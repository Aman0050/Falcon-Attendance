import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message || "Invalid input" });
      return;
    }

    const { identifier, password } = parsed.data;

    const result = await query(
      `SELECT * FROM users WHERE email = $1 OR employee_id = $1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, employee_id: user.employee_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Don't send the password hash back
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // In a stateless JWT setup, client deletes the token. 
  // For added security, we could implement a token blocklist here.
  res.json({ message: 'Logout successful' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await query(
      `SELECT id, employee_id, name, email, phone, role, status, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
