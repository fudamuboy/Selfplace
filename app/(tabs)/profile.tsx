import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import useAuthStore from '../../store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../../store/useThemeStore';
import useNotificationStore from '../../store/useNotificationStore';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';

interface Stats {
  checkInCount: number;
  topMood: string | null;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
  const { currentTheme } = useThemeStore();
  const { remindersEnabled, reminderTime, loadConfig } = useNotificationStore();

  useEffect(() => {
    fetchStats();
    loadConfig();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await client.get('/insights/stats');
      setStats(res.data);
    } catch (error) {
      console.log('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const renderMenuItem = (icon: any, title: string, subtitle?: string, onPress?: () => void, isDestructive = false) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: isDestructive ? 'rgba(248, 113, 113, 0.1)' : currentTheme.colors.glow }
        ]}>
          <Ionicons 
            name={icon} 
            size={22} 
            color={isDestructive ? '#F87171' : currentTheme.colors.primary} 
          />
        </View>
        <View style={{ marginLeft: 16 }}>
          <Text style={[
            styles.menuText, 
            { color: currentTheme.colors.text.primary, marginLeft: 0 },
            isDestructive && styles.destructiveText
          ]}>{title}</Text>
          {subtitle && (
            <Text style={{ 
              fontSize: 12, 
              color: currentTheme.colors.text.secondary,
              marginTop: 2 
            }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={currentTheme.colors.text.muted} />
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Profil</Text>
        
        {/* Profile Header Card */}
        <LinearGradient
          colors={[currentTheme.colors.glow, 'transparent']}
          style={[styles.profileCard, { borderColor: currentTheme.colors.cardBorder }]}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setIsModalVisible(true)}
            >
              <LinearGradient
                colors={[currentTheme.colors.mascot.start, currentTheme.colors.mascot.end]}
                style={styles.avatarGlow}
              >
                <View style={[styles.avatar, { backgroundColor: currentTheme.colors.background[1] }]}>
                  <Text style={styles.avatarLetter}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={[styles.welcomeText, { color: currentTheme.colors.text.primary }]}>Merhaba, {user?.username} 🌿</Text>
              <Text style={[styles.subWelcomeText, { color: currentTheme.colors.text.secondary }]}>Kendine ayırdığın küçük anlar burada başlar.</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Rhythm Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: currentTheme.colors.text.secondary }]}>Senin Ritmin</Text>
          <View style={[styles.rhythmCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            {loading ? (
              <ActivityIndicator color={currentTheme.colors.primary} size="small" />
            ) : (
              <>
                <View style={styles.rhythmItem}>
                  <Ionicons name="calendar-outline" size={20} color={currentTheme.colors.primary} style={styles.rhythmIcon} />
                  <Text style={[styles.rhythmText, { color: currentTheme.colors.text.primary }]}>
                    Son 7 günde <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>{stats?.checkInCount || 0}</Text> kez kendine alan açtın.
                  </Text>
                </View>
                {stats?.topMood && (
                  <View style={[styles.rhythmItem, { marginTop: 12 }]}>
                    <Ionicons name="heart-outline" size={20} color={currentTheme.colors.primary} style={styles.rhythmIcon} />
                    <Text style={[styles.rhythmText, { color: currentTheme.colors.text.primary }]}>
                      Bu hafta en çok <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>{stats.topMood}</Text> hissetmiş olabilirsin.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Premium Teaser Card */}
        <View style={styles.section}>
          <LinearGradient
            colors={[currentTheme.colors.card, 'transparent']}
            style={[styles.premiumCard, { borderColor: currentTheme.colors.cardBorder }]}
          >
            <View style={styles.premiumHeader}>
              <View style={[styles.premiumIconContainer, { backgroundColor: currentTheme.colors.glow }]}>
                <Ionicons name="sparkles" size={18} color={currentTheme.colors.primary} />
              </View>
              <Text style={[styles.premiumTitle, { color: currentTheme.colors.text.primary }]}>Daha fazlası yakında ✨</Text>
            </View>
            <Text style={[styles.premiumSubtitle, { color: currentTheme.colors.text.secondary }]}>
              Selfplace zamanla daha kişisel içgörüler ve daha derin farkındalıklar sunacak.
            </Text>
            <TouchableOpacity 
              style={[styles.notifyButton, { backgroundColor: currentTheme.colors.glow }]}
              onPress={() => setIsPremiumModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.notifyButtonText, { color: currentTheme.colors.primary }]}>Beni haberdar et</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Menu */}
        <View style={[styles.menuContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          {renderMenuItem('settings-outline', 'Ayarlar', undefined, () => router.push('/settings'))}
          {renderMenuItem(
            'notifications-outline', 
            'Günlük Hatırlatıcı', 
            remindersEnabled ? `Her gün ${reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : 'Kapalı',
            () => router.push('/settings')
          )}
          {renderMenuItem('color-palette-outline', 'Uygulama Hissi', undefined, () => router.push('/theme-selection'))}
          {renderMenuItem('shield-checkmark-outline', 'Gizlilik ve Veriler', undefined, () => router.push('/privacy-data'))}
          <View style={[styles.logoutSeparator, { backgroundColor: currentTheme.colors.cardBorder }]} />
          {renderMenuItem('log-out-outline', 'Çıkış Yap', undefined, handleLogout, true)}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: currentTheme.colors.text.muted }]}>Kendini tanıma yolculuğun küçük adımlarla ilerler ✨</Text>
        </View>
      </ScrollView>

      {/* Profile Details Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.background[1], borderColor: currentTheme.colors.glow }]}>
            <View style={styles.modalHeader}>
               <Text style={[styles.modalTitle, { color: currentTheme.colors.text.primary }]}>Profil Bilgileri</Text>
               <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                 <Ionicons name="close" size={24} color={currentTheme.colors.text.secondary} />
               </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
               <View style={styles.modalAvatarContainer}>
                  <LinearGradient
                    colors={[currentTheme.colors.mascot.start, currentTheme.colors.mascot.end]}
                    style={styles.largeAvatarGlow}
                  >
                    <View style={[styles.largeAvatar, { backgroundColor: currentTheme.colors.background[1] }]}>
                      <Text style={styles.largeAvatarLetter}>
                        {user?.username?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </LinearGradient>
               </View>

               <View style={styles.infoGroup}>
                  <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>Kullanıcı Adı</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.colors.text.primary }]}>{user?.username}</Text>
               </View>

               <View style={styles.infoGroup}>
                  <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>E-posta</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.colors.text.primary }]}>{user?.email}</Text>
               </View>
            </View>

            <CustomButton 
              title="Kapat" 
              onPress={() => setIsModalVisible(false)} 
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={isPremiumModalVisible}
        title="Harika ✨"
        message="Yeni özellikler hazır olduğunda seni nazikçe bilgilendireceğiz."
        onClose={() => setIsPremiumModalVisible(false)}
        confirmText="Tamam"
      />
    </GradientBackground>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subWelcomeText: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  emailText: {
    fontSize: 12,
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  rhythmCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  rhythmItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rhythmIcon: {
    marginRight: 12,
  },
  rhythmText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  menuContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
  },
  destructiveText: {
    color: '#F87171',
  },
  logoutSeparator: {
    height: 1,
    marginHorizontal: 18,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  premiumCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  premiumSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  notifyButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  notifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalAvatarContainer: {
    marginBottom: 32,
  },
  largeAvatarGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  largeAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarLetter: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
  },
  infoGroup: {
    width: '100%',
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '600',
  },
});
