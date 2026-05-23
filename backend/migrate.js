require('dotenv').config();
const db = require('./src/config/db');

async function run() {
  try {
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;");
    console.log("Migration successful");
  } catch (e) {
    console.error("Migration failed", e);
  } finally {
    process.exit(0);
  }
}
run();
