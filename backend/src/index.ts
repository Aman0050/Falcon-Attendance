import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import locationRoutes from './routes/locationRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import adminRoutes from './routes/adminRoutes';
import leaveRoutes from './routes/leaveRoutes';
import profileRoutes from './routes/profileRoutes';
import notificationRoutes from './routes/notificationRoutes';
import employeeRoutes from './routes/employeeRoutes';
import payrollRoutes from './routes/payrollRoutes';
import { startScheduler } from './services/schedulerService';

import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : '*',
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/attendance/location', locationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/payroll', payrollRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/employee', employeeRoutes);

startScheduler();

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Falcon Office Backend is running' });
});

app.listen(port as number, '0.0.0.0', () => {
  console.log(`Server is running on port ${port} (0.0.0.0)`);
});
