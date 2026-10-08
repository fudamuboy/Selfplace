/* global __dirname */
const fs = require('fs');
const path = require('path');

// 1. Patch SimulatorAppPrerequisite.js to support Xcode 27 / DeviceHub
const prereqPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo/cli',
  'build',
  'src',
  'start',
  'doctor',
  'apple',
  'SimulatorAppPrerequisite.js'
);

if (fs.existsSync(prereqPath)) {
  let content = fs.readFileSync(prereqPath, 'utf8');
  const target = "return await getSimulatorAppIdViaAppleScriptAsync() ?? await getSimulatorAppIdFromBundleAsync();";
  const replacement = "return await getSimulatorAppIdViaAppleScriptAsync() ?? await getSimulatorAppIdFromBundleAsync() ?? 'com.apple.iphonesimulator';";
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(prereqPath, content, 'utf8');
    console.log('[patch-expo-xcode27] Patched SimulatorAppPrerequisite.js');
  }
}

// 2. Patch ensureSimulatorAppRunning.js
const ensureRunningPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo/cli',
  'build',
  'src',
  'start',
  'platforms',
  'ios',
  'ensureSimulatorAppRunning.js'
);

if (fs.existsSync(ensureRunningPath)) {
  let content = fs.readFileSync(ensureRunningPath, 'utf8');
  if (content.includes("whose name is \\\"Simulator\\\"'") && !content.includes('DeviceHub')) {
    content = content.replace(
      "whose name is \\\"Simulator\\\"'",
      "whose name is \\\"Simulator\\\" or name is \\\"DeviceHub\\\"'"
    );
    fs.writeFileSync(ensureRunningPath, content, 'utf8');
    console.log('[patch-expo-xcode27] Patched ensureSimulatorAppRunning.js');
  }
}
