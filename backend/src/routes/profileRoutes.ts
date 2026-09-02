import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/profileController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken); // Protect all profile routes

router.get('/', getProfile);
router.patch('/', updateProfile);
router.patch('/change-password', changePassword);

export default router;
