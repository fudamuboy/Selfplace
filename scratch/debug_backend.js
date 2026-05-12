require('dotenv').config({ path: 'backend/.env' });
const db = require('../backend/src/config/db');

async function test() {
  const uId = 8;
  const cardId = 18;
  const response = 'Deneyeceğim';

  try {
    // 1. Verify user exists
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [uId]);
    console.log('User check:', userCheck.rows);

    // 2. Get card category
    const cardInfo = await db.query('SELECT category FROM invitation_cards WHERE id = $1', [cardId]);
    console.log('Card info:', cardInfo.rows);
    
    if (cardInfo.rows.length === 0) {
      console.log('Card not found');
      return;
    }
    const category = cardInfo.rows[0].category;

    console.log('Attempting insert with:', { uId, cardId, response, category });

    const result = await db.query(
      'INSERT INTO card_responses (user_id, card_id, response, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [uId, cardId, response, category]
    );
    console.log('Insert result:', result.rows[0]);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
}

test();
