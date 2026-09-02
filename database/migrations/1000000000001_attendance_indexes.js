exports.up = (pgm) => {
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_attendance_status_date ON attendance(status, attendance_date);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_attendance_status_date;`);
};
