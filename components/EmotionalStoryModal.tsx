import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { sanitizeText } from '../utils/textSanitizer';

const { width } = Dimensions.get('window');
const STORY_DURATION = 6000; // 6 seconds per slide

export interface StorySlide {
  id: string;
  title: string;
  label: string;
  bodyText: string;
  footerText: string;
  icon: any;
  iconColor: string;
  gradient: [string, string, ...string[]];
}

interface EmotionalStoryModalProps {
  visible: boolean;
  slides: StorySlide[];
  onClose: () => void;
  initialIndex?: number;
}

export const EmotionalStoryModal: React.FC<EmotionalStoryModalProps> = ({
  visible,
  slides,
  onClose,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  
  const progress = useSharedValue(0);

  // Trigger when slide ends
  const handleNextSlide = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      progress.value = 0;
      startAnimation();
    }
  };

  const startAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: STORY_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(handleNextSlide)();
        }
      }
    );
  };

  const pauseAnimation = () => {
    setIsPaused(true);
    cancelAnimation(progress);
  };

  const resumeAnimation = () => {
    setIsPaused(false);
    const remainingDuration = STORY_DURATION * (1 - progress.value);
    progress.value = withTiming(
      1,
      { duration: remainingDuration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(handleNextSlide)();
        }
      }
    );
  };

  useEffect(() => {
    if (visible && slides.length > 0) {
      setCurrentIndex(initialIndex);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && slides.length > 0) {
      startAnimation();
    } else {
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [currentIndex, visible]);

  if (!visible || slides.length === 0) return null;

  const activeSlide = slides[currentIndex];

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <LinearGradient colors={activeSlide.gradient} style={styles.container}>
        
        {/* Progress Bars */}
        <View style={styles.progressRow}>
          {slides.map((_, index) => {
            return <ProgressBar key={index} index={index} currentIndex={currentIndex} progress={progress} />;
          })}
        </View>

        {/* Header Actions */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Slide Content with Fade Transition */}
        <Animated.View 
          key={activeSlide.id} 
          entering={FadeIn.duration(400)} 
          exiting={FadeOut.duration(300)} 
          style={styles.slideContent}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={activeSlide.icon} size={80} color={activeSlide.iconColor} />
          </View>
          <Text style={styles.title}>{activeSlide.title}</Text>
          <Text style={styles.label}>{activeSlide.label}</Text>
          <Text style={styles.bodyText}>{sanitizeText(activeSlide.bodyText)}</Text>
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>{activeSlide.footerText}</Text>
          </View>
        </Animated.View>

        {/* Touch Navigation Zones */}
        <View style={styles.touchZones}>
          <Pressable
            style={styles.touchLeft}
            onPress={handlePrevSlide}
            onPressIn={pauseAnimation}
            onPressOut={resumeAnimation}
          />
          <Pressable
            style={styles.touchRight}
            onPress={handleNextSlide}
            onPressIn={pauseAnimation}
            onPressOut={resumeAnimation}
          />
        </View>
      </LinearGradient>
    </Modal>
  );
};

interface ProgressBarProps {
  index: number;
  currentIndex: number;
  progress: Animated.SharedValue<number>;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ index, currentIndex, progress }) => {
  const animatedStyle = useAnimatedStyle(() => {
    let widthPercent = 0;
    if (index < currentIndex) {
      widthPercent = 100;
    } else if (index === currentIndex) {
      widthPercent = progress.value * 100;
    } else {
      widthPercent = 0;
    }
    return {
      width: `${widthPercent}%`,
    };
  });

  return (
    <View style={styles.progressSegment}>
      <Animated.View style={[styles.progressFill, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    zIndex: 10,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  closeBtn: {
    padding: 8,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -40, // offset for header
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 1,
  },
  bodyText: {
    fontSize: 20,
    color: '#FFF',
    lineHeight: 32,
    textAlign: 'center',
    fontWeight: '400',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  touchZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5, // below header/progress, above content
  },
  touchLeft: {
    flex: 1,
  },
  touchRight: {
    flex: 1,
  },
});
