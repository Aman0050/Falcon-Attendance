import { query } from '../src/db';
import dotenv from 'dotenv';

dotenv.config();

const seedOffice = async () => {
  try {
    const lat = 28.623160334128848;
    const lng = 77.37884342920898;

    await query(`
      INSERT INTO offices (name, latitude, longitude, location, radius_meters, status)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7)
    `, ['Falcon Info Solutions HQ', lat, lng, lng, lat, 100, 'active']);

    console.log('Office seeded successfully with real Falcon coordinates!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding office:', error);
    process.exit(1);
  }
};

seedOffice();
