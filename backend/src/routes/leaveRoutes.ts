import { Router } from 'express';
import { getBalances, applyLeave, getLeaveHistory, getLeaveRequest, cancelLeave } from '../controllers/leaveController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken); // Protect all leave routes

router.get('/balance', getBalances);
router.post('/', applyLeave);
router.get('/', getLeaveHistory);
router.get('/:id', getLeaveRequest);
router.patch('/:id/cancel', cancelLeave);

export default router;
