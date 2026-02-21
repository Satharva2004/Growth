import { API_BASE } from '../constants/Config';

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

    /**
     * Get all transactions
     * @param {string} token - Auth token
     * @returns {Promise<Array>} List of transactions
     */
    getTransactions: async (token) => {
        try {
            const response = await fetch(`${API_BASE}/transcation`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to fetch transactions');
            }

            return result.transactions || [];
        } catch (error) {
            console.error('Transaction API Error:', error);
            throw error;
        }
    },

    /**
     * Get a transaction by ID
     * @param {string} token - Auth token
     * @param {string} id - Transaction ID
     * @returns {Promise<Object>} Transaction details
     */
    getTransactionById: async (token, id) => {
        try {
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to fetch transaction');
            }

            return result.transaction || result;
        } catch (error) {
            console.error('Transaction API Error:', error);
            throw error;
        }
    },

    /**
     * Update a transaction (PUT)
     * @param {string} token - Auth token
     * @param {string} id - Transaction ID
     * @param {Object} data - Transaction data
     * @returns {Promise<Object>} Updated transaction
     */
    updateTransaction: async (token, id, data) => {
        try {
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to update transaction');
            }

            return result;
        } catch (error) {
            console.error('Transaction API Error:', error);
            throw error;
        }
    },

    /**
     * Partially update a transaction (PATCH)
     * @param {string} token - Auth token
     * @param {string} id - Transaction ID
     * @param {Object} data - Partial transaction data
     * @returns {Promise<Object>} Updated transaction
     */
    partialUpdateTransaction: async (token, id, data) => {
        try {
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to update transaction');
            }

            return result;
        } catch (error) {
            console.error('Transaction API Error:', error);
            throw error;
        }
    },

    /**
     * Delete a transaction
     * @param {string} token - Auth token
     * @param {string} id - Transaction ID
     * @returns {Promise<void>}
     */
    deleteTransaction: async (token, id) => {
        try {
            const response = await fetch(`${API_BASE}/transcation/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || result.error || 'Failed to delete transaction');
            }
        } catch (error) {
            console.error('Transaction API Error:', error);
            throw error;
        }
    },

    /**
     * Sync multiple transactions (e.g. from SMS)
     * @param {string} token - Auth token
     * @param {Array} transactions - Array of transaction objects
     * @returns {Promise<Object>} Sync result
     */
    syncTransactions: async (token, transactions) => {
        try {
            const response = await fetch(`${API_BASE}/transcation/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ transactions }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to sync transactions');
            }

            return result;
        } catch (error) {
            console.error('Transaction Sync API Error:', error);
            throw error;
        }
    },
};

export default TransactionService;
