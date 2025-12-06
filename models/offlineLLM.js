import { useEffect, useMemo } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import SmsReceiver from "react-native-sms-receiver";
import { useAuth } from '@/contexts/AuthContext';

const log = (...args) => {
  console.log('[SMS-Auto]', ...args);
};

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
  if (/debited|spent|withdrawn|deducted|used/.test(lower)) return "debit";
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

const detectTimestamp = () => new Date().toISOString();

const parseSmsPayload = (message) => {
  if (!message) return null;
  const body = typeof message === 'string' ? message : message?.body || message?.message;
  if (!body) return null;
  log('Parsing SMS body:', body);

  const amount = detectAmount(body);
  log('Detected amount:', amount);
  const type = detectType(body);
  log('Detected type:', type);

  if (!amount && !type) {
    log('SMS ignored because neither amount nor type detected');
    return {
      is_transaction: false,
      raw_text: body,
    };
  }

  return {
    amount,
    currency: 'INR',
    type,
    vendor: detectVendor(body),
    payment_method: /upi/i.test(body) ? 'UPI' : undefined,
    reference_id: detectReference(body),
    timestamp: detectTimestamp(),
    raw_text: body,
    source: 'sms',
    confidence: amount ? 0.6 : 0.3,
  };
};

const normalizeTransaction = (parsed) => {
  if (!parsed || parsed.is_transaction === false) {
    return null;
  }

  return {
    amount: parsed.amount ?? null,
    currency: parsed.currency ?? "INR",
    type: parsed.type ?? null,
    vendor: parsed.vendor ?? null,
    payment_method: parsed.payment_method ?? null,
    reference_id: parsed.reference_id ?? null,
    timestamp: parsed.timestamp ?? null,
    raw_text: parsed.raw_text ?? null,
    source: parsed.source ?? "sms",
    confidence: parsed.confidence ?? null,
  };
};

const listenToIncomingSms = (handler, options = {}) => {
  if (typeof SmsReceiver.startListener !== "function") {
    console.warn("react-native-sms-receiver is not available");
    return () => {};
  }

  SmsReceiver.startListener(handler, options);

  return () => {
    if (typeof SmsReceiver.stopListener === "function") {
      SmsReceiver.stopListener();
    }
  };
};

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

const handleSmsPayload = async (message, callbacks, token) => {
  log('Received SMS payload:', message);
  const parsed = parseSmsPayload(message);
  log('Parsed payload:', parsed);
  const normalized = normalizeTransaction(parsed);
  log('Normalized transaction:', normalized);

  if (!normalized) {
    callbacks?.onIgnored?.(message, { reason: 'Filtered sender or not a txn' });
    log('SMS ignored after normalization');
    return;
  }

  callbacks?.onTransaction?.(normalized, parsed);
  log('SMS transaction emitted, pushing to API');

  if (!token) {
    log('No auth token, skipping API push');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/transcation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: normalized.vendor || 'SMS transaction',
        amount: normalized.amount ?? 0,
        category: normalized.type === 'credit' ? 'Income' : 'Expense',
        note: normalized.raw_text || undefined,
        payment_method: normalized.payment_method || undefined,
        reference_id: normalized.reference_id || undefined,
        is_auto: true,
        transaction_date: normalized.timestamp || new Date().toISOString(),
        source: normalized.source || 'sms',
        sms_body: normalized.raw_text || undefined,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.message || 'Failed to persist SMS transaction');
    }
    log('SMS transaction stored via API', result);
  } catch (error) {
    console.error('[SMS-Auto] Failed to send SMS transaction to API', error);
  }
};

const requestSmsPermissions = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const smsPermissions = [
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ];

    const results = await PermissionsAndroid.requestMultiple(smsPermissions);
    log('SMS permission results:', results);
    const granted = smsPermissions.every(
      (perm) => results[perm] === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!granted) {
      console.warn('SMS permissions were denied', results);
    }

    return granted;
  } catch (error) {
    console.error("Failed to request SMS permissions", error);
    return false;
  }
};

const defaultSenderFilters = [
  /^(?:VM|VK|AX|TD)-/i,
  /UPI/i,
  /SBI|HDFC|ICICI|KOTAK|AXIS/i,
];

export const useOfflineLLMBridge = ({
  enabled = true,
  senderFilters = defaultSenderFilters,
  onTransaction,
  onError,
  onIgnored,
} = {}) => {
  const { token } = useAuth();
  const callbacks = useMemo(
    () => ({ onTransaction, onError, onIgnored }),
    [onTransaction, onError, onIgnored]
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let teardown;
    let cancelled = false;

    const setupListener = async () => {
      const hasPermission = await requestSmsPermissions();
      log('SMS permissions granted?', hasPermission);

      if (!hasPermission) {
        callbacks?.onError?.(new Error('SMS permissions not granted'));
        return;
      }

      if (cancelled) return;

      teardown = listenToIncomingSms(
        (message) => {
          const address = message?.address || message?.originatingAddress || '';
          log('Incoming SMS from address:', address);
          const passesFilter = !senderFilters.length
            ? true
            : senderFilters.some((filter) => {
                if (filter instanceof RegExp) return filter.test(address);
                if (typeof filter === 'string') return address.includes(filter);
                return false;
              });

          if (!passesFilter) {
            callbacks?.onIgnored?.(message, { reason: 'Filtered sender' });
            log('SMS filtered by sender list');
            return;
          }

          try {
            handleSmsPayload(message, callbacks, token);
          } catch (error) {
            console.error('Failed to parse SMS', error);
            callbacks?.onError?.(error, message);
          }
        },
        {
          autoGrant: false,
        }
      );
    };

    setupListener();

    return () => {
      cancelled = true;
      log('Tearing down SMS listener');
      teardown?.();
    };
  }, [enabled, callbacks, senderFilters, token]);
};
