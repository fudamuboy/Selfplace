import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { Toast } from '../components/Toast';
import { CustomButton } from '../components/CustomButton';
import { getRituals, respondToRitual, RelationshipRitual } from '../api/relationshipApi';
import { CONTENT_MAX_WIDTH, FORM_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';

export default function ConnectionRitualsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const connectionId = parseInt(id || '0', 10);
  
  const { currentTheme } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [ritual, setRitual] = useState<RelationshipRitual | null>(null);
  
  const [responseText, setResponseText] = useState('');
  const [includeInSynthesis, setIncludeInSynthesis] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const fetchDailyRitual = async () => {
    try {
      setLoading(true);
      const data = await getRituals(connectionId);
      setRitual(data);
      if (data.myResponse) {
        setResponseText(data.myResponse.response_text);
        setIncludeInSynthesis(data.myResponse.include_in_synthesis);
      }
    } catch (error) {
      console.warn('[ConnectionRituals] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connectionId) {
      fetchDailyRitual();
    }
  }, [connectionId]);

  const handleSubmit = async () => {
    if (!responseText.trim()) {
      showToast('Lütfen cevabınızı yazın.');
      return;
    }

    setSubmitLoading(true);
    try {
      await respondToRitual(connectionId, ritual!.ritualId, responseText, includeInSynthesis);
      showToast('Cevabınız kaydedildi ✨');
      fetchDailyRitual();
    } catch (error) {
      console.warn('[ConnectionRituals] Submit error:', error);
      showToast('Cevap kaydedilemedi.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
  };

  if (loading || !ritual) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const alreadyAnswered = !!ritual.myResponse;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Günlük Ritüel</Text>
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
              
              {/* Question Card */}
              <View style={[styles.questionCard, { backgroundColor: currentTheme.colors.glow, borderColor: currentTheme.colors.primary }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={currentTheme.colors.primary} style={styles.questionIcon} />
                <Text style={[styles.questionText, { color: currentTheme.colors.text.primary }]}>
                  {ritual.prompt}
                </Text>
              </View>

              {/* Status Section */}
              <View style={[styles.statusCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                <View style={styles.statusRow}>
                  <Ionicons 
                    name={alreadyAnswered ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={alreadyAnswered ? currentTheme.colors.primary : currentTheme.colors.text.muted} 
                  />
                  <Text style={[styles.statusText, { color: currentTheme.colors.text.secondary }]}>
                    {alreadyAnswered ? "Sizin yanıtınız tamamlandı." : "Sizin yanıtınız bekleniyor."}
                  </Text>
                </View>
                <View style={[styles.statusRow, { marginTop: 10 }]}>
                  <Ionicons 
                    name={ritual.partnerResponded ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={ritual.partnerResponded ? currentTheme.colors.primary : currentTheme.colors.text.muted} 
                  />
                  <Text style={[styles.statusText, { color: currentTheme.colors.text.secondary }]}>
                    {ritual.partnerResponded ? "Ortağınız yanıtını tamamladı 🌿" : "Ortağınızın yanıtı bekleniyor..."}
                  </Text>
                </View>
              </View>

              {/* Input Group */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>Yansıtmanız</Text>
                <TextInput
                  style={[
                    styles.textInput, 
                    { 
                      backgroundColor: currentTheme.colors.card, 
                      color: currentTheme.colors.text.primary, 
                      borderColor: currentTheme.colors.cardBorder 
                    }
                  ]}
                  value={responseText}
                  onChangeText={setResponseText}
                  placeholder="Duygularınızı, düşüncelerinizi buraya samimiyetle ve nazikçe yazın..."
                  placeholderTextColor={currentTheme.colors.text.muted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>

              {/* Synthesis toggle */}
              <View style={[styles.switchRow, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                <View style={styles.switchTexts}>
                  <Text style={[styles.switchTitle, { color: currentTheme.colors.text.primary }]}>Uyum Sentezine Dahil Et</Text>
                  <Text style={[styles.switchSub, { color: currentTheme.colors.text.muted }]}>Bu yanıt günlük AI uyum analizinde kullanılsın.</Text>
                </View>
                <Switch
                  value={includeInSynthesis}
                  onValueChange={setIncludeInSynthesis}
                  trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Action Button */}
              <CustomButton
                title={alreadyAnswered ? "Cevabı Güncelle" : "Kaydet"}
                onPress={handleSubmit}
                loading={submitLoading}
                style={{ marginTop: 20 }}
              />

              <Text style={[styles.privacyNote, { color: currentTheme.colors.text.muted }]}>
                🔒 Yanıtınız tamamen özel kalır. Ortağınız cevabınızın içeriğini doğrudan okuyamaz. Yalnızca yapay zeka, aranızdaki uyumu sentezlemek için bu verilerden yararlanır.
              </Text>

              {/* AI Ritual Reflection Synthesis Card */}
              {ritual.relationshipReflection && (
                <View style={[styles.synthesisCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                  <View style={styles.synthesisHeader}>
                    <Ionicons name="sparkles" size={18} color={currentTheme.colors.primary} />
                    <Text style={[styles.synthesisTitle, { color: currentTheme.colors.text.primary }]}>✨ Ortak Yansımanız</Text>
                  </View>
                  
                  {ritual.emotionalClimate && (
                    <View style={[styles.climateBadge, { backgroundColor: currentTheme.colors.secondary }]}>
                      <Text style={[styles.climateText, { color: currentTheme.colors.primary }]}>
                        Atmosfer: {ritual.emotionalClimate}
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.reflectionText, { color: currentTheme.colors.text.primary }]}>
                    {ritual.relationshipReflection}
                  </Text>

                  {ritual.gentleSuggestion && (
                    <>
                      <View style={[styles.divider, { backgroundColor: currentTheme.colors.cardBorder }]} />
                      <View style={styles.suggestionRow}>
                        <Ionicons name="heart" size={16} color={currentTheme.colors.accent} style={{ marginTop: 2 }} />
                        <View style={styles.suggestionTextContainer}>
                          <Text style={[styles.suggestionLabel, { color: currentTheme.colors.text.secondary }]}>Küçük Bir Adım</Text>
                          <Text style={[styles.suggestionText, { color: currentTheme.colors.text.primary }]}>
                            {ritual.gentleSuggestion}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              )}

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Toast 
          visible={toast.visible} 
          message={toast.message} 
          onHide={() => setToast({ ...toast, visible: false })} 
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
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 60,
    flexGrow: 1,
  },
  formOuter: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  questionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  questionIcon: {
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  textInput: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    height: 140,
    lineHeight: 22,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  switchTexts: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  privacyNote: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  synthesisCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 30,
    marginBottom: 10,
  },
  synthesisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  synthesisTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  climateBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  climateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reflectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
