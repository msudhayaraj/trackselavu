import { NewCategory } from '../models/category.model';

export const DEFAULT_INCOME_CATEGORIES: NewCategory[] = [
  { name: 'Salary', type: 'INCOME', icon: 'work', color: '#00695c', isActive: true, isDefault: true },
  { name: 'Business', type: 'INCOME', icon: 'business_center', color: '#00897b', isActive: true, isDefault: true },
  { name: 'Freelance', type: 'INCOME', icon: 'laptop_mac', color: '#26a69a', isActive: true, isDefault: true },
  { name: 'Interest', type: 'INCOME', icon: 'percent', color: '#4db6ac', isActive: true, isDefault: true },
  { name: 'Refund', type: 'INCOME', icon: 'replay', color: '#80cbc4', isActive: true, isDefault: true },
  { name: 'Other Income', type: 'INCOME', icon: 'more_horiz', color: '#b2dfdb', isActive: true, isDefault: true },
];

export const DEFAULT_EXPENSE_CATEGORIES: NewCategory[] = [
  { name: 'Food', type: 'EXPENSE', icon: 'restaurant', color: '#fb8c00', isActive: true, isDefault: true },
  { name: 'Petrol and Fuel', type: 'EXPENSE', icon: 'local_gas_station', color: '#f4511e', isActive: true, isDefault: true },
  { name: 'Shopping', type: 'EXPENSE', icon: 'shopping_bag', color: '#8e24aa', isActive: true, isDefault: true },
  { name: 'Recharge', type: 'EXPENSE', icon: 'sim_card', color: '#00acc1', isActive: true, isDefault: true },
  { name: 'Bills', type: 'EXPENSE', icon: 'receipt_long', color: '#6d4c41', isActive: true, isDefault: true },
  { name: 'Travel', type: 'EXPENSE', icon: 'flight', color: '#3949ab', isActive: true, isDefault: true },
  { name: 'Rent', type: 'EXPENSE', icon: 'home', color: '#546e7a', isActive: true, isDefault: true },
  { name: 'Groceries', type: 'EXPENSE', icon: 'local_grocery_store', color: '#43a047', isActive: true, isDefault: true },
  { name: 'Milk', type: 'EXPENSE', icon: 'local_drink', color: '#29b6f6', isActive: true, isDefault: true },
  { name: 'Medical', type: 'EXPENSE', icon: 'local_hospital', color: '#e53935', isActive: true, isDefault: true },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'movie', color: '#d81b60', isActive: true, isDefault: true },
  { name: 'Education', type: 'EXPENSE', icon: 'school', color: '#1e88e5', isActive: true, isDefault: true },
  { name: 'EMI and Loans', type: 'EXPENSE', icon: 'account_balance', color: '#5d4037', isActive: true, isDefault: true },
  { name: 'Subscriptions', type: 'EXPENSE', icon: 'subscriptions', color: '#fbc02d', isActive: true, isDefault: true },
  { name: 'Other Expenses', type: 'EXPENSE', icon: 'category', color: '#78909c', isActive: true, isDefault: true },
];
