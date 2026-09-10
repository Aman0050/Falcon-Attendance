exports.up = (pgm) => {
  // 1. Add additive columns to notifications table
  pgm.sql(`
    ALTER TABLE notifications 
      ALTER COLUMN attendance_date DROP NOT NULL;
  `);

  pgm.sql(`
    ALTER TABLE notifications 
      DROP CONSTRAINT IF EXISTS unique_emp_type_date;
  `);

  pgm.sql(`
    ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS recipient_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee',
      ADD COLUMN IF NOT EXISTS title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Medium',
      ADD COLUMN IF NOT EXISTS action_url TEXT,
      ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
  `);

  // Backfill existing rows
  pgm.sql(`
    UPDATE notifications 
    SET recipient_user_id = employee_id 
    WHERE recipient_user_id IS NULL AND employee_id IS NOT NULL;
  `);

  pgm.sql(`
    UPDATE notifications 
    SET is_read = (read_at IS NOT NULL)
    WHERE is_read IS FALSE AND read_at IS NOT NULL;
  `);

  pgm.sql(`
    UPDATE notifications 
    SET created_at = sent_at 
    WHERE created_at IS NULL AND sent_at IS NOT NULL;
  `);

  // Indexes for high performance
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read, created_at DESC);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(role, created_at DESC);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at);`);

  // 2. Notification Preferences table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      attendance_notifications BOOLEAN DEFAULT TRUE,
      leave_notifications BOOLEAN DEFAULT TRUE,
      payroll_notifications BOOLEAN DEFAULT TRUE,
      announcement_notifications BOOLEAN DEFAULT TRUE,
      push_notifications BOOLEAN DEFAULT TRUE,
      email_notifications BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id);`);

  // 3. Device Push Tokens table
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS device_push_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      push_token TEXT NOT NULL,
      platform VARCHAR(20) DEFAULT 'expo',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_token UNIQUE (user_id, push_token)
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON device_push_tokens(user_id);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS device_push_tokens;`);
  pgm.sql(`DROP TABLE IF EXISTS notification_preferences;`);
  pgm.sql(`
    ALTER TABLE notifications
      DROP COLUMN IF EXISTS recipient_user_id,
      DROP COLUMN IF EXISTS sender_user_id,
      DROP COLUMN IF EXISTS role,
      DROP COLUMN IF EXISTS priority,
      DROP COLUMN IF EXISTS action_url,
      DROP COLUMN IF EXISTS icon,
      DROP COLUMN IF EXISTS is_read,
      DROP COLUMN IF EXISTS created_at,
      DROP COLUMN IF EXISTS updated_at,
      DROP COLUMN IF EXISTS deleted_at;
  `);
};
