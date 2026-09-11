import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    employee_id: string;
    role: string;
    roles: string[];
    name?: string;
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
        `SELECT id, employee_id, role, roles, status, name FROM users WHERE id = $1`,
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

      const rawRoles = dbUser.roles;
      const roles: string[] = Array.isArray(rawRoles) 
        ? rawRoles.map((r: any) => String(r).toLowerCase()) 
        : [String(dbUser.role || 'employee').toLowerCase()];

      // Attach authoritative DB identity
      req.user = {
        id: dbUser.id,
        employee_id: dbUser.employee_id,
        role: dbUser.role,
        roles,
        name: dbUser.name
      };
      
      next();
    } catch (error) {
      console.error('Authentication DB error:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  });
};

export const authenticate = authenticateToken;

export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const userRoles = req.user.roles || [req.user.role];
    const hasPermission = userRoles.some(r => r.toLowerCase() === role.toLowerCase());
    if (!hasPermission) {
      res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      return;
    }
    
    next();
  };
};

export const adminOnly = requireRole('admin');
export const employeeOnly = requireRole('employee');
export const shared = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  const userRoles = req.user.roles || [req.user.role];
  const hasPermission = userRoles.some(r => r.toLowerCase() === 'admin' || r.toLowerCase() === 'employee');
  if (!hasPermission) {
    res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    return;
  }
  next();
};
