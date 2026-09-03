import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { query } from '../db';
import { calculateStatus, getAttendanceSettings } from '../services/attendanceStatusService';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const getAttendanceReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to, month, year, employeeId, status, search, export: exportType } = req.query;
    
    const page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    if (limit > 100 && !exportType) limit = 100;

    // 1. Determine Date Range
    let startDateStr = '';
    let endDateStr = '';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    if (from && to) {
      startDateStr = String(from);
      endDateStr = String(to);
      if (startDateStr > endDateStr) {
        res.status(400).json({ success: false, error: { message: 'Invalid date range: from > to' } });
        return;
      }
    } else {
      const y = year ? parseInt(String(year)) : parseInt(todayStr.split('-')[0]);
      const m = month ? parseInt(String(month)) : parseInt(todayStr.split('-')[1]);
      startDateStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = new Date(y, m, 0);
      endDateStr = endDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }

    // Do not project future attendance statuses
    const actualEndStr = endDateStr > todayStr ? todayStr : endDateStr;

    // 2. Fetch Employees
    let empQuery = `SELECT id, name, email, employee_id FROM users WHERE status = 'active'`;
    const empParams: any[] = [];
    if (employeeId) {
      empParams.push(employeeId);
      empQuery += ` AND id = $${empParams.length}`;
    }
    if (search) {
      empParams.push(`%${search}%`);
      empQuery += ` AND (name ILIKE $${empParams.length} OR email ILIKE $${empParams.length})`;
    }
    empQuery += ` ORDER BY name ASC`;
    const empRes = await query(empQuery, empParams);
    const employees = empRes.rows;

    if (employees.length === 0) {
      res.json({
        success: true,
        data: {
          period: { from: startDateStr, to: endDateStr },
          summary: { employees: 0, workingDays: 0, present: 0, absent: 0, halfDay: 0, onLeave: 0, late: 0, totalWorkingMinutes: 0, attendancePercentage: 0 },
          employees: [],
          pagination: { total: 0, page, limit, totalPages: 0 }
        }
      });
      return;
    }

    // Pagination slice for UI (if export, we process all filtered)
    let paginatedEmployees = employees;
    if (!exportType) {
      const offset = (page - 1) * limit;
      paginatedEmployees = employees.slice(offset, offset + limit);
    }
    // We actually need to calculate the summary for the *paginated* employees or ALL employees? 
    // Usually, top-level summary represents the filtered dataset (all pages).
    // Let's process all matched employees to get the exact summary, then paginate the final output array.
    
    // 3. Fetch Related Data
    const empIds = employees.map(e => e.id);
    // Be careful with large array in IN clause. If it's too large, we might need a join. But 100-200 employees is fine.
    
    const [attRes, settings, holRes, leaveRes] = await Promise.all([
      query(`SELECT * FROM attendance WHERE attendance_date >= $1 AND attendance_date <= $2`, [startDateStr, actualEndStr]),
      getAttendanceSettings(),
      query(`SELECT holiday_date, name FROM holidays WHERE is_active = true AND holiday_date >= $1 AND holiday_date <= $2`, [startDateStr, actualEndStr]),
      query(`SELECT * FROM leave_requests WHERE status = 'APPROVED' AND start_date <= $2 AND end_date >= $1`, [startDateStr, actualEndStr])
    ]);

    const attMap = new Map();
    for (const r of attRes.rows) {
      const d = new Date(r.attendance_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const k = `${r.employee_id}_${d}`;
      attMap.set(k, r);
    }

    const holMap = new Map(holRes.rows.map(r => [new Date(r.holiday_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), r]));
    
    const leaveMap = new Map();
    for (const lr of leaveRes.rows) {
      let d = new Date(lr.start_date);
      const end = new Date(lr.end_date);
      while (d <= end) {
        const dStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const k = `${lr.employee_id}_${dStr}`;
        leaveMap.set(k, lr);
        d.setDate(d.getDate() + 1);
      }
    }

    let globalSummary = {
      employees: employees.length,
      workingDays: 0,
      present: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      late: 0,
      totalWorkingMinutes: 0,
      attendancePercentage: 0,
      totalExpectedDays: 0
    };

    const employeeReports = [];

    // Precalculate working days in the period
    let workingDaysCount = 0;
    if (startDateStr <= actualEndStr) {
       let curr = new Date(startDateStr);
       const end = new Date(actualEndStr);
       while (curr <= end) {
         const dStr = curr.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
         if (curr.getDay() !== 0 && !holMap.has(dStr)) {
           workingDaysCount++;
         }
         curr.setDate(curr.getDate() + 1);
       }
    }
    globalSummary.workingDays = workingDaysCount;

    for (const emp of employees) {
      let empSummary = {
        present: 0, absent: 0, halfDay: 0, onLeave: 0, late: 0, totalWorkingMinutes: 0, attendancePercentage: 0, totalExpectedDays: 0
      };
      
      const dailyRecords = [];
      let curr = new Date(startDateStr);
      const end = new Date(actualEndStr);

      while (curr <= end) {
        const dStr = curr.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const rec = attMap.get(`${emp.id}_${dStr}`);
        const hol = holMap.has(dStr) ? { holiday_date: dStr, name: holMap.get(dStr).name } : null;
        const lve = leaveMap.get(`${emp.id}_${dStr}`);
        
        const result = calculateStatus(dStr, rec, settings, hol, lve, new Date());
        result.holidayName = (result as any).holidayName || null;
        result.leaveType = lve ? lve.leave_type : null;

        if (!status || status === 'All' || result.status === status) {
          dailyRecords.push({
            date: dStr,
            day: curr.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' }),
            status: result.status,
            checkIn: result.checkIn ? result.checkIn.toISOString() : null,
            checkOut: result.checkOut ? result.checkOut.toISOString() : null,
            workingMinutes: Math.round(result.workingMinutes),
            leaveType: result.leaveType,
            holidayName: result.holidayName,
            isLate: result.isLate
          });
        }

        // Always calculate full summary for the employee regardless of status filter so totals make sense?
        // Requirement: "UI: Status = ABSENT. Export: must contain only Amit's absent records."
        // We filter daily records, but the summary should reflect their totals for the requested period.
        if (result.status === 'PRESENT') empSummary.present++;
        else if (result.status === 'ABSENT' || result.status === 'INSUFFICIENT_HOURS') empSummary.absent++;
        else if (result.status === 'HALF_DAY') empSummary.halfDay++;
        else if (result.status === 'ON_LEAVE') empSummary.onLeave++;
        
        if (result.isLate) empSummary.late++;
        empSummary.totalWorkingMinutes += result.workingMinutes;

        if (result.status !== 'HOLIDAY' && result.status !== 'SUNDAY' && result.status !== 'NOT_MARKED') {
          empSummary.totalExpectedDays++;
        }

        curr.setDate(curr.getDate() + 1);
      }

      const attended = empSummary.present + (empSummary.halfDay * 0.5);
      const required = empSummary.totalExpectedDays - empSummary.onLeave;
      empSummary.attendancePercentage = required > 0 ? Math.round((attended / required) * 100) : 100;

      globalSummary.present += empSummary.present;
      globalSummary.absent += empSummary.absent;
      globalSummary.halfDay += empSummary.halfDay;
      globalSummary.onLeave += empSummary.onLeave;
      globalSummary.late += empSummary.late;
      globalSummary.totalWorkingMinutes += empSummary.totalWorkingMinutes;
      globalSummary.totalExpectedDays += empSummary.totalExpectedDays;

      // Only include employee if they have daily records matching the filter (or if no status filter)
      if (dailyRecords.length > 0) {
        employeeReports.push({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          empId: emp.employee_id,
          summary: empSummary,
          daily: dailyRecords
        });
      }
    }

    const totalAttended = globalSummary.present + (globalSummary.halfDay * 0.5);
    const totalRequired = globalSummary.totalExpectedDays - globalSummary.onLeave;
    globalSummary.attendancePercentage = totalRequired > 0 ? Math.round((totalAttended / totalRequired) * 100) : 100;

    // Apply sorting to employeeReports (simplified by name or %)
    const sortField = req.query.sort as string;
    const order = req.query.order === 'desc' ? -1 : 1;
    if (sortField === 'attendancePercentage') {
      employeeReports.sort((a, b) => (a.summary.attendancePercentage - b.summary.attendancePercentage) * order);
    } else if (sortField === 'present') {
      employeeReports.sort((a, b) => (a.summary.present - b.summary.present) * order);
    } else {
      employeeReports.sort((a, b) => a.name.localeCompare(b.name) * order);
    }

    if (exportType === 'excel') {
      return await exportExcel(res, globalSummary, employeeReports, startDateStr, endDateStr);
    } else if (exportType === 'pdf') {
      return await exportPdf(res, globalSummary, employeeReports, startDateStr, endDateStr);
    }

    // Pagination for UI
    const offset = (page - 1) * limit;
    const paginated = employeeReports.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        period: { from: startDateStr, to: endDateStr },
        summary: globalSummary,
        employees: paginated,
        pagination: {
          total: employeeReports.length,
          page,
          limit,
          totalPages: Math.ceil(employeeReports.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, error: { message: 'Server error generating report' }});
  }
};

