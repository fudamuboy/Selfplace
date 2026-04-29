import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { themeModes, ThemeMode } from '../constants/themeModes';
import { LinearGradient } from 'expo-linear-gradient';

export default function ThemeSelectionScreen() {
  const router = useRouter();
  const { currentTheme, setTheme } = useThemeStore();

  const renderThemeOption = (themeId: ThemeMode['id']) => {
    const theme = themeModes[themeId];
    const isSelected = currentTheme.id === themeId;

    return (
      <TouchableOpacity
        key={themeId}
        style={[
          styles.themeCard,
          { borderColor: isSelected ? theme.colors.primary : theme.colors.cardBorder }
        ]}
        onPress={() => setTheme(themeId)}
      >
        <LinearGradient
          colors={theme.colors.background}
          style={styles.themePreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Mock UI Mockup */}
          <View style={styles.previewContent}>
            <View style={[styles.previewLine, { backgroundColor: theme.colors.text.muted, width: '40%', alignSelf: 'center', marginBottom: 12 }]} />
            
            <View style={styles.previewRow}>
               <View style={[styles.previewMood, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]} />
               <View style={[styles.previewMood, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]} />
               <View style={[styles.previewMood, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]} />
            </View>

            <View style={[styles.previewInput, { backgroundColor: theme.colors.input.background, borderColor: theme.colors.input.border }]} />
            
            <View style={[styles.previewButton, { backgroundColor: theme.colors.button.primary }]} />
          </View>

          <View style={styles.themeLabelRow}>
            <Text style={[styles.themeName, { color: theme.colors.text.primary }]}>
              {theme.name}
            </Text>
            {isSelected && (
              <View style={[styles.checkCircle, { backgroundColor: theme.colors.button.primary }]}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Uygulama Hissi</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: currentTheme.colors.text.secondary }]}>
            Selfplace'in sana nasıl hissettirmesini istersin? Aşağıdan bir mod seçerek deneyimini kişiselleştirebilirsin.
          </Text>

          <View style={styles.optionsContainer}>
            {Object.keys(themeModes).map((id) => renderThemeOption(id as ThemeMode['id']))}
          </View>
        </ScrollView>
      </View>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.8,
  },
  optionsContainer: {
    gap: 16,
  },
  themeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
  },
  themePreview: {
    padding: 20,
    height: 140,
    justifyContent: 'space-between',
  },
  previewContent: {
    opacity: 0.6,
  },
  previewLine: {
    height: 4,
    borderRadius: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewMood: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
  },
  previewInput: {
    height: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  previewButton: {
    height: 12,
    width: '100%',
    borderRadius: 6,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
