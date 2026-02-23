import SmsAndroid from 'react-native-get-sms-android';
import SmsListener from 'react-native-android-sms-listener';
import { DeviceEventEmitter, Platform, NativeModules, AppState } from 'react-native';
import errorHandler from './errorHandler';

/**
 * SMS Service using react-native-get-sms-android
 * Provides comprehensive SMS operations: list, send, delete
 * WITH PROPER ERROR HANDLING
 */

class SmsService {
    constructor() {
        this.deliveryListener = null;
        this.errorListener = null;
        this.smsListeners = []; // Array of callback functions
        this._recentBodies = new Map(); // body-hash → timestamp, for dedup
        this._appStateSubscription = null;
        this.setupNativeErrorListener();
        this.setupDirectSmsListener();
        this._watchAppState();
    }

    /**
     * Re-initialize native monitoring whenever the app comes to the foreground.
     * This ensures the listener is alive even after the app was in background
     * for a long time (screen off, Doze mode, etc.)
     */
    _watchAppState() {
        if (Platform.OS !== 'android') return;
        this._appStateSubscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                console.log('📲 [SmsService] App foregrounded — re-pinging native module');
                try {
                    if (NativeModules.DirectSmsModule) {
                        NativeModules.DirectSmsModule.startMonitoring();
                    }
                } catch (e) {
                    console.warn('[SmsService] Could not restart native monitor:', e);
                }
            }
        });
    }

    /**
     * Simple deduplication: returns true if this SMS body was seen within the
     * last 3 seconds (prevents double-fires from duplicate native events).
     */
    _isDuplicate(body) {
        const key = (body || '').slice(0, 80);
        const now = Date.now();
        if (this._recentBodies.has(key)) {
            const last = this._recentBodies.get(key);
            if (now - last < 3000) return true; // within 3 s → duplicate
        }
        this._recentBodies.set(key, now);
        // Prune map to prevent memory leak
        if (this._recentBodies.size > 50) {
            const oldest = [...this._recentBodies.entries()].sort((a, b) => a[1] - b[1])[0];
            this._recentBodies.delete(oldest[0]);
        }
        return false;
    }

    // ...

    /**
     * Setup the Global SMS Listener using our custom native module
     */
    setupDirectSmsListener() {
        console.log('🔌 Connecting to DirectSmsReceiver...');

        if (Platform.OS === 'android' && NativeModules.DirectSmsModule) {
            try {
                NativeModules.DirectSmsModule.startMonitoring();
                NativeModules.DirectSmsModule.createNotificationChannel(); // Create Channel
                console.log('🔌 Native Module initialized');
            } catch (e) {
                console.error('Failed to init Native Module:', e);
            }
        }

        DeviceEventEmitter.addListener('onDirectSmsReceived', async (event) => {
            console.log('📩 [DIRECT SMS RECEIVED]', event.originatingAddress);

            // ── Deduplication guard ──────────────────────────────────────────
            if (this._isDuplicate(event.body)) {
                console.log('⏭️ [SmsService] Duplicate SMS event, skipping.');
                return;
            }

            try {
                const { parseWithGroq } = require('./groqService');
                const transaction = await parseWithGroq(event.body, event.originatingAddress);

                if (transaction && transaction.amount) {
                    console.log('💰 Valid Transaction Detected:', transaction.name, transaction.amount);

                    const enrichedEvent = { ...event, parsed: transaction };

                    this.smsListeners.forEach(callback => {
                        try { callback(enrichedEvent); }
                        catch (err) { console.error('Error in SMS listener callback:', err); }
                    });
                } else {
                    // Not a transaction — forward raw so UI can ignore it
                    this.smsListeners.forEach(callback => {
                        try { callback({ ...event, parsed: null }); }
                        catch (err) { /* silent */ }
                    });
                }
            } catch (e) {
                console.error('Error in auto-parsing SMS:', e);
            }
        });
    }

    /**
     * Add a listener for incoming SMS
     * @param {Function} onSmsReceived - Callback when SMS is received
     * @returns {Function} Unsubscribe function
     */
    addSmsListener(onSmsReceived) {
        this.smsListeners.push(onSmsReceived);
        console.log(`✅ SMS Listener added. Total listeners: ${this.smsListeners.length}`);

        // Return unsubscribe function
        return () => {
            this.removeSmsListener(onSmsReceived);
        };
    }

    /**
     * Remove a specific listener
     * @param {Function} callback - The callback to remove
     */
    removeSmsListener(callback) {
        this.smsListeners = this.smsListeners.filter(cb => cb !== callback);
        console.log(`Removed SMS listener. Remaining: ${this.smsListeners.length}`);
    }

    /**
     * Start listening (Legacy/Wrapper for single listener support)
     * Prefer addSmsListener for multiple listeners
     */
    startSmsListener(onSmsReceived) {
        // Remove existing listeners to mimic old behavior if needed, 
        // OR better: just add this one.
        // For backward compatibility with the test script that expects a subscription object with .remove():

        const unsubscribe = this.addSmsListener(onSmsReceived);
        return {
            remove: unsubscribe
        };
    }

    /**
     * Stop all listeners (Legacy support)
     */
    stopSmsListener() {
        console.log('🛑 Stopping all SMS listeners...');
        this.smsListeners = [];
        this._updateNativeSubscription();
    }

    /**
     * Setup listener for native module errors
     */
    setupNativeErrorListener() {
        try {
            this.errorListener = DeviceEventEmitter.addListener(
                'sms_error',
                (error) => {
                    console.error('🔴 Native SMS Error:', error);
                    errorHandler.notifyListeners({
                        type: 'native_sms_error',
                        error,
                        timestamp: new Date().toISOString(),
                    });
                }
            );
        } catch (err) {
            console.warn('Could not setup native error listener:', err);
        }
    }

    /**
     * List SMS messages with filters
     * @param {Object} filter - Filter options
     * @returns {Promise<Array>} Array of SMS messages
     */
    async listSms(filter = {}) {
        return errorHandler.safeNativeCall(
            () => new Promise((resolve, reject) => {
                if (Platform.OS !== 'android') {
                    reject(new Error('SMS operations are only supported on Android'));
                    return;
                }

                const defaultFilter = {
                    box: 'inbox', // 'inbox', 'sent', 'draft', 'outbox', 'failed', 'queued', or '' for all
                    indexFrom: 0,
                    maxCount: 100,
                    ...filter,
                };

                try {
                    SmsAndroid.list(
                        JSON.stringify(defaultFilter),
                        (fail) => {
                            console.error('❌ Failed to list SMS:', fail);
                            reject(new Error(`SMS List Failed: ${fail}`));
                        },
                        (count, smsList) => {
                            try {
                                const messages = JSON.parse(smsList);
                                console.log(`✅ Retrieved ${count} SMS messages`);
                                resolve(messages);
                            } catch (error) {
                                console.error('❌ Failed to parse SMS list:', error);
                                reject(new Error(`SMS Parse Error: ${error.message}`));
                            }
                        }
                    );
                } catch (error) {
                    console.error('❌ SMS List Exception:', error);
                    reject(error);
                }
            }),
            {
                context: 'SmsService.listSms',
                defaultValue: [],
                timeout: 15000, // 15 second timeout
            }
        );
    }

    /**
     * Get unread SMS messages
     * @param {number} maxCount - Maximum number of messages to retrieve
     * @returns {Promise<Array>} Array of unread SMS messages
     */
    getUnreadSms(maxCount = 50) {
        return this.listSms({
            box: 'inbox',
            read: 0,
            maxCount,
        });
    }

    /**
     * Get SMS messages from a specific sender
     * @param {string} phoneNumber - Sender's phone number
     * @param {number} maxCount - Maximum number of messages to retrieve
     * @returns {Promise<Array>} Array of SMS messages from the sender
     */
    getSmsFromSender(phoneNumber, maxCount = 50) {
        return this.listSms({
            box: 'inbox',
            address: phoneNumber,
            maxCount,
        });
    }

    /**
     * Get SMS messages within a date range
     * @param {number} minDate - Start timestamp (milliseconds since UNIX epoch)
     * @param {number} maxDate - End timestamp (milliseconds since UNIX epoch)
     * @param {number} maxCount - Maximum number of messages to retrieve
     * @returns {Promise<Array>} Array of SMS messages within the date range
     */
    getSmsByDateRange(minDate, maxDate, maxCount = 100) {
        return this.listSms({
            box: 'inbox',
            minDate,
            maxDate,
            maxCount,
        });
    }

    /**
     * Search SMS messages by content
     * @param {string} searchText - Text to search for in message body
     * @param {number} maxCount - Maximum number of messages to retrieve
     * @returns {Promise<Array>} Array of matching SMS messages
     */
    searchSmsByContent(searchText, maxCount = 50) {
        return this.listSms({
            box: 'inbox',
            body: searchText,
            maxCount,
        });
    }

    /**
     * Search SMS messages using regex pattern
     * @param {string} regexPattern - Regex pattern to match message body
     * @param {number} maxCount - Maximum number of messages to retrieve
     * @returns {Promise<Array>} Array of matching SMS messages
     */
    searchSmsByRegex(regexPattern, maxCount = 50) {
        return this.listSms({
            box: 'inbox',
            bodyRegex: regexPattern,
            maxCount,
        });
    }

    /**
     * Get SMS messages from a specific thread
     * @param {number} threadId - Thread ID
     * @param {number} maxCount - Maximum number of messages to retrieve
     * @returns {Promise<Array>} Array of SMS messages from the thread
     */
    getSmsFromThread(threadId, maxCount = 50) {
        return this.listSms({
            thread_id: threadId,
            maxCount,
        });
    }

    /**
     * Send SMS to a single recipient
     * @param {string} phoneNumber - Recipient's phone number
     * @param {string} message - Message content
     * @returns {Promise<string>} Success message
     */
    sendSms(phoneNumber, message) {
        return new Promise((resolve, reject) => {
            if (Platform.OS !== 'android') {
                reject(new Error('SMS operations are only supported on Android'));
                return;
            }

            SmsAndroid.autoSend(
                phoneNumber,
                message,
                (fail) => {
                    console.error('Failed to send SMS:', fail);
                    reject(new Error(fail));
                },
                (success) => {
                    console.log('SMS sent successfully');
                    resolve(success);
                }
            );
        });
    }

    /**
     * Send SMS to multiple recipients
     * @param {Array<string>} phoneNumbers - Array of recipient phone numbers
     * @param {string} message - Message content
     * @returns {Promise<string>} Success message
     */
    sendBulkSms(phoneNumbers, message) {
        return new Promise((resolve, reject) => {
            if (Platform.OS !== 'android') {
                reject(new Error('SMS operations are only supported on Android'));
                return;
            }

            const addressList = {
                addressList: phoneNumbers,
            };

            SmsAndroid.autoSend(
                JSON.stringify(addressList),
                message,
                (fail) => {
                    console.error('Failed to send bulk SMS:', fail);
                    reject(new Error(fail));
                },
                (success) => {
                    console.log('Bulk SMS sent successfully');
                    resolve(success);
                }
            );
        });
    }

    /**
     * Delete an SMS message by ID
     * @param {number} messageId - SMS message ID
     * @returns {Promise<string>} Success message
     */
    deleteSms(messageId) {
        return new Promise((resolve, reject) => {
            if (Platform.OS !== 'android') {
                reject(new Error('SMS operations are only supported on Android'));
                return;
            }

            SmsAndroid.delete(
                messageId,
                (fail) => {
                    console.error('Failed to delete SMS:', fail);
                    reject(new Error(fail));
                },
                (success) => {
                    console.log('SMS deleted successfully');
                    resolve(success);
                }
            );
        });
    }

    /**
     * Setup SMS delivery listener
     * @param {Function} callback - Callback function to handle delivery events
     */
    setupDeliveryListener(callback) {
        if (this.deliveryListener) {
            this.deliveryListener.remove();
        }

        this.deliveryListener = DeviceEventEmitter.addListener(
            'sms_onDelivery',
            (msg) => {
                console.log('SMS Delivery Status:', msg);
                if (callback) {
                    callback(msg);
                }
            }
        );
    }

    /**
     * Remove SMS delivery listener
     */
    removeDeliveryListener() {
        if (this.deliveryListener) {
            this.deliveryListener.remove();
            this.deliveryListener = null;
        }
    }

    /**
     * Get recent transaction SMS from common banking keywords
     * @param {number} daysBack - Number of days to look back
     * @returns {Promise<Array>} Array of transaction SMS messages
     */
    async getTransactionSms(daysBack = 30) {
        const now = Date.now();
        const minDate = now - (daysBack * 24 * 60 * 60 * 1000);

        // Common banking keywords pattern
        const transactionPattern = '(.*)(debited|credited|withdrawn|deposited|paid|received|transaction|balance|INR|Rs\\.?)(.*)';

        try {
            const messages = await this.searchSmsByRegex(transactionPattern, 200);

            // Filter by date
            const filteredMessages = messages.filter(msg => msg.date >= minDate);

            // Sort by date (newest first)
            filteredMessages.sort((a, b) => b.date - a.date);

            return filteredMessages;
        } catch (error) {
            console.error('Failed to get transaction SMS:', error);
            throw error;
        }
    }

    /**
     * Get SMS statistics
     * @returns {Promise<Object>} SMS statistics
     */
    async getSmsStats() {
        try {
            const [inbox, sent, unread] = await Promise.all([
                this.listSms({ box: 'inbox', maxCount: 1000 }),
                this.listSms({ box: 'sent', maxCount: 1000 }),
                this.getUnreadSms(1000),
            ]);

            return {
                totalInbox: inbox.length,
                totalSent: sent.length,
                totalUnread: unread.length,
                total: inbox.length + sent.length,
            };
        } catch (error) {
            console.error('Failed to get SMS stats:', error);
            throw error;
        }
    }

}

// Export singleton instance
export default new SmsService();
