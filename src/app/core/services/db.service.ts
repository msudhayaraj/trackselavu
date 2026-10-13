import { Injectable } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Transaction } from '../models/transaction.model';
import { Category } from '../models/category.model';
import { Budget } from '../models/budget.model';
import { Account } from '../models/account.model';
import { SmsImportRecord } from '../models/sms-import.model';
import { AppSettings } from '../models/settings.model';

export const DB_NAME = 'tracselavu-db';
export const DB_VERSION = 1;

export interface TrackSelavuDbSchema extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-dateKey': string;
      'by-type': string;
      'by-categoryId': string;
      'by-source': string;
      'by-occurredAt': number;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-type': string };
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: { 'by-scope': string };
  };
  accounts: {
    key: string;
    value: Account;
  };
  sms_imports: {
    key: string;
    value: SmsImportRecord;
    indexes: {
      'by-fingerprint': string;
      'by-reference': string;
      'by-status': string;
    };
  };
  settings: {
    key: string;
    value: { key: keyof AppSettings; value: unknown };
  };
}

export type TrackSelavuDb = IDBPDatabase<TrackSelavuDbSchema>;

/**
 * Owns the single IndexedDB connection and schema migrations. Every other
 * data service goes through here instead of calling `idb` directly, so
 * schema changes have one place to be versioned safely.
 */
@Injectable({ providedIn: 'root' })
export class DbService {
  private dbPromise: Promise<TrackSelavuDb> | null = null;

  getDb(): Promise<TrackSelavuDb> {
    if (!this.dbPromise) {
      this.dbPromise = this.openDatabase();
    }
    return this.dbPromise;
  }

  private openDatabase(): Promise<TrackSelavuDb> {
    return openDB<TrackSelavuDbSchema>(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion, _newVersion, tx) => {
        if (oldVersion < 1) {
          const transactions = db.createObjectStore('transactions', { keyPath: 'id' });
          transactions.createIndex('by-dateKey', 'dateKey');
          transactions.createIndex('by-type', 'type');
          transactions.createIndex('by-categoryId', 'categoryId');
          transactions.createIndex('by-source', 'source');
          transactions.createIndex('by-occurredAt', 'occurredAt');

          const categories = db.createObjectStore('categories', { keyPath: 'id' });
          categories.createIndex('by-type', 'type');

          const budgets = db.createObjectStore('budgets', { keyPath: 'id' });
          budgets.createIndex('by-scope', 'scope');

          db.createObjectStore('accounts', { keyPath: 'id' });

          const smsImports = db.createObjectStore('sms_imports', { keyPath: 'id' });
          smsImports.createIndex('by-fingerprint', 'fingerprint', { unique: true });
          smsImports.createIndex('by-reference', 'referenceNumber');
          smsImports.createIndex('by-status', 'status');

          db.createObjectStore('settings', { keyPath: 'key' });
        }
        // Future schema changes: add `if (oldVersion < N) { ... }` blocks here,
        // using `tx` for any data backfill, so upgrading users never lose data.
        void tx;
      },
      blocked() {
        console.warn('TrackSelavu DB upgrade blocked by another open tab.');
      },
      blocking() {
        console.warn('TrackSelavu DB is blocking an upgrade in another tab; reload may be needed.');
      },
    });
  }
}
