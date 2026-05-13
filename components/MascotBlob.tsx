import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps,
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import useThemeStore from '../store/useThemeStore';
import { getMascotConfig, MascotMood } from '../utils/mascotThemeEngine';

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  mood?: MascotMood;
  stressLevel?: number; // 0-1
  hourOverride?: number;
}

export const MascotBlob: React.FC<Props> = ({ 
  mood = 'neutral', 
  stressLevel = 0,
  hourOverride 
}) => {
  const { currentTheme } = useThemeStore();
  
  const hour = hourOverride !== undefined ? hourOverride : new Date().getHours();
  
  // Calculate dynamic config based on theme, mood and time
  const config = useMemo(() => 
    getMascotConfig(currentTheme, mood, hour, stressLevel),
    [currentTheme, mood, hour, stressLevel]
  );

  // ─── Shared Values for Animation ───────────────────────────────────────────
  const radiusTL = useSharedValue(60);
  const radiusTR = useSharedValue(55);
  const radiusBL = useSharedValue(50);
  const radiusBR = useSharedValue(65);
  
  const scale = useSharedValue(1);
  const floatY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.2);
  const blink = useSharedValue(1);
  const glowPulse = useSharedValue(1);

  // Dynamic values that should transition smoothly when config changes
  const targetGlowOpacity = useSharedValue(0.2);
  const targetBreathDuration = useSharedValue(3500);

  useEffect(() => {
    // 1. Organic Morphs (Constant)
    radiusTL.value = withRepeat(withTiming(85, { duration: 5100, easing: Easing.inOut(Easing.sin) }), -1, true);
    radiusTR.value = withRepeat(withTiming(40, { duration: 6300, easing: Easing.inOut(Easing.sin) }), -1, true);
    radiusBL.value = withRepeat(withTiming(75, { duration: 4400, easing: Easing.inOut(Easing.sin) }), -1, true);
    radiusBR.value = withRepeat(withTiming(45, { duration: 5700, easing: Easing.inOut(Easing.sin) }), -1, true);

    // 2. Dynamic Breath & Pulse
    scale.value = withRepeat(
      withTiming(config.animation.scaleIntensity, { 
        duration: config.animation.breathDuration, 
        easing: Easing.inOut(Easing.sin) 
      }),
      -1,
      true
    );

    floatY.value = withRepeat(
      withTiming(config.animation.floatIntensity, { 
        duration: config.animation.floatDuration, 
        easing: Easing.inOut(Easing.sin) 
      }),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withTiming(config.animation.glowOpacityMax, { 
        duration: config.animation.breathDuration, 
        easing: Easing.inOut(Easing.sin) 
      }),
      -1,
      true
    );

    glowPulse.value = withRepeat(
      withTiming(1.05, { 
        duration: config.animation.breathDuration * 1.2, 
        easing: Easing.inOut(Easing.sin) 
      }),
      -1,
      true
    );

    // 3. Procedural Blink
    let timeoutId: any;
    const triggerBlink = () => {
      const isSleepy = mood === 'sleepy' || mood === 'tired';
      const blinkDuration = isSleepy ? 800 : 120;
      
      blink.value = withSequence(
        withTiming(0, { duration: blinkDuration }), 
        withTiming(1, { duration: blinkDuration })
      );
      
      timeoutId = setTimeout(triggerBlink, config.expression.blinkFrequency + Math.random() * 5000);
    };
    
    triggerBlink();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [config, mood]);

  // ─── Animated Styles ───────────────────────────────────────────────────────
  const morphStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: radiusTL.value,
    borderTopRightRadius: radiusTR.value,
    borderBottomLeftRadius: radiusBL.value,
    borderBottomRightRadius: radiusBR.value,
    transform: [
      { translateY: floatY.value }, 
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
    transform: [{ scaleY: blink.value }],
    opacity: config.expression.eyeOpacity,
  }));

  const faceStyle = useAnimatedStyle(() => ({
    opacity: withTiming(mood === 'sleepy' ? 0.6 : 1, { duration: 1000 }),
  }));

  return (
    <View style={styles.container}>
      {/* Procedural Aura Glow */}
      <Animated.View style={[styles.outerGlow, styles.glowLarge, glowStyle]} />
      <Animated.View style={[styles.outerGlow, styles.glowMedium, glowStyle]} />
      
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
                ) : (config.expression.eyeType === 'closed' || mood === 'sleepy' || mood === 'calm' || mood === 'tired') ? (
                  <>
                    <Path d="M-14,2 Q-11,4 -8,2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <Path d="M8,2 Q11,4 14,2" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : (config.expression.eyeType === 'semi' || mood === 'reflective') ? (
                  <>
                    <Path d="M-14,-1 Q-11,1 -8,-1" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                    <Path d="M8,-1 Q11,1 14,-1" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
                  </>
                ) : (config.expression.eyeType === 'open' || mood === 'neutral') ? (
                  <>
                    <Circle cx="-12" cy="0" r="3" fill="white" />
                    <Circle cx="12" cy="0" r="3" fill="white" />
                  </>
                ) : mood === 'sad' ? (
                  <>
                    <Path d="M-14,0 Q-11,-2 -8,0" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
                    <Path d="M8,0 Q11,-2 14,0" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
                  </>
                ) : (
                  <>
                    <Circle cx="-12" cy="0" r="3" fill="white" />
                    <Circle cx="12" cy="0" r="3" fill="white" />
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
  glowLarge: {
    width: 260,
    height: 260,
    shadowRadius: 80,
    elevation: 40,
  },
  glowMedium: {
    width: 200,
    height: 200,
    shadowRadius: 50,
    elevation: 30,
  },
});

