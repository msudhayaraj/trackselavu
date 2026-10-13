import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import {
  NewTransaction,
  PaymentMethod,
  Transaction,
  TransactionSource,
  TransactionType,
} from '../models/transaction.model';
import { generateId } from '../utils/id.util';
import { DateRange, isKeyInRange } from '../utils/date-range.util';

export interface TransactionFilter {
  range?: DateRange;
  type?: TransactionType;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  source?: TransactionSource;
  minAmountPaise?: number;
  maxAmountPaise?: number;
  searchText?: string;
  sortBy?: 'date' | 'amount' | 'category';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  constructor(private readonly dbService: DbService) {}

  async getById(id: string): Promise<Transaction | undefined> {
    const db = await this.dbService.getDb();
    return db.get('transactions', id);
  }

  async create(input: NewTransaction): Promise<Transaction> {
    this.assertValid(input);
    const db = await this.dbService.getDb();
    const now = Date.now();
    const transaction: Transaction = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    await db.put('transactions', transaction);
    return transaction;
  }

  async update(id: string, changes: Partial<NewTransaction>): Promise<Transaction> {
    const db = await this.dbService.getDb();
    const existing = await db.get('transactions', id);
    if (!existing) throw new Error('Transaction not found');
    const merged = { ...existing, ...changes };
    this.assertValid(merged);
    const updated: Transaction = { ...merged, id, updatedAt: Date.now() };
    await db.put('transactions', updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await this.dbService.getDb();
    await db.delete('transactions', id);
  }

  /** Fetches every transaction within a date range directly off the dateKey index. */
  async getByRange(range: DateRange): Promise<Transaction[]> {
    const db = await this.dbService.getDb();
    const idbRange = IDBKeyRange.bound(range.startKey, range.endKey);
    return db.getAllFromIndex('transactions', 'by-dateKey', idbRange);
  }

  async getAll(): Promise<Transaction[]> {
    const db = await this.dbService.getDb();
    return db.getAll('transactions');
  }

  async countAll(): Promise<number> {
    const db = await this.dbService.getDb();
    return db.count('transactions');
  }

  /**
   * In-memory filter/sort/paginate over the (already date-indexed) result set.
   * Personal-finance datasets are small enough (tens of thousands of rows at
   * most) that this stays fast while keeping filter logic simple and testable.
   */
  async query(filter: TransactionFilter): Promise<TransactionPage> {
    const base = filter.range ? await this.getByRange(filter.range) : await this.getAll();

    let results = base.filter((t) => {
      if (filter.type && t.type !== filter.type) return false;
      if (filter.categoryId && t.categoryId !== filter.categoryId) return false;
      if (filter.paymentMethod && t.paymentMethod !== filter.paymentMethod) return false;
      if (filter.source && t.source !== filter.source) return false;
      if (filter.minAmountPaise != null && t.amountPaise < filter.minAmountPaise) return false;
      if (filter.maxAmountPaise != null && t.amountPaise > filter.maxAmountPaise) return false;
      if (filter.searchText) {
        const needle = filter.searchText.trim().toLowerCase();
        if (needle) {
          const haystack = `${t.description ?? ''} ${t.merchant ?? ''}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
      }
      return true;
    });

    const sortBy = filter.sortBy ?? 'date';
    const dir = filter.sortDir === 'asc' ? 1 : -1;
    results = results.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (a.amountPaise - b.amountPaise) * dir;
        case 'category':
          return a.categoryId.localeCompare(b.categoryId) * dir;
        case 'date':
        default:
          return (a.occurredAt - b.occurredAt) * dir;
      }
    });

    const total = results.length;
    if (filter.offset != null || filter.limit != null) {
      const start = filter.offset ?? 0;
      const end = filter.limit != null ? start + filter.limit : undefined;
      results = results.slice(start, end);
    }
    return { items: results, total };
  }

  async countForCategory(categoryId: string): Promise<number> {
    const db = await this.dbService.getDb();
    return db.countFromIndex('transactions', 'by-categoryId', categoryId);
  }

  async countBySource(source: TransactionSource): Promise<number> {
    const db = await this.dbService.getDb();
    return db.countFromIndex('transactions', 'by-source', source);
  }

  private assertValid(t: Partial<NewTransaction>): void {
    if (t.amountPaise == null || !Number.isFinite(t.amountPaise) || t.amountPaise <= 0) {
      throw new Error('Transaction amount must be a positive value');
    }
    if (!Number.isInteger(t.amountPaise)) {
      throw new Error('Transaction amount must be stored as integer paise');
    }
  }
}

export function isDateKeyWithin(key: string, range: DateRange): boolean {
  return isKeyInRange(key, range);
}
