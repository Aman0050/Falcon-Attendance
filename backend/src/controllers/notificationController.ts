import { Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    // Admins only see 'ADMIN_DAILY_ABSENCE' and their own personal notifications. Wait. The user requirement says "Employee can see ONLY their own notifications... Admin absence notification data must be accessible only to admins."
    // If the user is admin, they might have ADMIN_DAILY_ABSENCE. Since we inserted it directly to their employee_id, they will just fetch their own notifications!
    // So the exact same query works for both admin and employee.
    const notifRes = await query(`
      SELECT id, type, attendance_date, message, sent_at, read_at 
      FROM notifications 
      WHERE employee_id = $1 
      ORDER BY sent_at DESC 
      LIMIT 100
    `, [employeeId]);

    res.json({ success: true, data: notifRes.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve notifications' } });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;
    const notificationId = parseInt(req.params.id);

    const updateRes = await query(`
      UPDATE notifications 
      SET read_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND employee_id = $2 
      RETURNING id
    `, [notificationId, employeeId]);

    if (updateRes.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Notification not found or access denied' } });
      return;
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.user!.id;

    await query(`
      UPDATE notifications 
      SET read_at = CURRENT_TIMESTAMP 
      WHERE employee_id = $1 AND read_at IS NULL
    `, [employeeId]);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};
