import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import SmsService from '../utils/smsService';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'login',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
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
    <AuthProvider>
      <RootLayoutNav />
      <Toast topOffset={60} />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initSmsListener = async () => {
      console.log('🏁 Initializing Global SMS Monitor...');

      try {
        // We need to request permissions first!
        // Importing PermissionsAndroid to be sure, or we can use SmsService if it has a request method exposed.
        // Let's us PermissionsAndroid directly here for clarity and reliability.
        const { PermissionsAndroid, Platform, Alert } = require('react-native');

        if (Platform.OS === 'android') {
          console.log('🔐 Requesting SMS Permissions...');
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_SMS
          ]);

          const receiveGranted = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
          const readGranted = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;

          console.log('🔐 Permission Status:', { receiveGranted, readGranted });

          if (!receiveGranted) {
            console.warn('⚠️ RECEIVE_SMS permission denied! SMS listener will not work.');
            Alert.alert('Permission Missing', 'SMS permissions are required to auto-detect transactions.');
            return;
          }
        }

        console.log('✅ Permissions confirmed. Starting listener...');
        const unsubscribe = SmsService.addSmsListener((msg: any) => {
          console.log('🔔 App Root detected SMS from:', msg.originatingAddress);
          console.log('📝 SMS Body:', msg.body);
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
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="goals/create" options={{ title: 'Create Goal' }} />
        <Stack.Screen name="goals/[id]" options={{ title: 'Goal Details' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sms-test" options={{ title: 'SMS Test', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }} />
      </Stack>
    </ThemeProvider>
  );
}
