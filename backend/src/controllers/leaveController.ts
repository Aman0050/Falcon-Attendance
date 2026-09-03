import { Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';

const applyLeaveSchema = z.object({
  leaveTypeId: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  reason: z.string().min(3).max(500),
});

export const getBalances = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    // Current business year based on IST
    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 4);

    const balanceRes = await query(`
      SELECT lt.code as "leaveType", lb.allocated_days as "allocatedDays", lb.used_days as "usedDays"
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1 AND lb.year = $2
    `, [employeeId, year]);

    // If no balances are set up, we should still return the types with 0 balance
    if (balanceRes.rows.length === 0) {
      const typesRes = await query(`SELECT code FROM leave_types WHERE is_active = true`);
      const emptyBalances = typesRes.rows.map(t => ({
        leaveType: t.code,
        allocatedDays: 0,
        usedDays: 0,
        remainingDays: 0
      }));
      res.json({ success: true, data: emptyBalances });
      return;
    }

    const data = balanceRes.rows.map(r => ({
      leaveType: r.leaveType,
      allocatedDays: r.allocatedDays,
      usedDays: r.usedDays,
      remainingDays: r.allocatedDays - r.usedDays
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('getBalances error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leave balances' } });
  }
};

export const applyLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    const parsed = applyLeaveSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
      return;
    }

    const { leaveTypeId, startDate, endDate, reason } = parsed.data;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      res.status(400).json({ success: false, error: { code: 'INVALID_DATE_RANGE', message: 'Start date must be before or equal to end date' } });
      return;
    }

    // Calculate total days (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check leave type exists and is active
    const ltRes = await query(`SELECT id FROM leave_types WHERE id = $1 AND is_active = true`, [leaveTypeId]);
    if (ltRes.rows.length === 0) {
      res.status(400).json({ success: false, error: { code: 'LEAVE_TYPE_INACTIVE', message: 'Selected leave type is inactive or not found' } });
      return;
    }

    // Check overlapping leave
    const overlapRes = await query(`
      SELECT id FROM leave_requests
      WHERE employee_id = $1 
      AND status IN ('PENDING', 'APPROVED')
      AND start_date <= $2 AND end_date >= $3
    `, [employeeId, endDate, startDate]);
    
    if (overlapRes.rows.length > 0) {
      res.status(400).json({ success: false, error: { code: 'LEAVE_OVERLAP', message: 'You already have a leave request covering part of these dates.' } });
      return;
    }

    // Check balance
    const year = startDate.substring(0, 4);
    const balanceRes = await query(`
      SELECT allocated_days, used_days FROM leave_balances 
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
    `, [employeeId, leaveTypeId, year]);

    if (balanceRes.rows.length === 0 || (balanceRes.rows[0].allocated_days - balanceRes.rows[0].used_days) < totalDays) {
      res.status(400).json({ success: false, error: { code: 'INSUFFICIENT_LEAVE_BALANCE', message: 'Insufficient leave balance.' } });
      return;
    }

    // Create request
    const insertRes = await query(`
      INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING id
    `, [employeeId, leaveTypeId, startDate, endDate, totalDays, reason]);

    res.json({ success: true, data: { leaveId: insertRes.rows[0].id, status: 'PENDING' } });
  } catch (error) {
    console.error('applyLeave error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to apply for leave' } });
  }
};

export const getLeaveHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    if (page < 1) return res.status(400).json({ success: false, error: { code: 'INVALID_PAGE', message: 'Page must be >= 1' } }) as any;
    
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string;

    let filterQuery = `WHERE lr.employee_id = $1`;
    let queryParams: any[] = [employeeId];

    if (statusFilter && statusFilter !== 'ALL') {
      queryParams.push(statusFilter.toUpperCase());
      filterQuery += ` AND lr.status = $2`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM leave_requests lr ${filterQuery}`, queryParams);
    const total = parseInt(countRes.rows[0].count);

    const histRes = await query(`
      SELECT lr.id, lt.code as "leaveType", lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status
      FROM leave_requests lr
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
          leaveType: rec.leaveType,
          startDate: new Date(rec.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          endDate: new Date(rec.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          totalDays: rec.total_days,
          reason: rec.reason,
          status: rec.status
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('getLeaveHistory error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leave history' } });
  }
};

export const getLeaveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    const id = parseInt(req.params.id);

    const leaveRes = await query(`
      SELECT lr.id, lt.code as "leaveType", lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status,
             lr.admin_comment, lr.reviewed_at, lr.created_at
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.id = $1 AND lr.employee_id = $2
    `, [id, employeeId]);

    if (leaveRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'LEAVE_NOT_FOUND', message: 'Leave request not found.' } });
      return;
    }

    const rec = leaveRes.rows[0];
    res.json({
      success: true,
      data: {
        id: rec.id,
        leaveType: rec.leaveType,
        startDate: new Date(rec.start_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        endDate: new Date(rec.end_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        totalDays: rec.total_days,
        reason: rec.reason,
        status: rec.status,
        adminComment: rec.admin_comment,
        reviewedAt: rec.reviewed_at,
        createdAt: rec.created_at
      }
    });
  } catch (error) {
    console.error('getLeaveRequest error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leave request' } });
  }
};

export const cancelLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    const id = parseInt(req.params.id);

    const existRes = await query(`SELECT status FROM leave_requests WHERE id = $1 AND employee_id = $2`, [id, employeeId]);
    if (existRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'LEAVE_NOT_FOUND', message: 'Leave request not found.' } });
      return;
    }

    if (existRes.rows[0].status !== 'PENDING') {
      res.status(400).json({ success: false, error: { code: 'LEAVE_NOT_PENDING', message: 'Only pending requests can be cancelled.' } });
      return;
    }

    await query(`UPDATE leave_requests SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Leave request cancelled successfully' });
  } catch (error) {
    console.error('cancelLeave error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to cancel leave' } });
  }
};
