import { Router } from 'express';
import { getAttendance, getDailySummary } from '../controllers/adminController';
import { getAttendanceReport } from '../controllers/adminReportController';
import { getAdminLeaves, approveLeave, rejectLeave } from '../controllers/adminLeaveController';
import { getEmployees, getEmployeeDetail, createEmployee, editEmployee, updateEmployeeStatus, resetPassword, deleteEmployee, uploadEmployeePhoto, deleteEmployeePhoto } from '../controllers/adminEmployeeController';
import { getSettings, updateSettings, getHolidays, addHoliday, deleteHoliday } from '../controllers/settingsController';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { uploadProfilePhoto } from '../middlewares/upload';
import { query } from '../db';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('admin'));

router.get('/notifications', async (req, res) => {
  try {
    const notifRes = await query(`
      SELECT * FROM notifications 
      WHERE type = 'ADMIN_DAILY_ABSENCE' 
      ORDER BY sent_at DESC 
      LIMIT 100
    `);
    res.json({ success: true, data: notifRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

router.get('/settings', getSettings);
router.patch('/settings', updateSettings);
router.get('/holidays', getHolidays);
router.post('/holidays', addHoliday);
router.delete('/holidays/:id', deleteHoliday);

router.get('/reports/attendance', getAttendanceReport);

router.get('/attendance', getAttendance);
router.get('/attendance/summary', getDailySummary);

router.get('/leave/is-initialized', (req, res, next) => {
  import('../controllers/adminLeaveController').then(m => m.isInitialized(req, res)).catch(next);
});
router.post('/leave/initialize', (req, res, next) => {
  import('../controllers/adminLeaveController').then(m => m.initializeLeaves(req, res)).catch(next);
});
router.get('/leave', getAdminLeaves);
router.patch('/leave/:id/approve', approveLeave);
router.patch('/leave/:id/reject', rejectLeave);

router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeDetail);
router.post('/employees', createEmployee);
router.patch('/employees/:id', editEmployee);
router.patch('/employees/:id/status', updateEmployeeStatus);
router.patch('/employees/:id/reset-password', resetPassword);
router.delete('/employees/:id', deleteEmployee);
router.post('/upload-photo', uploadProfilePhoto.single('photo'), uploadEmployeePhoto);
router.post('/employees/:id/photo', uploadProfilePhoto.single('photo'), uploadEmployeePhoto);
router.delete('/employees/:id/photo', deleteEmployeePhoto);

export default router;
