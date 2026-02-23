import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    TRANSACTIONS: 'clarity_transactions_cache',
    PENDING_SYNC: 'clarity_pending_sync',
    LAST_SYNC_TIME: 'clarity_last_sync_time',
    PROCESSED_SMS_IDS: 'clarity_processed_sms_ids',
};

/**
 * Save a full list of transactions to local cache.
 */
export async function cacheTransactions(transactions) {
    try {
        await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
        await AsyncStorage.setItem(KEYS.LAST_SYNC_TIME, Date.now().toString());
    } catch (e) {
        console.error('[OfflineStorage] cacheTransactions error:', e);
    }
}

/**
 * Load cached transactions from local storage.
 * Returns [] if nothing cached.
 */
export async function loadCachedTransactions() {
    try {
        const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('[OfflineStorage] loadCachedTransactions error:', e);
        return [];
    }
}

/**
 * Get the timestamp of the last successful sync.
 */
export async function getLastSyncTime() {
    try {
        const raw = await AsyncStorage.getItem(KEYS.LAST_SYNC_TIME);
        return raw ? parseInt(raw, 10) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Add a transaction to the pending-sync queue (when offline).
 */
export async function addToPendingQueue(transaction) {
    try {
        const raw = await AsyncStorage.getItem(KEYS.PENDING_SYNC);
        const queue = raw ? JSON.parse(raw) : [];
        // Avoid exact duplicates by reference_id
        if (transaction.reference_id && queue.some(q => q.reference_id === transaction.reference_id)) {
            console.log('[OfflineStorage] Skipping duplicate pending transaction:', transaction.reference_id);
            return;
        }
        queue.push({ ...transaction, _queued_at: Date.now() });
        await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(queue));
        console.log('[OfflineStorage] Added to pending queue. Total:', queue.length);
    } catch (e) {
        console.error('[OfflineStorage] addToPendingQueue error:', e);
    }
}

/**
 * Get all pending transactions waiting to be synced.
 */
export async function getPendingQueue() {
    try {
        const raw = await AsyncStorage.getItem(KEYS.PENDING_SYNC);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Clear the pending sync queue (after successful sync).
 */
export async function clearPendingQueue() {
    try {
        await AsyncStorage.removeItem(KEYS.PENDING_SYNC);
    } catch (e) {
        console.error('[OfflineStorage] clearPendingQueue error:', e);
    }
}

/**
 * Remove specific items from the pending queue by their _queued_at timestamps.
 */
export async function removeSyncedFromQueue(syncedQueuedAts) {
    try {
        const raw = await AsyncStorage.getItem(KEYS.PENDING_SYNC);
        const queue = raw ? JSON.parse(raw) : [];
        const remaining = queue.filter(q => !syncedQueuedAts.includes(q._queued_at));
        await AsyncStorage.setItem(KEYS.PENDING_SYNC, JSON.stringify(remaining));
    } catch (e) {
        console.error('[OfflineStorage] removeSyncedFromQueue error:', e);
    }
}

/**
 * Remember an SMS message_id as processed to avoid re-processing.
 * @param {string} smsId - The unique SMS id (date + address combo or message id)
 */
export async function markSmsAsProcessed(smsId) {
    try {
        const raw = await AsyncStorage.getItem(KEYS.PROCESSED_SMS_IDS);
        const ids = raw ? JSON.parse(raw) : [];
        if (!ids.includes(smsId)) {
            ids.push(smsId);
            // Keep only last 500 IDs to avoid bloat
            const trimmed = ids.slice(-500);
            await AsyncStorage.setItem(KEYS.PROCESSED_SMS_IDS, JSON.stringify(trimmed));
        }
    } catch (e) {
        console.error('[OfflineStorage] markSmsAsProcessed error:', e);
    }
}

/**
 * Check if an SMS has already been processed.
 * @param {string} smsId
 * @returns {Promise<boolean>}
 */
export async function isSmsProcessed(smsId) {
    try {
        const raw = await AsyncStorage.getItem(KEYS.PROCESSED_SMS_IDS);
        const ids = raw ? JSON.parse(raw) : [];
        return ids.includes(smsId);
    } catch (e) {
        return false;
    }
}
