import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView as RNScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  Extrapolate,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../components/GradientBackground';
import { CustomModal } from '../components/CustomModal';
import client from '../api/client';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { pickFallbackCards } from '../utils/cardPool';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_HEIGHT = CARD_WIDTH * 1.45;
const GAP = 20;
const SNAP_INTERVAL = CARD_WIDTH + GAP;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

// ─── Legacy tiny pool kept for TypeScript type reference only ────────────────
// Actual fallback content is now served from utils/cardPool.ts
const _LEGACY_POOL_STUB = [{ icon: '', title: '', message: '', category: '' }];

// ─── Particle component ──────────────────────────────────────────────────────
const Particle = ({ color, delay }: { color: string; delay: number }) => {
  const x = useSharedValue(Math.random() * 200 - 100);
  const startY = useSharedValue(Math.random() * 60 + 20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0.2, { duration: 1800 })
        ),
        -1,
        false
      )
    );
    startY.value = withDelay(
      delay,
      withRepeat(withTiming(startY.value - 120, { duration: 3000, easing: Easing.out(Easing.quad) }), -1, false)
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: startY.value },
      { scale: scale.value },
    ],
  }));

  const size = Math.random() * 5 + 3;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

import { useT } from '../i18n';

// ─── Single Card Face (Back) ─────────────────────────────────────────────────
const CardBack = ({
  index,
  theme,
  isEn,
}: {
  index: number;
  theme: any;
  isEn: boolean;
}) => {
  const BACK_PATTERNS = ['✦', '◈', '⬡'];
  return (
    <LinearGradient
      colors={[
        index % 3 === 0
          ? 'rgba(167,139,250,0.18)'
          : index % 3 === 1
          ? 'rgba(192,132,252,0.22)'
          : 'rgba(139,92,246,0.16)',
        'rgba(15,17,26,0.7)',
      ]}
      style={styles.cardFace}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View
        style={[
          styles.cardBackBorder,
          { borderColor: theme.colors.primary + '55' },
        ]}
      >
        <Text style={[styles.cardBackPattern, { color: theme.colors.primary + 'CC' }]}>
          {BACK_PATTERNS[index % 3]}
        </Text>
        <View style={[styles.cardBackDot, { backgroundColor: theme.colors.primary + '40' }]} />
        <View style={[styles.cardBackSubtext]}>
          <Text style={{ color: theme.colors.primary + '88', fontSize: 10, letterSpacing: 2 }}>
            {isEn ? 'FOR YOU' : 'SENİN İÇİN'}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

// ─── Single Card Face (Front / Revealed) ─────────────────────────────────────
const CardFront = ({
  data,
  theme,
}: {
  data: any;
  theme: any;
}) => {
  return (
    <LinearGradient
      colors={['rgba(20,10,40,0.72)', 'rgba(50,20,80,0.60)', 'rgba(10,8,20,0.88)']}
      style={styles.cardFace}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {/* Subtle top accent stripe */}
      <LinearGradient
        colors={[theme.colors.primary + '55', 'transparent']}
        style={styles.cardFrontAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.cardFrontInner}>
        {/* Category pill */}
        {data.category ? (
          <View style={[styles.categoryPill, { borderColor: theme.colors.primary + '90', backgroundColor: theme.colors.primary + '50' }]}>
            <Text style={[styles.categoryPillText, { color: '#FFFFFF' }]}>
              {data.category.toUpperCase()}
            </Text>
          </View>
        ) : null}

        {/* Icon */}
        <Text style={styles.cardFrontIcon}>{data.icon}</Text>

        {/* Text panel — dark frosted layer for contrast */}
        <View style={styles.cardTextPanel}>
          <Text style={styles.cardFrontTitle}>
            {data.title}
          </Text>
          <Text style={styles.cardFrontMessage}>
            {data.message}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

// ─── The Flippable Card ───────────────────────────────────────────────────────
const FlipCard = (props: {
  index: number;
  scrollX: SharedValue<number>;
  selected: boolean;
  hasSelection: boolean;
  data: any;
  theme: any;
  isEn: boolean;
  onSelect: () => void;
  onFlipComplete: () => void;
  floatDelay: number;
}) => {
  const { index, scrollX, selected, hasSelection, data, theme, isEn, onSelect, floatDelay } = props;
  const flip = useSharedValue(0);
  const floatY = useSharedValue(0);
  const internalScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const [flipped, setFlipped] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const handleFlipFinish = () => {
    setFlipped(true);
    setShowParticles(true);
  };

  useEffect(() => {
    if (flipped && props.onFlipComplete) {
      props.onFlipComplete();
    }
  }, [flipped]);

  useEffect(() => {
    floatY.value = withDelay(
      floatDelay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    glowOpacity.value = withDelay(
      floatDelay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.2, { duration: 2400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, []);

  useEffect(() => {
    if (selected) {
      floatY.value = withTiming(0, { duration: 400 });
      internalScale.value = withSpring(1.08, { damping: 14, stiffness: 120 });
      flip.value = withDelay(
        200,
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) }, (finished) => {
          if (finished) {
            runOnJS(handleFlipFinish)();
          }
        })
      );
    } else if (hasSelection && !selected) {
      internalScale.value = withTiming(0.82, { duration: 500 });
    } else if (!hasSelection) {
      internalScale.value = withSpring(1);
      if (flip.value === 1) {
        flip.value = withTiming(0, { duration: 600 });
        setFlipped(false);
        setShowParticles(false);
      }
    }
  }, [selected, hasSelection]);

  const containerStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.82, 1.0, 0.82],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.45, 1.0, 0.45],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateY: floatY.value },
        { scale: hasSelection ? internalScale.value : scale },
      ],
      opacity: hasSelection && !selected ? withTiming(0.35) : opacity,
    };
  });

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const particles = Array.from({ length: 8 });

  return (
    <Animated.View style={[styles.cardWrapper, containerStyle]}>
      <Animated.View
        style={[
          styles.cardGlow,
          glowStyle,
          {
            shadowColor: theme.colors.primary,
            backgroundColor: theme.colors.primary + '18',
          },
        ]}
      />

      {showParticles && (
        <View style={styles.particleContainer} pointerEvents="none">
          {particles.map((_, i) => (
            <Particle key={i} color={theme.colors.primary} delay={i * 120} />
          ))}
        </View>
      )}

      <View style={styles.cardTouchable} pointerEvents={hasSelection && !flipped ? "none" : "auto"}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onSelect}
          disabled={hasSelection}
          style={{ width: '100%', height: '100%' }}
        >
          <Animated.View style={[styles.cardInner, backStyle]}>
            <CardBack index={index} theme={theme} isEn={isEn} />
          </Animated.View>

          <Animated.View style={[styles.cardInner, frontStyle]}>
            <CardFront data={data} theme={theme} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Pagination Dots ──────────────────────────────────────────────────────────
