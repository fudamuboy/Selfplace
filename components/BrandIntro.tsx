import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import useThemeStore from '../store/useThemeStore';
import { GradientBackground } from './GradientBackground';
import { MascotBlob } from './MascotBlob';
import { t } from '../i18n';

export type BrandIntroVariant = 'full' | 'compact';

interface Props {
  /**
   * 'full' on first launch, 'compact' for returning users. null while unknown (the first few
   * milliseconds of startup): only the dark background shows, identical to the native splash.
   */
  variant: BrandIntroVariant | null;
  /** App hydration finished. The intro never hides before this, and never stalls it either. */
  ready: boolean;
  onFinish: () => void;
}

// Timelines (ms from the moment the variant is known). The real startup work runs in parallel underneath.
const TIMELINES = {
  full: {
    aura: { delay: 0, duration: 900 },
    mascot: { delay: 500, duration: 900 },
    brand: { delay: 1200, stagger: 55, duration: 500 },
    orbit: { delay: 1600, duration: 600 },
    taglineAt: 2200,
    taglineMinVisible: 900,
    minSequence: 3400,
    reducedMotion: 1200,
    contentOut: 260,
    backgroundOut: 300,
  },
  compact: {
    aura: { delay: 0, duration: 400 },
    mascot: { delay: 100, duration: 500 },
    brand: { delay: 450, stagger: 30, duration: 350 },
    orbit: { delay: 650, duration: 300 },
    taglineAt: 950,
    taglineMinVisible: 700,
    minSequence: 1900,
    reducedMotion: 800,
    contentOut: 220,
    backgroundOut: 260,
  },
} as const;

const BRAND = 'SELFPLACE';
const ORBIT_SIZE = 252; // just outside the mascot's large glow at scale 0.7 (320 × 0.7 = 224)
const ORBIT_STROKE = 1.5;
const ORBIT_R = (ORBIT_SIZE - ORBIT_STROKE * 2) / 2;
const ORBIT_C = 2 * Math.PI * ORBIT_R;

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_SINE = Easing.inOut(Easing.sin);

/** One letter of SELFPLACE, rising and fading in on its own delay. */
const BrandLetter: React.FC<{ char: string; delay: number; duration: number; color: string; start: boolean; reduceMotion: boolean }> = ({
  char, delay, duration, color, start, reduceMotion,
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!start) return;
    progress.value = withDelay(reduceMotion ? 0 : delay, withTiming(1, { duration: reduceMotion ? 300 : duration, easing: EASE_OUT }));
  }, [start, delay, duration, reduceMotion, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * 6 }],
  }));
  return <Animated.Text style={[styles.brandLetter, { color }, style]}>{char}</Animated.Text>;
};

/**
 * Brand moment shown on cold start, in place of a loading spinner. Not a fake loader:
 * it overlays the real startup, waits for it if needed, and fades away to reveal the
 * screen already routed underneath. Mounted once per cold start, so returning from the
 * background never replays it.
 */
