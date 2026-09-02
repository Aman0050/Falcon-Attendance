import { query } from '../src/db';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    await query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT unique_employee_date UNIQUE (employee_id, attendance_date);
    `);
    console.log('Constraint added successfully.');
  } catch (e: any) {
    console.log('Constraint already exists or error:', e.message);
  }
  process.exit(0);
};

run();
