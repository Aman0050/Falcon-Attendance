"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLocation = void 0;
const db_1 = require("../db");
const MAX_ACCURACY = parseInt(process.env.MAX_LOCATION_ACCURACY_METERS || '100', 10);
const verifyLocation = async (latitude, longitude, accuracy) => {
    if (accuracy > MAX_ACCURACY) {
        throw {
            status: 400,
            code: 'LOCATION_ACCURACY_TOO_LOW',
            message: 'GPS accuracy is too low. Please move to an area with better GPS signal and try again.',
        };
    }
    const officeResult = await (0, db_1.query)(`
    SELECT 
      id, 
      name,
      radius_meters,
      ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS distance_meters
    FROM offices 
    WHERE status = 'active' 
    LIMIT 1
  `, [longitude, latitude]);
    if (officeResult.rows.length === 0) {
        throw {
            status: 404,
            code: 'OFFICE_NOT_CONFIGURED',
            message: 'No active office location is configured.',
        };
    }
    const office = officeResult.rows[0];
    const distanceMeters = parseFloat(office.distance_meters);
    const insideOffice = distanceMeters <= office.radius_meters;
    return {
        insideOffice,
        distanceMeters: Math.round(distanceMeters * 10) / 10,
        allowedRadiusMeters: office.radius_meters,
        accuracyMeters: Math.round(accuracy),
        officeId: office.id,
        officeName: office.name || 'Falcon Info Solutions HQ'
    };
};
exports.verifyLocation = verifyLocation;
