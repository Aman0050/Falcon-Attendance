exports.up = (pgm) => {
  // 1. Attendance Settings
  pgm.sql(`
    CREATE TABLE attendance_settings (
      id SERIAL PRIMARY KEY,
      office_start TIME NOT NULL DEFAULT '10:00:00',
      office_end TIME NOT NULL DEFAULT '18:30:00',
      late_threshold TIME NOT NULL DEFAULT '10:15:00',
      absence_cutoff TIME NOT NULL DEFAULT '11:00:00',
      half_day_minutes INTEGER NOT NULL DEFAULT 240,
      full_day_minutes INTEGER NOT NULL DEFAULT 480,
      checkout_reminder_time TIME NOT NULL DEFAULT '18:45:00',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default row
  pgm.sql(`INSERT INTO attendance_settings (id) VALUES (1);`);

  // 2. Holidays
  pgm.sql(`
    CREATE TABLE holidays (
      id SERIAL PRIMARY KEY,
      holiday_date DATE NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  pgm.sql(`CREATE INDEX idx_holidays_date ON holidays(holiday_date);`);

  // 3. Notifications
  pgm.sql(`
    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      attendance_date DATE NOT NULL,
      message TEXT NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT unique_emp_type_date UNIQUE (employee_id, type, attendance_date)
    );
  `);
  pgm.sql(`CREATE INDEX idx_notifications_employee ON notifications(employee_id);`);

  // 4. Modify Leave Requests
  pgm.addColumns('leave_requests', {
    leave_duration: { type: 'varchar(20)', default: 'FULL_DAY', notNull: true }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('leave_requests', ['leave_duration'], { ifExists: true });
  pgm.sql(`DROP TABLE IF EXISTS notifications;`);
  pgm.sql(`DROP TABLE IF EXISTS holidays;`);
  pgm.sql(`DROP TABLE IF EXISTS attendance_settings;`);
};
