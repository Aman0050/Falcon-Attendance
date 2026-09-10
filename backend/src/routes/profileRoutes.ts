import { Router } from 'express';
import { getProfile, updateProfile, changePassword, uploadProfilePhotoHandler, deleteProfilePhotoHandler } from '../controllers/profileController';
import { authenticateToken } from '../middlewares/auth';
import { uploadProfilePhoto } from '../middlewares/upload';

const router = Router();

router.use(authenticateToken); // Protect all profile routes

router.get('/', getProfile);
router.patch('/', updateProfile);
router.patch('/change-password', changePassword);
router.post('/photo', uploadProfilePhoto.single('photo'), uploadProfilePhotoHandler);
router.delete('/photo', deleteProfilePhotoHandler);

export default router;
