export type TransactionType = 'INCOME' | 'EXPENSE';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type TransactionSource = 'MANUAL' | 'SMS';

/**
 * Classification disambiguates credits/debits that are not plain income/expense,
 * per spec: refunds, transfers, and credit-card bill payments must not be
 * counted as ordinary income/expense in totals unless the user intends it.
 */
export type TransactionClassification =
  | 'NORMAL'
  | 'REFUND'
  | 'TRANSFER'
  | 'CREDIT_CARD_PAYMENT';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Integer paise. 25000 === ₹250.00. Never store as float rupees. */
  amountPaise: number;
  categoryId: string;
  /** Local calendar date key 'YYYY-MM-DD', used for day/week/month grouping. */
  dateKey: string;
  /** Epoch ms for the local wall-clock date+time, used for sorting/display. */
  occurredAt: number;
  paymentMethod: PaymentMethod;
  description?: string;
  merchant?: string;
  accountId?: string;
  source: TransactionSource;
  classification: TransactionClassification;
  smsImportId?: string;
  createdAt: number;
  updatedAt: number;
}

export type NewTransaction = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt'
>;
