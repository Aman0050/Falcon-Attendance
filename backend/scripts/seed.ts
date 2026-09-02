import bcrypt from 'bcrypt';
import { query } from '../src/db';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('🔴 PRODUCTION BLOCKER: Default seed credentials cannot be executed in production environments.');
    process.exit(1);
  }

  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const employeePassword = await bcrypt.hash('employee123', 10);

    // Insert Admin
    await query(`
      INSERT INTO users (employee_id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['ADMIN001', 'Admin User', 'admin@falcon.com', adminPassword, 'ADMIN']);

    // Insert Employee
    await query(`
      INSERT INTO users (employee_id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['EMP001', 'Employee User', 'employee@falcon.com', employeePassword, 'EMPLOYEE']);

    console.log('Database seeded successfully with test users!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();
