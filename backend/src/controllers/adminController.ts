import { Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';

export const getAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    if (page < 1) {
      res.status(400).json({ success: false, error: { code: 'INVALID_PAGE', message: 'Page must be >= 1' } });
      return;
    }
    const offset = (page - 1) * limit;

    const date = req.query.date as string;
    const employeeId = req.query.employeeId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let filterQuery = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (date) {
      queryParams.push(date);
      filterQuery += ` AND a.attendance_date = $${queryParams.length}`;
    }
    if (employeeId) {
      queryParams.push(employeeId);
      filterQuery += ` AND u.employee_id = $${queryParams.length}`;
    }
    if (status && status !== 'All') {
      if (status === 'Checked In') {
        filterQuery += ` AND a.check_out IS NULL AND a.check_in IS NOT NULL`;
      } else if (status === 'Checked Out') {
        filterQuery += ` AND a.check_out IS NOT NULL`;
      } else {
        queryParams.push(status.toUpperCase());
        filterQuery += ` AND a.status = $${queryParams.length}`;
      }
    }
    if (search) {
      queryParams.push(`%${search}%`);
      filterQuery += ` AND (u.name ILIKE $${queryParams.length} OR u.employee_id ILIKE $${queryParams.length})`;
    }

    const countRes = await query(`
      WITH expanded_leaves AS (
        SELECT d::date as attendance_date, lr.employee_id
        FROM leave_requests lr
        JOIN generate_series(lr.start_date, lr.end_date, '1 day'::interval) d ON true
        WHERE lr.status = 'APPROVED'
      ),
      combined AS (
        SELECT a.attendance_date, a.employee_id
        FROM attendance a
        UNION ALL
        SELECT el.attendance_date, el.employee_id
        FROM expanded_leaves el
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance a 
          WHERE a.employee_id = el.employee_id AND a.attendance_date = el.attendance_date
        )
      )
      SELECT COUNT(*) 
      FROM combined a
      JOIN users u ON a.employee_id = u.id
      ${filterQuery}
    `, queryParams);
    const total = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const histRes = await query(`
      WITH expanded_leaves AS (
        SELECT 
          -lr.id as id, 
          d::date as attendance_date,
          NULL::timestamp with time zone as check_in,
          NULL::timestamp with time zone as check_out,
          0 as working_minutes,
          'ON LEAVE'::varchar as status,
          lr.employee_id
        FROM leave_requests lr
        JOIN generate_series(lr.start_date, lr.end_date, '1 day'::interval) d ON true
        WHERE lr.status = 'APPROVED'
      ),
      combined AS (
        SELECT id, attendance_date, check_in, check_out, working_minutes, status, employee_id
        FROM attendance
        UNION ALL
        SELECT id, attendance_date, check_in, check_out, working_minutes, status, employee_id
        FROM expanded_leaves el
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance a 
          WHERE a.employee_id = el.employee_id AND a.attendance_date = el.attendance_date
        )
      )
      SELECT a.id, a.attendance_date, a.check_in, a.check_out, a.working_minutes, a.status,
             u.name as employee_name, u.employee_id as employee_code
      FROM combined a
      JOIN users u ON a.employee_id = u.id
      ${filterQuery}
      ORDER BY a.attendance_date DESC, a.check_in DESC NULLS LAST
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        items: histRes.rows.map(rec => ({
          attendanceId: rec.id,
          employeeName: rec.employee_name,
          employeeId: rec.employee_code,
          date: new Date(rec.attendance_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          checkIn: rec.check_in,
          checkOut: rec.check_out,
          workingMinutes: rec.working_minutes ? Math.round(rec.working_minutes) : 0,
          status: rec.status
        })),
        pagination: { page, limit, total, totalPages }
      }
    });
  } catch (error) {
    console.error('Admin getAttendance error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving attendance.' } });
  }
};

export const getDailySummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = req.query.date as string;
    if (!date) {
      res.status(400).json({ success: false, error: { code: 'INVALID_DATE', message: 'Date parameter is required' } });
      return;
    }

    const usersRes = await query(`SELECT COUNT(*) FROM users WHERE role != 'admin' AND status = 'active'`);
    const totalEmployees = parseInt(usersRes.rows[0].count);

    const attRes = await query(`
      WITH expanded_leaves AS (
        SELECT d::date as attendance_date, 'ON LEAVE'::varchar as status, NULL::timestamp with time zone as check_out, lr.employee_id
        FROM leave_requests lr
        JOIN generate_series(lr.start_date, lr.end_date, '1 day'::interval) d ON true
        WHERE lr.status = 'APPROVED'
      ),
      combined AS (
        SELECT status, check_out, attendance_date, employee_id
        FROM attendance
        UNION ALL
        SELECT status, check_out, attendance_date, employee_id
        FROM expanded_leaves el
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance a 
          WHERE a.employee_id = el.employee_id AND a.attendance_date = el.attendance_date
        )
      )
      SELECT status, check_out 
      FROM combined 
      WHERE attendance_date = $1
    `, [date]);

    let present = 0;
    let absent = 0;
    let late = 0;
    let onLeave = 0;
    let checkedIn = 0;
    let checkedOut = 0;

    attRes.rows.forEach(r => {
      if (r.status === 'PRESENT') present++;
      if (r.status === 'ABSENT') absent++;
      if (r.status === 'LATE') late++;
      if (r.status === 'ON LEAVE') onLeave++;
      if (r.status !== 'ON LEAVE' && r.status !== 'ABSENT') {
        if (r.check_out) checkedOut++;
        else checkedIn++;
      }
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        present: present + late,
        absent,
        late,
        onLeave,
        checkedIn,
        checkedOut
      }
    });
  } catch (error) {
    console.error('Admin getDailySummary error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving daily summary.' } });
  }
};
