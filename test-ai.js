const { generateWeeklyInsight } = require('./backend/src/services/aiService');

const mockData = {
  checkIns: [
    { mood: 'Mutlu', note: 'Harika bir gün' },
    { mood: 'Sakin', note: 'Dinlendirici' }
  ],
  cardResponses: [],
  advancedCheckIns: []
};

async function test() {
  try {
    const res = await generateWeeklyInsight(mockData, 'GROWING', false);
    console.log('--- RAW AI RESPONSE ---');
    console.log(res);
    console.log('-----------------------');
    const parsed = JSON.parse(res);
    console.log('PARSED OK:', parsed);
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
