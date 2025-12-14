import { Platform } from 'react-native';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

/**
 * Satisfaction Service
 * Handles API interactions for satisfaction ratings
 */
const SatisfactionService = {
    /**
     * Create or update satisfaction record
     * @param {string} token - Auth token
     * @param {Object} data - Satisfaction data
     * @param {string} data.transactionId - Transaction ID
     * @param {number} data.rating - Rating (1-5)
     * @param {string} [data.note] - Optional note
     * @returns {Promise<Object>} Created satisfaction record
     */
    createSatisfaction: async (token, { transactionId, rating, note }) => {
        try {
            const response = await fetch(`${API_BASE}/satisfaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    transactionId,
                    rating,
                    note,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to record satisfaction');
            }

            return result;
        } catch (error) {
            console.error('Satisfaction API Error:', error);
            throw error;
        }
    },

    /**
     * Get satisfaction details by transaction ID
     * @param {string} token - Auth token
     * @param {string} transactionId - Transaction ID
     * @returns {Promise<Object>} Satisfaction details
     */
    getSatisfaction: async (token, transactionId) => {
        try {
            const response = await fetch(`${API_BASE}/satisfaction/${transactionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(result.message || 'Failed to retrieve satisfaction');
            }

            return result.satisfaction;
        } catch (error) {
            console.error('Satisfaction API Error:', error);
            throw error;
        }
    },
};

export default SatisfactionService;
