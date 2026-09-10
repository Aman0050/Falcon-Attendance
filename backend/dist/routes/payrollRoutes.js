"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const payrollController_1 = require("../controllers/payrollController");
const router = (0, express_1.Router)();
// Only admin can access payroll endpoints
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)('admin'));
// Settings
router.get('/settings', payrollController_1.PayrollController.getSettings);
router.put('/settings', payrollController_1.PayrollController.updateSettings);
// Salary Profiles
router.get('/profiles', payrollController_1.PayrollController.getSalaryProfiles);
router.post('/profiles/:employeeId', payrollController_1.PayrollController.updateSalaryProfile);
router.get('/profiles/:employeeId/revisions', payrollController_1.PayrollController.getSalaryRevisions);
// Cycles & Processing
router.get('/cycles', payrollController_1.PayrollController.getCycles);
router.get('/cycles/:year/:month', payrollController_1.PayrollController.getCycleDetails);
router.post('/calculate', payrollController_1.PayrollController.calculatePreview);
router.post('/finalize', payrollController_1.PayrollController.finalizeCycle);
router.post('/cycles/:id/unlock', payrollController_1.PayrollController.unlockCycle);
router.patch('/items/:id', payrollController_1.PayrollController.updatePayrollItem);
// Reports Export
router.get('/reports/salary-register', payrollController_1.PayrollController.exportSalaryRegister);
router.get('/reports/pf', payrollController_1.PayrollController.exportPFReport);
router.get('/reports/esic', payrollController_1.PayrollController.exportESICReport);
router.get('/reports/summary-pdf', payrollController_1.PayrollController.exportSummaryPDF);
exports.default = router;
