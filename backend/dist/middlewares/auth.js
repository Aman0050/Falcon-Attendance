"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shared = exports.employeeOnly = exports.adminOnly = exports.requireRole = exports.authenticate = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
    if (!token) {
        res.status(401).json({ error: 'Authentication token is missing' });
        return;
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            res.status(403).json({ error: 'Invalid or expired token' });
            return;
        }
        try {
            const userRes = await (0, db_1.query)(`SELECT id, employee_id, role, status, name FROM users WHERE id = $1`, [decoded.id]);
            if (userRes.rows.length === 0) {
                res.status(401).json({ error: 'User not found' });
                return;
            }
            const dbUser = userRes.rows[0];
            if (dbUser.status !== 'active') {
                res.status(401).json({ error: 'Account is deactivated' });
                return;
            }
            // Attach authoritative DB identity
            req.user = {
                id: dbUser.id,
                employee_id: dbUser.employee_id,
                role: dbUser.role,
                name: dbUser.name
            };
            next();
        }
        catch (error) {
            console.error('Authentication DB error:', error);
            res.status(500).json({ error: 'Internal server error during authentication' });
        }
    });
};
exports.authenticateToken = authenticateToken;
exports.authenticate = exports.authenticateToken;
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        if (req.user.role.toLowerCase() !== role.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.adminOnly = (0, exports.requireRole)('admin');
exports.employeeOnly = (0, exports.requireRole)('employee');
const shared = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
    }
    const role = req.user.role.toLowerCase();
    if (role !== 'admin' && role !== 'employee') {
        res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
        return;
    }
    next();
};
exports.shared = shared;
