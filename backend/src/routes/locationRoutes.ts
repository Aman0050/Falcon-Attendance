import { Router } from 'express';
import { validateLocation } from '../controllers/locationController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Only authenticated users (EMPLOYEE or ADMIN) can validate location
router.post('/validate', authenticateToken, validateLocation);

export default router;
