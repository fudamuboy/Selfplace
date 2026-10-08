import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal , Platform } from 'react-native';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { CONTENT_MAX_WIDTH, MODAL_MAX_WIDTH, PAGE_PADDING_H } from '../../constants/Layout';
import { getSubscription } from '../../api/userApi';
import { PremiumUpgradeModal } from '../../components/PremiumUpgradeModal';
import { logger } from '../../utils/logger';

import { useT } from '../../i18n';

interface PlanConfig {
  title: string;
  description: string;
  buttonLabel: string;
  isPremium: boolean;
  sparkleColorKey?: 'start' | 'primary';
}

const getZodiacSign = (day: number, month: number, isEn: boolean): string => {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return isEn ? 'Aries' : 'Koç';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return isEn ? 'Taurus' : 'Boğa';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return isEn ? 'Gemini' : 'İkizler';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return isEn ? 'Cancer' : 'Yengeç';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return isEn ? 'Leo' : 'Aslan';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return isEn ? 'Virgo' : 'Başak';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return isEn ? 'Libra' : 'Terazi';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return isEn ? 'Scorpio' : 'Akrep';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return isEn ? 'Sagittarius' : 'Yay';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return isEn ? 'Capricorn' : 'Oğlak';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return isEn ? 'Aquarius' : 'Kova';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return isEn ? 'Pisces' : 'Balık';
  return isEn ? 'Unknown' : 'Bilinmiyor';
};

const getZodiacSignLabel = (sign?: string, isEn: boolean = false): string => {
  if (!sign) return '';
  const trToEn: Record<string, string> = {
    'Koç': 'Aries', 'Boğa': 'Taurus', 'İkizler': 'Gemini', 'Yengeç': 'Cancer',
    'Aslan': 'Leo', 'Başak': 'Virgo', 'Terazi': 'Libra', 'Akrep': 'Scorpio',
    'Yay': 'Sagittarius', 'Oğlak': 'Capricorn', 'Kova': 'Aquarius', 'Balık': 'Pisces'
  };
  if (isEn) return trToEn[sign] || sign;
  // Legacy rows may hold the English name; show the Turkish one in Turkish mode
  return Object.keys(trToEn).find(tr => trToEn[tr] === sign) || sign;
};

const MOOD_TR_TO_EN: Record<string, string> = {
  'Mutlu': 'Happy', 'Üzgün': 'Sad', 'Kızgın': 'Angry', 'Kaygılı': 'Anxious',
  'Yorgun': 'Tired', 'Hassas': 'Sensitive', 'Motive': 'Motivated', 'Sakin': 'Calm'
};

// Moods are stored as the Turkish key, but legacy rows may hold the English label
const getMoodLabel = (mood: string, isEn: boolean): string => {
  if (isEn) return MOOD_TR_TO_EN[mood] || mood;
  return Object.keys(MOOD_TR_TO_EN).find(tr => MOOD_TR_TO_EN[tr].toLowerCase() === mood.toLowerCase()) || mood;
};

interface Stats {
  checkInCount: number;
  topMood: string | null;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { t, language } = useT();
  const isEn = language === 'en';

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPremiumModalVisible, setIsPremiumModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const { currentTheme } = useThemeStore();
  const { remindersEnabled, reminderTime, loadConfig } = useNotificationStore();

