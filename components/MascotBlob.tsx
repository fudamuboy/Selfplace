import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import useThemeStore from '../store/useThemeStore';
import { EmotionalContext, getMascotConfig, MascotMood } from '../utils/mascotThemeEngine';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  mood?: MascotMood;
  stressLevel?: number; // 0-1
  hourOverride?: number;
  emotionalContext?: EmotionalContext;
  scale?: number;
  color?: 'purple' | 'yellow' | 'green' | 'blue';
}

const COLOR_CONFIG = {
  purple: {
    start: '#8B7CFF',
    end: '#6366F1',
    glow: '#8B7CFF',
  },
  yellow: {
    start: '#FFD166',
    end: '#F59E0B',
    glow: '#FFD166',
  },
  green: {
    start: '#55E6C1',
    end: '#10B981',
    glow: '#55E6C1',
  },
  blue: {
    start: '#818CF8',
    end: '#6366F1',
    glow: '#818CF8',
  }
};

export const MascotBlob: React.FC<Props> = ({
  mood = 'neutral',
  stressLevel = 0,
  hourOverride,
  emotionalContext,
  scale: scaleProp = 1,
  color
}) => {
  const { currentTheme } = useThemeStore();

  const hour = hourOverride !== undefined ? hourOverride : new Date().getHours();

  // Calculate dynamic config based on theme, mood, time, context and color override
  const config = useMemo(() => {
    const baseConfig = getMascotConfig(currentTheme, mood, hour, stressLevel, emotionalContext);
    if (color && COLOR_CONFIG[color]) {
      baseConfig.colors = { ...COLOR_CONFIG[color] };
    }
    return baseConfig;
  }, [currentTheme, mood, hour, stressLevel, emotionalContext, color]);

  // ─── Shared Values for Animation ───────────────────────────────────────────
  const radiusTL = useSharedValue(60);
  const radiusTR = useSharedValue(55);
  const radiusBL = useSharedValue(50);
  const radiusBR = useSharedValue(65);

  const scale = useSharedValue(1);
  const floatY = useSharedValue(0);
  const floatX = useSharedValue(0); // Horizontal drift
  const glowOpacity = useSharedValue(0.2);
  const blink = useSharedValue(1);
  const glowPulse = useSharedValue(1);
  const eyeShiftX = useSharedValue(0); // Eye movement
  const eyeShiftY = useSharedValue(0);

  // Keep latest config accessible inside animation closures without
  // making it a dep that restarts all animations on every render.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // ─── One-time animation startup (never restarts) ───────────────────────────
  // All shared values are initialized here with empty deps [].
  // The closures read configRef.current so they always use the latest config
  // without config being a dep that triggers a full restart.
  useEffect(() => {
    const cfg = configRef.current;

    // 1. Organic Morphs
    radiusTL.value = withRepeat(withTiming(85, { duration: 5000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
    radiusTR.value = withRepeat(withTiming(40, { duration: 6000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
    radiusBL.value = withRepeat(withTiming(75, { duration: 4500 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
    radiusBR.value = withRepeat(withTiming(45, { duration: 5500 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }), -1, true);

    // 2. Breath & Pulse
    const breathDuration = cfg.animation.breathDuration * (0.95 + Math.random() * 0.1);
    scale.value = withRepeat(
      withTiming(cfg.animation.scaleIntensity, { duration: breathDuration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    floatY.value = withRepeat(
      withTiming(cfg.animation.floatIntensity, { duration: cfg.animation.floatDuration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    // 3. Horizontal Drift
    floatX.value = withRepeat(
      withTiming(Math.random() * 6 - 3, { duration: cfg.animation.floatDuration * 1.5, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    glowOpacity.value = withRepeat(
      withTiming(cfg.animation.glowOpacityMax, { duration: breathDuration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    glowPulse.value = withRepeat(
      withTiming(1.05, { duration: breathDuration * 1.2, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    // 4. Procedural Blink
    let blinkTimeoutId: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      const isSleepy = configRef.current.expression.eyeType === 'closed';
      const blinkDuration = isSleepy ? 800 : 120;
      blink.value = withSequence(
        withTiming(0, { duration: blinkDuration }),
        withTiming(1, { duration: blinkDuration })
      );
      blinkTimeoutId = setTimeout(triggerBlink, configRef.current.expression.blinkFrequency + Math.random() * 6000);
    };

    // 5. Eye Movement
    let eyeTimeoutId: ReturnType<typeof setTimeout>;
    const triggerEyeShift = () => {
      const targetX = (Math.random() - 0.5) * 3;
      const targetY = (Math.random() - 0.5) * 2;
      const duration = 1000 + Math.random() * 2000;
      eyeShiftX.value = withTiming(targetX, { duration });
      eyeShiftY.value = withTiming(targetY, { duration });
      eyeTimeoutId = setTimeout(triggerEyeShift, 4000 + Math.random() * 8000);
    };

    triggerBlink();
    triggerEyeShift();

    return () => {
      if (blinkTimeoutId) clearTimeout(blinkTimeoutId);
      if (eyeTimeoutId) clearTimeout(eyeTimeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty: animations start once and run forever


  // ─── Animated Styles ───────────────────────────────────────────────────────
  const morphStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: radiusTL.value,
    borderTopRightRadius: radiusTR.value,
    borderBottomLeftRadius: radiusBL.value,
    borderBottomRightRadius: radiusBR.value,
    transform: [
      { translateY: floatY.value },
      { translateX: floatX.value },
      { scale: scale.value }
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowPulse.value }],
    backgroundColor: config.colors.glow,
    shadowColor: config.colors.glow,
  }));

  const eyeProps = useAnimatedProps(() => ({
    transform: [
      { scaleY: blink.value },
      { translateX: eyeShiftX.value },
      { translateY: eyeShiftY.value }
    ],
    opacity: config.expression.eyeOpacity,
  }));

  const faceStyle = useAnimatedStyle(() => ({
    opacity: withTiming(mood === 'sleepy' || config.expression.eyeType === 'closed' ? 0.6 : 1, { duration: 1000 }),
  }));

  return (
    <View style={[styles.container, scaleProp !== 1 && { transform: [{ scale: scaleProp }] }]}>
      {/* Layered Atmospheric Aura Glow (Simplified & Minimal) */}
      <Animated.View style={[
        styles.outerGlow, 
        styles.glowLarge, 
        glowStyle, 
        useAnimatedStyle(() => ({
          opacity: glowOpacity.value * 0.65,
        })),
        { backgroundColor: config.colors.glow }
      ]} />
      <Animated.View style={[
        styles.outerGlow, 
        styles.glowMedium, 
        glowStyle,
        useAnimatedStyle(() => ({
          opacity: glowOpacity.value,
        })),
        { backgroundColor: config.colors.glow }
      ]} />

      <Animated.View style={[styles.blob, morphStyle]}>
        <LinearGradient
          colors={[config.colors.start, config.colors.end]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <Animated.View style={[styles.faceContainer, faceStyle]}>
          <Svg height="100" width="100" viewBox="0 0 100 100">
            <G x="50" y="45">
              <AnimatedG animatedProps={eyeProps}>
                {mood === 'happy' || mood === 'excited' ? (
                  <>
                    <Path d="M-14,-3 Q-11,-7 -8,-3" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <Path d="M8,-3 Q11,-7 14,-3" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : mood === 'sad' ? (
                  <>
                    <Path d="M-14,0 Q-11,-2 -8,0" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
                    <Path d="M8,0 Q11,-2 14,0" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
                  </>
                ) : config.expression.eyeType === 'open' ? (
                  <>
                    <Circle cx="-12" cy="0" r="3.2" fill="white" />
                    <Circle cx="12" cy="0" r="3.2" fill="white" />
                  </>
                ) : (config.expression.eyeType === 'closed' || mood === 'sleepy' || mood === 'tired') ? (
                  <>
                    <Path d="M-14,2 Q-11,4 -8,2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <Path d="M8,2 Q11,4 14,2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : (config.expression.eyeType === 'semi' || mood === 'reflective' || mood === 'calm') ? (
                  <>
                    <Path d="M-14,1 Q-11,-0.5 -8,1" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                    <Path d="M8,1 Q11,-0.5 14,1" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                  </>
                ) : (
                  <>
                    <Circle cx="-12" cy="0" r="3.2" fill="white" />
                    <Circle cx="12" cy="0" r="3.2" fill="white" />
                  </>
                )}
              </AnimatedG>
              <Path
                d={
                  mood === 'happy' || mood === 'excited' ? "M-5,12 Q0,18 5,12" :
                    mood === 'sad' ? "M-4,18 Q0,14 4,18" :
                      mood === 'reflective' ? "M-3,14 Q0,14.5 3,14" :
                        "M-4,14 Q0,15.5 4,14"
                }
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                opacity={config.expression.mouthOpacity}
              />
            </G>
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
    width: 280,
  },
  blob: {
    width: 150,
    height: 150,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    borderRadius: 140,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
  },
  glowExtraLarge: {
    width: 400,
    height: 400,
    shadowRadius: 140,
    elevation: 60,
    borderRadius: 200,
  },
  glowLarge: {
    width: 320,
    height: 320,
    shadowRadius: 100,
    elevation: 50,
    borderRadius: 160,
  },
  glowMedium: {
    width: 240,
    height: 240,
    shadowRadius: 70,
    elevation: 40,
    borderRadius: 120,
  },
});

