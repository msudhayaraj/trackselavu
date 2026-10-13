export type AccountType = 'BANK' | 'CARD' | 'WALLET' | 'CASH' | 'OTHER';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Last 2-4 digits as seen in SMS, e.g. "4521". Never store full numbers. */
  numberSuffix?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewAccount = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>;
