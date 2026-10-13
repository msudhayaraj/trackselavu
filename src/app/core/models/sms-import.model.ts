import { PaymentMethod, TransactionType } from './transaction.model';

export type SmsImportStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'IGNORED';

export type SmsImportSource = 'PASTE' | 'FILE_IMPORT' | 'ANDROID_INBOX';

export type SmsDetectedKind =
  | 'DEBIT'
  | 'CREDIT'
  | 'REFUND'
  | 'REVERSAL'
  | 'FAILED'
  | 'PROMOTIONAL'
  | 'OTP'
  | 'BALANCE_ALERT'
  | 'CARD_REMINDER'
  | 'UNKNOWN';

/** Pure parser output. Independent of storage/UI concerns. */
export interface ParsedSms {
  kind: SmsDetectedKind;
  isActionable: boolean;
  suggestedType?: TransactionType;
  amountPaise?: number;
  merchant?: string;
  accountSuffix?: string;
  referenceNumber?: string;
  paymentMethod?: PaymentMethod;
  transactionDateKey?: string;
  confidence: number; // 0-1
}

export interface SmsImportRecord {
  id: string;
  rawText: string;
  /** Stable fingerprint used for dedup when no bank reference number exists. */
  fingerprint: string;
  referenceNumber?: string;
  parsed: ParsedSms;
  status: SmsImportStatus;
  source: SmsImportSource;
  linkedTransactionId?: string;
  createdAt: number;
  updatedAt: number;
}

export type NewSmsImportRecord = Omit<
  SmsImportRecord,
  'id' | 'createdAt' | 'updatedAt'
>;

/** User-maintained rule: merchant name/pattern -> category, learned from corrections. */
export interface MerchantCategoryRule {
  id: string;
  merchantPattern: string;
  categoryId: string;
  createdAt: number;
  updatedAt: number;
}
