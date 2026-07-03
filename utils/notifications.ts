import { requireNativeModule } from 'expo-modules-core';
import { isRunningInExpoGo } from 'expo';

// 1. Disable push token auto-registration side-effects in Expo Go
// before importing expo-notifications. This prevents the SDK 53 console.error warning
// from triggering on module load.
if (isRunningInExpoGo()) {
  try {
    const ServerRegistrationModule = requireNativeModule('NotificationsServerRegistrationModule');
    if (ServerRegistrationModule) {
      // By unsetting getRegistrationInfoAsync, we cause expo-notifications' internal
      // auto-registration module to skip setting up push token listeners and fetching tokens,
      // completely bypassing the Expo Go remote notification warning on load.
      ServerRegistrationModule.getRegistrationInfoAsync = undefined;
    }
  } catch (e) {
    // Fail silently if native module is not present in this environment
  }
}

// 2. Export standard public expo-notifications APIs.
// This allows the rest of the application to import standard public notification APIs
// from this wrapper, maintaining full compatibility and type safety.
export * from 'expo-notifications';
