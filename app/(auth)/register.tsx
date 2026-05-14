import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import client from '../../api/client';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { Colors } from '../../constants/Colors';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });

  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !email || !password || !birthDate) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen tüm alanları (Doğum Tarihi dahil) doldurun.', success: false });
      return;
    }


    setLoading(true);
    try {
      await client.post('/auth/register', { 
        username, 
        email, 
        password, 
        birth_date: birthDate.toISOString().split('T')[0] 
      });

      setModal({
        visible: true,
        title: 'Başarılı',
        message: 'Kayıt olundu, şimdi giriş yapabilirsiniz.',
        success: true
      });
    } catch (err: any) {
      const errorData = err.response?.data;
      const debugInfo = errorData?.debug || errorData?.debug_error || err.message;
      const stackInfo = errorData?.stack;

      setModal({
        visible: true,
        title: 'Kayıt Başarısız',
        message: errorData?.message || 'Hesap oluşturulurken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.'
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
        <View style={styles.content}>
          <View style={styles.mascotContainer}>
            <MascotBlob mood="happy" />
          </View>
          <Text style={styles.title}>Yeni Hesap</Text>
          <Text style={styles.subtitle}>Kendine giden yolculuğa buradan başla.</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ad Soyadınızı girin"
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
                {birthDate ? birthDate.toLocaleDateString('tr-TR') : 'Doğum Tarihinizi Seçin'}
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
                      <Text style={[styles.pickerTitle, { color: Colors.text.secondary }]}>Doğum Tarihi</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.doneButtonText}>Tamam</Text>
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
              placeholder="E-posta adresinizi girin"
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
              placeholder="Şifrenizi girin"
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

          <CustomButton
            title="Kayıt Ol"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 20, width: '100%' }}
          />

          <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.linkText}>Zaten hesabın var mı? <Text style={{ fontWeight: 'bold' }}>Giriş Yap</Text></Text>
          </TouchableOpacity>
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
    padding: 24,
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
});



