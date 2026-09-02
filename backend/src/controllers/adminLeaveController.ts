import { Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

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
      SELECT lr.id, u.name as employee_name, u.employee_id as employee_code, lt.code as "leaveType",
             lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status, lr.created_at
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
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
          leaveType: rec.leaveType,
          startDate: new Date(rec.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          endDate: new Date(rec.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          totalDays: rec.total_days,
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
    const leaveId = parseInt(req.params.id);

    await client.query('BEGIN');

    const lrRes = await client.query(`
      SELECT employee_id, leave_type_id, start_date, total_days, status
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

    // Check balance
    const year = new Date(lr.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 4);
    const balRes = await client.query(`
      SELECT id, allocated_days, used_days FROM leave_balances 
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 FOR UPDATE
    `, [lr.employee_id, lr.leave_type_id, year]);

    if (balRes.rows.length === 0 || (balRes.rows[0].allocated_days - balRes.rows[0].used_days) < lr.total_days) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_LEAVE_BALANCE', message: 'Insufficient balance' } });
      return;
    }

    // Update Request
    await client.query(`
      UPDATE leave_requests 
      SET status = 'APPROVED', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [adminId, leaveId]);

    // Deduct Balance
    await client.query(`
      UPDATE leave_balances 
      SET used_days = used_days + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [lr.total_days, balRes.rows[0].id]);

    await client.query('COMMIT');
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
    const leaveId = parseInt(req.params.id);
    const parsed = rejectSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required (min 3 chars).' } });
      return;
    }

    const existRes = await query(`SELECT status FROM leave_requests WHERE id = $1`, [leaveId]);
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
      SET status = 'REJECTED', admin_comment = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [parsed.data.comment, adminId, leaveId]);

    res.json({ success: true, message: 'Leave rejected' });
  } catch (error) {
    console.error('rejectLeave error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Rejection failed' } });
  }
};
