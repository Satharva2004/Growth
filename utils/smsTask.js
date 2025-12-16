import * as SecureStore from 'expo-secure-store';
import TransactionService from './transactionService';
import { parseTransactionSms } from './transactionSmsParser';
import { sendSatisfactionNotification, setupNotifications } from './notificationService';

// Task MUST be async
module.exports = async (taskData) => {
    console.log('⚡ Headless JS Task Started:', taskData);

    const { originatingAddress, body, timestamp } = taskData;

    try {
        // 0. Setup Notifications Channel (Critical for Android Background)
        await setupNotifications();
        // 1. Get Auth Token
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
            console.warn('⚠️ No auth token found in background task. Cannot create transaction.');
            return;
        }

        // 2. Parse SMS
        // We reuse the existing parser
        const parsed = parseTransactionSms(body);

        if (parsed && parsed.type === 'debit') {
            console.log('💸 Background Debit Detected:', parsed.amount);

            // 3. Create Transaction
            const newTxn = await TransactionService.createTransaction(token, {
                name: parsed.merchant || 'Unknown Purchase',
                amount: parsed.amount,
                category: 'Other',
                note: `Auto-detected from Background SMS: ${body}`,
                is_auto: true,
                transaction_date: new Date(timestamp).toISOString() // Use SMS timestamp
            });

            console.log('✅ Background Transaction created:', newTxn.id || newTxn._id);

            // 4. Send Notification
            const txnId = newTxn.id || newTxn._id;
            if (txnId) {
                await sendSatisfactionNotification(
                    txnId,
                    parsed.merchant || 'Unknown Purchase',
                    parsed.amount,
                    { requestPermissions: false } // Important: Don't ask for permissions in background
                );
            }
        } else {
            console.log('ℹ️ SMS was not a debit transaction.');
        }

    } catch (error) {
        console.error('❌ Error in Headless SMS Task:', error);
    }
};
