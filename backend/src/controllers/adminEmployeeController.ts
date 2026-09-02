import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';

const createEmployeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  role: z.enum(['employee', 'admin']).default('employee'),
  customEmployeeId: z.string().max(50).optional(),
  password: z.string().min(6).max(100).optional(),
});

const editEmployeeSchema = createEmployeeSchema.partial();

export const getEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    const offset = (page - 1) * limit;

    const search = req.query.search as string;
    const department = req.query.department as string;
    const status = req.query.status as string;
    const role = req.query.role as string;

    let filterQuery = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      filterQuery += ` AND (name ILIKE $${queryParams.length} OR employee_id ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`;
    }
    if (department) {
      queryParams.push(department);
      filterQuery += ` AND department = $${queryParams.length}`;
    }
    if (status && status !== 'All') {
      queryParams.push(status.toLowerCase());
      filterQuery += ` AND status = $${queryParams.length}`;
    }
    if (role && role !== 'All') {
      queryParams.push(role.toLowerCase());
      filterQuery += ` AND role = $${queryParams.length}`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM users ${filterQuery}`, queryParams);
    const total = parseInt(countRes.rows[0].count);

    const usersRes = await query(`
      SELECT id, employee_id as "employeeId", name, email, phone, department, 
             designation, joining_date as "joiningDate", status, role, created_at as "createdAt"
      FROM users
      ${filterQuery}
      ORDER BY id DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    const items = usersRes.rows.map(rec => {
      if (rec.joiningDate) {
        rec.joiningDate = new Date(rec.joiningDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      }
      return rec;
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('getEmployees error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch employees' } });
  }
};

export const getEmployeeDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const userRes = await query(`
      SELECT id, employee_id as "employeeId", name, email, phone, department, 
             designation, joining_date as "joiningDate", status, role, profile_photo_url as "profilePhotoUrl"
      FROM users WHERE id = $1
    `, [id]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    const profile = userRes.rows[0];
    if (profile.joiningDate) {
      profile.joiningDate = new Date(profile.joiningDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }

    const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 4);

    // Attendance summary
    const attRes = await query(`
      SELECT 
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM attendance_date) = $2
    `, [id, year]);

    // Leave requests summary
    const leaveRes = await query(`
      SELECT 
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected
      FROM leave_requests
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM start_date) = $2
    `, [id, year]);

    // Leave balances
    const balRes = await query(`
      SELECT lt.name as "leaveType", lb.allocated_days as "allocatedDays", lb.used_days as "usedDays"
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = $1 AND lb.year = $2
    `, [id, year]);

    res.json({
      success: true,
      data: {
        profile,
        attendanceSummary: {
          present: parseInt(attRes.rows[0].present || '0'),
          absent: parseInt(attRes.rows[0].absent || '0'),
          late: parseInt(attRes.rows[0].late || '0'),
        },
        leaveSummary: {
          approved: parseInt(leaveRes.rows[0].approved || '0'),
          pending: parseInt(leaveRes.rows[0].pending || '0'),
          rejected: parseInt(leaveRes.rows[0].rejected || '0'),
        },
        leaveBalances: balRes.rows.map(r => ({
          leaveType: r.leaveType,
          allocatedDays: r.allocatedDays,
          usedDays: r.usedDays,
          remainingDays: r.allocatedDays - r.usedDays
        }))
      }
    });
  } catch (error) {
    console.error('getEmployeeDetail error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch employee details' } });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await require('pg').Pool.prototype.connect.bind(require('../db').pool)();
  try {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }

    const { name, email, phone, department, designation, joiningDate, role, customEmployeeId, password } = parsed.data;

    // Check email
    const emailRes = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (emailRes.rows.length > 0) {
      res.status(400).json({ success: false, error: { code: 'EMAIL_IN_USE', message: 'Email already exists' } });
      return;
    }

    if (customEmployeeId) {
      const empIdRes = await client.query(`SELECT id FROM users WHERE employee_id = $1`, [customEmployeeId]);
      if (empIdRes.rows.length > 0) {
        res.status(400).json({ success: false, error: { code: 'EMPLOYEE_ID_IN_USE', message: 'Employee ID already exists' } });
        return;
      }
    }

    await client.query('BEGIN');

    // Generate or use employee code
    let employeeCode = customEmployeeId;
    if (!employeeCode) {
      const maxRes = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM users`);
      const nextId = parseInt(maxRes.rows[0].max_id) + 1;
      employeeCode = `EMP${nextId.toString().padStart(3, '0')}`;
    }

    // Generate or use temp password
    const tempPassword = password || crypto.randomBytes(6).toString('hex');
    const hashed = await bcrypt.hash(tempPassword, 10);

    const insertQuery = `
      INSERT INTO users (employee_id, name, email, phone, department, designation, joining_date, role, password_hash, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
      RETURNING id, employee_id as "employeeId"
    `;
    const insertParams = [employeeCode, name, email, phone || null, department || null, designation || null, joiningDate || null, role, hashed];

    const result = await client.query(insertQuery, insertParams);

    await client.query('COMMIT');
    res.json({ success: true, data: { id: result.rows[0].id, employeeId: result.rows[0].employeeId, tempPassword: password ? 'User defined password' : tempPassword } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createEmployee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create employee' } });
  } finally {
    client.release();
  }
};

export const editEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const parsed = editEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }

    const { name, email, phone, department, designation, joiningDate, role } = parsed.data;

    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [];

    const addField = (val: any, fieldName: string) => {
      if (val !== undefined) {
        params.push(val);
        updateQuery += `, ${fieldName} = $${params.length}`;
      }
    };

    addField(name, 'name');
    addField(email, 'email');
    addField(phone, 'phone');
    addField(department, 'department');
    addField(designation, 'designation');
    addField(joiningDate, 'joining_date');
    addField(role, 'role');

    if (params.length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No fields to update' } });
      return;
    }

    params.push(id);
    updateQuery += ` WHERE id = $${params.length}`;

    await query(updateQuery, params);

    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    console.error('editEmployee error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update employee' } });
  }
};

export const updateEmployeeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const status = req.body.status;
    if (status !== 'active' && status !== 'inactive') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Status must be active or inactive' } });
      return;
    }

    // Prevent deactivating yourself
    if (id === req.user!.id) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: 'Cannot deactivate yourself' } });
      return;
    }

    await query(`UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
    res.json({ success: true, message: `Employee marked as ${status}` });
  } catch (error) {
    console.error('updateEmployeeStatus error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update status' } });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if user exists
    const userRes = await query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashed = await bcrypt.hash(tempPassword, 10);

    await query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hashed, id]);

    res.json({ success: true, data: { tempPassword }, message: 'Password reset successful' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reset password' } });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user!.id) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: 'Cannot delete yourself' } });
      return;
    }
    
    // First, verify status is inactive to prevent accidental deletion of active employees
    const userRes = await query(`SELECT status FROM users WHERE id = $1`, [id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    
    if (userRes.rows[0].status !== 'inactive') {
      res.status(400).json({ success: false, error: { code: 'INVALID_ACTION', message: 'Can only delete INACTIVE employees' } });
      return;
    }

    await query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error: any) {
    console.error('deleteEmployee error:', error);
    if (error.code === '23503') { // PostgreSQL foreign_key_violation
      res.status(400).json({ success: false, error: { code: 'FOREIGN_KEY_VIOLATION', message: 'Cannot delete employee because they have attendance or leave records. Please keep them as INACTIVE instead.' } });
    } else {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete employee' } });
    }
  }
};
