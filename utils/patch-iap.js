/* global __dirname */
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

const rniapModulePath = path.join(__dirname, '..', 'node_modules', 'react-native-iap', 'android', 'src', 'play', 'java', 'com', 'dooboolab', 'rniap', 'RNIapModule.kt');

if (fs.existsSync(rniapModulePath)) {
  console.log('Patching react-native-iap RNIapModule.kt...');
  let content = fs.readFileSync(rniapModulePath, 'utf8');

  const target1 = `        val activity = currentActivity
        if (activity == null) {
            promise.safeReject(PromiseUtils.E_UNKNOWN, "getCurrentActivity returned null")
            return
        }`;
        
  const replacement1 = `        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.safeReject(PromiseUtils.E_UNKNOWN, "getCurrentActivity returned null")
            return
        }`;

  const target2 = `            val flowParams = builder.build()
            val billingResultCode = billingClient.launchBillingFlow(activity, flowParams).responseCode
            if (billingResultCode != BillingClient.BillingResponseCode.OK) {
                val errorData = PlayUtils.getBillingResponseData(billingResultCode)
                promise.safeReject(errorData.code, errorData.message)
            }`;

  const replacement2 = `            val flowParams = builder.build()
            activity.runOnUiThread {
                val billingResultCode = billingClient.launchBillingFlow(activity, flowParams).responseCode
                if (billingResultCode != BillingClient.BillingResponseCode.OK) {
                    val errorData = PlayUtils.getBillingResponseData(billingResultCode)
                    promise.safeReject(errorData.code, errorData.message)
                }
            }`;

  let changed = false;
  if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    changed = true;
  }
  
  if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(rniapModulePath, content, 'utf8');
    console.log('react-native-iap RNIapModule.kt patched successfully.');
  } else {
    console.log('react-native-iap RNIapModule.kt is already patched or targets not found.');
  }
} else {
  console.warn('RNIapModule.kt not found at:', rniapModulePath);
}
