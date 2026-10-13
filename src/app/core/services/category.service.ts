import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { Category, NewCategory } from '../models/category.model';
import { generateId } from '../utils/id.util';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './default-categories';

export class CategoryInUseError extends Error {
  constructor(public readonly transactionCount: number) {
    super(
      `Category is used by ${transactionCount} transaction(s). Reassign or archive it instead of deleting.`,
    );
  }
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private readonly dbService: DbService) {}

  /**
   * Populates sensible defaults on first launch, and on every later launch adds any
   * new default categories that shipped in an app update (matched by name+type) —
   * without touching or duplicating anything the user already has.
   */
  async seedDefaultsIfEmpty(): Promise<void> {
    const db = await this.dbService.getDb();
    const existing = await db.getAll('categories');
    const existingKeys = new Set(existing.map((c) => `${c.type}:${c.name.trim().toLowerCase()}`));

    const missing = [...DEFAULT_INCOME_CATEGORIES, ...DEFAULT_EXPENSE_CATEGORIES].filter(
      (c) => !existingKeys.has(`${c.type}:${c.name.trim().toLowerCase()}`),
    );
    if (missing.length === 0) return;

    const now = Date.now();
    const tx = db.transaction('categories', 'readwrite');
    for (const c of missing) {
      const category: Category = { ...c, id: generateId(), createdAt: now, updatedAt: now };
      await tx.store.put(category);
    }
    await tx.done;
  }

  async getAll(includeInactive = true): Promise<Category[]> {
    const db = await this.dbService.getDb();
    const all = await db.getAll('categories');
    const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
    return includeInactive ? sorted : sorted.filter((c) => c.isActive);
  }

  async getByType(type: Category['type'], includeInactive = false): Promise<Category[]> {
    const db = await this.dbService.getDb();
    const all = await db.getAllFromIndex('categories', 'by-type', type);
    const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
    return includeInactive ? sorted : sorted.filter((c) => c.isActive);
  }

  async getById(id: string): Promise<Category | undefined> {
    const db = await this.dbService.getDb();
    return db.get('categories', id);
  }

  async create(input: NewCategory): Promise<Category> {
    const db = await this.dbService.getDb();
    const now = Date.now();
    const category: Category = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    await db.put('categories', category);
    return category;
  }

  async update(id: string, changes: Partial<NewCategory>): Promise<Category> {
    const db = await this.dbService.getDb();
    const existing = await db.get('categories', id);
    if (!existing) throw new Error('Category not found');
    const updated: Category = { ...existing, ...changes, id, updatedAt: Date.now() };
    await db.put('categories', updated);
    return updated;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive });
  }

  /**
   * Deletes a category only if no transactions reference it. Callers must
   * reassign or archive first — this never cascades into transaction data.
   */
  async delete(id: string): Promise<void> {
    const db = await this.dbService.getDb();
    const usageCount = await db.countFromIndex('transactions', 'by-categoryId', id);
    if (usageCount > 0) {
      throw new CategoryInUseError(usageCount);
    }
    await db.delete('categories', id);
  }

  async countTransactionsUsing(id: string): Promise<number> {
    const db = await this.dbService.getDb();
    return db.countFromIndex('transactions', 'by-categoryId', id);
  }

  /** Reassigns every transaction from one category to another, then deletes the source category. */
  async reassignAndDelete(fromCategoryId: string, toCategoryId: string): Promise<number> {
    const db = await this.dbService.getDb();
    const tx = db.transaction(['transactions', 'categories'], 'readwrite');
    const index = tx.objectStore('transactions').index('by-categoryId');
    let cursor = await index.openCursor(fromCategoryId);
    let count = 0;
    while (cursor) {
      await cursor.update({ ...cursor.value, categoryId: toCategoryId, updatedAt: Date.now() });
      count++;
      cursor = await cursor.continue();
    }
    await tx.objectStore('categories').delete(fromCategoryId);
    await tx.done;
    return count;
  }
}
