const { getTest } = require('../controllers/personalityController');
const { FULL_POOL, DIMENSIONS } = require('../data/personalityQuestions');

async function runTests() {
  console.log('--- STARTING PERSONALITY QUESTION SELECTION ENGINE TESTS ---');

  // Test 1: Check full pool size and uniqueness
  console.log(`Total questions in FULL_POOL: ${FULL_POOL.length}`);
  if (FULL_POOL.length < 120) {
    throw new Error(`FAIL: Question pool size is ${FULL_POOL.length}, expected at least 120.`);
  }
  const allIds = FULL_POOL.map(q => q.id);
  const uniqueIds = new Set(allIds);
  if (allIds.length !== uniqueIds.size) {
    throw new Error('FAIL: Duplicate IDs found in FULL_POOL.');
  }
  console.log('✅ Test 1: FULL_POOL size and ID uniqueness check passed.');

  // Test 2: Check dimension distribution in FULL_POOL
  const poolDimCounts = {};
  FULL_POOL.forEach(q => {
    poolDimCounts[q.dimension] = (poolDimCounts[q.dimension] || 0) + 1;
  });
  console.log('Dimension counts in FULL_POOL:', poolDimCounts);
  for (const d of DIMENSIONS) {
    if (!poolDimCounts[d] || poolDimCounts[d] < 20) {
      throw new Error(`FAIL: Dimension "${d}" has only ${poolDimCounts[d] || 0} questions in pool (expected at least 20).`);
    }
  }
  console.log('✅ Test 2: Dimension distribution in pool passed (each has >= 20 questions).');

  // Test 3: Run 100 simulations of getTest and verify constraints
  const numSimulations = 100;
  console.log(`Running ${numSimulations} simulated test generations...`);

  for (let sim = 1; sim <= numSimulations; sim++) {
    let testResponse = null;

    const req = {
      params: { type: 'journey' }
    };
    const res = {
      json: (data) => {
        testResponse = data;
      },
      status: (code) => {
        return {
          json: (data) => {
            console.error(`Error response status ${code}:`, data);
          }
        };
      }
    };

    await getTest(req, res);

    if (!testResponse || !testResponse.success || !testResponse.test || !testResponse.test.questions) {
      throw new Error(`FAIL: getTest did not return a valid questions list in simulation ${sim}`);
    }

    const questions = testResponse.test.questions;

    // Constraint A: Exactly 50 questions
    if (questions.length !== 50) {
      throw new Error(`FAIL: Simulation ${sim} returned ${questions.length} questions, expected exactly 50.`);
    }

    // Constraint B: Strictly unique IDs in the generated list
    const seenIds = new Set();
    questions.forEach(q => {
      if (seenIds.has(q.id)) {
        throw new Error(`FAIL: Simulation ${sim} returned duplicate question ID "${q.id}".`);
      }
      seenIds.add(q.id);
    });

    // Constraint C: No consecutive questions of the same dimension
    for (let i = 1; i < questions.length; i++) {
      const prevDim = questions[i - 1].dimension;
      const currDim = questions[i].dimension;
      if (prevDim === currDim) {
        throw new Error(`FAIL: Simulation ${sim} has consecutive questions from the same dimension "${currDim}" at index ${i - 1} and ${i}.`);
      }
    }

    // Constraint D: Balanced dimension representation
    const genDimCounts = {};
    questions.forEach(q => {
      genDimCounts[q.dimension] = (genDimCounts[q.dimension] || 0) + 1;
    });
    // With 50 questions and 7 dimensions, each dimension must appear either 7 or 8 times (7 * 7 = 49)
    for (const d of DIMENSIONS) {
      const count = genDimCounts[d] || 0;
      if (count < 7 || count > 8) {
        throw new Error(`FAIL: Simulation ${sim} has unbalanced dimension "${d}" count of ${count} (expected 7 or 8).`);
      }
    }

    // Constraint E: No consecutive duplicate question styles/types
    for (let i = 1; i < questions.length; i++) {
      const prevType = questions[i - 1].type;
      const currType = questions[i].type;
      if (prevType === currType) {
        throw new Error(`FAIL: Simulation ${sim} has consecutive questions of the same type "${currType}" at index ${i - 1} and ${i}.`);
      }
    }

    // Constraint F: Semantic overlap inspection (report how many overlaps were bypassed/triggered fallback)
    const seenTags = new Set();
    let overlaps = 0;
    questions.forEach(q => {
      let hasOverlap = false;
      if (q.semanticTags) {
        q.semanticTags.forEach(tag => {
          if (seenTags.has(tag)) {
            hasOverlap = true;
          }
          seenTags.add(tag);
        });
      }
      if (hasOverlap) {
        overlaps++;
      }
    });

    if (sim === 1) {
      console.log(`Simulation 1 Stats:`);
      console.log(`- Unique IDs count: ${seenIds.size}`);
      console.log(`- Dimension distribution:`, genDimCounts);
      console.log(`- Semantic tag overlaps (fallbacks triggered): ${overlaps}`);
    }
  }

  console.log(`✅ Test 3: ${numSimulations} simulations passed all constraints (uniqueness, rotation, dimension balancing, type variety).`);
  console.log('--- ALL TESTS PASSED SUCCESSFULLY 🎉 ---');
}

runTests().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
