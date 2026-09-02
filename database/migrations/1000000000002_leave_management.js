exports.up = (pgm) => {
  // Drop the old unused leaves table
  pgm.sql(`DROP TABLE IF EXISTS leaves;`);

  // 1. leave_types
  pgm.sql(`
    CREATE TABLE leave_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      code VARCHAR(20) UNIQUE NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default types
  pgm.sql(`
    INSERT INTO leave_types (name, code, description) VALUES
    ('Casual Leave', 'CASUAL', 'For personal reasons and unexpected events.'),
    ('Sick Leave', 'SICK', 'For medical reasons and health recovery.'),
    ('Earned Leave', 'EARNED', 'Planned vacation time.')
  `);

  // 2. leave_balances
  pgm.sql(`
    CREATE TABLE leave_balances (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      allocated_days INTEGER DEFAULT 0,
      used_days INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_emp_leave_year UNIQUE (employee_id, leave_type_id, year)
    );
  `);

  // 3. leave_requests
  pgm.sql(`
    CREATE TABLE leave_requests (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT,
      status VARCHAR(20) DEFAULT 'PENDING',
      admin_comment TEXT,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indexes
  pgm.sql(`CREATE INDEX idx_lr_employee_start ON leave_requests(employee_id, start_date);`);
  pgm.sql(`CREATE INDEX idx_lr_employee_status ON leave_requests(employee_id, status);`);
  pgm.sql(`CREATE INDEX idx_lr_status_start ON leave_requests(status, start_date);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS leave_requests;`);
  pgm.sql(`DROP TABLE IF EXISTS leave_balances;`);
  pgm.sql(`DROP TABLE IF EXISTS leave_types;`);
};
