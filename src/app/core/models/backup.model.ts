import { Transaction } from './transaction.model';
import { Category } from './category.model';
import { Budget } from './budget.model';
import { Account } from './account.model';
import { SmsImportRecord } from './sms-import.model';
import { AppSettings } from './settings.model';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  app: 'TrackSelavu';
  schemaVersion: number;
  exportedAt: number;
  data: {
    transactions: Transaction[];
    categories: Category[];
    budgets: Budget[];
    accounts: Account[];
    smsImports: SmsImportRecord[];
    settings: Partial<AppSettings>;
  };
}

export type RestoreMode = 'MERGE' | 'REPLACE';

export interface BackupPreview {
  exportedAt: number;
  schemaVersion: number;
  counts: {
    transactions: number;
    categories: number;
    budgets: number;
    accounts: number;
    smsImports: number;
  };
  duplicateTransactionIds: number;
  duplicateSmsFingerprints: number;
}

export interface RestoreResult {
  mode: RestoreMode;
  transactionsImported: number;
  transactionsSkipped: number;
  smsImportsImported: number;
  smsImportsSkipped: number;
  categoriesImported: number;
  budgetsImported: number;
  accountsImported: number;
}
