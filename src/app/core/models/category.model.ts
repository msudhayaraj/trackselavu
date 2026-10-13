import { TransactionType } from './transaction.model';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;
