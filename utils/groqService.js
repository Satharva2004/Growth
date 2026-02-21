
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Parse SMS using Groq LLM
 * @param {string} smsBody - The body of the SMS
 * @param {string} sender - The sender of the SMS
 * @returns {Promise<Object|null>} Parsed transaction data or null
 */
export const parseWithGroq = async (smsBody, sender) => {
    try {
        const systemPrompt = `
You are an intelligent financial assistant specialized in parsing SMS transaction alerts.
Your goal is to extract structured data from raw SMS text.

INPUT:
- SMS Body: "${smsBody}"
- Sender ID: "${sender}"

INSTRUCTIONS:
1. Identify if this is a financial transaction (Debit, Credit, Bill Payment, etc.). If NOT, return \`null\`.
2. Extract the following fields:
   - name: The clean name of the MERCHANT or PERSON. Remove generic words like "UPI-ref", "Transfer to", etc.
   - amount: The numeric value of the transaction.
   - category: Classify into: Food, Travel, Shopping, Bills, Entertainment, Health, Transfer, Income, Investment, or Other.
   - type: "debit" or "credit".
   - merchant_domain: (CRITICAL) The website domain of the merchant (e.g., "swiggy.com", "uber.com", "amazon.in", "starbucks.com"). If it's a person or unknown, return null.
   - payment_method: UPI, Card, NetBanking, Wallet, Cash, etc.
   - reference_id: Any UTR, Ref No, or Transaction ID found.
   - transaction_date: ISO 8601 date string (YYYY-MM-DDTHH:mm:ss.sssZ) if a date/time is mentioned. Otherwise null.
   - source: The bank/wallet name (e.g., HDFC, SBI, Paytm).

OUTPUT FORMAT:
Return ONLY a raw JSON object. No markdown formatting.

EXAMPLE OUTPUT:
{
  "name": "Swiggy",
  "amount": 250.00,
  "category": "Food",
  "type": "debit",
  "merchant_domain": "swiggy.com",
  "payment_method": "UPI",
  "reference_id": "1234567890",
  "transaction_date": "2024-01-01T10:00:00.000Z",
  "source": "HDFC Bank"
}
`;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: systemPrompt }
                ],
                model: 'llama-3.3-70b-versatile', // Using a capable model
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API Error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) return null;

        const parsed = JSON.parse(content);

        if (!parsed || parsed.type === 'unknown' || !parsed.amount) {
            return null;
        }

        // Add additional required fields
        parsed.sms_body = smsBody;
        parsed.image_address = getLogoUrl(parsed.name, parsed.merchant_domain);

        return parsed;

    } catch (error) {
        console.error('Error parsing with Groq:', error);
        return null; // Fallback to Regex or fail gracefully
    }
};

/**
 * Generate a logo URL based on merchant name
 * @param {string} merchantName 
 * @param {string|null} domain 
 * @returns {string}
 */
const getLogoUrl = (merchantName, domain) => {
    if (domain) {
        const LOGO_DEV_PUBLIC_KEY = process.env.EXPO_PUBLIC_LOGO_DEV_PUBLIC_KEY;
        return `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`;
    }
    // Fallback: Use UI Avatars with valid URL encoding
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(merchantName)}&background=random`;
};
