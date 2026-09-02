require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  const bcrypt = require('bcrypt');
  
  const res = await client.query("SELECT email, employee_id FROM users WHERE role = 'admin' LIMIT 1");
  if (res.rows.length > 0) {
    console.log("Admin exists:", res.rows[0]);
  } else {
    console.log("No admin found. Creating one...");
    const hashed = await bcrypt.hash('admin123', 10);
    
    // Check if email exists
    const emailRes = await client.query("SELECT id FROM users WHERE email = 'admin@falcon.com'");
    if (emailRes.rows.length > 0) {
      await client.query("UPDATE users SET role = 'admin', password_hash = $1 WHERE email = 'admin@falcon.com'", [hashed]);
      console.log("Existing user updated to admin: admin@falcon.com / admin123");
    } else {
      await client.query(`
        INSERT INTO users (employee_id, name, email, password_hash, role, status)
        VALUES ('ADMIN01', 'System Admin', 'admin@falcon.com', $1, 'admin', 'active')
      `, [hashed]);
      console.log("Admin created: admin@falcon.com / admin123");
    }
  }
  await client.end();
}
run();
