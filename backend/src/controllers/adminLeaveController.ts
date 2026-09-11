import { Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';
import { NotificationService } from '../services/notificationService';

export const isInitialized = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const resCount = await query(`SELECT COUNT(*) as count FROM leave_balances`);
    const initialized = parseInt(resCount.rows[0].count) > 0;
    res.json({ success: true, data: { initialized } });
  } catch (error) {
    console.error('isInitialized error:', error);
    res.status(500).json({ success: false, error: { message: 'Error checking initialization status' } });
  }
};

const initializeSchema = z.object({
  quarter: z.number().min(1).max(4),
  employees: z.array(z.object({
    employeeId: z.number(),
    usedPaidLeave: z.number().min(0)
  }))
});

export const initializeLeaves = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await require('pg').Pool.prototype.connect.bind(require('../db').pool)();
  try {
    const parsed = initializeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: 'Invalid data provided' } });
      return;
    }

    const { quarter, employees } = parsed.data;
    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 4);

    const check = await client.query(`SELECT COUNT(*) FROM leave_balances`);
    if (parseInt(check.rows[0].count) > 0) {
      res.status(400).json({ success: false, error: { message: 'Leave balances already initialized' } });
      return;
    }

    await client.query('BEGIN');

    for (const emp of employees) {
      const accrued = quarter * 4.5;
      const currentBalance = accrued - emp.usedPaidLeave;
      await client.query(`
        INSERT INTO leave_balances (employee_id, year, accrued_leave, used_paid_leave, current_balance, last_credit_date)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
      `, [emp.employeeId, year, accrued, emp.usedPaidLeave, currentBalance]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Leave initialized successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('initializeLeaves error:', error);
    res.status(500).json({ success: false, error: { message: 'Initialization failed' } });
  } finally {
    client.release();
  }
};

