const API_BASE = 'https://goals-backend-brown.vercel.app/api';

/**
 * Transaction Service
 * Handles API interactions for transactions
 */
const TransactionService = {
    /**
     * Create a new transaction
     * @param {string} token - Auth token
     * @param {Object} data - Transaction data
     * @returns {Promise<Object>} Created transaction
     */
    createTransaction: async (token, data) => {
        try {
            const response = await fetch(`${API_BASE}/transcation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to create transaction');
            }

            // The API returns { message: "...", transaction: { ... } } or similar
            // We return the transaction object if possible, or the whole result
            return result.transaction || result;
        } catch (error) {
            console.error('Transaction API Error:', error);
            throw error;
        }
    },
};

export default TransactionService;
