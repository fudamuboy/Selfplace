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
  ],
  couple_memories: [
    'id', 'connection_id', 'memory_type', 'summary', 'participants', 
    'emotional_weight', 'resolved', 'last_referenced_at', 'created_at', 'updated_at', 'symbol'
  ],
  relationship_garden: [
    'id', 'connection_id', 'garden_state', 'growth_level', 'updated_at'
  ],
  relationship_daily_syncs: [
    'id', 'connection_id', 'synced_date', 'generated_text', 'emotional_weather', 
    'relationship_energy', 'created_at', 'expires_at', 'insight_feed', 
    'emotional_aura', 'connection_state', 'relationship_rhythm', 'emotional_closeness'
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
      // 1. Check if the table exists using to_regclass for safety
      const tableCheck = await db.query(`
        SELECT to_regclass($1) AS reg;
      `, [`public.${table}`]);

      const tableExists = tableCheck.rows[0] && tableCheck.rows[0].reg !== null;

      if (!tableExists) {
        // Skip validation of signature tables if they don't exist yet
        const isSignatureTable = ['couple_memories', 'relationship_garden', 'relationship_daily_syncs'].includes(table);
        if (isSignatureTable) {
          console.log(`[SCHEMA-VALIDATOR] Signature table '${table}' does not exist yet. Skipping validation.`);
          continue;
        }
        
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
          // Soft-ignore missing Signature columns
          const isSignatureColumn = [
            'emotional_aura', 
            'connection_state', 
            'relationship_rhythm', 
            'emotional_closeness',
            'symbol'
          ].includes(col);
          
          if (isSignatureColumn) {
            console.log(`[SCHEMA-VALIDATOR] Signature column '${col}' on table '${table}' does not exist yet. Soft-ignoring.`);
            continue;
          }

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
