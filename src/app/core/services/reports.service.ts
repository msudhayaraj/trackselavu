import { Injectable } from '@angular/core';
import { TransactionService } from './transaction.service';
import { CategoryService } from './category.service';
import { Transaction, TransactionType } from '../models/transaction.model';
import {
  addDaysToKey,
  addMonthsToKey,
  DateRange,
  daysBetweenInclusive,
  startOfMonthKey,
  endOfMonthKey,
  monthLabel,
} from '../utils/date-range.util';

export interface PeriodTotals {
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  transactionCount: number;
}

export interface CategoryBreakdownEntry {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  amountPaise: number;
  percent: number;
  transactionCount: number;
}

export interface DailyPoint {
  dateKey: string;
  incomePaise: number;
  expensePaise: number;
}

export interface MonthlyPoint {
  monthKey: string;
  label: string;
  incomePaise: number;
  expensePaise: number;
}

/** Counts toward headline totals only; refunds/transfers/card-payments are tracked but excluded to avoid double counting or inflating income. */
function isCountable(t: Transaction): boolean {
  return t.classification === 'NORMAL';
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly categoryService: CategoryService,
  ) {}

  async getTotals(range: DateRange): Promise<PeriodTotals> {
    const transactions = (await this.transactionService.getByRange(range)).filter(isCountable);
    let incomePaise = 0;
    let expensePaise = 0;
    for (const t of transactions) {
      if (t.type === 'INCOME') incomePaise += t.amountPaise;
      else expensePaise += t.amountPaise;
    }
    return {
      incomePaise,
      expensePaise,
      netPaise: incomePaise - expensePaise,
      transactionCount: transactions.length,
    };
  }

  async getCategoryBreakdown(
    range: DateRange,
    type: TransactionType = 'EXPENSE',
  ): Promise<CategoryBreakdownEntry[]> {
    const transactions = (await this.transactionService.getByRange(range)).filter(
      (t) => isCountable(t) && t.type === type,
    );
    const categories = await this.categoryService.getAll();
    const byId = new Map(categories.map((c) => [c.id, c]));

    const totalsByCategory = new Map<string, { amountPaise: number; count: number }>();
    for (const t of transactions) {
      const entry = totalsByCategory.get(t.categoryId) ?? { amountPaise: 0, count: 0 };
      entry.amountPaise += t.amountPaise;
      entry.count += 1;
      totalsByCategory.set(t.categoryId, entry);
    }

    const grandTotal = [...totalsByCategory.values()].reduce((s, v) => s + v.amountPaise, 0);

    return [...totalsByCategory.entries()]
      .map(([categoryId, { amountPaise, count }]) => {
        const category = byId.get(categoryId);
        return {
          categoryId,
          categoryName: category?.name ?? 'Uncategorized',
          color: category?.color ?? '#90a4ae',
          icon: category?.icon ?? 'category',
          amountPaise,
          percent: grandTotal > 0 ? (amountPaise / grandTotal) * 100 : 0,
          transactionCount: count,
        };
      })
      .sort((a, b) => b.amountPaise - a.amountPaise);
  }

  async getTopCategories(
    range: DateRange,
    type: TransactionType = 'EXPENSE',
    limit = 3,
  ): Promise<CategoryBreakdownEntry[]> {
    const breakdown = await this.getCategoryBreakdown(range, type);
    return breakdown.slice(0, limit);
  }

  async getLargestTransactions(range: DateRange, limit = 5): Promise<Transaction[]> {
    const transactions = (await this.transactionService.getByRange(range)).filter(isCountable);
    return transactions.sort((a, b) => b.amountPaise - a.amountPaise).slice(0, limit);
  }

  async getAverageDailyExpense(range: DateRange): Promise<number> {
    const totals = await this.getTotals(range);
    const days = daysBetweenInclusive(range);
    return days > 0 ? Math.round(totals.expensePaise / days) : 0;
  }

  async getDailySeries(range: DateRange): Promise<DailyPoint[]> {
    const transactions = (await this.transactionService.getByRange(range)).filter(isCountable);
    const byDate = new Map<string, DailyPoint>();

    let cursor = range.startKey;
    while (cursor <= range.endKey) {
      byDate.set(cursor, { dateKey: cursor, incomePaise: 0, expensePaise: 0 });
      cursor = addDaysToKey(cursor, 1);
    }
    for (const t of transactions) {
      const point = byDate.get(t.dateKey);
      if (!point) continue;
      if (t.type === 'INCOME') point.incomePaise += t.amountPaise;
      else point.expensePaise += t.amountPaise;
    }
    return [...byDate.values()];
  }

  async getHighestSpendingDay(range: DateRange): Promise<DailyPoint | null> {
    const series = await this.getDailySeries(range);
    if (series.length === 0) return null;
    return series.reduce((max, p) => (p.expensePaise > max.expensePaise ? p : max), series[0]);
  }

  /** Monthly aggregates for `monthCount` months ending at the month containing referenceKey. */
  async getMonthlySeries(referenceKey: string, monthCount = 6): Promise<MonthlyPoint[]> {
    const points: MonthlyPoint[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const monthRef = addMonthsToKey(referenceKey, -i);
      const range: DateRange = {
        startKey: startOfMonthKey(monthRef),
        endKey: endOfMonthKey(monthRef),
        label: monthLabel(monthRef),
      };
      const totals = await this.getTotals(range);
      points.push({
        monthKey: range.startKey.slice(0, 7),
        label: monthLabel(monthRef),
        incomePaise: totals.incomePaise,
        expensePaise: totals.expensePaise,
      });
    }
    return points;
  }
}
