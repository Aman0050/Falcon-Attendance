import jwt from 'jsonwebtoken';
import { query } from '../src/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const mockToken = jwt.sign({ id: 2, employee_id: 'EMP001', role: 'EMPLOYEE' }, JWT_SECRET);

const lat = 28.62315327393985;
const lng = 77.37886940106566;

const runTests = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('🔴 PRODUCTION BLOCKER: test_attendance.ts cannot be run against production. It is destructive.');
    process.exit(1);
  }

  console.log('--- Running Attendance Tests ---');
  
  // Clean up today's attendance for the test employee
  // await query(`DELETE FROM attendance WHERE employee_id = 2`);

  const req = async (path: string, body?: any) => {
    const res = await fetch(`http://localhost:3000/api/attendance/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mockToken}` },
      body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
  };

  // Test 2: Check-in outside office
  console.log('\n2. Check-in outside office');
  console.log(await req('check-in', { latitude: 19.0, longitude: 72.8, accuracy: 10 }));

  // Test 3: Invalid lat
  console.log('\n3. Check-in invalid lat');
  console.log(await req('check-in', { latitude: 120, longitude: 77.3, accuracy: 10 }));

  // Test 5: Poor accuracy
  console.log('\n5. Check-in poor accuracy');
  console.log(await req('check-in', { latitude: lat, longitude: lng, accuracy: 500 }));

  // Test 10: Checkout without check-in
  console.log('\n10. Checkout without check-in');
  console.log(await req('check-out', { latitude: lat, longitude: lng, accuracy: 10 }));

  // Test 1: Successful check-in inside office
  console.log('\n1. Successful check-in');
  console.log(await req('check-in', { latitude: lat, longitude: lng, accuracy: 10 }));

  // Test 7: Duplicate check-in
  console.log('\n7. Duplicate check-in');
  console.log(await req('check-in', { latitude: lat, longitude: lng, accuracy: 10 }));

  // Today API
  console.log('\nToday API after check-in');
  console.log(await req('today'));

  // Test 8: Successful check-out
  console.log('\n8. Successful check-out');
  console.log(await req('check-out', { latitude: lat, longitude: lng, accuracy: 10 }));

  // Test 11: Duplicate check-out
  console.log('\n11. Duplicate check-out');
  console.log(await req('check-out', { latitude: lat, longitude: lng, accuracy: 10 }));

  // Today API after checkout
  console.log('\nToday API after checkout');
  console.log(await req('today'));

  process.exit(0);
};

runTests();
