import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLanguageStore, Language } from '../store/useLanguageStore';
import useThemeStore from '../store/useThemeStore';
import { CustomButton } from '../components/CustomButton';
import { GradientBackground } from '../components/GradientBackground';
import { MascotBlob } from '../components/MascotBlob';
import { FORM_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';
import { t } from '../i18n';

// Each option is written in its own language on purpose, so both are readable before a choice is made
const OPTIONS: { lang: Language; flag: string; name: string; hint: string }[] = [
  { lang: 'tr', flag: '🇹🇷', name: 'Türkçe', hint: 'Türkçe devam et' },
  { lang: 'en', flag: '🇬🇧', name: 'English', hint: 'Continue in English' },
];

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { language, setLanguage, setHasSelectedLanguage } = useLanguageStore();
  // On first launch the store holds the device language (see loadLanguage), so it is preselected
  const [selected, setSelected] = useState<Language>(language || 'en');
  // The preselected language is listed first; the order stays put while the user taps around
  const [options] = useState(() => [...OPTIONS].sort((a, b) => Number(b.lang === selected) - Number(a.lang === selected)));
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const handleSelect = async (lang: Language) => {
    if (lang !== selected) Haptics.selectionAsync().catch(() => {});
    setSelected(lang);
  };

  const handleContinue = async () => {
    await setLanguage(selected);
    await setHasSelectedLanguage(true);
    router.replace('/onboarding');
  };

  return (
    <GradientBackground>
      <View style={styles.content}>
        <View style={styles.center}>
          <Animated.View entering={FadeIn.duration(900)} style={styles.mascot}>
            <MascotBlob mood="calm" scale={0.62} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(700).delay(150)} style={styles.header}>
            <Text style={[styles.brand, { color: colors.primary }]}>SELFPLACE</Text>
            {/* Re-keyed on selection so the copy crossfades into the chosen language */}
            <Animated.Text key={`title-${selected}`} entering={FadeIn.duration(250)} style={[styles.title, { color: colors.text.primary }]}>
              {t('languageSelection.chooseTitle', undefined, selected)}
            </Animated.Text>
            <Animated.Text key={`subtitle-${selected}`} entering={FadeIn.duration(250)} style={[styles.subtitle, { color: colors.text.secondary }]}>
              {t('languageSelection.changeLater', undefined, selected)}
            </Animated.Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.options}>
            {options.map(option => {
              const isSelected = selected === option.lang;
              return (
                <Pressable
                  key={option.lang}
                  onPress={() => handleSelect(option.lang)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.name}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    isSelected && {
                      backgroundColor: colors.secondary,
                      borderColor: colors.primary + '99',
                      shadowColor: colors.primary,
                      shadowOpacity: 0.35,
                    },
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text style={styles.flag}>{option.flag}</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionName, { color: colors.text.primary }]}>{option.name}</Text>
                    <Text style={[styles.optionHint, { color: isSelected ? colors.primary : colors.text.secondary }]}>
                      {option.hint}
                    </Text>
                  </View>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                    style={{ opacity: isSelected ? 1 : 0 }}
                  />
                </Pressable>
              );
            })}
          </Animated.View>
        </View>

        <Animated.View entering={FadeIn.duration(700).delay(500)} style={styles.footer}>
          <CustomButton
            title={t('languageSelection.confirmButton', undefined, selected)}
            onPress={handleContinue}
            style={styles.continueButton}
            textStyle={styles.continueText}
          />
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: PAGE_PADDING_H,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  mascot: {
    alignItems: 'center',
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 14,
    opacity: 0.9,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0,
  },
  optionPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  flag: {
    fontSize: 20,
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionHint: {
    fontSize: 13,
  },
  footer: {
    paddingBottom: 12,
    alignItems: 'center',
  },
  continueButton: {
    maxWidth: 320,
    paddingVertical: 13,
    borderRadius: 26,
    shadowOpacity: 0.12,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
