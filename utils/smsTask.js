import * as SecureStore from 'expo-secure-store';
import TransactionService from './transactionService';
import { parseWithGroq } from './groqService';
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
        // Use Groq to process the message
        const parsed = await parseWithGroq(body, originatingAddress);

        if (parsed && parsed.type === 'debit') {
            console.log('💸 Background Debit Detected (Groq):', parsed.amount);

            // 3. Create Transaction
            const newTxn = await TransactionService.createTransaction(token, {
                name: parsed.name || 'Unknown Purchase',
                amount: parsed.amount,
                category: parsed.category || 'Other',
                note: parsed.note || `Auto-detected from Background SMS`,
                description: parsed.note, // Some backends might use description
                is_auto: true,
                transaction_date: parsed.transaction_date || new Date(timestamp).toISOString(),
                payment_method: parsed.payment_method,
                reference_id: parsed.reference_id,
                source: parsed.source,
                sms_body: body,
                image_address: parsed.image_address,
            });

            console.log('✅ Background Transaction created:', newTxn.id || newTxn._id);

            // 4. Send Notification
            const txnId = newTxn.id || newTxn._id;
            if (txnId) {
                await sendSatisfactionNotification(
                    txnId,
                    parsed.name || 'Unknown Purchase',
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
