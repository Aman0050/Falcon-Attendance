"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken); // Protect all profile routes
router.get('/', profileController_1.getProfile);
router.patch('/', profileController_1.updateProfile);
router.patch('/change-password', profileController_1.changePassword);
router.post('/photo', upload_1.uploadProfilePhoto.single('photo'), profileController_1.uploadProfilePhotoHandler);
router.delete('/photo', profileController_1.deleteProfilePhotoHandler);
exports.default = router;
