require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();

  const holidays = [
    { date: '2026-01-01', name: 'New Year' },
    { date: '2026-01-26', name: 'India Republic Day' },
    { date: '2026-03-04', name: 'Holi' },
    { date: '2026-03-20', name: 'Eid al-Fitr' },
    { date: '2026-08-15', name: 'Independence Day' },
    { date: '2026-08-28', name: 'Raksha Bandhan' },
    { date: '2026-09-04', name: 'Janmashtami' },
    { date: '2026-10-02', name: 'Gandhi Jayanti' },
    { date: '2026-10-20', name: 'Dussehra' },
    { date: '2026-11-07', name: 'Diwali' }
  ];

  console.log("Seeding holidays for 2026...");
  
  for (const hol of holidays) {
    try {
      await client.query(
        "INSERT INTO holidays (holiday_date, name) VALUES ($1, $2) ON CONFLICT (holiday_date) DO NOTHING",
        [hol.date, hol.name]
      );
      console.log(`Seeded ${hol.name} on ${hol.date}`);
    } catch (err) {
      console.error(`Failed to seed ${hol.name}:`, err);
    }
  }

  console.log("Holidays seeded successfully.");
  await client.end();
}

run();
