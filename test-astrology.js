require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/src/config/db');
const astrologyController = require('./backend/src/controllers/astrologyController');

async function test() {
  try {
    const targetUser = 7;
    console.log(`[TEST] Refreshing weekly guidance for user ${targetUser}...`);
    
    // 1. Mock Admin Refresh
    const reqRefresh = { params: { userId: targetUser } };
    const resRefresh = {
      json: (data) => console.log('[TEST] Admin Refresh Response:', data),
      status: (c) => ({ json: (d) => console.log('[TEST] Admin Refresh Error:', d) })
    };
    await astrologyController.refreshWeeklyGuidance(reqRefresh, resRefresh);

    // 2. Mock Fetch Weekly Guidance (which triggers synthesis)
    console.log(`\n[TEST] Generating new weekly guidance for user ${targetUser}...`);
    const reqWeekly = { user: { id: targetUser } };
    const resWeekly = {
      json: (data) => {
        console.log('\n[TEST] Weekly Guidance Success!');
        console.log('AI Guidance output type:', typeof data.data.aiGuidance);
        console.log('Keys:', Object.keys(data.data.aiGuidance || {}));
      },
      status: (c) => ({ json: (d) => console.error('[TEST] Error fetching weekly:', d) })
    };
    
    await astrologyController.getWeeklyGuidance(reqWeekly, resWeekly);

  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
test();
