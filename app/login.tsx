import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { login: authenticate } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'info',
        text1: 'Almost there ✍️',
        text2: 'Add your email and password to unlock your growth hub.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('https://goals-backend-brown.vercel.app/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (result && (result.message || result.error)) || 'Unable to log in. Please try again.';
        throw new Error(message);
      }

      // Save token from response
      if (result && (result.accessToken || result.token) && result.refreshToken) {
        const profile = {
          name:
            (result.user && (result.user.name || result.user.fullName)) ||
            result.name ||
            undefined,
          email:
            (result.user && (result.user.email || result.user.username)) ||
            result.email ||
            email.trim(),
        };
        const accessToken = result.accessToken || result.token;
        await authenticate(accessToken, result.refreshToken, profile);
      }

      const message =
        (result && (result.message || result.status || 'Login successful.')) || 'Login successful.';

      Toast.show({
        type: 'success',
        text1: 'Welcome back 🌟',
        text2: 'Your self-improvement studio is ready.',
      });
      setTimeout(() => router.replace('/(tabs)'), 800);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unexpected error. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Login paused ⚠️',
        text2: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.background, { backgroundColor: theme.background }]}> 
      <SafeAreaView style={styles.container}> 
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroArea}> 
              <Text style={[styles.badge, { backgroundColor: theme.badgeBackground, color: theme.badgeText }]}>✨ Goal Studio</Text>
              <Text style={[styles.title, { color: theme.text }]}>Design your
                <Text style={[styles.highlight, { color: theme.accentText }]}> personal</Text>
                {'\n'}breakthrough</Text>
              <Text style={[styles.subtitle, { color: theme.subtleText }]}>Set bold intentions, measure mindful wins, and evolve every day.</Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder, shadowColor: theme.glassShadow }]}> 
              <View style={styles.fieldGroup}> 
                <Text style={[styles.label, { color: theme.subtleText }]}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@betteryourself.com"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  selectionColor={theme.tint}
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </View>
              <View style={styles.fieldGroup}> 
                <Text style={[styles.label, { color: theme.subtleText }]}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="none"
                  secureTextEntry
                  selectionColor={theme.tint}
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </View>
              <Pressable style={[styles.button, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={onSubmit} disabled={isSubmitting}>
                <Text style={[styles.buttonText, { color: theme.primaryText }]}>{isSubmitting ? 'Logging in…' : 'Enter Growth Mode'}</Text>
              </Pressable>
              <View style={styles.footer}> 
                <Text style={[styles.footerText, { color: theme.subtleText }]}>New to the journey?</Text>
                <Link href="/signup" style={[styles.link, { color: theme.accentText }]}>Create your account ✨</Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
    gap: 32,
  },
  heroArea: {
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Poppins_500Medium',
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.2,
  },
  highlight: {
    fontFamily: 'Poppins_700Bold',
  },
  card: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 24,
    gap: 20,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 30,
    elevation: 10,
  },
  fieldGroup: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  button: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  link: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    textDecorationLine: 'underline',
  },
});