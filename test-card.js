require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/db');
const migrations = require('./backend/src/config/migrations');
const cardController = require('./backend/src/controllers/cardController');

async function test() {
  try {
    // 1. Run migrations
    await migrations.runMigrations();
    console.log('[TEST] Migrations complete.');
    
    const mockReq = { user: { id: 7 }, query: { localDate: '2026-06-17' }, body: { cardId: 1, localDate: '2026-06-17' } };
    const mockRes = {
      json: (data) => console.log('[TEST] RES.JSON:', data),
      status: (code) => ({ json: (data) => console.log(`[TEST] RES.STATUS(${code}):`, data) })
    };

    // Clean up mock user
    await db.query("DELETE FROM card_responses WHERE user_id = 7 AND local_date::date = '2026-06-17'::date");
    await db.query("DELETE FROM daily_card_sets WHERE user_id = 7");
    await db.query("DELETE FROM invitation_card_history WHERE user_id = 7");

    // 2. Fetch cards -> Should generate new set of 3
    console.log('\n--- 1. Fetching cards (First time) ---');
    await cardController.getInteractiveCards(mockReq, mockRes);
    
    // 3. Fetch cards again -> Should return the SAME set of 3
    console.log('\n--- 2. Fetching cards (Second time, should match) ---');
    await cardController.getInteractiveCards(mockReq, mockRes);

    // 4. Select a card -> should add to history
    console.log('\n--- 3. Selecting a card ---');
    // Find the first card from the daily set
    const dailySet = await db.query('SELECT card_id FROM daily_card_sets WHERE user_id = 7');
    mockReq.body.cardId = dailySet.rows[0].card_id;
    await cardController.selectInteractiveCard(mockReq, mockRes);

    // 5. Check history table
    const history = await db.query('SELECT * FROM invitation_card_history WHERE user_id = 7');
    console.log('\n--- 4. History Table ---');
    console.log(history.rows);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
