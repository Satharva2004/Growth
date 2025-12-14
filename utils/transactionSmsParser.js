import SmsService from './smsService';

/**
 * Transaction SMS Parser for react-native-get-sms-android
 * Integrates with your existing transaction flow
 */

/**
 * Parse transaction details from SMS body
 * @param {string} body - SMS message body
 * @returns {Object|null} Parsed transaction or null
 */
export const parseTransactionSms = (body) => {
    const lowerBody = body.toLowerCase();

    // Check if it's a transaction SMS
    const isTransaction =
        lowerBody.includes('debited') ||
        lowerBody.includes('credited') ||
        lowerBody.includes('withdrawn') ||
        lowerBody.includes('deposited') ||
        lowerBody.includes('paid') ||
        lowerBody.includes('received') ||
        lowerBody.includes('transaction');

    if (!isTransaction) {
        return null;
    }

    // Determine transaction type
    let type = 'unknown';
    if (lowerBody.includes('debited') || lowerBody.includes('withdrawn') || lowerBody.includes('paid')) {
        type = 'debit';
    } else if (lowerBody.includes('credited') || lowerBody.includes('deposited') || lowerBody.includes('received')) {
        type = 'credit';
    }

    // Extract amount (supports INR, Rs., Rs, ₹)
    const amountPatterns = [
        /(?:inr|rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
        /([0-9,]+(?:\.[0-9]{2})?)\s*(?:inr|rs\.?|₹)/i,
    ];

    let amount = null;
    for (const pattern of amountPatterns) {
        const match = body.match(pattern);
        if (match) {
            amount = parseFloat(match[1].replace(/,/g, ''));
            break;
        }
    }

    // Extract account number (last 4 digits)
    const accountMatch = body.match(/(?:a\/c|account|ac).*?(\d{4})/i);
    const accountNumber = accountMatch ? accountMatch[1] : null;

    // Extract reference/transaction ID
    const refMatch = body.match(/(?:ref|txn|transaction|utr).*?([a-z0-9]{8,})/i);
    const referenceId = refMatch ? refMatch[1] : null;

    // Extract merchant/description
    const merchantPatterns = [
        /(?:at|to|from)\s+([A-Z][A-Za-z0-9\s]{3,30}?)(?:\s+on|\s+a\/c|\.|$)/,
        /(?:paid to|received from)\s+([A-Z][A-Za-z0-9\s]{3,30}?)(?:\s+on|\.|$)/,
    ];

    let merchant = null;
    for (const pattern of merchantPatterns) {
        const match = body.match(pattern);
        if (match) {
            merchant = match[1].trim();
            break;
        }
    }

    return {
        type,
        amount,
        accountNumber,
        referenceId,
        merchant,
        rawBody: body,
    };
};

/**
 * Get and parse transaction SMS
 * @param {number} daysBack - Number of days to look back
 * @returns {Promise<Array>} Array of parsed transactions
 */
export const getTransactionMessages = async (daysBack = 30) => {
    try {
        // Get transaction SMS using the service
        const messages = await SmsService.getTransactionSms(daysBack);

        // Parse each message
        const transactions = messages
            .map(msg => {
                const parsed = parseTransactionSms(msg.body);

                if (!parsed) {
                    return null;
                }

                return {
                    id: msg._id,
                    date: new Date(msg.date),
                    timestamp: msg.date,
                    sender: msg.address,
                    threadId: msg.thread_id,
                    ...parsed,
                };
            })
            .filter(t => t !== null && t.amount !== null); // Only include valid transactions with amounts

        return transactions;
    } catch (error) {
        console.error('Failed to get transaction messages:', error);
        throw error;
    }
};

/**
 * Get transactions from specific bank
 * @param {string} bankIdentifier - Bank name or sender ID
 * @param {number} daysBack - Number of days to look back
 * @returns {Promise<Array>} Array of parsed transactions
 */
export const getTransactionsFromBank = async (bankIdentifier, daysBack = 30) => {
    try {
        const messages = await SmsService.getSmsFromSender(bankIdentifier, 100);

        const now = Date.now();
        const minDate = now - (daysBack * 24 * 60 * 60 * 1000);

        // Filter by date and parse
        const transactions = messages
            .filter(msg => msg.date >= minDate)
            .map(msg => {
                const parsed = parseTransactionSms(msg.body);

                if (!parsed) {
                    return null;
                }

                return {
                    id: msg._id,
                    date: new Date(msg.date),
                    timestamp: msg.date,
                    sender: msg.address,
                    bank: bankIdentifier,
                    ...parsed,
                };
            })
            .filter(t => t !== null && t.amount !== null);

        return transactions;
    } catch (error) {
        console.error('Failed to get bank transactions:', error);
        throw error;
    }
};

/**
 * Get transaction summary
 * @param {number} daysBack - Number of days to analyze
 * @returns {Promise<Object>} Transaction summary
 */
export const getTransactionSummary = async (daysBack = 30) => {
    try {
        const transactions = await getTransactionMessages(daysBack);

        const summary = {
            totalTransactions: transactions.length,
            totalDebits: 0,
            totalCredits: 0,
            debitAmount: 0,
            creditAmount: 0,
            banks: new Set(),
            merchants: new Set(),
            dateRange: {
                from: null,
                to: null,
            },
        };

        transactions.forEach(txn => {
            if (txn.type === 'debit') {
                summary.totalDebits++;
                summary.debitAmount += txn.amount;
            } else if (txn.type === 'credit') {
                summary.totalCredits++;
                summary.creditAmount += txn.amount;
            }

            summary.banks.add(txn.sender);

            if (txn.merchant) {
                summary.merchants.add(txn.merchant);
            }

            if (!summary.dateRange.from || txn.timestamp < summary.dateRange.from) {
                summary.dateRange.from = new Date(txn.timestamp);
            }

            if (!summary.dateRange.to || txn.timestamp > summary.dateRange.to) {
                summary.dateRange.to = new Date(txn.timestamp);
            }
        });

        summary.banks = Array.from(summary.banks);
        summary.merchants = Array.from(summary.merchants);
        summary.netAmount = summary.creditAmount - summary.debitAmount;

        return summary;
    } catch (error) {
        console.error('Failed to get transaction summary:', error);
        throw error;
    }
};

/**
 * Sync transactions to backend API
 * @param {string} apiUrl - Backend API endpoint
 * @param {string} authToken - Authentication token
 * @param {number} daysBack - Number of days to sync
 * @returns {Promise<Object>} Sync result
 */
export const syncTransactionsToBackend = async (apiUrl, authToken, daysBack = 30) => {
    try {
        // Get transactions from SMS
        const transactions = await getTransactionMessages(daysBack);

        console.log(`Syncing ${transactions.length} transactions to backend...`);

        // Send to backend
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                transactions,
                syncDate: new Date().toISOString(),
                source: 'sms',
            }),
        });

        if (!response.ok) {
            throw new Error(`Backend sync failed: ${response.status}`);
        }

        const result = await response.json();

        console.log('Sync completed successfully:', result);

        return {
            success: true,
            synced: transactions.length,
            result,
        };
    } catch (error) {
        console.error('Failed to sync transactions:', error);
        throw error;
    }
};

/**
 * Example: Integration with your existing flow
 */
export const integrateWithExistingFlow = async () => {
    try {
        // 1. Get transaction SMS from last 30 days
        const transactions = await getTransactionMessages(30);

        console.log(`Found ${transactions.length} transactions`);

        // 2. Get summary
        const summary = await getTransactionSummary(30);

        console.log('Summary:', summary);
        console.log(`Total Debits: ₹${summary.debitAmount.toFixed(2)}`);
        console.log(`Total Credits: ₹${summary.creditAmount.toFixed(2)}`);
        console.log(`Net: ₹${summary.netAmount.toFixed(2)}`);

        // 3. Sync to your backend (replace with your actual API endpoint)
        // const syncResult = await syncTransactionsToBackend(
        //   'https://goals-backend-brown.vercel.app/api/transaction',
        //   'your-auth-token',
        //   30
        // );

        return {
            transactions,
            summary,
        };
    } catch (error) {
        console.error('Integration failed:', error);
        throw error;
    }
};

export default {
    parseTransactionSms,
    getTransactionMessages,
    getTransactionsFromBank,
    getTransactionSummary,
    syncTransactionsToBackend,
    integrateWithExistingFlow,
};