const PaginationDot = ({ i, scrollX, theme }: { i: number; scrollX: SharedValue<number>; theme: any }) => {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (i - 1) * SNAP_INTERVAL,
      i * SNAP_INTERVAL,
      (i + 1) * SNAP_INTERVAL,
    ];
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolate.CLAMP
    );
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1.2, 0.8],
      Extrapolate.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
      backgroundColor: opacity > 0.8 ? theme.colors.primary : theme.colors.text.muted,
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
};

const PaginationDots = ({
  count,
  scrollX,
  theme,
}: {
  count: number;
  scrollX: SharedValue<number>;
  theme: any;
}) => {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <PaginationDot key={i} i={i} scrollX={scrollX} theme={theme} />
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CardsScreen() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [alreadySelected, setAlreadySelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { t, language } = useT();
  const isEn = language === 'en';
  const scrollX = useSharedValue(0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      // Categories arrive localized from the API, so match both languages
      case 'Öz-Şefkat':
      case 'Self-Compassion': return '💜';
      case 'Alan Aç':
      case 'Make Space': return '🌙';
      case 'Küçük Cesaret':
      case 'Small Courage': return '🌱';
      case 'Farkındalık':
      case 'Mindfulness': return '✨';
      case 'Nefes':
      case 'Breath': return '🫧';
      case 'Hafiflik':
      case 'Lightness': return '🎈';
      case 'Derinleş':
      case 'Deepen': return '🌊';
      case 'Dinlenme':
      case 'Rest': return '🛌';
      default: return '🌸';
    }
  };

  const getLocalDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const fetchCards = async () => {
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await client.get(`/cards/interactive?localDate=${getLocalDate()}`);
      const data = res.data;
      const fetchedCards = Array.isArray(data) ? data : (data.cards || []);
      const isSel = Array.isArray(data) ? false : !!data.alreadySelected;

      const mapped = fetchedCards.map((c: any) => ({
        id: c.id,
        icon: getCategoryIcon(c.category),
        title: c.title,
        message: c.content,
      }));

      setCards(mapped);
      setAlreadySelected(isSel);
      if (isSel) {
        setSelectedIndex(0);
      }
    } catch (error: any) {
      if (error?.isSessionExpiry) {
        setLoading(false);
        return;
      }
      const fallback = await pickFallbackCards(3, isEn);
      setCards(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.7, 1]),
  }));

  const isSelectingRef = useRef(false);

  const handleSelect = (index: number) => {
    if (selectedIndex !== null || isSelectingRef.current) return;
    isSelectingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIndex(index);
  };

  const handleComplete = async () => {
    if (selectedIndex === null) return;
    const selectedCard = cards[selectedIndex];
    if (!selectedCard) return;

    setSubmitting(true);

    try {
      if (!alreadySelected && selectedCard.id) {
        await client.post(`/cards/interactive/select`, {
          cardId: selectedCard.id,
          localDate: getLocalDate()
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      if (err?.isSessionExpiry) {
        setSubmitting(false);
        return;
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    isSelectingRef.current = false;
    setSelectedIndex(null);
  };

  return (
    <GradientBackground>
      <RNScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Animated.Text style={[styles.headerEyebrow, { color: currentTheme.colors.primary }, shimmerStyle]}>
            {isEn ? 'Your Invitation Card' : 'Davet Kartın'}
          </Animated.Text>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text.primary }]}>
            {alreadySelected ? (isEn ? "Today's Invitation ✨" : 'Bugünkü Davetin ✨') : (isEn ? 'Pick a Card' : 'Bir kart seç')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.colors.text.secondary }]}>
            {loading 
              ? (isEn ? 'Preparing cards...' : 'Kartların hazırlanıyor...') 
              : alreadySelected
                ? (isEn ? 'Your gentle step for today is right here.' : 'Bugün kendin için seçtiğin küçük adım burada.')
                : selectedIndex === null
                  ? (isEn ? 'A personal invitation awaits you' : 'Sana özel bir davet seni bekliyor')
                  : (isEn ? 'Found something special for you ✨' : 'Senin için bir şey bulduk ✨')}
          </Text>
          {!alreadySelected && selectedIndex === null && (
            <Text style={[styles.helperText, { color: currentTheme.colors.text.muted }]}>
              {isEn ? 'You can pick 1 card per day ✨' : 'Her gün yalnızca 1 kart seçebilirsin ✨'}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={[styles.carouselContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: currentTheme.colors.text.muted }}>{t('common.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.carouselContainer}>
              <Animated.ScrollView
                horizontal
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                snapToAlignment="center"
                contentContainerStyle={styles.carouselContent}
                // @ts-ignore
                clipChildren={false}
              >
                {cards.map((card, i) => (
                  <FlipCard
                    key={i}
                    index={i}
                    scrollX={scrollX}
                    selected={selectedIndex === i}
                    hasSelection={selectedIndex !== null}
                    data={card}
                    theme={currentTheme}
                    isEn={isEn}
                    onSelect={() => handleSelect(i)}
                    onFlipComplete={() => {}}
                    floatDelay={i * 400}
                  />
                ))}
              </Animated.ScrollView>
            </View>

            {selectedIndex === null && (
              <PaginationDots count={cards.length} scrollX={scrollX} theme={currentTheme} />
            )}
          </>
        )}

        {selectedIndex === null && (
          <Text style={[styles.hintText, { color: currentTheme.colors.text.muted }]}>
            {isEn ? 'Trust your intuition — the right card will reach you' : 'Sezgilerine güven — doğru kart seni bulur'}
          </Text>
        )}

        <View style={styles.bottomActions}>
          {selectedIndex !== null && (
            <>
              <TouchableOpacity 
                onPress={handleComplete} 
                disabled={submitting}
                style={[styles.primaryActionBtn, { backgroundColor: currentTheme.colors.primary }]}
              >
                <Text style={[styles.primaryActionText, { color: currentTheme.colors.button.text }]}>
                  {submitting ? (isEn ? 'Saving...' : 'Kaydediliyor...') : alreadySelected ? (isEn ? 'Done' : 'Tamam') : (isEn ? 'Completed ✨' : 'Tamamladım ✨')}
                </Text>
              </TouchableOpacity>

              {!alreadySelected && (
                <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                  <Text style={[styles.resetText, { color: currentTheme.colors.text.secondary }]}>
                    {isEn ? '← Pick another card' : '← Başka bir kart seç'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          
          {selectedIndex === null && (
            <TouchableOpacity onPress={() => router.back()} style={styles.laterBtn}>
              <Text style={[styles.laterText, { color: currentTheme.colors.text.muted }]}>
                {isEn ? 'Return later' : 'Daha sonra dönerim'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </RNScrollView>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.title === 'Harika ✨' || modal.title === 'Great ✨') router.back();
        }}
      />
    </GradientBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 0, // Header is centered by its own View
    alignItems: 'center',
    // Removed minHeight: '100%' to fix Bug 3
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  helperText: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.85,
  },

  // Carousel Row
  carouselContainer: {
    width: '100%',
    height: CARD_HEIGHT + 60, // Sufficient height for floating and scaling (Bug 2)
    marginBottom: 10,
  },
  carouselContent: {
    paddingHorizontal: SIDE_PADDING, // Snap to center for first/last (Bug 1)
    alignItems: 'center',
    gap: GAP,
  },

  // Individual card
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 20,
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Card back face
  cardFace: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  cardBackBorder: {
    flex: 1,
    margin: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cardBackPattern: {
    fontSize: 40,
  },
  cardBackDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  cardBackSubtext: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },

  // Card front face
  cardFrontAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardFrontInner: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cardFrontIcon: {
    fontSize: 42,
    marginBottom: 4,
  },
  // Dark frosted panel behind title + message for guaranteed contrast
  cardTextPanel: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardFrontTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.1,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardFrontMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.95)',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  ctaButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Particles
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },

  // Dots (Bug 4)
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 20,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Hint & bottom
  hintText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  bottomActions: {
    width: '100%',
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 15,
    marginTop: 20,
  },
  primaryActionBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryActionText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
  },
  laterBtn: {
    paddingVertical: 10,
  },
  laterText: {
    fontSize: 14,
  },
});