const formatMins = (m: number) => `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m`;

async function exportExcel(res: Response, summary: any, employeeReports: any[], from: string, to: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Falcon Info Solutions';
  
  const sheet = workbook.addWorksheet('Attendance Report');
  
  try {
    const logoPath = path.join(process.cwd(), '../mobile/assets/logo.png');
    if (fs.existsSync(logoPath)) {
      const logoId = workbook.addImage({
        buffer: fs.readFileSync(logoPath),
        extension: 'png'
      });
      sheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 100, height: 100 }
      });
    }
  } catch(e) {
    console.error('Logo add failed', e);
  }

  sheet.getCell('C1').value = 'Falcon Info Solutions';
  sheet.getCell('C1').font = { size: 16, bold: true };
  sheet.getCell('C2').value = `Report generation date: ${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`;
  
  sheet.getCell('A4').value = 'Summary Statistics';
  sheet.getCell('A4').font = { bold: true };
  sheet.getCell('A5').value = 'Total working days'; sheet.getCell('B5').value = summary.totalExpectedDays;
  sheet.getCell('A6').value = 'Present days'; sheet.getCell('B6').value = summary.present;
  sheet.getCell('A7').value = 'Absent days'; sheet.getCell('B7').value = summary.absent;
  sheet.getCell('A8').value = 'Leave days'; sheet.getCell('B8').value = summary.onLeave;
  sheet.getCell('A9').value = 'Late arrivals'; sheet.getCell('B9').value = summary.late;
  sheet.getCell('A10').value = 'Total working hours'; sheet.getCell('B10').value = formatMins(summary.totalWorkingMinutes);
  sheet.getCell('A11').value = 'Overtime'; sheet.getCell('B11').value = '0h 0m';

  sheet.addRow([]);
  sheet.addRow([]);

  // Table Data
  const headerRow = sheet.addRow(['Employee ID', 'Name', 'Date', 'Check In', 'Check Out', 'Status', 'Location']);
  headerRow.font = { bold: true };
  
  sheet.getColumn(1).width = 15;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 15;
  sheet.getColumn(7).width = 20;

  for (const er of employeeReports) {
    for (const d of er.daily) {
      const inTime = d.checkIn ? new Date(d.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-';
      const outTime = d.checkOut ? new Date(d.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-';
      let loc = '-';
      if (d.status === 'PRESENT' || d.status === 'HALF_DAY') {
        loc = 'Office'; // Standard default
      }
      
      let st = d.status.charAt(0).toUpperCase() + d.status.slice(1).toLowerCase().replace('_', ' ');
      if (d.status === 'ON_LEAVE' || d.status === 'HALF_DAY_LEAVE') st = 'Leave';
      
      sheet.addRow([
        er.empId || `EMP${String(er.id).padStart(3, '0')}`,
        er.name,
        d.date,
        inTime,
        outTime,
        st,
        loc
      ]);
    }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${from}-to-${to}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

async function exportPdf(res: Response, summary: any, employeeReports: any[], from: string, to: string) {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${from}-to-${to}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('Falcon Info Solutions', { align: 'center' });
  doc.fontSize(14).text(`Attendance Report (${from} to ${to})`, { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });
  doc.moveDown(2);

  // Simple table rendering
  const drawRow = (y: number, cols: string[]) => {
    let x = 30;
    const w = [150, 50, 50, 60, 50, 50, 80, 50]; // widths
    let maxHeight = 0;
    cols.forEach((txt, i) => {
      const height = doc.heightOfString(txt, { width: w[i] });
      if (height > maxHeight) maxHeight = height;
      doc.text(txt, x, y, { width: w[i], align: 'left' });
      x += w[i] + 10;
    });
    return maxHeight;
  };

  const headerHeight = drawRow(doc.y, ['Employee', 'Present', 'Absent', 'Half Day', 'Leave', 'Late', 'Hours', '%']);
  doc.y += headerHeight + 5;
  doc.moveTo(30, doc.y).lineTo(800, doc.y).stroke();
  doc.y += 10;

  for (const er of employeeReports) {
    if (doc.y > 500) { 
      doc.addPage(); 
      doc.y = 30; // Reset to top margin
    }
    const rowHeight = drawRow(doc.y, [
      er.name,
      String(er.summary.present),
      String(er.summary.absent),
      String(er.summary.halfDay),
      String(er.summary.onLeave),
      String(er.summary.late),
      formatMins(er.summary.totalWorkingMinutes),
      `${er.summary.attendancePercentage}%`
    ]);
    doc.y += rowHeight + 5;
  }

  doc.end();
}
