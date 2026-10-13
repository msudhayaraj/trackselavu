import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { Account, NewAccount } from '../models/account.model';
import { generateId } from '../utils/id.util';

@Injectable({ providedIn: 'root' })
export class AccountService {
  constructor(private readonly dbService: DbService) {}

  async getAll(): Promise<Account[]> {
    const db = await this.dbService.getDb();
    const all = await db.getAll('accounts');
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<Account | undefined> {
    const db = await this.dbService.getDb();
    return db.get('accounts', id);
  }

  async create(input: NewAccount): Promise<Account> {
    const db = await this.dbService.getDb();
    const now = Date.now();
    const account: Account = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    await db.put('accounts', account);
    return account;
  }

  async update(id: string, changes: Partial<NewAccount>): Promise<Account> {
    const db = await this.dbService.getDb();
    const existing = await db.get('accounts', id);
    if (!existing) throw new Error('Account not found');
    const updated: Account = { ...existing, ...changes, id, updatedAt: Date.now() };
    await db.put('accounts', updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await this.dbService.getDb();
    await db.delete('accounts', id);
  }

  /** Finds an existing account by its SMS-derived number suffix, or creates a minimal one. */
  async findOrCreateBySuffix(suffix: string, type: Account['type'] = 'BANK'): Promise<Account> {
    const all = await this.getAll();
    const existing = all.find((a) => a.numberSuffix === suffix);
    if (existing) return existing;
    return this.create({ name: `Account •${suffix}`, type, numberSuffix: suffix, isActive: true });
  }
}
