import { query } from '../src/db';
import dotenv from 'dotenv';
dotenv.config();

const lat = 28.623160334128848;
const lng = 77.37884342920898;

const run = async () => {
  await query(`
    UPDATE offices 
    SET latitude=$1, longitude=$2, location=ST_SetSRID(ST_MakePoint($3, $4), 4326) 
    WHERE name = $5
  `, [lat, lng, lng, lat, 'Falcon Info Solutions HQ']);
  console.log('Database coordinates updated.');
  process.exit(0);
};

run();
