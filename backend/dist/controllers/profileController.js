"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProfilePhotoHandler = exports.uploadProfilePhotoHandler = exports.changePassword = exports.updateProfile = exports.getProfile = void 0;
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const upload_1 = require("../middlewares/upload");
const notificationService_1 = require("../services/notificationService");
const updateProfileSchema = zod_1.z.object({
    phone: zod_1.z.string().max(20).optional(),
    profilePhotoUrl: zod_1.z.string().max(1000).nullable().optional().or(zod_1.z.literal('')),
    name: zod_1.z.string().min(2).max(100).optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6).max(100),
});
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRes = await (0, db_1.query)(`
      SELECT id, employee_id as "employeeId", name, email, phone, department, 
             designation, joining_date as "joiningDate", status, role, profile_photo_url as "profilePhotoUrl"
      FROM users WHERE id = $1
    `, [userId]);
        if (userRes.rows.length === 0) {
            res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
            return;
        }
        const rec = userRes.rows[0];
        if (rec.joiningDate) {
            rec.joiningDate = new Date(rec.joiningDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        }
        res.json({ success: true, data: rec });
    }
    catch (error) {
        console.error('getProfile error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch profile' } });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const parsed = updateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
            return;
        }
        const { phone, profilePhotoUrl, name } = parsed.data;
        let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
        const params = [];
        if (phone !== undefined) {
            params.push(phone);
            updateQuery += `, phone = $${params.length}`;
        }
        if (profilePhotoUrl !== undefined) {
            params.push(profilePhotoUrl);
            updateQuery += `, profile_photo_url = $${params.length}`;
        }
        if (name !== undefined) {
            params.push(name);
            updateQuery += `, name = $${params.length}`;
        }
        if (params.length === 0) {
            res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } });
            return;
        }
        params.push(userId);
        updateQuery += ` WHERE id = $${params.length}`;
        await (0, db_1.query)(updateQuery, params);
        res.json({ success: true, message: 'Profile updated successfully' });
    }
    catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update profile' } });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const parsed = changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } });
            return;
        }
        const { currentPassword, newPassword } = parsed.data;
        const userRes = await (0, db_1.query)(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length === 0) {
            res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
            return;
        }
        const isValid = await bcrypt_1.default.compare(currentPassword, userRes.rows[0].password_hash);
        if (!isValid) {
            res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect current password' } });
            return;
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await (0, db_1.query)(`UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [hashed, userId]);
        // Send security notification to user
        try {
            await notificationService_1.NotificationService.notifyUser(userId, {
                title: 'Password Changed Successfully',
                message: 'Your account password was updated. If you did not make this change, please contact your administrator immediately.',
                type: 'Security',
                priority: 'Critical',
                actionUrl: '/profile',
            });
        }
        catch (notifErr) {
            console.warn('Password change notification error:', notifErr);
        }
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('changePassword error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to change password' } });
    }
};
exports.changePassword = changePassword;
const uploadProfilePhotoHandler = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) {
            res.status(400).json({ success: false, error: { message: 'No photo file provided' } });
            return;
        }
        const photoUrl = await (0, upload_1.processAndSaveProfilePhoto)(req.file.buffer, `user-${userId}`);
        const userRes = await (0, db_1.query)(`SELECT profile_photo_url FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].profile_photo_url) {
            await (0, upload_1.deleteProfilePhotoFile)(userRes.rows[0].profile_photo_url);
        }
        await (0, db_1.query)(`UPDATE users SET profile_photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [photoUrl, userId]);
        res.json({
            success: true,
            data: {
                profilePhotoUrl: photoUrl,
            },
            message: 'Profile photo updated successfully',
        });
    }
    catch (error) {
        console.error('uploadProfilePhotoHandler error:', error);
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to upload photo' } });
    }
};
exports.uploadProfilePhotoHandler = uploadProfilePhotoHandler;
const deleteProfilePhotoHandler = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRes = await (0, db_1.query)(`SELECT profile_photo_url FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].profile_photo_url) {
            await (0, upload_1.deleteProfilePhotoFile)(userRes.rows[0].profile_photo_url);
        }
        await (0, db_1.query)(`UPDATE users SET profile_photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId]);
        res.json({
            success: true,
            message: 'Profile photo removed successfully',
        });
    }
    catch (error) {
        console.error('deleteProfilePhotoHandler error:', error);
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to remove photo' } });
    }
};
exports.deleteProfilePhotoHandler = deleteProfilePhotoHandler;
