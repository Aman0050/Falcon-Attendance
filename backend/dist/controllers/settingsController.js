"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHoliday = exports.addHoliday = exports.getHolidays = exports.updateSettings = exports.getSettings = void 0;
const db_1 = require("../db");
const zod_1 = require("zod");
const settingsSchema = zod_1.z.object({
    officeStart: zod_1.z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
    officeEnd: zod_1.z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
    lateThreshold: zod_1.z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
    absenceCutoff: zod_1.z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
    halfDayMinutes: zod_1.z.number().positive().optional(),
    fullDayMinutes: zod_1.z.number().positive().optional(),
    checkoutReminderTime: zod_1.z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
});
const holidaySchema = zod_1.z.object({
    holidayDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: zod_1.z.string().min(1),
    isActive: zod_1.z.boolean().optional(),
});
const getSettings = async (req, res) => {
    try {
        const setRes = await (0, db_1.query)('SELECT * FROM attendance_settings WHERE id = 1');
        res.json({ success: true, data: setRes.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Server error' } });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const parsed = settingsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { message: 'Invalid data format' } });
            return;
        }
        const d = parsed.data;
        let q = 'UPDATE attendance_settings SET updated_at = CURRENT_TIMESTAMP';
        const params = [];
        const push = (col, val) => {
            if (val !== undefined) {
                params.push(val);
                q += `, ${col} = $${params.length}`;
            }
        };
        push('office_start', d.officeStart);
        push('office_end', d.officeEnd);
        push('late_threshold', d.lateThreshold);
        push('absence_cutoff', d.absenceCutoff);
        push('half_day_minutes', d.halfDayMinutes);
        push('full_day_minutes', d.fullDayMinutes);
        push('checkout_reminder_time', d.checkoutReminderTime);
        if (params.length === 0) {
            res.status(400).json({ success: false, error: { message: 'No fields provided' } });
            return;
        }
        q += ` WHERE id = 1`;
        await (0, db_1.query)(q, params);
        res.json({ success: true, message: 'Settings updated' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Server error' } });
    }
};
exports.updateSettings = updateSettings;
const getHolidays = async (req, res) => {
    try {
        const holRes = await (0, db_1.query)('SELECT id, holiday_date as "holidayDate", name, is_active as "isActive" FROM holidays ORDER BY holiday_date DESC');
        res.json({ success: true, data: holRes.rows.map(r => ({ ...r, holidayDate: new Date(r.holidayDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })) });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Server error' } });
    }
};
exports.getHolidays = getHolidays;
const addHoliday = async (req, res) => {
    try {
        const parsed = holidaySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { message: 'Invalid data format' } });
            return;
        }
        const { holidayDate, name, isActive } = parsed.data;
        await (0, db_1.query)(`
      INSERT INTO holidays (holiday_date, name, is_active) 
      VALUES ($1, $2, COALESCE($3, true))
    `, [holidayDate, name, isActive]);
        res.json({ success: true, message: 'Holiday added' });
    }
    catch (error) {
        if (error.code === '23505')
            res.status(400).json({ success: false, error: { message: 'Holiday already exists on this date' } });
        else
            res.status(500).json({ success: false, error: { message: 'Server error' } });
    }
};
exports.addHoliday = addHoliday;
const deleteHoliday = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await (0, db_1.query)('DELETE FROM holidays WHERE id = $1', [id]);
        res.json({ success: true, message: 'Holiday deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Server error' } });
    }
};
exports.deleteHoliday = deleteHoliday;