export const BrandIntro: React.FC<Props> = ({ variant, ready, onFinish }) => {
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const reduceMotion = useReducedMotion();
  const mountedAt = useRef(Date.now());
  const startedAt = useRef<number | null>(null);
  const [showTagline, setShowTagline] = useState(false);
  const timeline = TIMELINES[variant ?? 'full'];

  const auraIn = useSharedValue(0);
  const auraBreath = useSharedValue(0);
  const mascotIn = useSharedValue(0);
  const orbitIn = useSharedValue(0);
  const orbitSpin = useSharedValue(0);
  const taglineIn = useSharedValue(0);
  const contentOut = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  // Phases 1, 2 and 4: atmosphere → mascot → orbit (the letters of phase 3 animate themselves)
  useEffect(() => {
    if (!variant) return;
    startedAt.current = Date.now();
    const tl = TIMELINES[variant];
    if (reduceMotion) {
      auraIn.value = withTiming(1, { duration: 300 });
      mascotIn.value = withTiming(1, { duration: 300 });
      orbitIn.value = withTiming(1, { duration: 300 });
      return;
    }
    auraIn.value = withDelay(tl.aura.delay, withTiming(1, { duration: tl.aura.duration, easing: EASE_OUT }));
    auraBreath.value = withDelay(
      tl.aura.duration,
      withRepeat(withSequence(withTiming(1, { duration: 1600, easing: EASE_SINE }), withTiming(0, { duration: 1600, easing: EASE_SINE })), -1)
    );
    mascotIn.value = withDelay(tl.mascot.delay, withTiming(1, { duration: tl.mascot.duration, easing: EASE_OUT }));
    orbitIn.value = withDelay(tl.orbit.delay, withTiming(1, { duration: tl.orbit.duration, easing: EASE_OUT }));
    orbitSpin.value = withDelay(tl.orbit.delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1));
    return () => {
      cancelAnimation(auraBreath);
      cancelAnimation(orbitSpin);
    };
  }, [variant, reduceMotion, auraIn, auraBreath, mascotIn, orbitIn, orbitSpin]);

  // Phase 5: tagline — only once the app is ready, so it renders in the resolved language
  useEffect(() => {
    if (!ready || !variant || startedAt.current === null) return;
    const tl = TIMELINES[variant];
    const wait = reduceMotion ? 0 : Math.max(0, tl.taglineAt - (Date.now() - startedAt.current));
    const timer = setTimeout(() => {
      setShowTagline(true);
      taglineIn.value = withTiming(1, { duration: reduceMotion ? 300 : variant === 'full' ? 600 : 400, easing: EASE_OUT });
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, variant, reduceMotion, taglineIn]);

  // Exit: after the sequence if the app is already ready, otherwise as soon as it becomes ready
  useEffect(() => {
    if (!ready || !variant || startedAt.current === null) return;
    const tl = TIMELINES[variant];
    const readyAfter = Date.now() - mountedAt.current;
    const elapsed = Date.now() - startedAt.current;
    const minimum = reduceMotion ? tl.reducedMotion : tl.minSequence;
    // On a slow start, still leave the tagline readable before fading out
    const taglineVisibleFrom = Math.max(tl.taglineAt, elapsed);
    const hold = Math.max(0, minimum - elapsed, reduceMotion ? 0 : taglineVisibleFrom + tl.taglineMinVisible - elapsed);

    const fadeTimer = setTimeout(() => {
      contentOut.value = withTiming(1, { duration: tl.contentOut, easing: Easing.in(Easing.quad) });
      overlayOpacity.value = withDelay(tl.contentOut, withTiming(0, { duration: tl.backgroundOut, easing: Easing.inOut(Easing.quad) }));
    }, hold);
    const doneTimer = setTimeout(() => {
      if (__DEV__) {
        console.log(`[BrandIntro] ${variant}: app ready after ${readyAfter}ms, intro hidden after ${Date.now() - mountedAt.current}ms`);
      }
      onFinish();
    }, hold + tl.contentOut + tl.backgroundOut);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
    // onFinish is intentionally read once; the intro runs a single time per cold start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, variant, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: 1 - contentOut.value,
    transform: [{ scale: reduceMotion ? 1 : 1 + contentOut.value * 0.03 }],
  }));
  const auraStyle = useAnimatedStyle(() => ({
    opacity: auraIn.value * (0.42 + auraBreath.value * 0.16),
    transform: [{ scale: (reduceMotion ? 1 : 0.85 + auraIn.value * 0.15) * (1 + auraBreath.value * 0.04) }],
  }));
  const mascotStyle = useAnimatedStyle(() => ({
    opacity: mascotIn.value,
    transform: [{ scale: reduceMotion ? 1 : 0.94 + mascotIn.value * 0.06 }],
  }));
  const orbitStyle = useAnimatedStyle(() => ({
    opacity: orbitIn.value,
    transform: [{ rotate: `${orbitSpin.value * 360}deg` }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineIn.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - taglineIn.value) * 6 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents={ready ? 'none' : 'auto'}>
      <GradientBackground noSafeArea>
        <Animated.View style={[styles.center, contentStyle]}>
          <View style={styles.stage}>
            {/* Phase 1 — atmosphere */}
            <Animated.View style={[styles.aura, { backgroundColor: colors.glow }, auraStyle]} />

            {/* Phase 4 — anticipation: a quiet orbit around the halo, with one arc of light travelling */}
            <Animated.View style={[styles.orbit, orbitStyle]}>
              <Svg width={ORBIT_SIZE} height={ORBIT_SIZE}>
                <Circle cx={ORBIT_SIZE / 2} cy={ORBIT_SIZE / 2} r={ORBIT_R} stroke={colors.primary} strokeOpacity={0.12} strokeWidth={ORBIT_STROKE} fill="none" />
                <Circle
                  cx={ORBIT_SIZE / 2}
                  cy={ORBIT_SIZE / 2}
                  r={ORBIT_R}
                  stroke={colors.primary}
                  strokeOpacity={0.85}
                  strokeWidth={ORBIT_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${ORBIT_C * 0.12} ${ORBIT_C}`}
                  fill="none"
                />
              </Svg>
            </Animated.View>

            {/* Phase 2 — the mascot (its own breathing, floating and blinking keep it alive) */}
            <Animated.View style={mascotStyle}>
              <MascotBlob mood="calm" scale={0.7} />
            </Animated.View>
          </View>

          {/* Phase 3 — brand */}
          <View style={styles.brandRow} accessible accessibilityLabel={t('common.appName')}>
            {BRAND.split('').map((char, i) => (
              <BrandLetter
                key={i}
                char={char}
                start={!!variant}
                delay={timeline.brand.delay + i * timeline.brand.stagger}
                duration={timeline.brand.duration}
                color={colors.primary}
                reduceMotion={reduceMotion}
              />
            ))}
          </View>

          {/* Phase 5 — tagline */}
          <Animated.Text style={[styles.tagline, { color: colors.text.secondary }, taglineStyle]}>
            {showTagline ? t('intro.tagline') : ''}
          </Animated.Text>
        </Animated.View>
      </GradientBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stage: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbit: {
    position: 'absolute',
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
  },
  brandRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  brandLetter: {
    fontSize: 15,
    fontWeight: '600',
    // letter spacing as margin, so each letter can animate on its own
    marginHorizontal: 3,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 14,
    minHeight: 21,
  },
});
