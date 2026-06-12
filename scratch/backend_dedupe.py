import re

with open('backend/src/controllers/personalityController.js', 'r') as f:
    content = f.read()

# Modify getTest to deduplicate FULL_POOL
old_getTest_logic = """    // Pick 50 questions randomly
    const shuffled = [...FULL_POOL].sort(() => 0.5 - Math.random());
    testResponse.questions = shuffled.slice(0, 50);"""

new_getTest_logic = """    // Mathematically guarantee deduplication before randomization
    const uniquePoolMap = new Map();
    for (const q of FULL_POOL) {
      if (!uniquePoolMap.has(q.id)) {
        uniquePoolMap.set(q.id, q);
      }
    }
    const uniquePool = Array.from(uniquePoolMap.values());

    // Pick 50 questions randomly from strictly deduplicated pool
    const shuffled = [...uniquePool].sort(() => 0.5 - Math.random());
    testResponse.questions = shuffled.slice(0, 50);"""

content = content.replace(old_getTest_logic, new_getTest_logic)

with open('backend/src/controllers/personalityController.js', 'w') as f:
    f.write(content)
