import cron from 'node-cron';
import { query } from '../db';
import { getAttendanceSettings } from './attendanceStatusService';

export function startScheduler() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      // Current date in IST
      const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      // Current time in IST (HH:MM:SS)
      const timeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }); // 24hr format

      const settings = await getAttendanceSettings();

      // Check holidays and weekends
      const isWeekend = new Date(dateStr).getDay() === 0; // Sunday only
      const holidayRes = await query('SELECT id FROM holidays WHERE holiday_date = $1 AND is_active = true', [dateStr]);
      const isHoliday = holidayRes.rows.length > 0;

      if (isWeekend || isHoliday) {
        return; // Don't process absence on holidays/weekends
      }

      // 1. ABSENCE PROCESSING
      // If current time >= absence_cutoff
      if (timeStr >= settings.absence_cutoff) {
        // Find active employees with no check-in today and no full-day approved leave
        const absentRes = await query(`
          SELECT u.id, u.role
          FROM users u
          WHERE u.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM attendance a WHERE a.employee_id = u.id AND a.attendance_date = $1
          )
          AND NOT EXISTS (
            SELECT 1 FROM leave_requests lr 
            WHERE lr.employee_id = u.id 
              AND lr.status = 'APPROVED' 
              AND lr.start_date <= $1 
              AND lr.end_date >= $1
              AND lr.leave_duration = 'FULL_DAY'
          )
        `, [dateStr]);

        const absentEmployees = absentRes.rows.filter(u => u.role !== 'admin'); // Assuming admins don't get marked absent for this requirement, though requirement doesn't strictly say so, but it's standard. Wait, the requirement says "Calculate active employees". Let's just use all in absentRes.
        const absentCount = absentRes.rows.length;

        for (const user of absentRes.rows) {
          // Insert notification (deduplicated by unique constraint)
          try {
            await query(`
              INSERT INTO notifications (employee_id, type, attendance_date, message)
              VALUES ($1, 'ABSENCE', $2, 'Attendance not marked today. You have been marked absent.')
            `, [user.id, dateStr]);
          } catch (e: any) {
            if (e.code !== '23505') console.error('Failed to insert absence notification:', e);
          }
        }

        // Admin Notification
        if (absentCount > 0) {
          const adminsRes = await query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active'`);
          for (const admin of adminsRes.rows) {
            try {
              await query(`
                INSERT INTO notifications (employee_id, type, attendance_date, message)
                VALUES ($1, 'ADMIN_DAILY_ABSENCE', $2, $3)
              `, [admin.id, dateStr, `${absentCount} employees are absent today.`]);
            } catch (e: any) {
              if (e.code !== '23505') console.error('Failed to insert admin absence notification:', e);
            }
          }
        }
      }

      // 2. CHECKOUT MISSING PROCESSING
      // If current time >= checkout_reminder_time
      if (timeStr >= settings.checkout_reminder_time) {
        const missingRes = await query(`
          SELECT a.employee_id 
          FROM attendance a
          JOIN users u ON a.employee_id = u.id
          WHERE u.status = 'active'
            AND a.attendance_date = $1
            AND a.check_out IS NULL
        `, [dateStr]);

        for (const att of missingRes.rows) {
          try {
            await query(`
              INSERT INTO notifications (employee_id, type, attendance_date, message)
              VALUES ($1, 'MISSING_CHECKOUT', $2, 'You checked in today but have not checked out.')
            `, [att.employee_id, dateStr]);
          } catch (e: any) {
            if (e.code !== '23505') console.error('Failed to insert checkout notification:', e);
          }
        }
      }

    } catch (error) {
      console.error('Scheduler error:', error);
    }
  });
}
