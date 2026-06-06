import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { sendInvite } from '../api/relationshipApi';
import { FORM_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';

const RELATIONSHIP_TYPES = [
  { key: 'partner', label: 'Partner', icon: 'heart-outline', desc: 'Romantik birliktelikler için' },
  { key: 'best_friend', label: 'En Yakın Arkadaş', icon: 'star-outline', desc: 'En güvendiğiniz dostunuz için' },
  { key: 'family', label: 'Aile Üyesi', icon: 'home-outline', desc: 'Aile bireyleriniz için' },
  { key: 'close_person', label: 'Yakın Kişi', icon: 'people-outline', desc: 'Diğer tüm yakın bağlar için' }
];

export default function ConnectionInviteScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [connectionType, setConnectionType] = useState('partner');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });

  const handleSendInvite = async () => {
    if (!email) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen davet etmek istediğiniz kişinin e-posta adresini girin.', success: false });
      return;
    }

    setLoading(true);
    try {
      await sendInvite(email, connectionType, alias);
      setModal({
        visible: true,
        title: 'Davet Gönderildi ✨',
        message: `${email} adresine bağlantı isteğiniz başarıyla iletildi. Karşı taraf kabul ettiğinde bağlantınız aktif olacaktır.`,
        success: true
      });
    } catch (error: any) {
      setModal({
        visible: true,
        title: 'Hata',
        message: error.response?.data?.message || 'İstek gönderilirken bir hata oluştu. Lütfen bilgileri kontrol edip tekrar deneyin.',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Bağlantı Daveti</Text>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formOuter}>
              <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
                Birlikte duygusal uyum kurmak istediğiniz kişinin e-posta adresini girin ve ilişkinizin türünü seçin.
              </Text>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>E-posta Adresi</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: currentTheme.colors.card, color: currentTheme.colors.text.primary, borderColor: currentTheme.colors.cardBorder }]}
                  placeholder="ornek@email.com"
                  placeholderTextColor={currentTheme.colors.text.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Alias Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>Takma Ad / Nickname (Opsiyonel)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: currentTheme.colors.card, color: currentTheme.colors.text.primary, borderColor: currentTheme.colors.cardBorder }]}
                  placeholder="Onu nasıl çağırmak istersiniz?"
                  placeholderTextColor={currentTheme.colors.text.muted}
                  value={alias}
                  onChangeText={setAlias}
                  autoCorrect={false}
                />
              </View>

              {/* Relationship Type Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>İlişki Türü</Text>
                <View style={styles.typesContainer}>
                  {RELATIONSHIP_TYPES.map((type) => {
                    const isSelected = connectionType === type.key;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.typeCard,
                          { 
                            backgroundColor: isSelected ? currentTheme.colors.glow : currentTheme.colors.card,
                            borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder
                          }
                        ]}
                        onPress={() => setConnectionType(type.key)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.typeHeader}>
                          <Ionicons 
                            name={type.icon as any} 
                            size={20} 
                            color={isSelected ? currentTheme.colors.primary : currentTheme.colors.text.secondary} 
                          />
                          <Text 
                            style={[
                              styles.typeLabel, 
                              { color: isSelected ? currentTheme.colors.text.primary : currentTheme.colors.text.secondary, fontWeight: isSelected ? '700' : '500' }
                            ]}
                          >
                            {type.label}
                          </Text>
                        </View>
                        <Text style={[styles.typeDesc, { color: currentTheme.colors.text.muted }]}>{type.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Send Button */}
              <CustomButton
                title="Davet Gönder"
                onPress={handleSendInvite}
                loading={loading}
                style={{ marginTop: 24, width: '100%' }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <CustomModal
          visible={modal.visible}
          title={modal.title}
          message={modal.message}
          onClose={() => {
            setModal({ ...modal, visible: false });
            if (modal.success) router.replace('/connections');
          }}
        />
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
    paddingHorizontal: PAGE_PADDING_H,
    marginBottom: 16,
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
    flexGrow: 1,
  },
  formOuter: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  typesContainer: {
    gap: 12,
    marginTop: 4,
  },
  typeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 15,
  },
  typeDesc: {
    fontSize: 12,
    marginLeft: 30,
  },
});
