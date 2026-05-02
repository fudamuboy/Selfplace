import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

interface NotificationState {
  remindersEnabled: boolean;
  reminderTime: Date;
  loadConfig: () => Promise<void>;
  toggleReminders: (enabled: boolean) => Promise<boolean>;
  setReminderTime: (time: Date) => Promise<void>;
  scheduleNotification: () => Promise<void>;
}

const STORAGE_KEY = 'userPreferences';

const useNotificationStore = create<NotificationState>((set, get) => ({
  remindersEnabled: false,
  reminderTime: new Date(new Date().setHours(21, 0, 0, 0)),

  loadConfig: async () => {
    try {
      const prefs = await AsyncStorage.getItem(STORAGE_KEY);
      if (prefs) {
        const { remindersEnabled, reminderTime } = JSON.parse(prefs);
        set({
          remindersEnabled: !!remindersEnabled,
          reminderTime: reminderTime ? new Date(reminderTime) : new Date(new Date().setHours(21, 0, 0, 0)),
        });
      }
    } catch (error) {
      console.log('Error loading notification config:', error);
    }
  },

  toggleReminders: async (enabled: boolean) => {
    if (enabled) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') return false;
      }
    }

    set({ remindersEnabled: enabled });
    const { reminderTime } = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      remindersEnabled: enabled, 
      reminderTime: reminderTime.toISOString() 
    }));
    
    if (enabled) {
      await get().scheduleNotification();
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    return true;
  },

  setReminderTime: async (time: Date) => {
    set({ reminderTime: time });
    const { remindersEnabled } = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      remindersEnabled, 
      reminderTime: time.toISOString() 
    }));
    
    if (remindersEnabled) {
      await get().scheduleNotification();
    }
  },

  scheduleNotification: async () => {
    // Clear existing notifications first to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const { remindersEnabled, reminderTime } = get();
    if (!remindersEnabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Selfplace Hatırlatıcısı 🌿",
        body: "Kendine ayıracağın küçük bir an için hazır mısın?",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
        repeats: true,
      } as Notifications.CalendarTriggerInput,
    });
  },
}));

export default useNotificationStore;
