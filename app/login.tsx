
import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, Modal, FlatList } from 'react-native';
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

import { countries } from '@/constants/Countries';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { login: authenticate } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [otp, setOtp] = useState('');
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.includes(searchQuery)
  );

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
  }, []);

  const getFullPhone = () => `${countryCode}${phoneNumber.trim()}`;

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Toast.show({ type: 'info', text1: 'Required', text2: 'Please enter a phone number.' });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: getFullPhone() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error sending OTP');
      setIsOtpSent(true);
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Check your messages.' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Toast.show({ type: 'info', text1: 'Required', text2: 'Please enter the code.' });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: getFullPhone(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid OTP');

      const profile = {
        name: data.user?.name || `User ${phoneNumber.slice(-4)}`,
        email: data.user?.email || undefined,
        photo: data.user?.picture || undefined,
      };
      await authenticate(data.accessToken || data.token, data.refreshToken, profile);
      router.replace('/(tabs)');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleSubmitting(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const googleUser = (userInfo as any).data?.user || (userInfo as any).user;
      const { idToken } = (userInfo as any).data || userInfo;

      if (!idToken) throw new Error('No ID token found');

      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error((result && result.message) || 'Google sign-in failed on server.');
      }

      if (result && (result.accessToken || result.token) && result.refreshToken) {
        const profile = {
          name: (result.user && (result.user.name || result.user.fullName)) || result.name || googleUser?.name || undefined,
          email: (result.user && (result.user.email || result.user.username)) || result.email || googleUser?.email || undefined,
          photo: (result.user && (result.user.photo || result.user.picture || result.user.avatar)) ||
            result.photo || result.picture ||
            googleUser?.photo || googleUser?.picture ||
            undefined,
        };
        await authenticate(result.accessToken || result.token, result.refreshToken, profile);
      }

      Toast.show({ type: 'success', text1: 'Welcome Back', text2: 'Signed in with Google.' });
      setTimeout(() => router.replace('/(tabs)'), 500);

    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Toast.show({ type: 'error', text1: 'Sign-In Failed', text2: error.message || 'Could not sign in with Google.' });
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const onSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'info', text1: 'Missing Fields', text2: 'Email and password are required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) throw new Error((result && result.message) || 'Login failed.');

      if (result && (result.accessToken || result.token) && result.refreshToken) {
        const profile = {
          name: (result.user && (result.user.name || result.user.fullName)) || result.name || undefined,
          email: (result.user && (result.user.email || result.user.username)) || result.email || email.trim(),
          photo: (result.user && (result.user.photo || result.user.picture || result.user.avatar)) ||
            result.photo || result.picture ||
            undefined,
        };
        await authenticate(result.accessToken || result.token, result.refreshToken, profile);
      }

      Toast.show({ type: 'success', text1: 'Welcome Back', text2: 'Session started.' });
      setTimeout(() => router.replace('/(tabs)'), 500);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unexpected error.';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: description });
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
            <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Clarity</Text>
              <Text style={[styles.subtitle, { color: theme.subtleText }]}>Sign in to your account</Text>
            </Animated.View>

            <View style={styles.form}>
              <Animated.View entering={FadeInUp.delay(300).duration(800)}>
                <Pressable
                  style={[styles.socialButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.divider }]}
                  onPress={handleGoogleLogin}
                  disabled={isGoogleSubmitting}
                >
                  {isGoogleSubmitting ? (
                    <Text style={styles.socialButtonText}>Connecting...</Text>
                  ) : (
                    <>
                      <FontAwesome name="google" size={18} color={theme.text} />
                      <Text style={[styles.socialButtonText, { color: theme.text }]}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>

              {!isOtpSent && (
                <Animated.View entering={FadeInUp.delay(350).duration(800)}>
                  <Pressable
                    style={[styles.socialButton, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.divider }]}
                    onPress={() => {
                      setIsPhoneMode(!isPhoneMode);
                      setIsOtpSent(false);
                    }}
                  >
                    <FontAwesome name={isPhoneMode ? "envelope" : "phone"} size={18} color={theme.text} />
                    <Text style={[styles.socialButtonText, { color: theme.text }]}>
                      {isPhoneMode ? "Continue with Email" : "Continue with Phone"}
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
                <Text style={[styles.dividerText, { color: theme.subtleText }]}>or</Text>
                <View style={[styles.divider, { backgroundColor: theme.divider }]} />
              </View>

              {isPhoneMode ? (
                <>
                  {isOtpSent ? (
                    <View style={styles.otpWrapper}>
                      <View style={styles.otpContainer}>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <View
                            key={index}
                            style={[
                              styles.otpBox,
                              {
                                backgroundColor: theme.surface,
                                borderColor: otp[index] ? theme.text : theme.divider,
                                borderWidth: otp.length === index ? 2 : 1,
                              }
                            ]}
                          >
                            <Text style={[styles.otpText, { color: theme.text }]}>
                              {otp[index] || ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <TextInput
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                        style={styles.hiddenInput}
                      />
                    </View>
                  ) : (
                    <>
                      <View style={styles.inputGroup}>
                        <View style={[styles.phoneInputContainer, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.divider }]}>
                          <Pressable
                            onPress={() => setShowCountryPicker(true)}
                            style={styles.countryPickerTrigger}
                          >
                            <Text style={[styles.countryPrefix, { color: theme.text }]}>{countryCode}</Text>
                            <FontAwesome name="chevron-down" size={10} color={theme.subtleText} />
                          </Pressable>
                          <View style={[styles.verticalDivider, { backgroundColor: theme.divider }]} />
                          <TextInput
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="234 567 8900"
                            placeholderTextColor={theme.inputPlaceholder}
                            keyboardType="phone-pad"
                            style={[styles.phoneInput, { color: theme.text }]}
                          />
                        </View>
                      </View>

                      <Modal
                        visible={showCountryPicker}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setShowCountryPicker(false)}
                      >
                        <View style={styles.modalOverlay}>
                          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                            <View style={styles.modalHeader}>
                              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
                              <Pressable onPress={() => {
                                setShowCountryPicker(false);
                                setSearchQuery('');
                              }}>
                                <FontAwesome name="times" size={20} color={theme.text} />
                              </Pressable>
                            </View>

                            <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.divider }]}>
                              <FontAwesome name="search" size={16} color={theme.subtleText} />
                              <TextInput
                                placeholder="Search country or code..."
                                placeholderTextColor={theme.inputPlaceholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={[styles.searchInput, { color: theme.text }]}
                              />
                            </View>

                            <FlatList
                              data={filteredCountries}
                              keyExtractor={(item) => `${item.iso}-${item.code}`}
                              renderItem={({ item }) => (
                                <Pressable
                                  style={styles.countryItem}
                                  onPress={() => {
                                    setCountryCode(item.code);
                                    setShowCountryPicker(false);
                                    setSearchQuery('');
                                  }}
                                >
                                  <Text style={styles.countryFlag}>{item.flag}</Text>
                                  <Text style={[styles.countryName, { color: theme.text }]}>{item.name}</Text>
                                  <Text style={[styles.countryCodeText, { color: theme.subtleText }]}>{item.code}</Text>
                                </Pressable>
                              )}
                              showsVerticalScrollIndicator={false}
                            />
                          </View>
                        </View>
                      </Modal>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email"
                      placeholderTextColor={theme.inputPlaceholder}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={[styles.input, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.divider, color: theme.text }]}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor={theme.inputPlaceholder}
                      autoCapitalize="none"
                      secureTextEntry
                      style={[styles.input, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.divider, color: theme.text }]}
                    />
                  </View>
                </>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.primary, opacity: (isSubmitting || pressed) ? 0.8 : 1 }
                ]}
                onPress={isPhoneMode ? (isOtpSent ? handleVerifyOTP : handleSendOTP) : onSubmit}
                disabled={isSubmitting}
              >
                <Text style={[styles.buttonText, { color: theme.primaryText }]}>
                  {isSubmitting ? 'Processing...' :
                    isPhoneMode ? (isOtpSent ? 'Verify Code' : 'Send Code') : 'Sign In'}
                </Text>
              </Pressable>

              {isOtpSent && (
                <Pressable onPress={() => setIsOtpSent(false)} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <Text style={[styles.link, { color: theme.subtleText }]}>Wrong number? Go back</Text>
                </Pressable>
              )}

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.subtleText }]}>New here?</Text>
                <Link href="/signup" replace asChild>
                  <Pressable>
                    <Text style={[styles.link, { color: theme.text }]}>Create account</Text>
                  </Pressable>
                </Link>
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
    padding: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 60,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 4,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 10,
  },
  input: {
    height: 56,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
    paddingHorizontal: 16,
  },
  button: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
    textTransform: 'uppercase',
  },
  socialButton: {
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  link: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  countryPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 6,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginRight: 12,
    opacity: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 16,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  countryCodeText: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  countryPrefix: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  otpWrapper: {
    height: 70,
    justifyContent: 'center',
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpText: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
});
