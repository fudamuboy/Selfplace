import React, { useEffect } from 'react';
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
import { Colors } from '../constants/Colors';

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  mood?: 'happy' | 'neutral' | 'calm' | 'sad' | 'tired';
}

export const MascotBlob: React.FC<Props> = ({ mood = 'neutral' }) => {
  // Shared values for asymmetrical corner morphing
  const radiusTL = useSharedValue(60);
  const radiusTR = useSharedValue(55);
  const radiusBL = useSharedValue(50);
  const radiusBR = useSharedValue(65);
  
  // Transform values
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const floatY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.15);
  const blink = useSharedValue(1);

  useEffect(() => {
    // 1. Quad-Corner Asymmetrical Morphing
    // Each corner moves with a different speed and amplitude
    radiusTL.value = withRepeat(
      withTiming(85, { duration: 5100, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    radiusTR.value = withRepeat(
      withTiming(40, { duration: 6300, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    radiusBL.value = withRepeat(
      withTiming(75, { duration: 4400, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    radiusBR.value = withRepeat(
      withTiming(45, { duration: 5700, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    // 2. Breathing (Scaling)
    scaleX.value = withRepeat(
      withTiming(1.05, { duration: 7500, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    scaleY.value = withRepeat(
      withTiming(1.08, { duration: 6200, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );

    // 3. Subtle Float & Glow
    floatY.value = withRepeat(
      withTiming(-8, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.28, { duration: 6200, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
    
    // 4. Blinking
    let timeoutId: any;
    const triggerBlink = () => {
      blink.value = withSequence(
        withTiming(0, { duration: 120 }),
        withTiming(1, { duration: 120 })
      );
      timeoutId = setTimeout(triggerBlink, 4000 + Math.random() * 6000);
    };
    triggerBlink();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const morphStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: radiusTL.value,
    borderTopRightRadius: radiusTR.value,
    borderBottomLeftRadius: radiusBL.value,
    borderBottomRightRadius: radiusBR.value,
    transform: [
      { translateY: floatY.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [
        { scale: interpolate(glowOpacity.value, [0.15, 0.28], [1, 1.15]) }
    ]
  }));

  const eyeProps = useAnimatedProps(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Dynamic Glow Layers */}
      <Animated.View style={[styles.outerGlow, styles.glowLarge, glowStyle]} />
      <Animated.View style={[styles.outerGlow, styles.glowMedium, glowStyle]} />
      
      {/* Morphing Liquid Blob */}
      <Animated.View style={[styles.blob, morphStyle]}>
        <LinearGradient
          colors={[Colors.secondary, Colors.primary]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Face UI (on top of morphing view) */}
        <View style={styles.faceContainer}>
          <Svg height="100" width="100" viewBox="0 0 100 100">
            <G x="50" y="45">
              <AnimatedG animatedProps={eyeProps}>
                {mood === 'happy' ? (
                  <>
                    <Path d="M-14,-3 Q-11,-7 -8,-3" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <Path d="M8,-3 Q11,-7 14,-3" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <Circle cx="-12" cy="0" r="3" fill="white" />
                    <Circle cx="12" cy="0" r="3" fill="white" />
                  </>
                )}
              </AnimatedG>
              <Path 
                d={mood === 'happy' ? "M-5,12 Q0,18 5,12" : "M-4,14 Q0,15.5 4,14"} 
                stroke="white" 
                strokeWidth="2" 
                fill="none" 
                strokeLinecap="round"
                opacity="0.9"
              />
            </G>
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 350,
    width: 350,
  },
  blob: {
    width: 180,
    height: 180,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    borderRadius: 180,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
  },
  glowLarge: {
    width: 260,
    height: 260,
    shadowRadius: 100,
    elevation: 50,
  },
  glowMedium: {
    width: 200,
    height: 200,
    shadowRadius: 70,
    elevation: 40,
  },
});
