import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';

const updateProfileSchema = z.object({
  phone: z.string().max(20).optional(),
  profilePhotoUrl: z.string().url().max(1000).optional().or(z.literal('')),
  name: z.string().min(2).max(100).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const userRes = await query(`
      SELECT id, employee_id as "employeeId", name, email, phone, department, 
             designation, joining_date as "joiningDate", status, role, profile_photo_url as "profilePhotoUrl"
      FROM users WHERE id = $1
    `, [userId]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    const rec = userRes.rows[0];
    if (rec.joiningDate) {
      rec.joiningDate = new Date(rec.joiningDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }

    res.json({ success: true, data: rec });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch profile' } });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const parsed = updateProfileSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }

    const { phone, profilePhotoUrl, name } = parsed.data;

    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [];

    if (phone !== undefined) {
      params.push(phone);
      updateQuery += `, phone = $${params.length}`;
    }
    if (profilePhotoUrl !== undefined) {
      params.push(profilePhotoUrl);
      updateQuery += `, profile_photo_url = $${params.length}`;
    }
    if (name !== undefined) {
      params.push(name);
      updateQuery += `, name = $${params.length}`;
    }

    if (params.length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
      return;
    }

    params.push(userId);
    updateQuery += ` WHERE id = $${params.length}`;

    await query(updateQuery, params);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update profile' } });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const parsed = changePasswordSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } });
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    const userRes = await query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isValid) {
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect current password' } });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hashed, userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to change password' } });
  }
};
