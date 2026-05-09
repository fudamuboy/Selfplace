const db = require('./db');

/**
 * Ensures the database schema is up to date.
 * This runs on every server startup to prevent 'column does not exist' errors.
 */
exports.runMigrations = async () => {
  console.log('[MIGRATION] Checking schema integrity...');
  
  try {
    // 1. Rename users.password_hash if it exists (migration to 'password')
    const checkUserCols = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (checkUserCols.rows.length > 0) {
      console.log('[MIGRATION] Renaming users.password_hash to users.password');
      await db.query('ALTER TABLE users RENAME COLUMN password_hash TO password');
    }

    // 2. Ensure reset password columns exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE
    `);

    // 3. Ensure check_ins table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mood VARCHAR(50) NOT NULL,
        reflection_question TEXT,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Ensure daily_reflections table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_reflections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at DATE DEFAULT CURRENT_DATE,
        UNIQUE (user_id, created_at)
      )
    `);

    // 5. Ensure card_responses table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS card_responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER,
        response VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Ensure weekly_insights table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS weekly_insights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[MIGRATION] Schema check complete.');
  } catch (err) {
    console.error('[MIGRATION] Error during schema check:', err.message);
    throw err;
  }
};
