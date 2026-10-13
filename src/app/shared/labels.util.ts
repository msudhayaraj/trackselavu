import { PaymentMethod, TransactionSource, TransactionType } from '../core/models/transaction.model';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  DEBIT_CARD: 'Debit Card',
  CREDIT_CARD: 'Credit Card',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
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
