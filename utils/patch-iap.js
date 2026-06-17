/* eslint-env node */
const fs = require('fs');
const path = require('path');

const podspecPath = path.join(__dirname, '..', 'node_modules', 'react-native-iap', 'RNIap.podspec');

if (fs.existsSync(podspecPath)) {
  console.log('Patching react-native-iap RNIap.podspec...');
  let content = fs.readFileSync(podspecPath, 'utf8');

  // 1. Add require statement for react_native_pods.rb at the top if not present
  const requireSnippet = `
# Attempt to load react_native_pods.rb to ensure install_modules_dependencies is defined
react_native_pods_path = File.join(__dir__, "..", "react-native", "scripts", "react_native_pods.rb")
if File.exist?(react_native_pods_path)
  require react_native_pods_path
end
`;

  if (!content.includes('react_native_pods.rb')) {
    content = content.replace(
      'folly_compiler_flags = \'-DFOLLY_NO_CONFIG',
      requireSnippet + '\nfolly_compiler_flags = \'-DFOLLY_NO_CONFIG'
    );
  }

  // 2. Guard s.dependency "RCT-Folly" in the fallback elsif block
  const targetDependency = 's.dependency "RCT-Folly"';
  const guardedDependency = `
    # Guard RCT-Folly dependency if using prebuilt React Native core
    if ENV['RCT_USE_PREBUILT_RNCORE'] != '1'
      s.dependency "RCT-Folly"
    end`;

  if (content.includes(targetDependency) && !content.includes('RCT_USE_PREBUILT_RNCORE')) {
    content = content.replace(targetDependency, guardedDependency);
  }

  fs.writeFileSync(podspecPath, content, 'utf8');
  console.log('react-native-iap RNIap.podspec patched successfully.');
} else {
  console.warn('RNIap.podspec not found at:', podspecPath);
}