export const getAdminLeaves = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    const offset = (page - 1) * limit;

    const status = req.query.status as string;
    const employeeId = req.query.employeeId as string;
    const search = req.query.search as string;

    let filterQuery = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (status && status !== 'All') {
      queryParams.push(status.toUpperCase());
      filterQuery += ` AND lr.status = $${queryParams.length}`;
    }
    if (employeeId) {
      queryParams.push(employeeId);
      filterQuery += ` AND u.employee_id = $${queryParams.length}`;
    }
    if (search) {
      queryParams.push(`%${search}%`);
      filterQuery += ` AND (u.name ILIKE $${queryParams.length} OR u.employee_id ILIKE $${queryParams.length})`;
    }

    const countRes = await query(`
      SELECT COUNT(*) 
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      ${filterQuery}
    `, queryParams);
    const total = parseInt(countRes.rows[0].count);

    const histRes = await query(`
      SELECT lr.id, u.name as employee_name, u.employee_id as employee_code, lr.leave_type as "leaveType",
             lr.from_date, lr.to_date, lr.days, lr.reason, lr.status, lr.created_at, u.profile_photo_url as profile_photo_url
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      ${filterQuery}
      ORDER BY lr.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        items: histRes.rows.map(rec => ({
          id: rec.id,
          employeeName: rec.employee_name,
          employeeId: rec.employee_code,
          profilePhotoUrl: rec.profile_photo_url,
          leaveType: rec.leaveType,
          startDate: new Date(rec.from_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          endDate: new Date(rec.to_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          totalDays: parseFloat(rec.days),
          reason: rec.reason,
          status: rec.status,
          createdAt: rec.created_at
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('getAdminLeaves error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving leaves.' } });
  }
};

export const approveLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await require('pg').Pool.prototype.connect.bind(require('../db').pool)();
  
  try {
    const adminId = req.user!.id;
    const leaveId = parseInt(req.params.id as string);

    await client.query('BEGIN');

    const lrRes = await client.query(`
      SELECT employee_id, leave_type, from_date, days, status
      FROM leave_requests 
      WHERE id = $1 FOR UPDATE
    `, [leaveId]);

    if (lrRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: { code: 'LEAVE_NOT_FOUND', message: 'Request not found' } });
      return;
    }

    const lr = lrRes.rows[0];
    if (lr.status !== 'PENDING') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: { code: 'LEAVE_NOT_PENDING', message: 'Leave is not pending' } });
      return;
    }

    if (lr.leave_type === 'Paid Leave') {
      const year = new Date(lr.from_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 4);
      const balRes = await client.query(`
        SELECT id, current_balance FROM leave_balances 
        WHERE employee_id = $1 AND year = $2 FOR UPDATE
      `, [lr.employee_id, year]);

      if (balRes.rows.length === 0 || parseFloat(balRes.rows[0].current_balance) < parseFloat(lr.days)) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_LEAVE_BALANCE', message: 'Insufficient balance' } });
        return;
      }

      await client.query(`
        UPDATE leave_balances 
        SET used_paid_leave = used_paid_leave + $1, current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [lr.days, balRes.rows[0].id]);
    } else if (lr.leave_type === 'Leave Without Pay') {
      const year = new Date(lr.from_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 4);
      
      // Upsert logic for leave without pay if balance row doesn't exist?
      // Since it's Leave Without Pay, they might not have a balance row (ineligible yet).
      const balRes = await client.query(`
        SELECT id FROM leave_balances WHERE employee_id = $1 AND year = $2 FOR UPDATE
      `, [lr.employee_id, year]);

      if (balRes.rows.length > 0) {
        await client.query(`
          UPDATE leave_balances 
          SET leave_without_pay = leave_without_pay + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [lr.days, balRes.rows[0].id]);
      } else {
        await client.query(`
          INSERT INTO leave_balances (employee_id, year, leave_without_pay)
          VALUES ($1, $2, $3)
        `, [lr.employee_id, year, lr.days]);
      }
    }

    // Update Request
    await client.query(`
      UPDATE leave_requests 
      SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [adminId, leaveId]);

    await client.query('COMMIT');

    // Notify employee of approval
    try {
      const fromDateObj = new Date(lr.from_date);
      const formattedDate = !isNaN(fromDateObj.getTime())
        ? fromDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
        : lr.from_date;

      await NotificationService.notifyUser(lr.employee_id, {
        title: '🎉 Leave Approved',
        message: `Your leave request for ${formattedDate} has been approved.`,
        type: 'Leave',
        priority: 'High',
        actionUrl: '/leave',
      });
    } catch (notifErr) {
      console.warn('Approve leave notification error:', notifErr);
    }

    res.json({ success: true, message: 'Leave approved' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('approveLeave error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Approval failed' } });
  } finally {
    client.release();
  }
};

const rejectSchema = z.object({ comment: z.string().min(3).max(500) });

export const rejectLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user!.id;
    const leaveId = parseInt(req.params.id as string);
    const parsed = rejectSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required (min 3 chars).' } });
      return;
    }

    const existRes = await query(`SELECT employee_id, leave_type, from_date, days, status FROM leave_requests WHERE id = $1`, [leaveId]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'LEAVE_NOT_FOUND', message: 'Request not found' } });
      return;
    }
    
    if (existRes.rows[0].status !== 'PENDING') {
      res.status(400).json({ success: false, error: { code: 'LEAVE_NOT_PENDING', message: 'Leave is not pending' } });
      return;
    }

    await query(`
      UPDATE leave_requests 
      SET status = 'REJECTED', remarks = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [parsed.data.comment, adminId, leaveId]);

    // Notify employee of rejection
    try {
      await NotificationService.notifyUser(existRes.rows[0].employee_id, {
        title: 'Leave Request Rejected',
        message: `Your ${existRes.rows[0].leave_type} request was rejected. Reason: ${parsed.data.comment}`,
        type: 'Leave',
        priority: 'High',
        actionUrl: '/my-leave',
      });
    } catch (notifErr) {
      console.warn('Reject leave notification error:', notifErr);
    }

    res.json({ success: true, message: 'Leave rejected' });
  } catch (error) {
    console.error('rejectLeave error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Rejection failed' } });
  }
};
