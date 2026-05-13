import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  SlideInRight, 
  SlideInLeft,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

const { width } = Dimensions.get('window');

// ─── Typing Animation Component ──────────────────────────────────────────────
const TypingIndicator = ({ color }: { color: string }) => {
  const dots = [0, 1, 2];
  
  return (
    <View style={styles.typingContainer}>
      {dots.map((i) => {
        const dotStyle = useAnimatedStyle(() => {
          const translateY = withRepeat(
            withSequence(
              withDelay(i * 150, withTiming(-5, { duration: 400 })),
              withTiming(0, { duration: 400 })
            ),
            -1,
            true
          );
          return { transform: [{ translateY }] };
        });
        
        return (
          <Animated.View 
            key={i} 
            style={[styles.typingDot, { backgroundColor: color }, dotStyle]} 
          />
        );
      })}
    </View>
  );
};

// ─── Main Chat Screen ───────────────────────────────────────────────────────
export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const { currentTheme } = useThemeStore();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Initial welcome message if no history
    if (messages.length === 0) {
      fetchGreeting();
    }
  }, []);

  const fetchGreeting = async () => {
    try {
      const response = await client.get('/ai/greeting');
      addMessage('ai', response.data.greeting);
    } catch (err) {
      addMessage('ai', 'Merhaba, seninleyim. Bugün aklından neler geçiyor?');
    }
  };

  const addMessage = (sender: 'user' | 'ai', text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text }]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    addMessage('user', userMsg);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsTyping(true);
    try {
      const response = await client.post('/ai/chat', { 
        message: userMsg, 
        conversationId 
      });
      
      const aiMsg = response.data.message;
      setConversationId(response.data.conversationId);
      
      // Realistic typing delay based on message length
      const delay = Math.min(Math.max(aiMsg.length * 20, 1000), 4000);
      
      setTimeout(() => {
        setIsTyping(false);
        addMessage('ai', aiMsg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, delay);
    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      addMessage('ai', 'Şu an seni tam anlayamadım, ama dinlemeye devam ediyorum.');
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isAI = item.sender === 'ai';
    return (
      <Animated.View 
        entering={isAI ? SlideInLeft : SlideInRight}
        style={[
          styles.messageWrapper,
          isAI ? styles.aiWrapper : styles.userWrapper
        ]}
      >
        <LinearGradient
          colors={isAI 
            ? ['rgba(45, 27, 105, 0.4)', 'rgba(25, 15, 60, 0.6)'] 
            : [currentTheme.colors.primary + '33', currentTheme.colors.primary + '66']
          }
          style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}
        >
          <Text style={[styles.messageText, { color: '#FFF' }]}>{item.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <GradientBackground>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={styles.ambientGlow} />
        <Animated.View style={styles.ambientGlowSecondary} />
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <BlurView intensity={20} tint="dark" style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Selfplace AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Şu an burada</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </BlurView>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <Animated.View entering={FadeIn} style={styles.typingIndicatorWrapper}>
                <TypingIndicator color={currentTheme.colors.primary} />
              </Animated.View>
            ) : null
          }
        />

        {/* Input Area */}
        <BlurView intensity={40} tint="dark" style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Neler düşünüyorsun?"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              onPress={handleSend} 
              style={[styles.sendButton, { backgroundColor: currentTheme.colors.primary }]}
              disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-up" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50, // Reduced from 60
    paddingBottom: 15, // Reduced from 20
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  statusText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  listContent: {
    padding: 20,
    paddingTop: 20, // Reduced from 40
    paddingBottom: 120,
  },
  messageWrapper: {
    marginBottom: 20,
    maxWidth: '85%',
  },
  aiWrapper: {
    alignSelf: 'flex-start',
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  typingIndicatorWrapper: {
    alignSelf: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    marginBottom: 20,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 10,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  ambientGlow: {
    position: 'absolute',
    top: '20%',
    left: '-20%',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    filter: 'blur(100px)',
  },
  ambientGlowSecondary: {
    position: 'absolute',
    bottom: '30%',
    right: '-10%',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(109, 40, 217, 0.1)',
    filter: 'blur(80px)',
  },
});
