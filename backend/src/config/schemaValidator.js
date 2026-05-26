const db = require('./db');

/**
 * Maps the tables and columns required by the application controllers.
 * Any missing table or column here will trigger a loud validation warning or failure.
 */
const REQUIRED_SCHEMA = {
  users: [
    'id', 'username', 'email', 'password', 
    'birth_date', 'zodiac_sign', 'accepted_terms', 'terms_accepted_at'
  ],
  check_ins: [
    'id', 'user_id', 'mood', 'reflection_question', 'note', 'created_at'
  ],
  daily_reflections: [
    'id', 'user_id', 'text', 'created_at'
  ],
  weekly_insights: [
    'id', 'user_id', 'text', 'generated_at'
  ],
  personality_results: [
    'id', 'user_id', 'test_type', 'result_data', 'traits', 'created_at'
  ],
  advanced_check_ins: [
    'id', 'user_id', 'check_in_id', 'question_id', 'question_text', 'answer', 'answers'
  ],
  card_responses: [
    'id', 'user_id', 'card_id', 'response', 'category', 'local_date', 'completion_status'
  ],
  astrology_events: [
    'id', 'event_type', 'event_name', 'description', 'date_start', 'date_end', 'is_active'
  ],
  weekly_guidance: [
    'id', 'user_id', 'zodiac_sign', 'guidance_text', 'themes', 'generated_at', 'expires_at'
  ]
};

/**
 * Performs database schema verification on startup.
 * Throws a descriptive error if critical tables or columns are missing.
 */
async function validateSchema() {
  console.log('[SCHEMA-VALIDATOR] Starting database schema validation...');
  let failed = false;
  const failureDetails = [];

  try {
    for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
      // 1. Check if the table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );
      `, [table]);

      if (!tableCheck.rows[0].exists) {
        failed = true;
        const msg = `[CRITICAL-SCHEMA] Missing table: '${table}'`;
        console.error(msg);
        failureDetails.push(msg);
        continue;
      }

      // 2. Fetch existing columns in this table
      const dbColumnsRes = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `, [table]);

      const dbColumns = new Set(dbColumnsRes.rows.map(r => r.column_name));

      // 3. Verify all required columns are present
      for (const col of columns) {
        if (!dbColumns.has(col)) {
          failed = true;
          const msg = `[CRITICAL-SCHEMA] Missing column: '${col}' on table '${table}'`;
          console.error(msg);
          failureDetails.push(msg);
        }
      }
    }

    if (failed) {
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      console.error('[CRITICAL-SCHEMA] DATABASE SCHEMA VALIDATION FAILED!');
      failureDetails.forEach(d => console.error(` -> ${d}`));
      console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      throw new Error(`Database schema validation failed:\n${failureDetails.join('\n')}`);
    }

    console.log('[SCHEMA-VALIDATOR] All critical tables and columns successfully verified! ✨');
  } catch (err) {
    console.error('[SCHEMA-VALIDATOR] Validation Error:', err.message);
    throw err;
  }
}

module.exports = { validateSchema };
