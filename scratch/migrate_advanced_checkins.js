require('dotenv').config({ path: '../backend/.env' });
const db = require('../backend/src/config/db');

async function runMigration() {
  try {
    console.log('Starting migration...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS advanced_check_ins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        check_in_id INTEGER REFERENCES check_ins(id) ON DELETE CASCADE,
        question_id VARCHAR(100) NOT NULL,
        question_text TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table advanced_check_ins created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
