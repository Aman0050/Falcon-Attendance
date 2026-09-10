"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendar = exports.getSummary = exports.getHistory = exports.getToday = exports.checkOut = exports.checkIn = void 0;
const zod_1 = require("zod");
const db_1 = require("../db");
const locationService_1 = require("../services/locationService");
const notificationService_1 = require("../services/notificationService");
const attendanceStatusService_1 = require("../services/attendanceStatusService");
const coordsSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    accuracy: zod_1.z.number().positive(),
});
const checkIn = async (req, res) => {
    try {
        const parsed = coordsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'INVALID_COORDINATES', message: 'Invalid latitude, longitude, or accuracy.' } });
            return;
        }
        const { latitude, longitude, accuracy } = parsed.data;
        const employeeId = req.user.id;
        // 1. Verify location
        let locResult;
        try {
            locResult = await (0, locationService_1.verifyLocation)(latitude, longitude, accuracy);
        }
        catch (verr) {
            if (verr.status) {
                res.status(verr.status).json({ success: false, error: { code: verr.code, message: verr.message } });
                return;
            }
            throw verr;
        }
        if (!locResult.insideOffice) {
            res.status(403).json({
                success: false,
                error: { code: 'OUTSIDE_OFFICE', message: 'You must be at the Falcon Info Solutions office to mark attendance.' },
                data: { distanceMeters: locResult.distanceMeters, allowedRadiusMeters: locResult.allowedRadiusMeters }
            });
            return;
        }
        // 2. Check if already checked in today
        // We enforce timezone at DB or server level. Using CURRENT_DATE in postgres (depends on DB timezone).
        // Let's explicitly use server date for check.
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const existRes = await (0, db_1.query)(`SELECT id, check_in FROM attendance WHERE employee_id = $1 AND attendance_date = $2`, [employeeId, today]);
        if (existRes.rows.length > 0 && existRes.rows[0].check_in !== null) {
            res.status(400).json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: 'You have already checked in today.' } });
            return;
        }
        let newRecord;
        if (existRes.rows.length > 0) {
            // Record was auto-created by absence scheduler (check_in is NULL) -> update it!
            const updateRes = await (0, db_1.query)(`
        UPDATE attendance 
        SET office_id = $1, 
            check_in = CURRENT_TIMESTAMP, 
            check_in_location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
            status = 'PRESENT'
        WHERE id = $4
        RETURNING id, attendance_date, check_in, status
      `, [locResult.officeId, longitude, latitude, existRes.rows[0].id]);
            newRecord = updateRes.rows[0];
        }
        else {
            // 3. Create attendance
            const insertRes = await (0, db_1.query)(`
        INSERT INTO attendance (
          employee_id, office_id, attendance_date, check_in, check_out, check_in_location, status
        ) VALUES (
          $1, $2, $3, CURRENT_TIMESTAMP, NULL, ST_SetSRID(ST_MakePoint($4, $5), 4326), 'PRESENT'
        ) RETURNING id, attendance_date, check_in, status
      `, [employeeId, locResult.officeId, today, longitude, latitude]);
            newRecord = insertRes.rows[0];
        }
        // Trigger Smart Notifications
        try {
            const settings = await (0, attendanceStatusService_1.getAttendanceSettings)();
            const timeStr = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
            const isLate = settings && settings.late_threshold && timeStr > settings.late_threshold;
            if (isLate) {
                await notificationService_1.NotificationService.notifyUser(employeeId, {
                    title: 'Late Check-In',
                    message: `You marked attendance at ${timeStr}, which is past the late threshold (${settings.late_threshold}).`,
                    type: 'Attendance',
                    priority: 'High',
                    actionUrl: '/my-attendance',
                    attendanceDate: today,
                });
                await notificationService_1.NotificationService.notifyAdmins({
                    title: 'Employee Checked In Late',
                    message: `${req.user.name || 'An employee'} checked in late today at ${timeStr}.`,
                    type: 'Attendance',
                    priority: 'Medium',
                    actionUrl: '/attendance',
                    attendanceDate: today,
                });
            }
            else {
                await notificationService_1.NotificationService.notifyUser(employeeId, {
                    title: 'Check-In Confirmed',
                    message: `Your check-in was verified successfully at ${timeStr}.`,
                    type: 'Attendance',
                    priority: 'Low',
                    actionUrl: '/my-attendance',
                    attendanceDate: today,
                });
            }
        }
        catch (e) {
            console.error('Check-in notification error:', e);
        }
        res.json({
            success: true,
            data: {
                attendanceId: newRecord.id,
                attendanceDate: newRecord.attendance_date,
                checkIn: newRecord.check_in,
                status: newRecord.status
            }
        });
    }
    catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred during check-in.' } });
    }
};
exports.checkIn = checkIn;
const checkOut = async (req, res) => {
    try {
        const parsed = coordsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { code: 'INVALID_COORDINATES', message: 'Invalid latitude, longitude, or accuracy.' } });
            return;
        }
        const { latitude, longitude, accuracy } = parsed.data;
        const employeeId = req.user.id;
        // 1. Verify location
        let locResult;
        try {
            locResult = await (0, locationService_1.verifyLocation)(latitude, longitude, accuracy);
        }
        catch (verr) {
            if (verr.status) {
                res.status(verr.status).json({ success: false, error: { code: verr.code, message: verr.message } });
                return;
            }
            throw verr;
        }
        if (!locResult.insideOffice) {
            res.status(403).json({
                success: false,
                error: { code: 'OUTSIDE_OFFICE', message: 'You must be at the Falcon Info Solutions office to mark attendance.' },
                data: { distanceMeters: locResult.distanceMeters, allowedRadiusMeters: locResult.allowedRadiusMeters }
            });
            return;
        }
        // 2. Find today's attendance
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const existRes = await (0, db_1.query)(`SELECT id, check_in, check_out FROM attendance WHERE employee_id = $1 AND attendance_date = $2`, [employeeId, today]);
        if (existRes.rows.length === 0 || !existRes.rows[0].check_in) {
            res.status(400).json({ success: false, error: { code: 'NOT_CHECKED_IN', message: 'You have not checked in today.' } });
            return;
        }
        const attendance = existRes.rows[0];
        if (attendance.check_out) {
            res.status(400).json({ success: false, error: { code: 'ALREADY_CHECKED_OUT', message: 'You have already checked out today.' } });
            return;
        }
        // 3. Update checkout
        const updateRes = await (0, db_1.query)(`
      UPDATE attendance 
      SET 
        check_out = CURRENT_TIMESTAMP, 
        check_out_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
        working_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - check_in)) / 60
      WHERE id = $3
      RETURNING id, attendance_date, check_in, check_out, working_minutes, status
    `, [longitude, latitude, attendance.id]);
        const updated = updateRes.rows[0];
        // Notification
        try {
            const formatDuration = (mins) => {
                const h = Math.floor(mins / 60);
                const m = Math.floor(mins % 60);
                return `${h}h ${m}m`;
            };
            const checkOutTime = new Date(updated.check_out).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
            await (0, db_1.query)(`
        INSERT INTO notifications (employee_id, type, attendance_date, message)
        VALUES ($1, 'CHECK_OUT', $2, $3)
      `, [employeeId, today, `Checkout completed successfully. Time: ${checkOutTime}, Duration: ${formatDuration(updated.working_minutes)}`]);
        }
        catch (e) {
            if (e.code !== '23505')
                console.error('Checkout notification error:', e);
        }
        res.json({
            success: true,
            data: {
                attendanceId: updated.id,
                attendanceDate: updated.attendance_date,
                checkIn: updated.check_in,
                checkOut: updated.check_out,
                workingMinutes: Math.round(updated.working_minutes),
                status: updated.status
            }
        });
    }
    catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred during check-out.' } });
    }
};
exports.checkOut = checkOut;
const getToday = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const [existRes, setRes, holRes, leaveRes] = await Promise.all([
            (0, db_1.query)(`
        SELECT id, attendance_date, check_in, check_out, working_minutes, status 
        FROM attendance WHERE employee_id = $1 AND attendance_date = $2
      `, [employeeId, today]),
            (0, attendanceStatusService_1.getAttendanceSettings)(),
            (0, db_1.query)('SELECT name FROM holidays WHERE holiday_date = $1 AND is_active = true', [today]),
            (0, db_1.query)(`
        SELECT lr.leave_type, lr.status, lr.days, lr.from_date as start_date, lr.to_date as end_date
        FROM leave_requests lr
        WHERE lr.employee_id = $1 AND lr.status = 'APPROVED' AND lr.from_date <= $2 AND lr.to_date >= $2
        LIMIT 1
      `, [employeeId, today])
        ]);
        const record = existRes.rows[0];
        const holiday = holRes.rows[0];
        const leave = leaveRes.rows[0];
        // Compute absolute state
        const result = (0, attendanceStatusService_1.calculateStatus)(today, record, setRes, holiday, leave, new Date());
        if (result.status === 'NOT_MARKED') {
            res.json({ success: true, data: { attendance: null } });
            return;
        }
        res.json({
            success: true,
            data: {
                attendance: {
                    attendanceId: result.attendanceId,
                    date: today,
                    checkIn: result.checkIn,
                    checkOut: result.checkOut,
                    workingMinutes: Math.round(result.workingMinutes),
                    status: result.status,
                    isLate: result.isLate,
                    holidayName: holiday ? holiday.name : null,
                    leaveType: leave ? leave.leave_type : null
                }
            }
        });
    }
    catch (error) {
        console.error('Get today error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving today attendance.' } });
    }
};
exports.getToday = getToday;
const getHistory = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 20;
        if (limit > 100)
            limit = 100;
        if (limit < 1)
            limit = 1;
        if (page < 1)
            return res.status(400).json({ success: false, error: { code: 'INVALID_PAGE', message: 'Page must be >= 1' } });
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        // Fetch user details for joining date
        const uRes = await (0, db_1.query)('SELECT joining_date, created_at FROM users WHERE id = $1', [employeeId]);
        const startDateRaw = uRes.rows[0].joining_date || uRes.rows[0].created_at;
        const startDate = new Date(startDateRaw).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        let filterYear = !isNaN(year) ? year : null;
        let filterMonth = !isNaN(month) ? month : null;
        // Fetch all related data in parallel
        const [attRes, settings, holRes, leaveRes] = await Promise.all([
            (0, db_1.query)(`SELECT * FROM attendance WHERE employee_id = $1`, [employeeId]),
            (0, attendanceStatusService_1.getAttendanceSettings)(),
            (0, db_1.query)(`SELECT holiday_date FROM holidays WHERE is_active = true`),
            (0, db_1.query)(`SELECT *, from_date as start_date, to_date as end_date FROM leave_requests WHERE employee_id = $1 AND status = 'APPROVED'`, [employeeId])
        ]);
        // Build hash maps for O(1) lookup
        const attMap = new Map(attRes.rows.map(r => [new Date(r.attendance_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), r]));
        const holMap = new Set(holRes.rows.map(r => new Date(r.holiday_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })));
        const leaveMap = new Map();
        for (const lr of leaveRes.rows) {
            const d = new Date(lr.start_date);
            const end = new Date(lr.end_date);
            while (d <= end) {
                leaveMap.set(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), lr);
                d.setDate(d.getDate() + 1);
            }
        }
        // Generate date sequence
        let current = new Date(startDate);
        const endBound = new Date(today);
        let allRecords = [];
        while (current <= endBound) {
            const dStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const cYear = current.getFullYear();
            const cMonth = current.getMonth() + 1;
            if ((!filterYear || cYear === filterYear) && (!filterMonth || cMonth === filterMonth)) {
                const rec = attMap.get(dStr);
                const hol = holMap.has(dStr) ? { holiday_date: dStr } : null;
                const lve = leaveMap.get(dStr);
                const result = (0, attendanceStatusService_1.calculateStatus)(dStr, rec, settings, hol, lve, new Date());
                if (result.status !== 'NOT_MARKED') {
                    allRecords.push({
                        attendanceId: result.attendanceId,
                        date: dStr,
                        checkIn: result.checkIn,
                        checkOut: result.checkOut,
                        workingMinutes: Math.round(result.workingMinutes),
                        status: result.status,
                        isLate: result.isLate
                    });
                }
            }
            current.setDate(current.getDate() + 1);
        }
        // Sort descending
        allRecords.sort((a, b) => b.date.localeCompare(a.date));
        // Paginate
        const total = allRecords.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginated = allRecords.slice(offset, offset + limit);
        res.json({
            success: true,
            data: {
                items: paginated,
                pagination: { page, limit, total, totalPages }
            }
        });
    }
    catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving attendance history.' } });
    }
};
exports.getHistory = getHistory;
const getSummary = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            res.status(400).json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'Valid year and month are required' } });
            return;
        }
        // Date range for the requested month
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const startDate = new Date(startStr);
        const endDate = new Date(year, month, 0); // Last day of month
        // But don't go beyond today or before joining date
        // Explicitly parse current date in Asia/Kolkata
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const today = new Date(todayStr);
        const uRes = await (0, db_1.query)('SELECT joining_date, created_at FROM users WHERE id = $1', [employeeId]);
        const joinDateRaw = uRes.rows[0].joining_date || uRes.rows[0].created_at;
        const joinDateStr = new Date(joinDateRaw).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const joinDate = new Date(joinDateStr);
        const actualStart = startDate < joinDate ? joinDate : startDate;
        const actualEnd = endDate > today ? today : endDate;
        let summary = {
            present: 0,
            halfDays: 0,
            absent: 0,
            onLeave: 0,
            halfDayLeave: 0,
            late: 0,
            checkoutMissing: 0,
            totalWorkingHours: 0,
            totalWorkingDays: 0,
            attendancePercentage: 0
        };
        if (actualStart <= actualEnd) {
            const [attRes, settings, holRes, leaveRes] = await Promise.all([
                (0, db_1.query)(`SELECT * FROM attendance WHERE employee_id = $1`, [employeeId]),
                (0, attendanceStatusService_1.getAttendanceSettings)(),
                (0, db_1.query)(`SELECT holiday_date FROM holidays WHERE is_active = true`),
                (0, db_1.query)(`SELECT *, from_date as start_date, to_date as end_date FROM leave_requests WHERE employee_id = $1 AND status = 'APPROVED'`, [employeeId])
            ]);
            const attMap = new Map(attRes.rows.map(r => [new Date(r.attendance_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), r]));
            const holMap = new Set(holRes.rows.map(r => new Date(r.holiday_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })));
            const leaveMap = new Map();
            for (const lr of leaveRes.rows) {
                const d = new Date(lr.start_date);
                const end = new Date(lr.end_date);
                while (d <= end) {
                    leaveMap.set(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), lr);
                    d.setDate(d.getDate() + 1);
                }
            }
            let current = new Date(actualStart);
            while (current <= actualEnd) {
                const dStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                const rec = attMap.get(dStr);
                const hol = holMap.has(dStr) ? { holiday_date: dStr } : null;
                const lve = leaveMap.get(dStr);
                const result = (0, attendanceStatusService_1.calculateStatus)(dStr, rec, settings, hol, lve, new Date());
                if (result.status === 'PRESENT')
                    summary.present++;
                else if (result.status === 'HALF_DAY')
                    summary.halfDays++;
                else if (result.status === 'ABSENT' || result.status === 'INSUFFICIENT_HOURS')
                    summary.absent++;
                else if (result.status === 'ON_LEAVE')
                    summary.onLeave++;
                else if (result.status === 'HALF_DAY_LEAVE')
                    summary.halfDayLeave++;
                else if (result.status === 'CHECKOUT_MISSING')
                    summary.checkoutMissing++;
                if (result.status !== 'HOLIDAY' && result.status !== 'SUNDAY' && result.status !== 'NOT_MARKED') {
                    summary.totalWorkingDays++;
                }
                if (result.status === 'PRESENT' && result.isLate)
                    summary.late++;
                summary.totalWorkingHours += (result.workingMinutes / 60);
                current.setDate(current.getDate() + 1);
            }
            // Calculate attendance percentage: (Present + (Half Days * 0.5) + (Half Day Leave * 0.5) + Checkout Missing) / (Working Days - Leaves)
            // Actually simpler: (Present + CheckoutMissing + HalfDay/2 + HalfDayLeave/2) / (TotalWorkingDays - FullDayLeaves)
            // The user just requested a logical percentage.
            const attended = summary.present + summary.checkoutMissing + (summary.halfDays * 0.5) + (summary.halfDayLeave * 0.5);
            const required = summary.totalWorkingDays - summary.onLeave;
            if (required > 0) {
                summary.attendancePercentage = Math.round((attended / required) * 100);
            }
            else {
                summary.attendancePercentage = 100; // If no working days required, percentage is 100
            }
        }
        summary.totalWorkingHours = Math.round(summary.totalWorkingHours * 100) / 100;
        res.json({ success: true, data: { summary } });
    }
    catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving attendance summary.' } });
    }
};
exports.getSummary = getSummary;
const getCalendar = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            res.status(400).json({ success: false, error: { code: 'INVALID_PARAMETERS', message: 'Valid year and month are required' } });
            return;
        }
        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const startDate = new Date(startStr);
        const endDate = new Date(year, month, 0);
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const today = new Date(todayStr);
        const actualStart = startDate;
        const actualEnd = endDate;
        let calendar = [];
        const [attRes, settings, holRes, leaveRes] = await Promise.all([
            (0, db_1.query)(`SELECT * FROM attendance WHERE employee_id = $1`, [employeeId]),
            (0, attendanceStatusService_1.getAttendanceSettings)(),
            (0, db_1.query)(`SELECT holiday_date, name FROM holidays WHERE is_active = true`),
            (0, db_1.query)(`
        SELECT *, from_date as start_date, to_date as end_date 
        FROM leave_requests 
        WHERE employee_id = $1 AND status = 'APPROVED'
      `, [employeeId])
        ]);
        const attMap = new Map(attRes.rows.map(r => [new Date(r.attendance_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), r]));
        const holMap = new Map(holRes.rows.map(r => [new Date(r.holiday_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), r]));
        const leaveMap = new Map();
        for (const lr of leaveRes.rows) {
            const d = new Date(lr.start_date);
            const end = new Date(lr.end_date);
            while (d <= end) {
                leaveMap.set(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), lr);
                d.setDate(d.getDate() + 1);
            }
        }
        let current = new Date(actualStart);
        while (current <= actualEnd) {
            const dStr = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            // If the date is strictly in the future, don't generate status.
            if (current > today) {
                calendar.push({
                    date: dStr,
                    status: 'NOT_MARKED',
                    check_in: null,
                    check_out: null,
                    working_minutes: 0,
                    leave_type: null,
                    holiday_name: holMap.has(dStr) ? holMap.get(dStr).name : null,
                    is_sunday: current.getDay() === 0
                });
                current.setDate(current.getDate() + 1);
                continue;
            }
            const rec = attMap.get(dStr);
            const hol = holMap.has(dStr) ? { holiday_date: dStr, name: holMap.get(dStr).name } : null;
            const lve = leaveMap.get(dStr);
            const result = (0, attendanceStatusService_1.calculateStatus)(dStr, rec, settings, hol, lve, new Date());
            calendar.push({
                date: dStr,
                status: result.status,
                check_in: result.checkIn ? result.checkIn.toISOString() : null,
                check_out: result.checkOut ? result.checkOut.toISOString() : null,
                working_minutes: Math.round(result.workingMinutes),
                leave_type: lve ? lve.leave_type : null,
                holiday_name: result.holidayName || null,
                is_sunday: current.getDay() === 0
            });
            current.setDate(current.getDate() + 1);
        }
        res.json({ success: true, data: calendar });
    }
    catch (error) {
        console.error('Get calendar error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving calendar.' } });
    }
};
exports.getCalendar = getCalendar;
