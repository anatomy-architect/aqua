const db = require('./db/database');

async function updatePlan() {
  await db.initDatabase();
  db.prepare("UPDATE plans SET durationDays = 48 WHERE name = 'Deep Current'").run();
  db.prepare("UPDATE investments SET durationDaysSnapshot = 48 WHERE planNameSnapshot = 'Deep Current'").run();
  const updated = db.prepare("SELECT * FROM plans WHERE name = 'Deep Current'").get();
  console.log('✓ Updated Deep Current Plan in DB:', updated);
}

updatePlan().catch(console.error);
