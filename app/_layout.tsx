
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import SmsService from '../utils/smsService';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import * as Notifications from 'expo-notifications';
import {
  sendCategoryNotification,
  handleNotificationResponse,
  setupNotifications,
} from '@/utils/notificationService';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SatisfactionProvider, useSatisfaction } from '@/contexts/SatisfactionContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import { CustomThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <AuthProvider>
        <SatisfactionProvider>
          <RootLayoutNav />
          <Toast topOffset={60} />
        </SatisfactionProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { token } = useAuth();
  const { promptForTransaction } = useSatisfaction();

  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // ── Setup Notifications on mount ───────────────────────────────────────────
  useEffect(() => {
    setupNotifications();

    let subscription: any = null;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener(response => {
        Promise.resolve(handleNotificationResponse(response, tokenRef.current)).then((result: any) => {
          if (result && result.type === 'OPEN_APP' && result.transactionId) {
            // Body tap → open transaction in-app for category selection
            promptForTransaction(result.transactionId);
          }
        });
      });
    } catch (e) {
      console.warn('[Layout] Notification listener not available (Expo Go?):', e);
    }

    return () => {
      subscription?.remove();
    };
  }, [promptForTransaction]);

  // ── Global SMS listener (foreground) ──────────────────────────────────────
  useEffect(() => {
    const initSmsListener = async () => {
      console.log('🏁 Initializing Global SMS Monitor...');

      try {
        const { PermissionsAndroid, Platform } = require('react-native');

        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_SMS,
          ]);

          const receiveGranted =
            granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
            PermissionsAndroid.RESULTS.GRANTED;

          if (!receiveGranted) {
            console.warn('⚠️ RECEIVE_SMS permission denied!');
            return;
          }
        }

        console.log('✅ Permissions confirmed. Starting listener...');

        const unsubscribe = SmsService.addSmsListener(async (msg: any) => {
          console.log('🔔 App Root detected SMS from:', msg.originatingAddress);

          const parsed = msg.parsed;

          // Only handle confirmed transactions (debit or credit with an amount)
          if (parsed && parsed.amount && (parsed.type === 'debit' || parsed.type === 'credit')) {
            console.log('💸 Transaction Detected (Groq):', parsed.amount, parsed.name);

            if (token) {
              try {
                const TransactionService = require('../utils/transactionService').default;
                const { markSmsAsProcessed, isSmsProcessed } = require('../utils/offlineStorage');

                // Build fingerprint for foreground dedup
                const fingerprint = `fg_${msg.originatingAddress}_${parsed.amount}_${parsed.reference_id || Date.now()}`;
                const alreadyDone = await isSmsProcessed(fingerprint);
                if (alreadyDone) {
                  console.log('⏭️ [Layout] Duplicate foreground SMS, skipping.');
                  return;
                }

                Toast.show({
                  type: 'info',
                  text1: 'New Transaction Detected',
                  text2: `Processing ${parsed.name || 'purchase'}...`,
                });

                const newTxn = await TransactionService.createTransaction(token, {
                  name: parsed.name || 'Unknown Purchase',
                  amount: parsed.amount,
                  category: parsed.category || 'Other',
                  note: `Auto-detected from SMS`,
                  is_auto: true,
                  transaction_date: parsed.transaction_date || new Date().toISOString(),
                  merchant_domain: parsed.merchant_domain,
                  image_address: parsed.image_address,
                  reference_id: parsed.reference_id,
                });

                console.log('✅ Transaction created:', newTxn.id || newTxn._id);
                await markSmsAsProcessed(fingerprint);

                // ── Category notification if AI couldn't identify ──────────
                const txnId = newTxn.id || newTxn._id;
                const needsCategory =
                  !parsed.category ||
                  parsed.category === 'Other' ||
                  parsed.category === 'other';

                if (txnId && needsCategory) {
                  await sendCategoryNotification(
                    txnId,
                    parsed.name || 'Unknown Purchase',
                    parsed.amount,
                  );
                } else {
                  // Open in-app prompt to tag the category
                  if (txnId) promptForTransaction(txnId);
                }
              } catch (err) {
                console.error('❌ Failed to process SMS transaction:', err);
                Toast.show({
                  type: 'error',
                  text1: 'Transaction Error',
                  text2: 'Could not save detected transaction.',
                });
              }
            } else {
              console.log('⚠️ User not logged in — queuing transaction locally.');
              const { addToPendingQueue } = require('../utils/offlineStorage');
              await addToPendingQueue({
                name: parsed.name || 'Unknown Purchase',
                amount: parsed.amount,
                category: parsed.category || 'Other',
                note: `Auto-detected from SMS`,
                is_auto: true,
                transaction_date: parsed.transaction_date || new Date().toISOString(),
                merchant_domain: parsed.merchant_domain,
                reference_id: parsed.reference_id,
              });
            }
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('❌ Failed to initialize SMS listener:', err);
      }
    };

    const cleanupPromise = initSmsListener();

    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [token, promptForTransaction]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="transactions/create" options={{ headerShown: false }} />
        <Stack.Screen name="transactions/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
