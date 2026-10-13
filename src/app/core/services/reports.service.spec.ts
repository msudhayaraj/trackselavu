import { ReportsService } from './reports.service';
import { Transaction } from '../models/transaction.model';
import { Category } from '../models/category.model';
import { DateRange } from '../utils/date-range.util';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36),
    type: 'EXPENSE',
    amountPaise: 10000,
    categoryId: 'food',
    dateKey: '2026-10-12',
    occurredAt: Date.now(),
    paymentMethod: 'UPI',
    source: 'MANUAL',
    classification: 'NORMAL',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

class FakeTransactionService {
  constructor(private readonly transactions: Transaction[]) {}
  async getByRange(range: DateRange): Promise<Transaction[]> {
    return this.transactions.filter((t) => t.dateKey >= range.startKey && t.dateKey <= range.endKey);
  }
}

class FakeCategoryService {
  constructor(private readonly categories: Category[]) {}
  async getAll(): Promise<Category[]> {
    return this.categories;
  }
}

const FOOD: Category = { id: 'food', name: 'Food', type: 'EXPENSE', icon: 'restaurant', color: '#fb8c00', isActive: true, isDefault: true, createdAt: 0, updatedAt: 0 };
const TRAVEL: Category = { id: 'travel', name: 'Travel', type: 'EXPENSE', icon: 'flight', color: '#3949ab', isActive: true, isDefault: true, createdAt: 0, updatedAt: 0 };

describe('ReportsService', () => {
  function build(transactions: Transaction[], categories: Category[] = [FOOD, TRAVEL]) {
    return new ReportsService(
      new FakeTransactionService(transactions) as any,
      new FakeCategoryService(categories) as any,
    );
  }

  const range: DateRange = { startKey: '2026-10-01', endKey: '2026-10-31', label: 'October' };

  it('sums income and expense totals, excluding refunds/transfers/card payments', () => {
    const service = build([
      makeTransaction({ type: 'EXPENSE', amountPaise: 10000, classification: 'NORMAL' }),
      makeTransaction({ type: 'INCOME', amountPaise: 50000, classification: 'NORMAL' }),
      makeTransaction({ type: 'EXPENSE', amountPaise: 99999, classification: 'TRANSFER' }),
      makeTransaction({ type: 'INCOME', amountPaise: 88888, classification: 'REFUND' }),
    ]);

    return service.getTotals(range).then((totals) => {
      expect(totals.expensePaise).toBe(10000);
      expect(totals.incomePaise).toBe(50000);
      expect(totals.netPaise).toBe(40000);
      expect(totals.transactionCount).toBe(2);
    });
  });

  it('breaks down expenses by category with correct percentages', async () => {
    const service = build([
      makeTransaction({ categoryId: 'food', amountPaise: 30000 }),
      makeTransaction({ categoryId: 'travel', amountPaise: 10000 }),
    ]);
    const breakdown = await service.getCategoryBreakdown(range, 'EXPENSE');
    expect(breakdown[0].categoryName).toBe('Food');
    expect(breakdown[0].amountPaise).toBe(30000);
    expect(breakdown[0].percent).toBeCloseTo(75, 1);
    expect(breakdown[1].percent).toBeCloseTo(25, 1);
  });

  it('finds the largest transactions in the range', async () => {
    const service = build([
      makeTransaction({ id: 'small', amountPaise: 5000 }),
      makeTransaction({ id: 'big', amountPaise: 90000 }),
    ]);
    const largest = await service.getLargestTransactions(range, 1);
    expect(largest[0].id).toBe('big');
  });

  it('finds the highest spending day from a daily series', async () => {
    const service = build([
      makeTransaction({ dateKey: '2026-10-05', amountPaise: 20000 }),
      makeTransaction({ dateKey: '2026-10-06', amountPaise: 70000 }),
    ]);
    const highest = await service.getHighestSpendingDay(range);
    expect(highest?.dateKey).toBe('2026-10-06');
    expect(highest?.expensePaise).toBe(70000);
  });

  it('returns zero totals and an empty breakdown for a period with no transactions', async () => {
    const service = build([]);
    const totals = await service.getTotals(range);
    const breakdown = await service.getCategoryBreakdown(range);
    expect(totals.incomePaise).toBe(0);
    expect(totals.expensePaise).toBe(0);
    expect(breakdown).toEqual([]);
  });
});
