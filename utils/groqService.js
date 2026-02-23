
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MODEL = 'llama-3.1-8b-instant';
const MAX_RETRIES = 3;

/* ─── helpers ────────────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Parse "try again in 1.5s / 780ms" from a Groq 429 body → milliseconds */
const parseRetryDelay = (text) => {
    try {
        const ms = text.match(/in\s+([\d.]+)\s*ms/i);
        const sec = text.match(/in\s+([\d.]+)\s*s(?!\w)/i);
        if (ms) return Math.ceil(parseFloat(ms[1])) + 300;
        if (sec) return Math.ceil(parseFloat(sec[1]) * 1000) + 300;
    } catch (_) { }
    return null;
};

/* ─── prompt ─────────────────────────────────────────────────────────────── */

/**
 * This prompt is deliberately strict.
 * The most common mistake is treating PROMOTIONAL / MARKETING messages
 * (e.g. "Recharge with ₹899 plan") as actual debits.
 */
const buildPrompt = (smsBody, sender) => `
You are a strict Indian bank-SMS transaction parser. Your ONLY job is to
identify REAL money movements (money actually left or entered an account).

══ REAL TRANSACTION INDICATORS (must have at least 2) ══════════════════════
  • Account/card reference:       "A/c", "Ac", "XX1234", "Card ending", "XXXX"
  • Confirmed action (past tense): "debited", "credited", "paid", "sent",
                                   "received", "transferred", "processed"
  • Unique reference number:      "UTR", "Ref No", "Txn ID", "UPI Ref", "IMPS",
                                   "NEFT", "RTGS" followed by alphanumeric code
  • Balance confirmation:         "Avl Bal", "Available balance", "A/c bal"
  • OTP-less sender ID pattern:   sender like VM-HDFCBK, AX-ICICIB, VK-SBIPSG,
                                   AD-PAYTMB, etc.

══ REJECT IMMEDIATELY — these are NOT transactions ═════════════════════════
  ✗ Recharge offers / plan promotions   ("Recharge with ₹899", "Best plan at")
  ✗ Cashback / reward offers            ("Get 10% cashback", "Earn reward points")
  ✗ OTP / verification messages         ("OTP is", "Do not share")
  ✗ Account statements / summaries      ("Your statement for", "monthly summary")
  ✗ Low-balance alerts without debit    ("Your balance is low")
  ✗ Marketing / promotional language    ("Offer valid till", "Limited time",
                                         "Upgrade now", "Click here", "Subscribe")
  ✗ Future-tense amounts                ("will be debited", "plan costs ₹399")
  ✗ Multiple plan prices listed         ("₹239 | ₹479 | ₹2999")

══ FEW-SHOT EXAMPLES ════════════════════════════════════════════════════════

SMS: "Dear Customer, Rs.3,599.00 has been debited from A/c XX4821 at JIO on
     20-02-2025 14:30. Avl Bal: Rs.12,450.00. If not you, call 1800111109."
Sender: VM-HDFCBK
→ REAL TRANSACTION ✓ (has A/c ref + past-tense debit + balance)
→ {"is_transaction":true,"name":"Jio","amount":3599,"category":"Bills",
   "type":"debit","merchant_domain":"jio.com","payment_method":"NetBanking","source":"HDFC Bank"}

SMS: "Recharge now with Jio's best plans! ₹899/28 days unlimited.
     ₹2,025/84 days. ₹3,599/annual. Click to recharge: jio.com/offer"
Sender: JM-JIOCMN
→ MARKETING ✗ (promotional language, future offers, multiple prices)
→ {"is_transaction":false}

SMS: "UPI payment of Rs.114.00 to Rapido Auto is successful.
     UPI Ref: 503821749261. -Axis Bank"
Sender: AX-AXISBK
→ REAL TRANSACTION ✓ (past-tense "successful" + UPI Ref)
→ {"is_transaction":true,"name":"Rapido","amount":114,"category":"Travel",
   "type":"debit","merchant_domain":"rapido.xyz","payment_method":"UPI","reference_id":"503821749261","source":"Axis Bank"}

SMS: "Get Rapido ride credits worth ₹150! Use code RIDE150 before 28 Feb.
     T&C apply. Reply STOP to opt out."
Sender: TM-RAPIDO
→ MARKETING ✗ (promotional code, future expiry, T&C)
→ {"is_transaction":false}

SMS: "Rs.150.00 debited from your account via UPI to Mangesh Shahdev
     on 20-Feb-2025. UPI Ref No 318204759021. — SBI"
Sender: VK-SBIPSG
→ REAL TRANSACTION ✓ (past-tense debited + UPI Ref)
→ {"is_transaction":true,"name":"Mangesh Shahdev","amount":150,"category":"Transfer",
   "type":"debit","merchant_domain":null,"payment_method":"UPI","reference_id":"318204759021","source":"SBI"}

SMS: "Congratulations! Your Jio recharge of ₹899 is DUE tomorrow.
     Recharge now to avoid service interruption."
Sender: JM-JIOCMN
→ MARKETING ✗ (future tense "DUE tomorrow", promotional urgency)
→ {"is_transaction":false}

══ NOW PARSE THIS ════════════════════════════════════════════════════════════
SMS: "${smsBody}"
Sender: "${sender}"

Apply the rules above strictly. If in doubt → {"is_transaction":false}

Return ONLY a raw JSON object (no markdown). Schema when is_transaction=true:
{
  "is_transaction": true,
  "name": "<merchant or person — clean, no UPI jargon>",
  "amount": <number, no commas>,
  "category": "<Food|Travel|Shopping|Bills|Entertainment|Health|Transfer|Income|Investment|Other>",
  "type": "<debit|credit>",
  "merchant_domain": "<REQUIRED for businesses: domain.com (e.g. zomato.com, swiggy.com, amzn.in, uber.com, jio.com, airtel.in). Use null for individuals.>",
  "payment_method": "<UPI|Card|NetBanking|Wallet|Cash|null>",
  "reference_id": "<UTR/UPI Ref/Txn ID or null>",
  "transaction_date": "<ISO8601 or null>",
  "source": "<bank or wallet name or null>"
}
`.trim();

