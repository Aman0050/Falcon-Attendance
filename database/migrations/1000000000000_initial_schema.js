exports.up = (pgm) => {
  // Enable PostGIS extension
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS postgis;`);

  // 1. users
  pgm.sql(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'employee',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. offices
  pgm.sql(`
    CREATE TABLE offices (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      location GEOGRAPHY(Point, 4326) NOT NULL,
      radius_meters INTEGER NOT NULL DEFAULT 100,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. attendance
  pgm.sql(`
    CREATE TABLE attendance (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      office_id INTEGER NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      check_in TIMESTAMP WITH TIME ZONE NOT NULL,
      check_out TIMESTAMP WITH TIME ZONE,
      check_in_location GEOGRAPHY(Point, 4326),
      check_out_location GEOGRAPHY(Point, 4326),
      status VARCHAR(20) DEFAULT 'present',
      working_minutes INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_employee_date UNIQUE (employee_id, attendance_date)
    );
  `);

  // Add indexes for attendance
  pgm.sql(`CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);`);
  pgm.sql(`CREATE INDEX idx_attendance_date ON attendance(attendance_date);`);

  // 4. leaves
  pgm.sql(`
    CREATE TABLE leaves (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      reason TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. audit_logs
  pgm.sql(`
    CREATE TABLE audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INTEGER,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS audit_logs;`);
  pgm.sql(`DROP TABLE IF EXISTS leaves;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_attendance_date;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_attendance_employee_id;`);
  pgm.sql(`DROP TABLE IF EXISTS attendance;`);
  pgm.sql(`DROP TABLE IF EXISTS offices;`);
  pgm.sql(`DROP TABLE IF EXISTS users;`);
  // Optional: Do not drop PostGIS extension in down migration, as other apps might use it
};
