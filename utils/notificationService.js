import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store'; // Import SecureStore
import SatisfactionService from './satisfactionService';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Define Action Identifiers
export const ACTIONS = {
    YES: 'SATISFACTION_YES',
    NO: 'SATISFACTION_NO',
    MAYBE: 'SATISFACTION_MAYBE',
};

// Define Category Identifier
const CATEGORY_ID = 'SATISFACTION_CATEGORY';

/**
 * Initialize Notifications
 * Sets up channels and categories for interactive notifications
 */
export async function setupNotifications() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('transactions', {
            name: 'Transactions',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#00311F',
        });
    }

    // Define interactive categories
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
        {
            identifier: ACTIONS.YES,
            buttonTitle: 'Yes, worth it',
            options: {
                opensAppToForeground: false, // Handle in background if possible? On iOS this might need true for some cases, but false is better for quick actions
            },
        },
        {
            identifier: ACTIONS.MAYBE,
            buttonTitle: 'Maybe',
            options: {
                opensAppToForeground: false,
            },
        },
        {
            identifier: ACTIONS.NO,
            buttonTitle: 'No',
            options: {
                opensAppToForeground: false,
            },
        },
    ]);

    console.log('🔔 Notifications configured with categories');
}

/**
 * Request Permissions
 */
export async function requestNotificationPermissions(requestIfMissing = true) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted' && requestIfMissing) {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

/**
 * Schedule a Satisfaction Notification
 * @param transactionId - The ID of the transaction to rate
 * @param merchantName - Name of the merchant/transaction
 * @param amount - Amount of the transaction
 */
export async function sendSatisfactionNotification(transactionId, merchantName, amount, options = {}) {
    const { requestPermissions = true } = options;
    const hasPermission = await requestNotificationPermissions(requestPermissions);

    if (!hasPermission) {
        console.warn('Notification permission not granted (Background: ' + !requestPermissions + ')');
        return;
    }

    // Ensure category is set up (idempotent-ish)
    // We assume setupNotifications was called, or we could call it here?
    // Better to rely on caller or init.

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'New Transaction Detected',
            body: `You spent ${amount} at ${merchantName}. Was it worth it?`,
            data: { transactionId },
            categoryIdentifier: CATEGORY_ID,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX, // Ensure high priority
        },
        trigger: null, // Send immediately
    });
}


/**
 * Handle Notification Response (User Interaction)
 * Reads token from storage since context might not be available in background
 * @param response - The response object from Expo Notifications
 * @param {string|null} [authToken] - Optional auth token to avoid async lookup
 */
export async function handleNotificationResponse(response, authToken = null) {
    const actionId = response.actionIdentifier;
    const { transactionId } = response.notification.request.content.data;

    // Log the interaction for debugging
    console.log(`🔔 Notification Response: ${actionId}, TxID: ${transactionId}`);

    if (!transactionId) return;

    let rating = null;
    let note = '';

    switch (actionId) {
        case ACTIONS.YES:
            rating = 5;
            note = 'Yes, worth it';
            break;
        case ACTIONS.NO:
            rating = 1;
            note = 'No, not worth it';
            break;
        case ACTIONS.MAYBE:
            rating = 3;
            note = 'Maybe';
            break;
        default:
            // Tapped body, opens app.
            return { type: 'OPEN_APP', transactionId };
    }

    if (rating) {
        try {
            // Get token from argument or SecureStore for background execution
            const token = authToken || await SecureStore.getItemAsync('authToken');

            if (!token) {
                console.warn('⚠️ Token missing during notification action.');
                await Notifications.dismissNotificationAsync(response.notification.request.identifier);
                return { type: 'OPEN_APP', transactionId };
            }

            await SatisfactionService.createSatisfaction(token, {
                transactionId,
                rating,
                note
            });
            console.log(`✅ Recorded satisfaction via notification: ${rating}`);

            // Dismiss notification on success
            await Notifications.dismissNotificationAsync(response.notification.request.identifier);

        } catch (error) {
            console.error('Failed to record satisfaction from notification:', error);
            // Even if failed, we interacted. Dismiss it.
            await Notifications.dismissNotificationAsync(response.notification.request.identifier);
        }
    }
}

/**
 * Register global notification listeners
 * Should be called at app root (index.js)
 */
export function registerNotificationListeners() {
    // Handle background/foreground interactions
    Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
}

