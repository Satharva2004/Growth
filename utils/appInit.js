/**
 * App Initialization
 * Sets up global error handling and other app-wide configurations
 * IMPORT THIS FIRST in your App.js/App.tsx
 */

import errorHandler from './utils/errorHandler';
import { Alert, Platform } from 'react-native';

/**
 * Initialize the app
 * Call this ONCE at app startup
 */
export const initializeApp = () => {
    console.log('🚀 Initializing App...');

    // 1. Setup global error handler
    errorHandler.initialize();

    // 2. Add error listener for user notifications
    errorHandler.addListener((errorInfo) => {
        console.log('📊 Error captured:', errorInfo.type);

        // Show user-friendly alerts for critical errors
        if (errorInfo.isFatal || errorInfo.type === 'native_error') {
            if (__DEV__) {
                // In development, show detailed error
                Alert.alert(
                    '🔴 Error',
                    `Type: ${errorInfo.type}\nMessage: ${errorInfo.error?.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                );
            } else {
                // In production, show generic error
                Alert.alert(
                    'Error',
                    'Something went wrong. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        }

        // Log to external service in production
        if (!__DEV__) {
            // TODO: Send to Sentry, Firebase Crashlytics, etc.
            errorHandler.logToService(errorInfo);
        }
    });

    // 3. Setup React Native specific error handlers
    if (Platform.OS === 'android') {
        console.log('📱 Android-specific initialization...');
        // Add Android-specific setup here
    } else if (Platform.OS === 'ios') {
        console.log('📱 iOS-specific initialization...');
        // Add iOS-specific setup here
    }

    console.log('✅ App initialized successfully');
};

/**
 * Cleanup function (call on app unmount if needed)
 */
export const cleanupApp = () => {
    console.log('🧹 Cleaning up app...');
    // Add cleanup logic here
};

export default {
    initializeApp,
    cleanupApp,
};
