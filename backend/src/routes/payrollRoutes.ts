import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { PayrollController } from '../controllers/payrollController';

const router = Router();

// Only admin can access payroll endpoints
router.use(authenticateToken);
router.use(requireRole('admin'));

// Settings
router.get('/settings', PayrollController.getSettings);
router.put('/settings', PayrollController.updateSettings);

// Salary Profiles
router.get('/profiles', PayrollController.getSalaryProfiles);
router.post('/profiles/:employeeId', PayrollController.updateSalaryProfile);
router.get('/profiles/:employeeId/revisions', PayrollController.getSalaryRevisions);

// Cycles & Processing
router.get('/cycles', PayrollController.getCycles);
router.get('/cycles/:year/:month', PayrollController.getCycleDetails);
router.post('/calculate', PayrollController.calculatePreview);
router.post('/finalize', PayrollController.finalizeCycle);
router.post('/cycles/:id/unlock', PayrollController.unlockCycle);
router.patch('/items/:id', PayrollController.updatePayrollItem);

// Reports Export
router.get('/reports/salary-register', PayrollController.exportSalaryRegister);
router.get('/reports/pf', PayrollController.exportPFReport);
router.get('/reports/esic', PayrollController.exportESICReport);
router.get('/reports/summary-pdf', PayrollController.exportSummaryPDF);

export default router;
