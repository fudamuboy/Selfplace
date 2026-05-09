import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { MascotBlob } from '../../components/MascotBlob';
import client from '../../api/client';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen tüm alanları doldurun.', success: false });
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/register', { username, email, password });
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
        message: debugInfo 
          ? `Sunucu hatası detayı:\n\n${debugInfo}${stackInfo ? `\n\nStack:\n${stackInfo.substring(0, 200)}...` : ''}`
          : 'Bir hata oluştu. Lütfen tekrar deneyin.',
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
        <View style={styles.content}>
          <View style={styles.mascotContainer}>
            <MascotBlob mood="happy" />
          </View>
          <Text style={styles.title}>Yeni Hesap</Text>
          <Text style={styles.subtitle}>Kendine giden yolculuğa buradan başla.</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı Adı"
              placeholderTextColor={Colors.text.secondary}
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="E-posta"
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
              placeholder="Şifre"
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
});

