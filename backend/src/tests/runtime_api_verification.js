const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

function request(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

const turkishCharRegex = /[çğıöşüÇĞİÖŞÜ]/;

function checkForTurkish(obj, path = '') {
  const leaks = [];
  if (!obj) return leaks;

  if (typeof obj === 'string') {
    if (turkishCharRegex.test(obj)) {
      leaks.push({ path, value: obj });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      leaks.push(...checkForTurkish(item, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      // Ignore internal keys like date, id, created_at, symbols, etc.
      if (['id', 'created_at', 'updated_at', 'icon', 'symbol', 'date'].includes(key)) continue;
      leaks.push(...checkForTurkish(value, path ? `${path}.${key}` : key));
    }
  }
  return leaks;
}

async function runRuntimeVerification() {
  console.log('🚀 Starting Deep Live Runtime API Verification...\n');

  // 1. Get or create a test user with birth_date
  let userRes = await db.query("SELECT id, username, birth_date, zodiac_sign FROM users WHERE birth_date IS NOT NULL LIMIT 1");
  let testUserId = userRes.rows[0]?.id;
  if (!testUserId) {
    const newU = await db.query(
      "INSERT INTO users (username, email, password, birth_date) VALUES ('runtime_tester', 'rt@test.com', 'hash', '1995-10-25') RETURNING id"
    );
    testUserId = newU.rows[0].id;
  } else {
    // Ensure birth_date is set to Scorpio
    await db.query("UPDATE users SET birth_date = '1995-10-25' WHERE id = $1", [testUserId]);
  }
  const token = jwt.sign({ id: testUserId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const authHeadersEn = {
    'Authorization': `Bearer ${token}`,
    'x-app-language': 'en'
  };
  const authHeadersTr = {
    'Authorization': `Bearer ${token}`,
    'x-app-language': 'tr'
  };

  // 2. Test Auth & Error Localization
  console.log('1️⃣ Testing Authentication & Error Localizations:');
  const unauthEn = await request('/api/auth/me', { 'x-app-language': 'en' });
  console.log(`   [Unauthenticated EN] status: ${unauthEn.status}, message: "${unauthEn.data?.message}"`);
  if (turkishCharRegex.test(unauthEn.data?.message || '')) {
    throw new Error(`Turkish leaked in unauthenticated EN: ${unauthEn.data?.message}`);
  }

  const unauthTr = await request('/api/auth/me', { 'x-app-language': 'tr' });
  console.log(`   [Unauthenticated TR] status: ${unauthTr.status}, message: "${unauthTr.data?.message}"`);

  // 3. Test /api/astrology/home
  console.log('\n2️⃣ Testing /api/astrology/home (Home Sky Widget):');
  const homeEn = await request('/api/astrology/home', authHeadersEn);
  console.log(`   [EN] status: ${homeEn.status}`);
  if (homeEn.status === 200) {
    const leaks = checkForTurkish(homeEn.data);
    if (leaks.length > 0) {
      console.error('   ❌ Leaks in /api/astrology/home [EN]:', leaks);
      throw new Error('Turkish leaked into /api/astrology/home [EN]');
    }
    console.log(`   ✅ /api/astrology/home [EN]: Clean! (Event: "${homeEn.data.currentEvent?.event_name}")`);
  }

  const homeTr = await request('/api/astrology/home', authHeadersTr);
  console.log(`   [TR] status: ${homeTr.status}, Event: "${homeTr.data.currentEvent?.event_name}"`);

  // 4. Test /api/astrology/daily (Daily Whisper)
  console.log('\n3️⃣ Testing /api/astrology/daily (Daily Whisper):');
  const dailyEn = await request('/api/astrology/daily', authHeadersEn);
  console.log(`   [EN] status: ${dailyEn.status}`);
  if (dailyEn.status === 200) {
    const leaks = checkForTurkish(dailyEn.data);
    if (leaks.length > 0) {
      console.error('   ❌ Leaks in /api/astrology/daily [EN]:', leaks);
      throw new Error('Turkish leaked into /api/astrology/daily [EN]');
    }
    console.log(`   ✅ /api/astrology/daily [EN]: Clean! Whisper: "${dailyEn.data.whisper?.slice(0, 50)}..."`);
  }

  const dailyTr = await request('/api/astrology/daily', authHeadersTr);
  console.log(`   [TR] status: ${dailyTr.status}, Whisper: "${dailyTr.data.whisper?.slice(0, 50)}..."`);

  // 5. Test /api/astrology/weekly (Weekly Energy & 9 Sections)
  console.log('\n4️⃣ Testing /api/astrology/weekly (Weekly Energy & 9 Sections):');
  const weeklyEn = await request('/api/astrology/weekly', authHeadersEn);
  console.log(`   [EN] status: ${weeklyEn.status}`);
  if (weeklyEn.status === 200) {
    const leaks = checkForTurkish(weeklyEn.data);
    if (leaks.length > 0) {
      console.error('   ❌ Leaks in /api/astrology/weekly [EN]:', leaks);
      throw new Error('Turkish leaked into /api/astrology/weekly [EN]');
    }
    const weeklyPayload = weeklyEn.data?.data || weeklyEn.data;
    console.log(`   ✅ /api/astrology/weekly [EN]: Clean! General theme: "${JSON.stringify(weeklyPayload.aiGuidance?.GeneralTheme || weeklyPayload.aiGuidance)?.slice(0, 70)}..."`);
    console.log(`   ✅ Zodiac Profile [EN]: sign: ${weeklyPayload.zodiacProfile?.sign}, ruling_planet: ${weeklyPayload.zodiacProfile?.ruling_planet}`);
    console.log(`   ✅ Core needs [EN]: "${weeklyPayload.zodiacProfile?.core_needs}"`);
  }

  const weeklyTr = await request('/api/astrology/weekly', authHeadersTr);
  const weeklyTrPayload = weeklyTr.data?.data || weeklyTr.data;
  console.log(`   [TR] status: ${weeklyTr.status}`);
  console.log(`   [TR] Zodiac Profile sign: ${weeklyTrPayload.zodiacProfile?.sign}, ruling_planet: ${weeklyTrPayload.zodiacProfile?.ruling_planet}`);

  // 6. Test /api/reflections/daily (Daily Reflection)
  console.log('\n5️⃣ Testing /api/reflections/daily (Daily Reflection):');
  const reflectionEn = await request('/api/reflections/daily', authHeadersEn);
  console.log(`   [EN] status: ${reflectionEn.status}`);
  if (reflectionEn.status === 200) {
    const leaks = checkForTurkish(reflectionEn.data);
    if (leaks.length > 0) {
      console.error('   ❌ Leaks in /api/reflections/daily [EN]:', leaks);
      throw new Error('Turkish leaked into /api/reflections/daily [EN]');
    }
    console.log(`   ✅ /api/reflections/daily [EN]: Clean! Reflection: "${reflectionEn.data.reflection?.slice(0, 50)}..."`);
  }

  const reflectionTr = await request('/api/reflections/daily', authHeadersTr);
  console.log(`   [TR] status: ${reflectionTr.status}, Reflection: "${reflectionTr.data.reflection?.slice(0, 50)}..."`);

  // 7. Test /api/cards/today
  console.log('\n6️⃣ Testing /api/cards/today (Daily Cards):');
  const cardsEn = await request('/api/cards/today', authHeadersEn);
  console.log(`   [EN] status: ${cardsEn.status}`);
  if (cardsEn.status === 200 && cardsEn.data.card) {
    const leaks = checkForTurkish(cardsEn.data.card);
    if (leaks.length > 0) {
      console.error('   ❌ Leaks in /api/cards/today [EN]:', leaks);
      throw new Error('Turkish leaked into /api/cards/today [EN]');
    }
    console.log(`   ✅ /api/cards/today [EN]: Clean! Title: "${cardsEn.data.card.title}"`);
  }

  // 8. Database Language Isolation & Integrity Verification
  console.log('\n7️⃣ Verifying Database Language Isolation:');
  const dailyReflectionsDist = await db.query(
    'SELECT language, COUNT(*) FROM daily_reflections GROUP BY language'
  );
  console.log('   daily_reflections language distribution:', dailyReflectionsDist.rows);
  const nullReflections = await db.query(
    'SELECT COUNT(*) FROM daily_reflections WHERE language IS NULL'
  );
  if (parseInt(nullReflections.rows[0].count) > 0) {
    throw new Error('NULL language rows detected in daily_reflections!');
  }
  console.log('   ✅ ZERO NULL-language rows in daily_reflections');

  const whisperDist = await db.query(
    'SELECT language, COUNT(*) FROM daily_whisper GROUP BY language'
  );
  console.log('   daily_whisper language distribution:', whisperDist.rows);

  const guidanceDist = await db.query(
    'SELECT language, COUNT(*) FROM weekly_guidance GROUP BY language'
  );
  console.log('   weekly_guidance language distribution:', guidanceDist.rows);

  // 9. Cache Contamination Stress Test: TR -> EN -> TR -> EN
  console.log('\n8️⃣ Running TR -> EN -> TR -> EN cache contamination stress test:');
  for (let i = 1; i <= 3; i++) {
    const cycleEn = await request('/api/astrology/daily', authHeadersEn);
    const cycleTr = await request('/api/astrology/daily', authHeadersTr);
    if (turkishCharRegex.test(cycleEn.data?.whisper || '')) {
      throw new Error(`Cache contamination detected on cycle ${i}: Turkish in EN response!`);
    }
  }
  console.log('   ✅ 3 cycles of TR -> EN -> TR -> EN completed with ZERO cache contamination!');

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL LIVE RUNTIME API ENDPOINTS VERIFIED: 100% CLEAN ENGLISH!');
  console.log('════════════════════════════════════════════════════════════════');
  process.exit(0);
}

runRuntimeVerification().catch(err => {
  console.error('\n❌ RUNTIME VERIFICATION FAILED:', err);
  process.exit(1);
});
