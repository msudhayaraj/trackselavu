import { PaymentMethod, TransactionSource, TransactionType } from '../core/models/transaction.model';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  DEBIT_CARD: 'Debit Card',
  CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  CASH: 'payments',
  UPI: 'qr_code_2',
  DEBIT_CARD: 'credit_card',
  CREDIT_CARD: 'payment',
  BANK_TRANSFER: 'account_balance',
  OTHER: 'more_horiz',
};

export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  CASH: '#43a047',
  UPI: '#1976d2',
  DEBIT_CARD: '#3949ab',
  CREDIT_CARD: '#8e24aa',
  BANK_TRANSFER: '#5d4037',
  OTHER: '#78909c',
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  'CASH',
  'UPI',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
];

export const TRANSACTION_SOURCE_LABELS: Record<TransactionSource, string> = {
  MANUAL: 'Manual Entry',
  SMS: 'SMS Import',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
};
