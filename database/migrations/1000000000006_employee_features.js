exports.up = (pgm) => {
  // 1. salary_slips
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS salary_slips (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      file_url VARCHAR(500),
      generated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_emp_month_year UNIQUE (employee_id, month, year)
    );
  `);

  // 2. Alter existing notifications table to add title
  pgm.sql(`
    ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS title VARCHAR(255);
  `);

  // Indexes
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_salary_slips_employee ON salary_slips(employee_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE notifications DROP COLUMN IF EXISTS title;`);
  pgm.sql(`DROP TABLE IF EXISTS salary_slips;`);
};
