
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
import { sendSatisfactionNotification, handleNotificationResponse, setupNotifications } from '@/utils/notificationService';
import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SatisfactionProvider, useSatisfaction } from '@/contexts/SatisfactionContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/ modal` keeps a back button present.
  initialRouteName: 'login',
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

  // Setup Notifications on mount
  useEffect(() => {
    setupNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response, tokenRef.current).then((result) => {
        if (result && result.type === 'OPEN_APP' && result.transactionId) {
          // If user tapped the notification body, prompt them in-app
          promptForTransaction(result.transactionId);
        }
      });
    });

    return () => {
      subscription.remove();
    };
  }, [promptForTransaction]);

  useEffect(() => {
    const initSmsListener = async () => {
      console.log('🏁 Initializing Global SMS Monitor...');

      try {
        const { PermissionsAndroid, Platform, Alert } = require('react-native');

        if (Platform.OS === 'android') {
          // Check permissions first without requesting if possible, but request is safe
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_SMS
          ]);

          const receiveGranted = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
          if (!receiveGranted) {
            console.warn('⚠️ RECEIVE_SMS permission denied!');
            return;
          }
        }

        console.log('✅ Permissions confirmed. Starting listener...');

        const unsubscribe = SmsService.addSmsListener(async (msg: any) => {
          console.log('🔔 App Root detected SMS from:', msg.originatingAddress);

          // The event is now enriched with Groq data in 'parsed' field
          const parsed = msg.parsed;

          if (parsed && (parsed.type === 'debit' || parsed.type === 'credit')) {
            console.log('💸 Transaction Detected (Groq):', parsed.amount);

            if (token) {
              try {
                // Dynamic import to avoid cycles or heavy load
                const TransactionService = require('../utils/transactionService').default;

                Toast.show({
                  type: 'info',
                  text1: 'New Transaction Detected',
                  text2: `Processing ${parsed.name || 'purchase'}...`
                });

                // Create transaction on backend
                const newTxn = await TransactionService.createTransaction(token, {
                  name: parsed.name || 'Unknown Purchase',
                  amount: parsed.amount,
                  category: parsed.category || 'Other',
                  note: parsed.note || `Auto - detected from SMS`,
                  is_auto: true,
                  transaction_date: parsed.transaction_date || new Date().toISOString(),
                  merchant_domain: parsed.merchant_domain,
                  image_address: parsed.image_address // Pass this if backend supports it, or it will be ignored
                });

                console.log('✅ Transaction created:', newTxn.id || newTxn._id);

                // Trigger Interactive Notification
                const txnId = newTxn.id || newTxn._id;
                if (txnId) {
                  await sendSatisfactionNotification(
                    txnId,
                    parsed.name || 'Unknown Purchase',
                    parsed.amount
                  );

                  // Also prompt in app just in case
                  promptForTransaction(txnId);
                }
              } catch (err) {
                console.error('❌ Failed to process SMS transaction:', err);
                Toast.show({
                  type: 'error',
                  text1: 'Transaction Error',
                  text2: 'Could not save detected transaction.'
                });
              }
            } else {
              console.log('⚠️ User not logged in, skipping transaction creation.');
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
