import { validateLocationWithServer } from '../../mobile/src/api/locationApi'; // We'll just mock this via fetch
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const mockToken = jwt.sign({ id: 2, employee_id: 'EMP001', role: 'EMPLOYEE' }, JWT_SECRET);

const runTests = async () => {
  console.log('--- Running Location Validation Tests ---');
  
  const validate = async (lat: number, lng: number, acc: number) => {
    const response = await fetch('http://localhost:3000/api/attendance/location/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mockToken}` },
      body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc })
    });
    return response.json();
  };

  // Test 1: Inside office (Exact matches Noida coords)
  console.log('\nTest 1 - Inside office (Exact matches Noida coords)');
  let res = await validate(28.62315327393985, 77.37886940106566, 10);
  console.log(res);

  // Test 2: Outside office (Mumbai coordinates)
  console.log('\nTest 2 - Outside office');
  res = await validate(19.0760, 72.8777, 10);
  console.log(res);

  // Test 3: Boundary (slightly off)
  console.log('\nTest 3 - Boundary');
  res = await validate(28.6145, 77.2090, 10);
  console.log(res);

  // Test 4: Invalid latitude
  console.log('\nTest 4 - Invalid latitude (120)');
  res = await validate(120, 77.2090, 10);
  console.log(res);

  // Test 5: Invalid longitude
  console.log('\nTest 5 - Invalid longitude (200)');
  res = await validate(28.6139, 200, 10);
  console.log(res);

  // Test 7: Poor accuracy
  console.log('\nTest 7 - Poor accuracy (500)');
  res = await validate(28.6139, 77.2090, 500);
  console.log(res);

  // Test 8: No authentication
  console.log('\nTest 8 - No authentication');
  const unauthResponse = await fetch('http://localhost:3000/api/attendance/location/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: 28.6139, longitude: 77.2090, accuracy: 10 })
  });
  console.log(await unauthResponse.json());
};

runTests();
