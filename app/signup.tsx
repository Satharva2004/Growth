
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

export default function SignupScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'dark']; // Force dark preference
  const router = useRouter();
  const { login: authenticate } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '428582393615-r0h05a56835aj1q34s4bhgn64jk67vnv.apps.googleusercontent.com', // Updated Web Client ID
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

      const response = await fetch('https://goals-backend-brown.vercel.app/api/auth/google', {
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
        console.error('Google Sign-In Error', error);
        Toast.show({ type: 'error', text1: 'Verification Failed', text2: error.message || 'Could not sign up with Google.' });
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };


  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Toast.show({
        type: 'info',
        text1: 'Incomplete Data',
        text2: 'All fields are mandatory for registration.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('https://goals-backend-brown.vercel.app/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (result && (result.message || result.error)) || 'Unable to sign up. Please try again.';
        throw new Error(message);
      }

      // Save token from response
      if (result && (result.accessToken || result.token) && result.refreshToken) {
        const profile = {
          name:
            (result.user && (result.user.name || result.user.fullName)) ||
            result.name ||
            name.trim(),
          email:
            (result.user && (result.user.email || result.user.username)) ||
            result.email ||
            email.trim(),
        };
        const accessToken = result.accessToken || result.token;
        await authenticate(accessToken, result.refreshToken, profile);
      }

      Toast.show({
        type: 'success',
        text1: 'Registration Complete',
        text2: "System access granted.",
      });
      setTimeout(() => router.replace('/(tabs)'), 900);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unexpected error. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.background, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.container}>
        <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
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
            <Animated.View
              entering={FadeInDown.delay(200).duration(1000).springify()}
              style={styles.heroArea}
            >
              <View style={[styles.badge, { borderColor: theme.text }]}>
                <Text style={[styles.badgeText, { color: theme.text }]}>NEW_USER_PROTOCOL</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>REGISTRATION</Text>
              <Text style={[styles.subtitle, { color: theme.subtleText }]}>Initialize your profile to begin tracking.</Text>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(400).duration(1000).springify()}
              style={{ gap: 20 }}
            >
              <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.subtleText }]}>FULL_NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="USER_01"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="words"
                  selectionColor={theme.tint}
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.subtleText }]}>EMAIL_ADDRESS</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="user@clarity.io"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  selectionColor={theme.tint}
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
                />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.subtleText }]}>ACCESS_KEY</Text>
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
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(900).duration(800)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.7 : 1 }
                  ]}
                  onPress={onSubmit}
                  disabled={isSubmitting}>
                  <Text style={[styles.buttonText, { color: theme.primaryText }]}>{isSubmitting ? 'INITIALIZING...' : 'CREATE IDENTITY'}</Text>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ height: 1, flex: 1, backgroundColor: theme.divider }} />
                <Text style={{ color: theme.subtleText, fontSize: 10, fontFamily: 'Courier' }}>ALT_METHOD</Text>
                <View style={{ height: 1, flex: 1, backgroundColor: theme.divider }} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(1100).duration(800)}>
                <Pressable
                  style={[
                    styles.socialButton,
                    {
                      borderColor: theme.inputBorder,
                    }
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleSubmitting}
                >
                  {isGoogleSubmitting ? (
                    <Text style={[styles.socialButtonText, { color: theme.text }]}>CONNECTING...</Text>
                  ) : (
                    <>
                      <FontAwesome name="google" size={16} color={theme.text} />
                      <Text style={[styles.socialButtonText, { color: theme.text }]}>GOOGLE_ID</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(1200).duration(800)} style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.subtleText }]}>IDENTITY_EXISTS?</Text>
                <Link href="/login" style={[styles.link, { color: theme.text }]}>ACCESS_LOGIN</Link>
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
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold', // Keep bold for header but consider changing if user wants strictly courier
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Courier',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 4, // Technical corners
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Courier', // Monospace input for technical feel
  },
  button: {
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Courier',
  },
  link: {
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
});