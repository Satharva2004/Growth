import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import TransactionService from './transactionService';

// Configure how notifications behave when the app is in the foreground
// Wrapped in try/catch: expo-notifications requires a custom native build;
// calling this in Expo Go (no native build) would crash with "Cannot find native module 'ExpoPushTokenManager'"
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
} catch (e) {
    console.warn('[NotificationService] expo-notifications native module not available (Expo Go?). Notifications disabled.');
}

// ── Category Action IDs ──────────────────────────────────────────────────────
export const ACTIONS = {
    FOOD: 'CAT_FOOD',
    TRAVEL: 'CAT_TRAVEL',
    SHOPPING: 'CAT_SHOPPING',
    BILLS: 'CAT_BILLS',
    ENTERTAINMENT: 'CAT_ENTERTAINMENT',
    HEALTH: 'CAT_HEALTH',
    OTHER: 'CAT_OTHER',
    // Legacy satisfaction aliases kept for any old notification that arrives
    YES: 'SATISFACTION_YES',
    NO: 'SATISFACTION_NO',
    MAYBE: 'SATISFACTION_MAYBE',
};

// Map action → human label & category string
export const ACTION_CATEGORY_MAP = {
    [ACTIONS.FOOD]: 'Food',
    [ACTIONS.TRAVEL]: 'Travel',
    [ACTIONS.SHOPPING]: 'Shopping',
    [ACTIONS.BILLS]: 'Bills',
    [ACTIONS.ENTERTAINMENT]: 'Entertainment',
    [ACTIONS.HEALTH]: 'Health',
    [ACTIONS.OTHER]: 'Other',
};

export const CATEGORY_NOTIFICATION_ID = 'CATEGORY_ASK_CATEGORY';
const CHANNEL_ID = 'transactions';

/**
 * Initialize Notifications
 * Sets up channels and interactive categories.
 */
export async function setupNotifications() {
    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                name: 'Transactions',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#00C48C',
            });
        }

        // Interactive category: user picks from a short list of categories
        await Notifications.setNotificationCategoryAsync(CATEGORY_NOTIFICATION_ID, [
            { identifier: ACTIONS.FOOD, buttonTitle: '🍕 Food & Drinks', options: { opensAppToForeground: false } },
            { identifier: ACTIONS.SHOPPING, buttonTitle: '🏷️ Shopping', options: { opensAppToForeground: false } },
            { identifier: ACTIONS.BILLS, buttonTitle: '⚡ Bills & Utils', options: { opensAppToForeground: false } },
            { identifier: ACTIONS.TRAVEL, buttonTitle: '🚕 Travel & Cab', options: { opensAppToForeground: false } },
            { identifier: ACTIONS.ENTERTAINMENT, buttonTitle: '🎬 Entertainment', options: { opensAppToForeground: false } },
            { identifier: ACTIONS.OTHER, buttonTitle: '📦 Others', options: { opensAppToForeground: false } },
        ]);

        console.log('🔔 Notifications configured with category-ask actions');
    } catch (e) {
        console.warn('[NotificationService] setupNotifications failed (native module unavailable):', e?.message);
    }
}

/**
 * Request Permissions
 */
export async function requestNotificationPermissions(requestIfMissing = true) {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted' && requestIfMissing) {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    } catch (e) {
        console.warn('[NotificationService] requestNotificationPermissions failed:', e?.message);
        return false;
    }
}

/**
 * Send an "Unknown category – please pick one" interactive notification.
 */
export async function sendCategoryNotification(transactionId, merchantName, amount, options = {}) {
    try {
        const { requestPermissions = true } = options;
        const hasPermission = await requestNotificationPermissions(requestPermissions);

        if (!hasPermission) return;

        // Visual enhancement: Use emojis based on amount or keywords
        const emoji = amount > 2000 ? '💸' : '✨';
        const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${emoji} New Transaction Detected`,
                body: `${formattedAmount} spent at ${merchantName}\nTap to categorize this payment.`,
                data: { transactionId, merchantName, amount, type: 'category_ask' },
                categoryIdentifier: CATEGORY_NOTIFICATION_ID,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                channelId: CHANNEL_ID,
                badge: 1,
            },
            trigger: null,
        });
    } catch (e) {
        console.warn('[NotificationService] sendCategoryNotification failed:', e.message);
    }
}

/**
 * Generic notification for alerts / success
 */
export async function showNotification(title, body, data = {}) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.HIGH,
                channelId: CHANNEL_ID,
            },
            trigger: null,
        });
    } catch (e) {
        console.warn('[NotificationService] showNotification failed:', e.message);
    }
}

/**
 * Handle all notification responses (interactive category pick OR body tap).
 *
 * @param {object} response  - Expo notification response object
 * @param {string|null} authToken - Optional pre-fetched token
 * @returns {{ type: string, transactionId: string } | undefined}
 */
export async function handleNotificationResponse(response, authToken = null) {
    const actionId = response.actionIdentifier;
    const data = response.notification.request.content.data || {};
    const { transactionId, type } = data;

    console.log(`🔔 Notification Response: actionId=${actionId}, txId=${transactionId}, type=${type}`);

    if (!transactionId) return;

    // ── Body tap → open app so user can pick category in-app ────────────────
    if (!actionId || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        return { type: 'OPEN_APP', transactionId };
    }

    // ── Category action button tapped ────────────────────────────────────────
    const category = ACTION_CATEGORY_MAP[actionId];
    if (category) {
        try {
            const token = authToken || await SecureStore.getItemAsync('authToken');
            if (!token) {
                console.warn('⚠️ Token missing during notification action.');
                return { type: 'OPEN_APP', transactionId };
            }

            // Update the transaction's category on the backend
            await TransactionService.partialUpdateTransaction(token, transactionId, { category });
            console.log(`✅ Category set via notification: ${category} for txn ${transactionId}`);

            await Notifications.dismissNotificationAsync(response.notification.request.identifier);
        } catch (error) {
            console.error('Failed to update category from notification:', error);
            await Notifications.dismissNotificationAsync(response.notification.request.identifier);
        }
        return;
    }

    // ── Legacy satisfaction actions (backwards compat) ───────────────────────
    // These can arrive from old notifications in the tray before this update
    if ([ACTIONS.YES, ACTIONS.NO, ACTIONS.MAYBE].includes(actionId)) {
        await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    }
}

/**
 * Register global notification listeners
 * Should be called at app root (index.js)
 */
export function registerNotificationListeners() {
    try {
        Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    } catch (e) {
        console.warn('[NotificationService] registerNotificationListeners failed (Expo Go?):', e.message);
    }
}
