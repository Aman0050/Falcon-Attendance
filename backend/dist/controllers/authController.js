"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logout = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const loginSchema = zod_1.z.object({
    identifier: zod_1.z.string().min(1, "Email or Employee ID is required"),
    password: zod_1.z.string().min(1, "Password is required"),
});
const login = async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.issues?.[0]?.message || "Invalid input" });
            return;
        }
        const { identifier, password } = parsed.data;
        const result = await (0, db_1.query)(`SELECT * FROM users WHERE email = $1 OR employee_id = $1`, [identifier]);
        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const user = result.rows[0];
        if (user.status !== 'active') {
            res.status(403).json({ error: 'Account is deactivated' });
            return;
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, employee_id: user.employee_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        // Don't send the password hash back
        const { password_hash, ...userWithoutPassword } = user;
        userWithoutPassword.profilePhotoUrl = user.profile_photo_url;
        res.json({
            message: 'Login successful',
            token,
            user: userWithoutPassword,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const logout = async (req, res) => {
    // In a stateless JWT setup, client deletes the token. 
    // For added security, we could implement a token blocklist here.
    res.json({ message: 'Logout successful' });
};
exports.logout = logout;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const result = await (0, db_1.query)(`SELECT id, employee_id, name, email, phone, role, status, profile_photo_url, profile_photo_url as "profilePhotoUrl", created_at FROM users WHERE id = $1`, [req.user.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMe = getMe;
