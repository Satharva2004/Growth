import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import SatisfactionService from './satisfactionService';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
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
            lightColor: '#FF231F7C',
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
 * @param response - The response object from Expo Notifications
 * @param token - The Auth token to make API calls
 */
export async function handleNotificationResponse(response, token) {
    const actionId = response.actionIdentifier;
    const { transactionId } = response.notification.request.content.data;

    // Log the interaction for debugging
    console.log(`🔔 Notification Response: ${actionId}, TxID: ${transactionId}, HasToken: ${!!token}`);

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
        if (!token) {
            console.warn('⚠️ Token missing during notification action. Falling back to in-app prompt.');
            // Dismiss notification if we're opening the app anyway, or let the app handle it.
            // But for consistency let's dismiss it.
            await Notifications.dismissNotificationAsync(response.notification.request.identifier);
            return { type: 'OPEN_APP', transactionId };
        }

        try {
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