  const { planType, setPlanType } = useAuthStore();
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);

  const MEMBERSHIP_CONFIGS: Record<string, PlanConfig> = {
    free: {
      title: isEn ? "Selfplace Free Plan" : "Selfplace Ücretsiz Plan",
      description: isEn ? "A peaceful and safe space for yourself." : "Kendin için sakin ve güvenli bir alan.",
      buttonLabel: isEn ? "Explore Plans" : "Planları Gör",
      isPremium: false,
      sparkleColorKey: 'primary',
    },
    plus: {
      title: isEn ? "Selfplace Plus Member 💜" : "Selfplace Plus Üyesi 💜",
      description: isEn ? "An emotional companion that understands you deeply." : "Sizi giderek daha iyi anlayan duygusal yoldaş.",
      buttonLabel: isEn ? "Manage Plan / Upgrade" : "Planı Yönet / Yükselt",
      isPremium: true,
      sparkleColorKey: 'primary',
    },
    signature: {
      title: isEn ? "Selfplace Signature Member ✨" : "Selfplace Signature Üyesi ✨",
      description: isEn ? "All premium features active." : "Tüm premium özellikler aktif. Duygusal yoldaşınız sizinle birlikte uyum kuruyor.",
      buttonLabel: isEn ? "Manage Plan" : "Planı Yönet / Değiştir",
      isPremium: true,
      sparkleColorKey: 'start',
    },
  };

  useEffect(() => {
    fetchStats();
    loadConfig();
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const sub = await getSubscription();
      setPlanType(sub.plan_type);
    } catch (error) {
      console.warn('[Profile] Error fetching subscription:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await client.get('/insights/stats');
      setStats(res.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const handleDateChange = async (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (!selectedDate || event.type === 'dismissed') return;
    
    try {
      setIsUpdatingProfile(true);
      const day = selectedDate.getDate();
      const month = selectedDate.getMonth() + 1;
      const newZodiac = getZodiacSign(day, month, false);
      
      const isoDate = selectedDate.toISOString();
      
      await client.put('/user/profile', {
        birth_date: isoDate,
        zodiac_sign: newZodiac
      });

      useAuthStore.getState().updateUser({
        birth_date: isoDate,
        zodiac_sign: newZodiac
      });

    } catch (err) {
      logger.error('[Profile] Error updating profile', err);
    } finally {
      setIsUpdatingProfile(false);
    }
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
        <View style={styles.innerContent}>
        <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{t('profile.title')}</Text>
        
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
              <Text style={[styles.welcomeText, { color: currentTheme.colors.text.primary }]}>
                {t('home.greeting', { name: user?.username || '' })} 🌿
              </Text>
              <Text style={[styles.subWelcomeText, { color: currentTheme.colors.text.secondary }]}>
                {isEn ? "Your personal space for reflection and balance." : "Kendine ayırdığın küçük anlar burada başlar."}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Kendini Keşfet Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: currentTheme.colors.text.secondary }]}>
            {isEn ? "Discover Yourself ✨" : "Kendini Keşfet ✨"}
          </Text>
          <Text style={[styles.discoverySubtext, { color: currentTheme.colors.text.muted }]}>
            {isEn ? "Explore your inner growth and mindset evolution 🌿" : "Kendini yeniden keşfetmek ister misin? İç dünyanda bir değişim olmuş olabilir 🌿"}
          </Text>
          <View style={[styles.menuContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            {renderMenuItem('compass-outline', isEn ? 'Inner Identity Journey ✨' : 'İçsel Kimlik Yolculuğu ✨', isEn ? 'Explore your emotional identity' : 'Duygusal kimliğini keşfet', () => router.push('/personality-test/journey'))}
            {renderMenuItem('book-outline', isEn ? 'Emotional Evolution' : 'Duygusal Evrim', isEn ? 'Your changing inner rhythm over time' : 'Zaman içinde değişen içsel ritmin', () => router.push('/personality-results'))}
          </View>
        </View>

        {/* Rhythm Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: currentTheme.colors.text.secondary }]}>
            {isEn ? "Your Rhythm" : "Senin Ritmin"}
          </Text>
          <View style={[styles.rhythmCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            {loading ? (
              <ActivityIndicator color={currentTheme.colors.primary} size="small" />
            ) : (
              <>
                <View style={styles.rhythmItem}>
                  <Ionicons name="calendar-outline" size={20} color={currentTheme.colors.primary} style={styles.rhythmIcon} />
                  <Text style={[styles.rhythmText, { color: currentTheme.colors.text.primary }]}>
                    {isEn ? (
                      <>You made space for yourself <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>{stats?.checkInCount || 0}</Text> times in the last 7 days.</>
                    ) : (
                      <>Son 7 günde <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>{stats?.checkInCount || 0}</Text> kez kendine alan açtın.</>
                    )}
                  </Text>
                </View>
                {stats?.topMood && (
                  <View style={[styles.rhythmItem, { marginTop: 12 }]}>
                    <Ionicons name="heart-outline" size={20} color={currentTheme.colors.primary} style={styles.rhythmIcon} />
                    <Text style={[styles.rhythmText, { color: currentTheme.colors.text.primary }]}>
                      {isEn ? (
                        <>You felt most <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>{getMoodLabel(stats.topMood, true)}</Text> this week.</>
                      ) : (
                        <>Bu hafta en çok <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>{getMoodLabel(stats.topMood, false)}</Text> hissetmiş olabilirsin.</>
                      )}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Premium Teaser Card / Subscription Manager */}
        {(() => {
          const config = MEMBERSHIP_CONFIGS[planType] ?? MEMBERSHIP_CONFIGS.free;
          return (
            <View style={styles.section}>
              <LinearGradient
                colors={[config.isPremium ? 'rgba(167, 139, 250, 0.08)' : currentTheme.colors.card, 'transparent']}
                style={[styles.premiumCard, { borderColor: config.isPremium ? currentTheme.colors.primary : currentTheme.colors.cardBorder }]}
              >
                <View style={styles.premiumHeader}>
                  <View style={[styles.premiumIconContainer, { backgroundColor: currentTheme.colors.glow }]}>
                    <Ionicons 
                      name="sparkles" 
                      size={18} 
                      color={config.sparkleColorKey === 'start' ? currentTheme.colors.mascot.start : currentTheme.colors.primary} 
                    />
                  </View>
                  <Text style={[styles.premiumTitle, { color: currentTheme.colors.text.primary }]}>
                    {config.title}
                  </Text>
                </View>
                <Text style={[styles.premiumSubtitle, { color: currentTheme.colors.text.secondary }]}>
                  {config.description}
                </Text>
                <TouchableOpacity 
                  style={[styles.notifyButton, { backgroundColor: currentTheme.colors.glow }]}
                  onPress={() => setIsUpgradeModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={[
                      styles.notifyButtonText, 
                      { color: config.sparkleColorKey === 'start' ? currentTheme.colors.mascot.start : currentTheme.colors.primary }
                    ]}
                  >
                    {config.buttonLabel}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          );
        })()}

        {/* Menu */}
        <View style={[styles.menuContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          {renderMenuItem('calendar-clear-outline', t('profile.emotionalArchive'), isEn ? 'View all past entries' : 'Tüm geçmiş paylaşımlarını gör', () => router.push('/history-full'))}
          {renderMenuItem('heart-circle-outline', isEn ? 'Relationships' : 'İlişki Bağlantısı', isEn ? 'Build empathy and shared spaces' : 'Birlikte empati ve anlayış kurun', () => router.push('/connections'))}
          {renderMenuItem('settings-outline', t('settings.title'), undefined, () => router.push('/settings'))}
          {renderMenuItem(
            'notifications-outline', 
            t('settings.dailyReminder'), 
            remindersEnabled ? (isEn ? `Daily at ${reminderTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : `Her gün ${reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`) : t('settings.off'),
            () => router.push('/settings')
          )}
          {renderMenuItem('color-palette-outline', t('profile.themeMode'), undefined, () => router.push('/theme-selection'))}
          {renderMenuItem('shield-checkmark-outline', t('profile.privacyAndData'), undefined, () => router.push('/privacy-data'))}
          <View style={[styles.logoutSeparator, { backgroundColor: currentTheme.colors.cardBorder }]} />
          {renderMenuItem('log-out-outline', t('settings.logout'), undefined, handleLogout, true)}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: currentTheme.colors.text.muted }]}>
            {isEn ? "Your journey of self-discovery progresses with small steps ✨" : "Kendini tanıma yolculuğun küçük adımlarla ilerler ✨"}
          </Text>
        </View>
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
               <Text style={[styles.modalTitle, { color: currentTheme.colors.text.primary }]}>{t('profile.infoTitle')}</Text>
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
                  <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>{isEn ? 'Username' : 'Kullanıcı Adı'}</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.colors.text.primary }]}>{user?.username}</Text>
               </View>

               <View style={styles.infoGroup}>
                  <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>{isEn ? 'Email' : 'E-posta'}</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.colors.text.primary }]}>{user?.email}</Text>
               </View>

               <View style={styles.infoGroup}>
                  <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>{isEn ? 'Zodiac Sign' : 'Burç'}</Text>
                  <View style={[styles.zodiacDisplay, { backgroundColor: currentTheme.colors.glow, borderColor: currentTheme.colors.cardBorder }]}>
                    <Text style={styles.zodiacSymbol}>✨</Text>
                    <Text style={[styles.zodiacValue, { color: currentTheme.colors.text.primary }]}>
                      {getZodiacSignLabel(user?.zodiac_sign, isEn) || (isEn ? 'Not determined yet' : 'Henüz belirlenmedi')}
                    </Text>
                  </View>
                  <Text style={[styles.infoSubLabel, { color: currentTheme.colors.text.muted, marginTop: 8 }]}>
                    {isEn ? 'Your zodiac sign will be calculated automatically when you update your birth date.' : 'Doğum tarihinizi güncelleyerek burcunuzun otomatik hesaplanmasını sağlayabilirsiniz.'}
                  </Text>
               </View>

               <View style={styles.infoGroup}>
                  <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>{isEn ? 'Birth Date' : 'Doğum Tarihi'}</Text>
                  <TouchableOpacity 
                    style={[styles.dateInput, { borderColor: currentTheme.colors.cardBorder, backgroundColor: currentTheme.colors.card }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[styles.dateValue, { color: user?.birth_date ? currentTheme.colors.text.primary : currentTheme.colors.text.muted }]}>
                      {isUpdatingProfile ? (isEn ? 'Updating...' : 'Güncelleniyor...') : (user?.birth_date ? new Date(user.birth_date).toLocaleDateString(isEn ? 'en-US' : 'tr-TR') : (isEn ? 'Select Date' : 'Tarih Seçin'))}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={currentTheme.colors.primary} />
                  </TouchableOpacity>
               </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={user?.birth_date ? new Date(user.birth_date) : new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                themeVariant="dark"
              />
            )}

            <CustomButton 
              title={isEn ? 'Close' : 'Kapat'} 
              onPress={() => setIsModalVisible(false)} 
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={isPremiumModalVisible}
        title={isEn ? 'Wonderful ✨' : 'Harika ✨'}
        message={isEn ? 'We will gently notify you when new features are ready.' : 'Yeni özellikler hazır olduğunda seni nazikçe bilgilendireceğiz.'}
        onClose={() => setIsPremiumModalVisible(false)}
        confirmText={isEn ? 'OK' : 'Tamam'}
      />

      <PremiumUpgradeModal
        visible={isUpgradeModalVisible}
        onClose={() => setIsUpgradeModalVisible(false)}
        currentPlan={planType}
        onPlanUpdated={(newPlan) => setPlanType(newPlan)}
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
    paddingBottom: 40,
    alignItems: 'center',
  },
  innerContent: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: PAGE_PADDING_H,
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
  discoverySubtext: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
    marginLeft: 4,
    lineHeight: 18,
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
    maxWidth: MODAL_MAX_WIDTH,
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
  infoSubLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  zodiacDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  zodiacSymbol: {
    fontSize: 24,
    marginRight: 12,
  },
  zodiacValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
