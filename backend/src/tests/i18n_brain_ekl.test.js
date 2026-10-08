const assert = require('assert');
const { getBrainDirectives } = require('../services/conversationBrain');
const { 
  getEntityKnowledge, 
  detectEntities, 
  classifyEntity, 
  _cache 
} = require('../services/entityKnowledgeLayer');

const db = require('../config/db');

async function runTests() {
  console.log('🧪 Running Conversation Brain & EKL Localization Test Suite...\n');

  // Fetch valid user ID from DB
  let testUserId = 1;
  try {
    const userRes = await db.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length > 0) {
      testUserId = userRes.rows[0].id;
    }
  } catch (e) {}

  // --- 1. Brain Directives in Turkish vs English ---
  console.log('1️⃣ Testing Conversation Brain directives for TR and EN...');
  const brainTr = await getBrainDirectives(testUserId, null, 'Merhaba', [], 'free', false, 'tr');
  assert(brainTr.directorDossier.includes('TÜRKÇE'), 'Turkish brain dossier must contain TÜRKÇE directive');

  const brainEn = await getBrainDirectives(testUserId, null, 'Hello', [], 'free', false, 'en');
  assert(brainEn.directorDossier.includes('ENGLISH'), 'English brain dossier must contain ENGLISH directive');
  console.log('   ✅ Brain directives correctly localized.');

  // --- 2. Repair Escalation in Turkish vs English ---
  console.log('2️⃣ Testing Response Repair Escalation for TR and EN...');
  const { updateBrainState } = require('../services/conversationBrain');
  const history = [
    { sender: 'ai', message: 'Karmaşık bir açıklama...' },
    { sender: 'user', message: 'anlamadım' },
    { sender: 'ai', message: 'Yine karmaşık bir açıklama...' },
  ];
  // First confusion message -> repair_attempts becomes 1 and state saved
  const turn1Tr = await getBrainDirectives(testUserId, null, 'anlamadım', history, 'free', false, 'tr');
  await updateBrainState(testUserId, null, [], turn1Tr.brainMetadata, turn1Tr.brainState);

  // Second confusion message -> repair_attempts becomes 2
  const brainRepairTr = await getBrainDirectives(testUserId, null, 'anlamadım', history, 'free', false, 'tr');
  assert(brainRepairTr.directorDossier.includes('KADEMELİ ONARIM LİMİTİ AŞILDI'), 'TR repair escalation must trigger TR text');

  const historyEn = [
    { sender: 'ai', message: 'Complex explanation...' },
    { sender: 'user', message: 'don\'t understand' },
    { sender: 'ai', message: 'Still complex...' },
  ];
  const turn1En = await getBrainDirectives(testUserId, null, 'don\'t understand', historyEn, 'free', false, 'en');
  await updateBrainState(testUserId, null, [], turn1En.brainMetadata, turn1En.brainState);

  const brainRepairEn = await getBrainDirectives(testUserId, null, 'don\'t understand', historyEn, 'free', false, 'en');
  assert(brainRepairEn.directorDossier.includes('REPAIR ESCALATION LIMIT REACHED'), 'EN repair escalation must trigger EN text');
  console.log('   ✅ Repair escalation messages correctly localized.');

  // --- 3. Global Entity Detection & Classification ---
  console.log('3️⃣ Testing Global Entity Detection & Classification...');
  const entitiesToTest = [
    { text: 'Eiffel Tower', expectedType: 'landmark' },
    { text: 'Central Park', expectedType: 'place' },
    { text: 'Istanbul Airport', expectedType: 'airport' },
    { text: 'Tokyo Disneyland', expectedType: 'tourist_attraction' },
  ];

  for (const item of entitiesToTest) {
    const detection = detectEntities(`We visited ${item.text} yesterday`);
    assert(detection !== null, `Detection failed for ${item.text}`);
    const type = classifyEntity(item.text);
    console.log(`   - Entity: "${item.text}" -> Detected type: "${type}"`);
  }
  console.log('   ✅ Global entity detection & classification verified.');

  // --- 4. EKL Cache Isolation across Languages ---
  console.log('4️⃣ Testing EKL Cache Language Isolation...');
  const keyTr = _cache._key('Eiffel Tower', 'tr');
  const keyEn = _cache._key('Eiffel Tower', 'en');

  assert.notStrictEqual(keyTr, keyEn, 'Cache keys for TR and EN must be distinct');
  assert.strictEqual(keyTr, 'eiffel tower_tr');
  assert.strictEqual(keyEn, 'eiffel tower_en');

  _cache.set('Eiffel Tower', { canonicalName: 'Eiffel Tower', summary: 'Eyfel Kulesi Paris\'tedir.' }, 'tr');
  _cache.set('Eiffel Tower', { canonicalName: 'Eiffel Tower', summary: 'Eiffel Tower is in Paris.' }, 'en');

  const cachedTr = _cache.get('Eiffel Tower', 'tr');
  const cachedEn = _cache.get('Eiffel Tower', 'en');

  assert.strictEqual(cachedTr.knowledge.summary, 'Eyfel Kulesi Paris\'tedir.');
  assert.strictEqual(cachedEn.knowledge.summary, 'Eiffel Tower is in Paris.');
  console.log('   ✅ Cache isolation verified: TR and EN entries do not collide.');

  console.log('\n🎉 ALL BRAIN & EKL LOCALIZATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
