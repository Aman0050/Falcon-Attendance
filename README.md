# Falcon Office

Falcon Office is an internal employee attendance monorepo application.

## GPS-Based Office Location Verification

The system verifies employee location by enforcing GPS checks on the mobile device and validating the coordinates against the backend database using PostGIS.

### How it works
1. The **Mobile App** requests foreground location permission using `expo-location`.
2. It fetches the device's current latitude, longitude, and accuracy.
3. The app sends these coordinates to the backend endpoint `POST /api/attendance/location/validate`.
4. The **Backend** receives the coordinates, verifies that the accuracy is acceptable (e.g., under 100 metres), and retrieves the active office from the PostgreSQL database.
5. PostGIS calculates the actual physical distance (in metres) using `ST_Distance`.
6. If `distance <= radius_meters`, the backend responds that the employee is inside the office.
7. The mobile UI updates accordingly, unlocking the Check-In button if inside.

### Required Environment Variables

**Backend (`backend/.env`)**
```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret_here
MAX_LOCATION_ACCURACY_METERS=100
```

### How to configure office coordinates
Currently, a temporary office at New Delhi has been seeded. **You MUST replace these with the real Falcon Info Solutions coordinates before production.**

1. Connect to the Supabase database.
2. Open the `offices` table.
3. Edit the `latitude`, `longitude`, `location` (PostGIS point), and `radius_meters`.
4. Alternatively, use SQL:
```sql
UPDATE offices 
SET 
  latitude = YOUR_LAT, 
  longitude = YOUR_LNG, 
  location = ST_SetSRID(ST_MakePoint(YOUR_LNG, YOUR_LAT), 4326),
  radius_meters = 100 
WHERE id = 1;
```

### How to enable PostGIS
PostGIS was enabled in the initial database migration. If you deploy a new database, run:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### How to run backend
```bash
cd backend
npm install
npm run dev
```

### How to run mobile
```bash
cd mobile
npm install
npm start
# Then press 'a' to open on Android or 'i' to open on iOS
```

### How to test GPS on a physical Android device
1. Connect your Android device via USB or use the Expo Go app.
2. Ensure Location Services are turned ON in the phone's quick settings.
3. Open the Falcon Office app.
4. Navigate to the **GPS Test** tab at the bottom to view raw GPS data and server validation responses.
5. In the **Home** tab, observe the "OFFICE STATUS" card auto-updating.

### API Documentation

**`POST /api/attendance/location/validate`**
- **Auth**: Requires Bearer JWT
- **Body**: 
  ```json
  { "latitude": 28.6139, "longitude": 77.2090, "accuracy": 10 }
  ```
- **Response (Success)**:
  ```json
  {
    "success": true,
    "data": {
      "insideOffice": true,
      "distanceMeters": 0,
      "allowedRadiusMeters": 100,
      "accuracyMeters": 10
    }
  }
  ```

### Known Limitations
- The system currently prevents spoofing merely by server-side evaluation and accuracy bounds. Rooted devices using Mock Location apps may still bypass this until we implement Android mock-location detection in a later step.
