import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { CustomButton } from '../components/CustomButton';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PostAuthOnboardingScreen() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { setPostAuthOnboardingCompleted } = useAuthStore();

  // Personalization State
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(21, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10); // 5, 10, 15

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (remindersEnabled) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          // Fallback if denied
        }
      }
      setStep(3);
    } else {
      // Save all and finish
      await AsyncStorage.setItem('remindersEnabled', remindersEnabled ? 'true' : 'false');
      await AsyncStorage.setItem('reminderTime', reminderTime.toISOString());
      await AsyncStorage.setItem('dailyGoal', dailyGoal.toString());
      await setPostAuthOnboardingCompleted(true);
      router.replace('/(tabs)');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Yolculuğunu sana göre şekillendirelim</Text>
      <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>Küçük tercihlerle Selfplace daha kişisel hissedebilir.</Text>

      <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>Günlük Hatırlatıcı</Text>
            <Text style={[styles.cardSubtitle, { color: currentTheme.colors.text.secondary }]}>Kendine zaman ayırmayı unutma.</Text>
          </View>
          <Switch 
            value={remindersEnabled} 
            onValueChange={setRemindersEnabled}
            trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {remindersEnabled && (
          <TouchableOpacity 
            style={styles.timePickerBtn}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={[styles.timeText, { color: currentTheme.colors.primary }]}>
              {reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Ionicons name="time-outline" size={20} color={currentTheme.colors.primary} />
          </TouchableOpacity>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (date) setReminderTime(date);
            }}
          />
        )}
      </View>

      <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder, marginTop: 20 }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary, marginBottom: 16 }]}>Günlük Hedefin</Text>
        <View style={styles.goalContainer}>
          {[5, 10, 15].map((val) => (
            <TouchableOpacity 
              key={val}
              style={[
                styles.goalOption, 
                { borderColor: currentTheme.colors.cardBorder },
                dailyGoal === val && { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }
              ]}
              onPress={() => setDailyGoal(val)}
            >
              <Text style={[
                styles.goalText, 
                { color: currentTheme.colors.text.primary },
                dailyGoal === val && { color: '#fff' }
              ]}>{val} dk</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <CustomButton title="Devam Et" onPress={handleNext} style={{ marginTop: 40 }} />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: currentTheme.colors.glow }]}>
        <Ionicons name="notifications-outline" size={40} color={currentTheme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Sana nazikçe hatırlatalım</Text>
      <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>Sadece seçtiğin zamanda, rahatsız etmeden.</Text>
      
      <CustomButton title="İzin Ver ve Devam Et" onPress={handleNext} style={{ marginTop: 40 }} />
      <TouchableOpacity onPress={() => setStep(3)} style={{ marginTop: 20 }}>
        <Text style={{ color: currentTheme.colors.text.muted }}>Şimdi Değil</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: currentTheme.colors.glow }]}>
        <Ionicons name="checkmark-circle-outline" size={40} color={currentTheme.colors.primary} />
      </View>
      <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Hazırsın</Text>
      <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>Bu alan senin. Küçük bir anla başlayabilirsin.</Text>
      
      <CustomButton title="Uygulamaya Gir" onPress={handleNext} style={{ marginTop: 40 }} />
    </View>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        
        <View style={styles.progressContainer}>
           {[1, 2, 3].map(i => (
             <View key={i} style={[
               styles.progressDot, 
               { backgroundColor: i === step ? currentTheme.colors.primary : 'rgba(255,255,255,0.1)' }
             ]} />
           ))}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  goalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  goalText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  }
});
