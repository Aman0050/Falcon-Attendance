exports.up = (pgm) => {
  // Drop old leave_requests and leave_balances if they exist from migration 2
  pgm.sql(`DROP TABLE IF EXISTS leave_requests;`);
  pgm.sql(`DROP TABLE IF EXISTS leave_balances;`);
  pgm.sql(`DROP TABLE IF EXISTS leave_types;`);
  
  // 1. leave_policy
  pgm.sql(`
    CREATE TABLE leave_policy (
      id SERIAL PRIMARY KEY,
      annual_leave NUMERIC(5, 2) NOT NULL DEFAULT 18,
      quarterly_leave NUMERIC(5, 2) NOT NULL DEFAULT 4.5,
      probation_months INTEGER NOT NULL DEFAULT 6,
      carry_forward BOOLEAN DEFAULT false,
      max_carry_forward NUMERIC(5, 2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  pgm.sql(`INSERT INTO leave_policy (annual_leave, quarterly_leave, probation_months, carry_forward, max_carry_forward) VALUES (18, 4.5, 6, false, 0);`);

  // 2. leave_balances
  pgm.sql(`
    CREATE TABLE leave_balances (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      accrued_leave NUMERIC(5, 2) DEFAULT 0,
      used_paid_leave NUMERIC(5, 2) DEFAULT 0,
      leave_without_pay NUMERIC(5, 2) DEFAULT 0,
      current_balance NUMERIC(5, 2) DEFAULT 0,
      last_credit_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_emp_year UNIQUE (employee_id, year)
    );
  `);

  // 3. leave_requests
  pgm.sql(`
    CREATE TABLE leave_requests (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      days NUMERIC(5, 2) NOT NULL,
      reason TEXT,
      leave_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP WITH TIME ZONE,
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Indexes
  pgm.sql(`CREATE INDEX idx_lr_employee_date ON leave_requests(employee_id, from_date);`);
  pgm.sql(`CREATE INDEX idx_lr_status ON leave_requests(status);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS leave_requests;`);
  pgm.sql(`DROP TABLE IF EXISTS leave_balances;`);
  pgm.sql(`DROP TABLE IF EXISTS leave_policy;`);
};
