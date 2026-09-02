exports.up = (pgm) => {
  pgm.addColumns('users', {
    department: { type: 'varchar(100)' },
    designation: { type: 'varchar(100)' },
    joining_date: { type: 'date' },
    profile_photo_url: { type: 'text' },
  });

  pgm.sql(`CREATE INDEX idx_users_department ON users(department);`);
  pgm.sql(`CREATE INDEX idx_users_role ON users(role);`);
  pgm.sql(`CREATE INDEX idx_users_status ON users(status);`);
};

exports.down = (pgm) => {
  pgm.dropIndex('users', 'idx_users_status', { ifExists: true });
  pgm.dropIndex('users', 'idx_users_role', { ifExists: true });
  pgm.dropIndex('users', 'idx_users_department', { ifExists: true });
  
  pgm.dropColumns('users', ['department', 'designation', 'joining_date', 'profile_photo_url']);
};
