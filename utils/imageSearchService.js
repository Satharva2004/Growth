const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY; // USER_PROVIDED_KEY
const GOOGLE_CSE_ID = process.env.EXPO_PUBLIC_GOOGLE_CSE_ID; // USER_PROVIDED_ID
const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * Image Search Service
 * Searches for images using Google Custom Search API
 */
const ImageSearchService = {
    /**
     * Search for an image URL by query (e.g., merchant name)
     * @param {string} query - The search query
     * @returns {Promise<string|null>} The image URL or null if not found
     */
    findImage: async (query) => {
        if (!query) return null;

        try {
            console.log(`🔍 Searching Google Images for: ${query}`);
            const url = `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(query)}&cx=${GOOGLE_CSE_ID}&key=${GOOGLE_API_KEY}&searchType=image&num=1&safe=active`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const imageUrl = data.items[0].link;
                console.log(`✅ Found Image: ${imageUrl}`);
                return imageUrl;
            } else {
                console.warn('⚠️ No images found for query:', query);
                return null;
            }
        } catch (error) {
            console.error('❌ Google Image Search Error:', error);
            return null;
        }
    }
};

export default ImageSearchService;
