declare module '@/models/offlineLLM' {
  export interface SmsExtractionResult {
    amount: number | null;
    currency: string | null;
    type: 'debit' | 'credit' | null;
    vendor: string | null;
    payment_method: string | null;
    reference_id: string | null;
    timestamp: string | null;
    raw_text: string | null;
    source: string | null;
    confidence: number | null;
  }

  export interface OfflineLLMCallbacks {
    onTransaction?: (payload: SmsExtractionResult, rawJson?: unknown) => void;
    onError?: (error: Error) => void;
    onIgnored?: (message: unknown, meta?: unknown) => void;
  }

  export interface OfflineLLMOptions extends OfflineLLMCallbacks {
    enabled?: boolean;
    model?: string;
    senderFilters?: Array<RegExp | string>;
  }

  export function useOfflineLLMBridge(options?: OfflineLLMOptions): void;
}
