import * as SecureStore from 'expo-secure-store';
import TransactionService from './transactionService';
import { parseWithGroq } from './groqService';
import { sendCategoryNotification, setupNotifications } from './notificationService';
import { markSmsAsProcessed, isSmsProcessed, addToPendingQueue } from './offlineStorage';

/**
 * Headless JS Task — runs even when app is killed/backgrounded.
 *
 * Key improvements:
 *  1. Deduplication – skips already-processed SMS via a persisted ID set.
 *  2. Offline queue – if network fails, queues the transaction locally.
 *  3. Category notification – asks user to pick a category when AI returns
 *     'Other' or cannot identify a category, instead of satisfaction prompt.
 *  4. Robust error handling with graceful fallbacks.
 */
module.exports = async (taskData) => {
    console.log('⚡ [BG Task] Headless JS Task Started:', JSON.stringify(taskData));

    const { originatingAddress, body, timestamp, _id } = taskData;

    // Build a unique SMS fingerprint for deduplication
    const smsFingerprint = _id || `${originatingAddress}_${timestamp}_${(body || '').slice(0, 40)}`;

    try {
        // ── 0. Avoid processing the same SMS twice ───────────────────────────
        const alreadyDone = await isSmsProcessed(smsFingerprint);
        if (alreadyDone) {
            console.log('⏭️ [BG Task] SMS already processed, skipping:', smsFingerprint);
            return;
        }

        // ── 1. Setup notification channel (idempotent) ───────────────────────
        await setupNotifications();

        // ── 2. Parse with Groq ───────────────────────────────────────────────
        console.log('🧠 [BG Task] Parsing SMS with Groq...');
        const parsed = await parseWithGroq(body, originatingAddress);

        if (!parsed || !parsed.amount) {
            console.log('ℹ️ [BG Task] SMS is not a financial transaction, skipping.');
            await markSmsAsProcessed(smsFingerprint); // Mark so we skip it next time
            return;
        }

        console.log('💰 [BG Task] Transaction detected:', parsed.name, parsed.amount, parsed.type);

        // ── 3. Get auth token ────────────────────────────────────────────────
        const token = await SecureStore.getItemAsync('authToken');

        const txnPayload = {
            name: parsed.name || 'Unknown Purchase',
            amount: parsed.amount,
            category: parsed.category || 'Other',
            note: parsed.note || `Auto-detected from SMS`,
            is_auto: true,
            transaction_date: parsed.transaction_date || new Date(timestamp || Date.now()).toISOString(),
            payment_method: parsed.payment_method,
            reference_id: parsed.reference_id,
            source: parsed.source,
            sms_body: body,
            image_address: parsed.image_address,
            merchant_domain: parsed.merchant_domain,
        };

        if (!token) {
            // ── 3a. Offline queue ────────────────────────────────────────────
            console.warn('⚠️ [BG Task] No auth token — queuing transaction for later sync.');
            await addToPendingQueue(txnPayload);
            await markSmsAsProcessed(smsFingerprint);
            return;
        }

        // ── 4. Create transaction on backend ─────────────────────────────────
        let newTxn;
        try {
            newTxn = await TransactionService.createTransaction(token, txnPayload);
            console.log('✅ [BG Task] Transaction created:', newTxn?.id || newTxn?._id);
        } catch (networkErr) {
            console.warn('⚠️ [BG Task] API failed, queuing locally:', networkErr.message);
            await addToPendingQueue(txnPayload);
            await markSmsAsProcessed(smsFingerprint);
            return;
        }

        // ── 5. Mark SMS as processed ─────────────────────────────────────────
        await markSmsAsProcessed(smsFingerprint);

        // ── 6. Category notification if AI couldn't identify category ─────────
        const txnId = newTxn?.id || newTxn?._id;
        const needsCategoryConfirm =
            !parsed.category ||
            parsed.category === 'Other' ||
            parsed.category === 'other';

        if (txnId && needsCategoryConfirm) {
            console.log('🔔 [BG Task] Sending category-ask notification...');
            await sendCategoryNotification(
                txnId,
                parsed.name || 'Unknown Purchase',
                parsed.amount,
                { requestPermissions: false }, // Never ask for permission in background
            );
        } else {
            console.log('✅ [BG Task] Category identified as:', parsed.category, '— no notification needed.');
        }

    } catch (error) {
        console.error('❌ [BG Task] Fatal error in Headless SMS Task:', error);
    }
};
