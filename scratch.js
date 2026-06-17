require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/db');

async function test() {
  const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'emotional_entries'");
  console.log(res.rows.map(r => r.column_name));
  process.exit(0);
}
test();
