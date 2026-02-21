
import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/constants/Config';

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { login: authenticate } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleSubmitting(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = (userInfo as any).data || userInfo;

      if (!idToken) throw new Error('No ID token found');

      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error((result && result.message) || 'Google sign-up failed on server.');
      }

      if (result && (result.accessToken || result.token) && result.refreshToken) {
        const profile = {
          name: (result.user && (result.user.name || result.user.fullName)) || result.name || undefined,
          email: (result.user && (result.user.email || result.user.username)) || result.email || undefined,
        };
        await authenticate(result.accessToken || result.token, result.refreshToken, profile);
      }

      Toast.show({ type: 'success', text1: 'Verified', text2: "Google identity linked." });
      setTimeout(() => router.replace('/(tabs)'), 900);

    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Toast.show({ type: 'error', text1: 'Verification Failed', text2: error.message || 'Could not sign up with Google.' });
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Toast.show({ type: 'info', text1: 'Incomplete Data', text2: 'All fields are mandatory.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('https://goals-backend-brown.vercel.app/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) throw new Error((result && result.message) || 'Unable to sign up.');

      if (result && (result.accessToken || result.token) && result.refreshToken) {
        const profile = {
          name: (result.user && (result.user.name || result.user.fullName)) || result.name || name.trim(),
          email: (result.user && (result.user.email || result.user.username)) || result.email || email.trim(),
        };
        const accessToken = result.accessToken || result.token;
        await authenticate(accessToken, result.refreshToken, profile);
      }

      Toast.show({ type: 'success', text1: 'Registration Complete', text2: "System access granted." });
      setTimeout(() => router.replace('/(tabs)'), 500);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unexpected error.';
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.background, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.container}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()} style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: theme.subtleText }]}>
                Join now to start tracking your finances.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(400).duration(1000).springify()} style={styles.form}>
              <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="words"
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="none"
                  secureTextEntry
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(900).duration(800)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.buttonBackground, opacity: (isSubmitting || pressed) ? 0.8 : 1 }
                  ]}
                  onPress={onSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.buttonText, { color: theme.buttonText }]}>{isSubmitting ? 'Creating...' : 'Sign Up'}</Text>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <Text style={[styles.dividerText, { color: theme.subtleText }]}>or</Text>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(1100).duration(800)}>
                <Pressable
                  style={[styles.socialButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775' }]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleSubmitting}
                >
                  {isGoogleSubmitting ? (
                    <Text style={[styles.socialButtonText, { color: '#1f1f1f' }]}>Connecting...</Text>
                  ) : (
                    <>
                      <FontAwesome name="google" size={20} color="#DB4437" />
                      <Text style={[styles.socialButtonText, { color: '#1f1f1f' }]}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(1200).duration(800)} style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.subtleText }]}>Already have an account?</Text>
                <Link href="/login" replace asChild>
                  <Pressable>
                    <Text style={[styles.link, { color: theme.tint }]}>Log In</Text>
                  </Pressable>
                </Link>
              </Animated.View>
            </Animated.View>
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
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  socialButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  link: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
});