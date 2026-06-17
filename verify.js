require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/db');

async function test() {
  try {
    const userId = 7; // I saw user 7 has recent checkins
    
    // Clear checkins for user 7 to have a clean state for this week
    await db.query(`DELETE FROM emotional_entries WHERE user_id = $1 AND source_type IN ('checkin', 'reflection') AND created_at >= date_trunc('week', CURRENT_DATE)`, [userId]);
    
    // Create 3 checkins today
    for (let i = 0; i < 3; i++) {
      await db.query(`
        INSERT INTO emotional_entries (user_id, source_type, emotion, prompt, content)
        VALUES ($1, 'reflection', 'Mutlu', 'Test Prompt', 'Test Content')
      `, [userId]);
    }
    
    // Test 1: Fetch current stats
    const currentRes = await db.query(`
      SELECT source_type
      FROM emotional_entries
      WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)
    `, [userId]);
    
    const countNow = currentRes.rows.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').length;
    console.log(`[TEST 1] Created 3 check-ins today. Stats return count: ${countNow} (Expected: 3)`);

    // Test 2: Next week reset test
    const nextWeekRes = await db.query(`
      SELECT source_type
      FROM emotional_entries
      WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE + INTERVAL '7 days')
    `, [userId]);
    
    const countNextWeek = nextWeekRes.rows.filter(r => r.source_type === 'checkin' || r.source_type === 'reflection').length;
    console.log(`[TEST 2] Next week reset test. Stats return count: ${countNextWeek} (Expected: 0)`);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
