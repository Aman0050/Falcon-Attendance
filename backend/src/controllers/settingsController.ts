import { Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../middlewares/auth';
import { z } from 'zod';

const settingsSchema = z.object({
  officeStart: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  officeEnd: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  lateThreshold: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  absenceCutoff: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  halfDayMinutes: z.number().positive().optional(),
  fullDayMinutes: z.number().positive().optional(),
  checkoutReminderTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
});

const holidaySchema = z.object({
  holidayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const setRes = await query('SELECT * FROM attendance_settings WHERE id = 1');
    res.json({ success: true, data: setRes.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: 'Invalid data format' } });
      return;
    }
    const d = parsed.data;

    let q = 'UPDATE attendance_settings SET updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [];
    const push = (col: string, val: any) => {
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
    await query(q, params);
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

export const getHolidays = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const holRes = await query('SELECT id, holiday_date as "holidayDate", name, is_active as "isActive" FROM holidays ORDER BY holiday_date DESC');
    res.json({ success: true, data: holRes.rows.map(r => ({ ...r, holidayDate: new Date(r.holidayDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

export const addHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = holidaySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { message: 'Invalid data format' } });
      return;
    }
    const { holidayDate, name, isActive } = parsed.data;
    await query(`
      INSERT INTO holidays (holiday_date, name, is_active) 
      VALUES ($1, $2, COALESCE($3, true))
    `, [holidayDate, name, isActive]);
    res.json({ success: true, message: 'Holiday added' });
  } catch (error: any) {
    if (error.code === '23505') res.status(400).json({ success: false, error: { message: 'Holiday already exists on this date' } });
    else res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

export const deleteHoliday = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await query('DELETE FROM holidays WHERE id = $1', [id]);
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};
