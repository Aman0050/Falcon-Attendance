exports.up = (pgm) => {
  // 1. payroll_settings
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS payroll_settings (
      id SERIAL PRIMARY KEY,
      calculation_method VARCHAR(50) DEFAULT 'WORKING_DAYS',
      fixed_working_days INTEGER DEFAULT 26,
      weekly_offs VARCHAR(50) DEFAULT '0',
      late_deduction_rule VARCHAR(50) DEFAULT 'THREE_LATE_HALF_DAY',
      pf_enabled BOOLEAN DEFAULT TRUE,
      pf_employee_percent NUMERIC(5,2) DEFAULT 12.00,
      pf_employer_percent NUMERIC(5,2) DEFAULT 12.00,
      pf_wage_ceiling NUMERIC(10,2) DEFAULT 15000.00,
      esic_enabled BOOLEAN DEFAULT TRUE,
      esic_employee_percent NUMERIC(5,2) DEFAULT 0.75,
      esic_employer_percent NUMERIC(5,2) DEFAULT 3.25,
      esic_wage_limit NUMERIC(10,2) DEFAULT 21000.00,
      pt_enabled BOOLEAN DEFAULT TRUE,
      default_pt_amount NUMERIC(10,2) DEFAULT 200.00,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default setting row if not exists
  pgm.sql(`
    INSERT INTO payroll_settings (id) 
    VALUES (1) 
    ON CONFLICT (id) DO NOTHING;
  `);

  // 2. employee_salary_profiles
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS employee_salary_profiles (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      monthly_ctc NUMERIC(12,2) NOT NULL DEFAULT 0,
      basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      hra NUMERIC(12,2) NOT NULL DEFAULT 0,
      da NUMERIC(12,2) NOT NULL DEFAULT 0,
      conveyance_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
      medical_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
      special_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
      pf_applicable BOOLEAN DEFAULT TRUE,
      esic_applicable BOOLEAN DEFAULT FALSE,
      pt_applicable BOOLEAN DEFAULT TRUE,
      tds_percent NUMERIC(5,2) DEFAULT 0.00,
      bank_name VARCHAR(100),
      account_number VARCHAR(100),
      ifsc_code VARCHAR(50),
      pan_number VARCHAR(20),
      uan_number VARCHAR(30),
      esic_number VARCHAR(30),
      effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_salary_profiles_employee ON employee_salary_profiles(employee_id);`);

  // 3. salary_revisions
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS salary_revisions (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      previous_ctc NUMERIC(12,2) NOT NULL,
      new_ctc NUMERIC(12,2) NOT NULL,
      effective_date DATE NOT NULL,
      reason TEXT,
      revised_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_salary_revisions_employee ON salary_revisions(employee_id);`);

  // 4. payroll_cycles
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS payroll_cycles (
      id SERIAL PRIMARY KEY,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      calculation_method VARCHAR(50) NOT NULL,
      total_working_days NUMERIC(5,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'DRAFT',
      total_gross_pay NUMERIC(14,2) DEFAULT 0,
      total_deductions NUMERIC(14,2) DEFAULT 0,
      total_net_pay NUMERIC(14,2) DEFAULT 0,
      finalized_at TIMESTAMP WITH TIME ZONE,
      finalized_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_cycle_month_year UNIQUE (month, year)
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_payroll_cycles_year_month ON payroll_cycles(year, month);`);

  // 5. payroll_items
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS payroll_items (
      id SERIAL PRIMARY KEY,
      cycle_id INTEGER NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      base_monthly_salary NUMERIC(12,2) NOT NULL,
      daily_rate NUMERIC(12,2) NOT NULL,
      total_days INTEGER NOT NULL,
      working_days NUMERIC(5,2) NOT NULL,
      present_days NUMERIC(5,2) NOT NULL DEFAULT 0,
      paid_leave_days NUMERIC(5,2) NOT NULL DEFAULT 0,
      lwp_days NUMERIC(5,2) NOT NULL DEFAULT 0,
      half_days NUMERIC(5,2) NOT NULL DEFAULT 0,
      late_days INTEGER NOT NULL DEFAULT 0,
      late_deduction_days NUMERIC(5,2) NOT NULL DEFAULT 0,
      payable_days NUMERIC(5,2) NOT NULL DEFAULT 0,
      earned_basic NUMERIC(12,2) NOT NULL DEFAULT 0,
      earned_hra NUMERIC(12,2) NOT NULL DEFAULT 0,
      earned_da NUMERIC(12,2) NOT NULL DEFAULT 0,
      earned_conveyance NUMERIC(12,2) NOT NULL DEFAULT 0,
      earned_medical NUMERIC(12,2) NOT NULL DEFAULT 0,
      earned_special NUMERIC(12,2) NOT NULL DEFAULT 0,
      bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
      incentive NUMERIC(12,2) NOT NULL DEFAULT 0,
      overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
      gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
      pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
      esic_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
      pt_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
      tds_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
      advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
      other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
      net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      salary_slip_url VARCHAR(500),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_cycle_emp UNIQUE (cycle_id, employee_id)
    );
  `);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_payroll_items_cycle ON payroll_items(cycle_id);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(employee_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS payroll_items;`);
  pgm.sql(`DROP TABLE IF EXISTS payroll_cycles;`);
  pgm.sql(`DROP TABLE IF EXISTS salary_revisions;`);
  pgm.sql(`DROP TABLE IF EXISTS employee_salary_profiles;`);
  pgm.sql(`DROP TABLE IF EXISTS payroll_settings;`);
};
