import { BudgetService } from './budget.service';
import { Budget } from '../models/budget.model';
import { Transaction } from '../models/transaction.model';
import { Category } from '../models/category.model';
import { DateRange } from '../utils/date-range.util';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'EXPENSE',
    amountPaise: 0,
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

function makeBudget(overrides: Partial<Budget>): Budget {
  return {
    id: 'b1',
    scope: 'OVERALL',
    period: 'MONTHLY',
    limitPaise: 2000000, // ₹20,000
    warningThresholdPercent: 80,
    isActive: true,
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
  async getById(id: string): Promise<Category | undefined> {
    return { id, name: 'Food', type: 'EXPENSE', icon: 'restaurant', color: '#fb8c00', isActive: true, isDefault: true, createdAt: 0, updatedAt: 0 };
  }
}

describe('BudgetService.getUsage', () => {
  function build(transactions: Transaction[]) {
    return new BudgetService({} as any, new FakeTransactionService(transactions) as any, new FakeCategoryService() as any);
  }

  it('computes spent/remaining/percentUsed for an overall monthly budget', async () => {
    const service = build([
      makeTransaction({ dateKey: '2026-10-05', amountPaise: 1250000 }),
      makeTransaction({ dateKey: '2026-09-05', amountPaise: 999999 }), // outside the month, must be excluded
    ]);
    const usage = await service.getUsage(makeBudget({}), '2026-10-12');
    expect(usage.spentPaise).toBe(1250000);
    expect(usage.remainingPaise).toBe(750000);
    expect(usage.percentUsed).toBeCloseTo(62.5, 1);
    expect(usage.isWarning).toBeFalse();
    expect(usage.isExceeded).toBeFalse();
  });

  it('flags a warning once spending crosses the threshold', async () => {
    const service = build([makeTransaction({ dateKey: '2026-10-05', amountPaise: 1700000 })]);
    const usage = await service.getUsage(makeBudget({ warningThresholdPercent: 80 }), '2026-10-12');
    expect(usage.percentUsed).toBeCloseTo(85, 1);
    expect(usage.isWarning).toBeTrue();
    expect(usage.isExceeded).toBeFalse();
  });

  it('flags exceeded once spending passes the limit', async () => {
    const service = build([makeTransaction({ dateKey: '2026-10-05', amountPaise: 2500000 })]);
    const usage = await service.getUsage(makeBudget({}), '2026-10-12');
    expect(usage.isExceeded).toBeTrue();
  });

  it('only counts transactions in the matching category for a category-scoped budget', async () => {
    const service = build([
      makeTransaction({ categoryId: 'food', amountPaise: 50000, dateKey: '2026-10-05' }),
      makeTransaction({ categoryId: 'travel', amountPaise: 90000, dateKey: '2026-10-05' }),
    ]);
    const usage = await service.getUsage(
      makeBudget({ scope: 'CATEGORY', categoryId: 'food', limitPaise: 100000 }),
      '2026-10-12',
    );
    expect(usage.spentPaise).toBe(50000);
  });

  it('excludes transfers from budget spend', async () => {
    const service = build([
      makeTransaction({ dateKey: '2026-10-05', amountPaise: 50000, classification: 'TRANSFER' }),
    ]);
    const usage = await service.getUsage(makeBudget({}), '2026-10-12');
    expect(usage.spentPaise).toBe(0);
  });
});
