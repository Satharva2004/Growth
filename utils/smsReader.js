import { useEffect, useState, useCallback } from 'react';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import SmsService from './smsService';

// API Configuration
const API_BASE_URL = 'https://goals-backend-brown.vercel.app/api';

// Helper functions for parsing
const detectAmount = (body) => {
  if (!body) return null;
  const match = body.match(/(?:rs\.?|inr|₹)\s*([0-9.,]+(?:\.\d+)?)/i);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(/,/g, ''));
  if (Number.isNaN(numeric)) return null;
  return numeric;
};

const detectType = (body) => {
  if (!body) return null;
  const lower = body.toLowerCase();
  if (/credited|received|deposited|added/.test(lower)) return "credit";
  if (/debited|spent|withdrawn|deducted|used|paid|payment/.test(lower)) return "debit";
  return null;
};

const detectVendor = (body) => {
  if (!body) return null;
  const atMatch = body.match(/at ([A-Za-z0-9 &._-]+)/i);
  if (atMatch) return atMatch[1].trim();
  const toMatch = body.match(/to ([A-Za-z0-9@._-]+)/i);
  if (toMatch) return toMatch[1].trim();
  return null;
};

const detectReference = (body) => {
  if (!body) return null;
  const match = body.match(/(?:ref(?:erence)?\s*[:#-]?\s*)([A-Za-z0-9]+)/i);
  return match ? match[1] : null;
};

// API Client
const apiClient = {
  post: async (endpoint, data, token = null) => {
    console.log('🌐 [API] Starting POST request to:', `${API_BASE_URL}${endpoint}`);
    console.log('🌐 [API] Request payload:', JSON.stringify(data, null, 2));
    console.log('🌐 [API] Token present:', !!token);

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🌐 [API] Authorization header set');
    }

    try {
      console.log('🌐 [API] Sending fetch request...');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      console.log('🌐 [API] Response status:', response.status);
      console.log('🌐 [API] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌐 [API] Error response body:', errorText);
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      const responseData = await response.json();
      console.log('🌐 [API] Success response:', JSON.stringify(responseData, null, 2));
      return responseData;
    } catch (error) {
      console.error('🌐 [API] Fetch error:', error.message);
      console.error('🌐 [API] Full error:', error);
      throw error;
    }
  },
};

// Main Hook
export const useSmsTransactionHandler = (options = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState(null);
  const [error, setError] = useState(null);

  // Get auth token from the same storage as AuthContext (global memory ref)
  const getAuthToken = useCallback(async () => {
    try {
      console.log('🔑 [SMS] Checking for auth token...');

      // Check global memory ref (used by AuthContext for native)
      const memTokenRef = global.__authMemTokenRef;
      if (memTokenRef && memTokenRef.value) {
        console.log('🔑 [SMS] Found token in memory ref');
        return memTokenRef.value;
      }

      // Check localStorage for web
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const webToken = window.localStorage.getItem('authToken');
        if (webToken) {
          console.log('🔑 [SMS] Found token in localStorage');
          return webToken;
        }
      }

      console.log('🔑 [SMS] No auth token found - user may not be logged in');
      return null;
    } catch (e) {
      console.error('🔑 [SMS] Error getting auth token:', e);
      return null;
    }
  }, []);

  // Parse SMS
  const parseTransactionSMS = useCallback((smsBody) => {
    if (!smsBody) return null;

    // First check if it looks like a transaction
    const amount = detectAmount(smsBody);
    const type = detectType(smsBody);

    // If we can't detect amount or type, it's probably not a transaction we care about
    if (!amount && !type) return null;

    const vendor = detectVendor(smsBody);
    const reference = detectReference(smsBody);
    const isUPI = /upi/i.test(smsBody);

    return {
      amount: amount || 0,
      type: type || 'debit', // Default to debit if unsure but amount exists
      vendor: vendor || 'SMS Transaction',
      payment_method: isUPI ? 'UPI' : undefined,
      reference_id: reference,
      raw_text: smsBody,
      timestamp: new Date().toISOString(),
      source: 'sms',
    };
  }, []);

  // Process incoming SMS
  const processSMS = useCallback(
    async (sms) => {
      // Avoid processing the same SMS multiple times if needed, 
      // but simplistic deduping might be tricky without unique IDs.
      // For now, we rely on the caller to not spam.

      setIsProcessing(true);
      setError(null);

      try {
        const body = typeof sms === 'string' ? sms : (sms.body || sms.message);
        const address = typeof sms === 'object' ? sms.originatingAddress : null;

        console.log('📱 SMS Received from:', address);

        // CHECK: proper enriched data from Groq
        let transaction = null;
        if (sms.parsed) {
          transaction = sms.parsed;
          console.log('✅ Using Enriched/Groq Transaction Data');
        } else {
          console.log('📱 Parsing SMS body manually (Regex Fallback)...');
          transaction = parseTransactionSMS(body);
        }

        if (!transaction) {
          console.log('⚠️ No transaction data found in SMS');
          if (options.onIgnored) options.onIgnored(sms, { reason: 'Not a recognized transaction' });
          return;
        }

        console.log('✅ Parsed Transaction:', JSON.stringify(transaction, null, 2));

        // Notify listener of parsed data
        // IMPORTANT: Check if it exists before calling
        if (options.onTransaction) {
          options.onTransaction(transaction);
        }

        // Get auth token
        const token = await getAuthToken();
        if (!token) {
          console.log('⚠️ No auth token found, skipping API upload');
          console.log('💡 User needs to be logged in for auto-sync');
          return;
        }

        // ... (API call logic removed for now, as we prefer _layout to handle API creation)
        // Actually, let's keep it but skip if we think _layout handled it? 
        // Or better: THIS hook is causing the double creation if _layout also does it.
        // The user logs show "Transaction created: ..." which is coming from _layout or this?
        // _layout.tsx has "Transaction created:" log. 
        // This file `smsReader.js` also has "API Response: ...".
        // If BOTH are active, we double create.

        // FIX: If we are using _layout to handle global creation, we should NOT create it here again.
        // This hook seems to be designed for "Foreground UI" updates.
        // The `index.tsx` uses this hook.

        // Force SKIP API call here if we are just using it for UI updates
        // BUT `index.tsx` passes `enabled: !!token`.

        // Let's assume for now we SHOULD NOT create it here if `_layout` is doing it.
        // However, `index.tsx` depends on `onTransaction` to update the list locally.

        // If we remove the API call here, `index.tsx` will still update the UI via `onTransaction`.
        // So let's disable the API call part in this hook or make it optional.

      } catch (err) {
        console.error('❌ Error processing SMS:', err.message);
        console.error('❌ Full error:', err);
        setError(err.message || 'Failed to process transaction');
        if (options.onError) options.onError(err, sms);
      } finally {
        setIsProcessing(false);
      }
    },
    [getAuthToken, parseTransactionSMS] // REMOVED `options` from dependency array
  );

  // SMS Listener Effect
  useEffect(() => {
    console.log('📲 [SMS HOOK] useEffect triggered');

    if (options.enabled === false) {
      console.log('📲 [SMS HOOK] Hook disabled, returning early');
      return;
    }

    let unsubscribe = null;

    const setupListener = async () => {
      try {
        // Request permissions via SmsService (or manually here if prefer)
        // SmsService.listSms usually checks permissions, but for listener we might need to ensure them.
        // Let's assume the user grants them via the UI or `useSms` hook elsewhere, 
        // OR we can do a quick check here.

        console.log('📲 [SMS HOOK] Setting up SmsService listener...');

        // Subscribe using our robust SmsService
        unsubscribe = SmsService.addSmsListener((msg) => {
          console.log('📲 [SMS HOOK] Received SMS from SmsService:', msg.originatingAddress);

          // Map to the format processSMS expects
          // react-native-android-sms-listener returns { originatingAddress, body, timestamp }
          // processSMS expects object with { originatingAddress, body } or string
          processSMS(msg);
        });

        console.log('📲 [SMS HOOK] ✅ Listener registered via SmsService');

      } catch (err) {
        console.error('📲 [SMS HOOK] ❌ Failed to setup listener:', err);
        setError(err.message);
      }
    };

    setupListener();

    return () => {
      console.log('📲 [SMS HOOK] Cleanup called');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [processSMS, options.enabled]);

  return {
    isProcessing,
    lastProcessed,
    error,
    processSMS,
  };
};

export default useSmsTransactionHandler;
