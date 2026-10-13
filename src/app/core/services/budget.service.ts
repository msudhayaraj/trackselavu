import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { Budget, BudgetUsage, NewBudget } from '../models/budget.model';
import { generateId } from '../utils/id.util';
import { TransactionService } from './transaction.service';
import { CategoryService } from './category.service';
import { getPresetRange, monthLabel, todayKey, WeekStart } from '../utils/date-range.util';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  constructor(
    private readonly dbService: DbService,
    private readonly transactionService: TransactionService,
    private readonly categoryService: CategoryService,
  ) {}

  async getAll(): Promise<Budget[]> {
    const db = await this.dbService.getDb();
    return db.getAll('budgets');
  }

  async getById(id: string): Promise<Budget | undefined> {
    const db = await this.dbService.getDb();
    return db.get('budgets', id);
  }

  async create(input: NewBudget): Promise<Budget> {
    const db = await this.dbService.getDb();
    const now = Date.now();
    const budget: Budget = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    await db.put('budgets', budget);
    return budget;
  }

  async update(id: string, changes: Partial<NewBudget>): Promise<Budget> {
    const db = await this.dbService.getDb();
    const existing = await db.get('budgets', id);
    if (!existing) throw new Error('Budget not found');
    const updated: Budget = { ...existing, ...changes, id, updatedAt: Date.now() };
    await db.put('budgets', updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await this.dbService.getDb();
    await db.delete('budgets', id);
  }

  /** Computes live spend-vs-limit for one budget, for the period containing referenceKey. */
  async getUsage(
    budget: Budget,
    referenceKey: string = todayKey(),
    weekStartsOn: WeekStart = 'MONDAY',
  ): Promise<BudgetUsage> {
    const range =
      budget.period === 'MONTHLY'
        ? getPresetRange('THIS_MONTH', referenceKey)
        : getPresetRange('THIS_WEEK', referenceKey, weekStartsOn);

    const transactions = await this.transactionService.getByRange(range);
    const spentPaise = transactions
      .filter((t) => t.type === 'EXPENSE' && t.classification !== 'TRANSFER')
      .filter((t) => budget.scope === 'OVERALL' || t.categoryId === budget.categoryId)
      .reduce((sum, t) => sum + t.amountPaise, 0);

    const remainingPaise = budget.limitPaise - spentPaise;
    const percentUsed = budget.limitPaise > 0 ? (spentPaise / budget.limitPaise) * 100 : 0;

    let categoryName: string | undefined;
    if (budget.scope === 'CATEGORY' && budget.categoryId) {
      const category = await this.categoryService.getById(budget.categoryId);
      categoryName = category?.name;
    }

    return {
      budget,
      categoryName,
      limitPaise: budget.limitPaise,
      spentPaise,
      remainingPaise,
      percentUsed,
      isWarning: percentUsed >= budget.warningThresholdPercent && percentUsed < 100,
      isExceeded: percentUsed >= 100,
      periodLabel: budget.period === 'MONTHLY' ? monthLabel(referenceKey) : range.label,
    };
  }

  async getAllUsages(
    referenceKey: string = todayKey(),
    weekStartsOn: WeekStart = 'MONDAY',
  ): Promise<BudgetUsage[]> {
    const budgets = (await this.getAll()).filter((b) => b.isActive);
    return Promise.all(budgets.map((b) => this.getUsage(b, referenceKey, weekStartsOn)));
  }

  async getOverallMonthlyUsage(referenceKey: string = todayKey()): Promise<BudgetUsage | null> {
    const budgets = await this.getAll();
    const overall = budgets.find((b) => b.scope === 'OVERALL' && b.period === 'MONTHLY' && b.isActive);
    return overall ? this.getUsage(overall, referenceKey) : null;
  }
}
