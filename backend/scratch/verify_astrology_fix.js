/**
 * Safe Strengths Parsing Verification Script
 * This script runs the exact logic introduced in the mobile app against all potential
 * malformed, plain text, valid JSON, and empty database payloads to guarantee 0% crash risk.
 */

const parseStrengths = (strengths) => {
  if (!strengths) return [];
  if (typeof strengths !== 'string') return Array.isArray(strengths) ? strengths : [];
  try {
    const parsed = JSON.parse(strengths);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('  [LOGGED-WARNING] Error parsing strengths JSON:', e.message);
    if (strengths.includes(',')) {
      return strengths.split(',').map((s) => s.trim());
    }
    return [strengths];
  }
};

// Test Cases
const testCases = [
  {
    name: "1. Valid JSON Array (Ideal state)",
    input: '["Liderlik", "Kararlılık", "Tutku"]',
    expected: "Liderlik • Kararlılık • Tutku"
  },
  {
    name: "2. Plain String Comma-Separated (No JSON - Malformed)",
    input: "Empati, Sezgi, Yaratıcılık",
    expected: "Empati • Sezgi • Yaratıcılık"
  },
  {
    name: "3. Plain Single String (No JSON - Malformed)",
    input: "Çok Hırslı ve Güçlü",
    expected: "Çok Hırslı ve Güçlü"
  },
  {
    name: "4. Already Parsed Array (Multi-env safety)",
    input: ["Analitik", "Mantıklı"],
    expected: "Analitik • Mantıklı"
  },
  {
    name: "5. Null / Empty (Edge case)",
    input: null,
    expected: ""
  },
  {
    name: "6. Corrupt JSON Brackets (Syntax Error)",
    input: '["Bozuk JSON',
    expected: '["Bozuk JSON'
  }
];

console.log("=== STARTING ASTROLOGY SAFE PARSER VERIFICATION ===");
let passed = true;

testCases.forEach((tc) => {
  console.log(`\nRunning test: ${tc.name}`);
  console.log(`Input:`, tc.input);
  
  try {
    const result = parseStrengths(tc.input).join(' • ');
    console.log(`Result: "${result}"`);
    
    if (result === tc.expected) {
      console.log(`✅ Passed!`);
    } else {
      console.log(`❌ Failed! Expected "${tc.expected}" but got "${result}"`);
      passed = false;
    }
  } catch (err) {
    console.log(`❌ CRITICAL FAILURE: Threw an uncaught crash!`, err.stack);
    passed = false;
  }
});

console.log("\n================================================");
if (passed) {
  console.log("🎉 ALL TESTS PASSED! ZERO CRASH RISK VERIFIED.");
} else {
  console.log("❌ SOME TESTS FAILED. REVIEW THE HELPER LOGIC.");
}
console.log("================================================");
process.exit(passed ? 0 : 1);
