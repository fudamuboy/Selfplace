import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import { CustomButton } from '../components/CustomButton';
import { Toast } from '../components/Toast';
import client from '../api/client';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';

const GOALS = [
  { id: 'Self-understanding', label: 'Kendini Anlama 🧠', subtitle: 'Kendini daha derin keşfet' },
  { id: 'Relationship growth', label: 'İlişkilerde Büyüme 🌱', subtitle: 'Bağlarını ve empatiyi güçlendir' },
  { id: 'Emotional balance', label: 'Duygusal Denge ⚖️', subtitle: 'Hislerini sakince yönet' },
  { id: 'Stress reduction', label: 'Stresi Azaltma 🧘', subtitle: 'Zihnini ve bedenini dinlendir' },
  { id: 'Personal development', label: 'Kişisel Gelişim 🚀', subtitle: 'Adım adım farkındalıkla büyü' }
];

export default function GoalsSelectionScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { user, updateUser } = useAuthStore();
  
  const [selectedGoals, setSelectedGoals] = useState<string[]>(user?.onboarding_goals || []);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const handleSave = async () => {
    if (selectedGoals.length === 0) {
      setToast({ visible: true, message: 'Lütfen en az bir hedef seçin.' });
      return;
    }
    setSaving(true);
    try {
      // Update backend
      await client.put('/user/profile', {
        onboarding_goals: selectedGoals
      });

      // Update Zustand local store
      await updateUser({
        onboarding_goals: selectedGoals
      });

      setToast({ visible: true, message: 'Hedefleriniz güncellendi ✨' });
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      setToast({ visible: true, message: 'Güncelleme yapılırken bir hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={saving}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Hedeflerim</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: currentTheme.colors.text.secondary }]}>
            Selfplace deneyimini ve yapay zeka yoldaşının rehberliğini şekillendirecek niyet ve hedeflerini seç.
          </Text>

          <View style={styles.goalsContainer}>
            {GOALS.map((goal) => {
              const isSelected = selectedGoals.includes(goal.id);
              return (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedGoals(prev => prev.filter(id => id !== goal.id));
                    } else {
                      setSelectedGoals(prev => [...prev, goal.id]);
                    }
                  }}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: isSelected ? currentTheme.colors.glow : currentTheme.colors.card,
                      borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder,
                    }
                  ]}
                  activeOpacity={0.8}
                  disabled={saving}
                >
                  <View style={styles.goalTextWrapper}>
                    <Text style={[styles.goalLabel, { color: currentTheme.colors.text.primary }]}>
                      {goal.label}
                    </Text>
                    <Text style={[styles.goalSubtitle, { color: currentTheme.colors.text.secondary }]}>
                      {goal.subtitle}
                    </Text>
                  </View>
                  <View style={[
                    styles.goalCheckbox,
                    {
                      borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.text.muted,
                      backgroundColor: isSelected ? currentTheme.colors.primary : 'transparent',
                    }
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <CustomButton
            title="Kaydet"
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: 40 }}
            disabled={selectedGoals.length === 0}
          />
        </ScrollView>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 40,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.8,
  },
  goalsContainer: {
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  goalTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
  },
  goalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  goalCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