/* ─── main export ────────────────────────────────────────────────────────── */

/**
 * Parse an SMS with Groq. Retries automatically on 429 rate-limit errors.
 *
 * @param {string} smsBody
 * @param {string} sender
 * @returns {Promise<Object|null>}  null = not a transaction / error
 */
export const parseWithGroq = async (smsBody, sender) => {
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'user', content: buildPrompt(smsBody, sender) }],
                    temperature: 0.1,
                    max_tokens: 300,   // JSON output is small
                    response_format: { type: 'json_object' },
                }),
            });

            /* ── 429: wait exactly as long as Groq tells us ── */
            if (response.status === 429) {
                const errText = await response.text();
                const waitMs = parseRetryDelay(errText) ?? (1000 * 2 ** attempt);
                console.warn(`[Groq] Rate limit (attempt ${attempt + 1}). Waiting ${waitMs}ms…`);
                await sleep(waitMs);
                lastError = errText;
                continue;
            }

            if (!response.ok) {
                console.error('[Groq] API Error:', response.status, await response.text());
                return null;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) return null;

            const parsed = JSON.parse(content);

            /* Model explicitly flagged this as non-transaction */
            if (!parsed.is_transaction) return null;

            /* Sanity checks */
            if (!parsed.amount || !parsed.name) return null;
            if (parsed.amount <= 0) return null;

            /* Attach derived fields */
            parsed.sms_body = smsBody;
            parsed.image_address = getLogoUrl(parsed.name, parsed.merchant_domain);
            parsed.category_identified = !!(parsed.category && parsed.category !== 'Other');

            return parsed;

        } catch (error) {
            console.error('[Groq] Exception (attempt', attempt + 1, '):', error.message);
            lastError = error;
            if (attempt < MAX_RETRIES - 1) await sleep(1000 * (attempt + 1));
        }
    }

    console.error('[Groq] All retries exhausted. Last error:', lastError);
    return null;
};

/* ─── logo helper ────────────────────────────────────────────────────────── */

export const getLogoUrl = (merchantName, domain) => {
    if (domain) {
        const key = process.env.EXPO_PUBLIC_LOGO_DEV_PUBLIC_KEY;
        return `https://img.logo.dev/${domain}?token=${key}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(merchantName || 'TX')}&background=random`;
};
