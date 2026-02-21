const API_BASE = 'https://goals-backend-brown.vercel.app/api';

/**
 * Analytics Service
 * Handles API interactions for analytics data
 */
const AnalyticsService = {
    /**
     * Get analytics data
     * @param {string} token - Auth token
     * @returns {Promise<Object>} Analytics data
     */
    getAnalytics: async (token) => {
        try {
            const response = await fetch(`${API_BASE}/analytics`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to fetch analytics');
            }

            return result;
        } catch (error) {
            console.error('Analytics API Error:', error);
            throw error;
        }
    },
};

export default AnalyticsService;
