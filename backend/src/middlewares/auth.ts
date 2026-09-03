import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    employee_id: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query.token as string);

  if (!token) {
    res.status(401).json({ error: 'Authentication token is missing' });
    return;
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    try {
      const userRes = await query(
        `SELECT id, employee_id, role, status FROM users WHERE id = $1`,
        [decoded.id]
      );

      if (userRes.rows.length === 0) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      const dbUser = userRes.rows[0];
      
      if (dbUser.status !== 'active') {
        res.status(401).json({ error: 'Account is deactivated' });
        return;
      }

      // Attach authoritative DB identity
      req.user = {
        id: dbUser.id,
        employee_id: dbUser.employee_id,
        role: dbUser.role
      };
      
      next();
    } catch (error) {
      console.error('Authentication DB error:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  });
};

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    if (req.user.role.toLowerCase() !== role.toLowerCase()) {
      res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }
    
    next();
  };
};
