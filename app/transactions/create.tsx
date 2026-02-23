import { useState, useRef, useEffect } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, Platform, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';

import Colors, { Fonts as F } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import {
  requestMicPermission,
  startRecording,
  stopRecording,
  transcribeAndParse,
} from '@/utils/voiceTransactionService';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const CATEGORIES = ['Food', 'Bills', 'Travel', 'Health', 'Shopping', 'Income', 'Savings', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Wallet'];

// States for the voice button
type VoiceState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

/* ─── Pulsing mic button ─────────────────────────────────────────────────── */
function VoiceButton({
  voiceState,
  onPressIn,
  onPressOut,
  theme,
}: {
  voiceState: VoiceState;
  onPressIn: () => void;
  onPressOut: () => void;
  theme: any;
}) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let rotateLoop: Animated.CompositeAnimation | null = null;

    if (voiceState === 'recording') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulse1, { toValue: 1.6, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(pulse2, { toValue: 2.1, duration: 1100, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          ]),
          Animated.parallel([
            Animated.timing(pulse1, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(pulse2, { toValue: 1, duration: 1100, useNativeDriver: true }),
          ]),
        ])
      );
      pulseLoop.start();
      Animated.spring(scale, { toValue: 1.1, useNativeDriver: true, friction: 4 }).start();
    } else if (voiceState === 'processing') {
      pulse1.setValue(1);
      pulse2.setValue(1);
      rotateLoop = Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.linear })
      );
      rotateLoop.start();
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    } else {
      pulse1.setValue(1);
      pulse2.setValue(1);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    }

    return () => {
      pulseLoop?.stop();
      rotateLoop?.stop();
    };
  }, [voiceState]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const bgColor =
    voiceState === 'recording' ? '#FF4757' :
      voiceState === 'processing' ? theme.accent :
        voiceState === 'done' ? '#00C48C' :
          voiceState === 'error' ? '#FF6B6B' :
            theme.primary;

  const icon =
    voiceState === 'processing' ? 'spinner' :
      voiceState === 'done' ? 'check' :
        voiceState === 'error' ? 'times' :
          'microphone';

  return (
    <View style={voiceStyles.wrapper}>
      {/* Outer pulse rings — only when recording */}
      {voiceState === 'recording' && (
        <>
          <Animated.View style={[voiceStyles.ring, { borderColor: '#FF475744', transform: [{ scale: pulse2 }] }]} />
          <Animated.View style={[voiceStyles.ring, { borderColor: '#FF475788', transform: [{ scale: pulse1 }] }]} />
        </>
      )}

      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[voiceStyles.btn, { backgroundColor: bgColor, transform: [{ scale }] }]}>
          {voiceState === 'processing' ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <FontAwesome name="circle-o-notch" size={28} color="#fff" />
            </Animated.View>
          ) : (
            <FontAwesome name={icon} size={28} color="#fff" />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const voiceStyles = StyleSheet.create({
  wrapper: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  btn: {
    width: 72, height: 72,
    borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});

/* ─── Main screen ────────────────────────────────────────────────────────── */
export default function CreateTransactionScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const { token } = useAuth();
  const { autoVoice } = useLocalSearchParams();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const recordingRef = useRef<any>(null);
  const isStartingRef = useRef(false); // mutex: prevent double-start on rapid taps

  // Auto-trigger voice if requested
  useEffect(() => {
    if (autoVoice === 'true') {
      handleMicDown();
    }
  }, [autoVoice]);

  /* ── voice button handlers ─────────────────────────────────────────────── */
  const handleMicDown = async () => {
    // Block if a start is in progress OR already recording/processing
    if (isStartingRef.current || voiceState === 'recording' || voiceState === 'processing') return;
    isStartingRef.current = true;

    const granted = await requestMicPermission();
    if (!granted) {
      isStartingRef.current = false;
      Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Microphone access is required.' });
      return;
    }
    try {
      // startRecording() internally clears any stale recording object before creating a new one
      recordingRef.current = await startRecording();
      setVoiceState('recording');
    } catch (e: any) {
      console.error('[Voice] startRecording error:', e);
      Toast.show({ type: 'error', text1: 'Mic Error', text2: e?.message ?? 'Could not start recording.' });
      setVoiceState('idle');
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleMicUp = async () => {
    // Only proceed if we have an active recording
    if (!recordingRef.current || voiceState !== 'recording') return;
    setVoiceState('processing');
    const rec = recordingRef.current;
    recordingRef.current = null; // clear immediately — safe against double-release
    try {
      const uri = await stopRecording(rec);
      if (!uri) throw new Error('No recording file');

      const { transcript: tx, parsed } = await transcribeAndParse(uri);
      setTranscript(tx);

      if (parsed?.error || !parsed?.amount) {
        Toast.show({ type: 'error', text1: 'Not understood', text2: tx || 'Please speak more clearly.' });
        setVoiceState('error');
        setTimeout(() => setVoiceState('idle'), 2000);
        return;
      }

      // Autofill the form
      if (parsed.name) setName(parsed.name);
      if (parsed.amount) setAmount(String(parsed.amount));
      if (parsed.category) setCategory(parsed.category);
      if (parsed.payment_method) setPaymentMethod(parsed.payment_method);
      if (parsed.note) setNote(parsed.note);

      setVoiceState('done');
      Toast.show({ type: 'success', text1: '🎙️ Got it!', text2: tx });
      setTimeout(() => setVoiceState('idle'), 1800);

    } catch (err: any) {
      console.error('[Voice] processing error:', err);
      Toast.show({ type: 'error', text1: 'Voice Error', text2: err.message });
      setVoiceState('error');
      setTimeout(() => setVoiceState('idle'), 2000);
    }
  };

  /* ── submit ────────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Name', text2: 'Please enter a transaction name.' });
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/transcation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          category: category || 'Other',
          note: note.trim() || undefined,
          transaction_date: new Date(date).toISOString(),
          payment_method: paymentMethod || 'Cash',
          is_auto: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to create transaction');

      Toast.show({ type: 'success', text1: 'Transaction Added', text2: 'Record saved successfully.' });
      setTimeout(() => router.back(), 500);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save the transaction.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── render ────────────────────────────────────────────────────────────── */
  const accent = theme.accent ?? '#00C48C';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Add Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── VOICE SECTION ── */}
        <View style={[styles.voiceCard, { backgroundColor: theme.surface, ...(theme.cardShadow ?? {}) }]}>
          <Text style={[styles.voiceTitle, { color: theme.text }]}>
            {voiceState === 'recording' ? '🎙️ Listening…' :
              voiceState === 'processing' ? '🤖 Processing…' :
                voiceState === 'done' ? '✅ Fields filled!' :
                  voiceState === 'error' ? '❌ Try again' :
                    '🎙️ Add by Voice'}
          </Text>
          <Text style={[styles.voiceHint, { color: theme.subtleText }]}>
            {voiceState === 'recording'
              ? 'Release when done speaking'
              : voiceState === 'processing'
                ? 'Transcribing with Whisper AI…'
                : 'Hold mic · say e.g. "Paid 150 cash at chai stall"'}
          </Text>

          <VoiceButton
            voiceState={voiceState}
            onPressIn={handleMicDown}
            onPressOut={handleMicUp}
            theme={theme}
          />

          {/* Live transcript */}
          {transcript.length > 0 && (
            <View style={[styles.transcriptBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.transcriptText, { color: theme.subtleText }]}>
                "{transcript}"
              </Text>
            </View>
          )}
        </View>

        {/* ── FORM ── */}

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Transaction Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Swiggy, Electricity Bill"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { backgroundColor: theme.inputBackground ?? theme.surface, color: theme.text }]}
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Amount (₹)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { backgroundColor: theme.inputBackground ?? theme.surface, color: theme.text }]}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, { backgroundColor: category === cat ? theme.primary ?? accent : theme.surface, ...(theme.cardShadow ?? {}) }]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, { color: category === cat ? theme.primaryText ?? '#fff' : theme.subtleText }]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Payment Method */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PAYMENT_METHODS.map((method) => (
              <Pressable
                key={method}
                style={[styles.chip, { backgroundColor: paymentMethod === method ? theme.primary ?? accent : theme.surface, ...(theme.cardShadow ?? {}) }]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[styles.chipText, { color: paymentMethod === method ? theme.primaryText ?? '#fff' : theme.subtleText }]}>
                  {method}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Date</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { backgroundColor: theme.inputBackground ?? theme.surface, color: theme.text }]}
          />
        </View>

        {/* Note */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            placeholder="Add a short note..."
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, styles.textArea, { backgroundColor: theme.inputBackground ?? theme.surface, color: theme.text }]}
          />
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: theme.primary ?? accent, opacity: isSubmitting || pressed ? 0.7 : 1 },
          ]}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          <Text style={[styles.submitText, { color: theme.primaryText ?? '#fff' }]}>
            {isSubmitting ? 'Saving…' : 'Save Transaction'}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F.semiBold,
  },
  backButton: { padding: 8, marginLeft: -8 },
  content: { padding: 24, gap: 24 },

  /* Voice card */
  voiceCard: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  voiceTitle: {
    fontSize: 17,
    fontFamily: F.bold,
  },
  voiceHint: {
    fontSize: 13,
    fontFamily: F.medium,
    textAlign: 'center',
    opacity: 0.7,
  },
  transcriptBox: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  transcriptText: {
    fontSize: 13,
    fontFamily: F.medium,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  /* Form */
  fieldGroup: { gap: 10 },
  label: { fontSize: 14, fontFamily: F.medium },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: F.regular ?? F.medium,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: { fontSize: 14, fontFamily: F.medium },
  submitButton: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  submitText: { fontSize: 16, fontFamily: F.semiBold },
});
