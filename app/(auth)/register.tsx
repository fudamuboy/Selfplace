import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

import client from '../../api/client';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { Colors } from '../../constants/Colors';
import { FORM_MAX_WIDTH, PAGE_PADDING_H } from '../../constants/Layout';

import { useT } from '../../i18n';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });

  const router = useRouter();
  const { t, language } = useT();
  const isEn = language === 'en';

  const handleRegister = async () => {
    if (!username || !email || !password || !birthDate) {
      setModal({ visible: true, title: t('common.error'), message: isEn ? 'Please fill in all fields (including Birth Date).' : 'Lütfen tüm alanları (Doğum Tarihi dahil) doldurun.', success: false });
      return;
    }
    
    if (!acceptedTerms) {
      setModal({ visible: true, title: t('common.error'), message: isEn ? 'Please accept the terms of service and privacy policy.' : 'Lütfen kullanım koşullarını ve gizlilik politikasını kabul edin.', success: false });
      return;
    }

    setLoading(true);
    try {
      const storedGoals = await AsyncStorage.getItem('onboardingGoals');
      const onboardingGoals = storedGoals ? JSON.parse(storedGoals) : [];

      await client.post('/auth/register', { 
        username, 
        email, 
        password, 
        birth_date: birthDate.toISOString().split('T')[0],
        accepted_terms: acceptedTerms,
        onboarding_goals: onboardingGoals
      });

      setModal({
        visible: true,
        title: t('common.success'),
        message: isEn ? 'Registration successful, you can now log in.' : 'Kayıt olundu, şimdi giriş yapabilirsiniz.',
        success: true
      });
    } catch (err: any) {
      const errorData = err.response?.data;

      setModal({
        visible: true,
        title: t('auth.registerTab') + ' ' + t('common.error'),
        message: errorData?.message || t('errors.generic'),
        success: false
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.formOuter}>
          <View style={styles.content}>
          <View style={styles.mascotContainer}>
            <MascotBlob mood="happy" />
          </View>
          <Text style={styles.title}>{isEn ? 'Create Account' : 'Yeni Hesap'}</Text>
          <Text style={styles.subtitle}>{isEn ? 'Begin your journey of self-discovery here.' : 'Kendine giden yolculuğa buradan başla.'}</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={isEn ? 'Enter your full name' : 'Ad Soyadınızı girin'}
              placeholderTextColor={Colors.text.secondary}
              value={username}
              onChangeText={setUsername}
            />
          </View>

      <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={[styles.input, styles.dateInput]} 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateText, { color: birthDate ? Colors.text.primary : Colors.text.secondary }]}>
                {birthDate ? birthDate.toLocaleDateString(isEn ? 'en-US' : 'tr-TR') : (isEn ? 'Select Birth Date' : 'Doğum Tarihinizi Seçin')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={Colors.text.secondary} />
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <Text style={[styles.pickerTitle, { color: Colors.text.secondary }]}>{t('profile.birthDate')}</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.doneButtonText}>{t('common.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={birthDate || new Date(2000, 0, 1)}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setBirthDate(selectedDate);
                      }}
                      maximumDate={new Date()}
                      themeVariant="dark"
                      textColor="#FFFFFF"
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setBirthDate(selectedDate);
                  }}
                  maximumDate={new Date()}
                />
              )
            )}

          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={Colors.text.secondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>


          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={Colors.text.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                {acceptedTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
            </TouchableOpacity>
            <View style={styles.termsTextWrapper}>
              <Text style={styles.termsTextInner}>
                <Link href="/terms" style={styles.termsLink} suppressHighlighting>
                  {t('settings.termsOfService')}
                </Link>
                {isEn ? ' and ' : '\'nı ve '}
                <Link href="/privacy-policy" style={styles.termsLink} suppressHighlighting>
                  {t('settings.privacyPolicy')}
                </Link>
                {isEn ? '. I accept.' : '\'nı okudum ve kabul ediyorum.'}
              </Text>
            </View>
          </View>

          <CustomButton
            title={t('auth.registerButton')}
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 20, width: '100%' }}
          />

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.linkText}>{t('auth.hasAccount')} <Text style={{ fontWeight: 'bold' }}>{t('auth.loginButton')}</Text></Text>
          </TouchableOpacity>
          
          <Text style={styles.disclaimerText}>
            {isEn ? "Selfplace is designed for emotional awareness and mindfulness. It is not a replacement for professional therapy." : "Selfplace duygusal destek ve farkındalık amaçlıdır. Profesyonel terapi yerine geçmez."}
          </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.success) router.replace('/(auth)/login');
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: PAGE_PADDING_H,
  },
  formOuter: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  mascotContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    transform: [{ scale: 0.8 }]
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  loginLink: {
    marginTop: 24,
    padding: 10,
  },
  linkText: {
    color: Colors.text.primary,
    fontSize: 15,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginRight: 8,
  },
  doneButtonText: {
    color: Colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerContainer: {
    backgroundColor: '#0F172A', // Deep Navy Solid
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.text.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsTextWrapper: {
    flex: 1,
  },
  termsTextInner: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  disclaimerText: {
    marginTop: 20,
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});



