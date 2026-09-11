require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database for migration...');

    await client.query(`
      ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS job_status VARCHAR(20) DEFAULT 'Permanent',
        ADD COLUMN IF NOT EXISTS provisional_start_date DATE,
        ADD COLUMN IF NOT EXISTS provisional_end_date DATE;
    `);

    // Add CHECK constraint if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_job_status_check'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_job_status_check CHECK (job_status IN ('Provisional', 'Permanent'));
        END IF;
      END $$;
    `);

    // Set any existing NULLs to 'Permanent'
    await client.query(`
      UPDATE users SET job_status = 'Permanent' WHERE job_status IS NULL;
    `);

    console.log('Migration completed successfully: job_status, provisional_start_date, provisional_end_date added.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
