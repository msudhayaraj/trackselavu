import { TestBed } from '@angular/core/testing';
import { TransactionService } from './transaction.service';
import { CategoryService } from './category.service';
import { DbService } from './db.service';
import { generateId } from '../utils/id.util';

describe('TransactionService — validation', () => {
  it('rejects a zero or negative amount before touching the database', async () => {
    const service = new TransactionService({} as any);
    await expectAsync(
      service.create({
        type: 'EXPENSE',
        amountPaise: 0,
        categoryId: 'x',
        dateKey: '2026-10-12',
        occurredAt: Date.now(),
        paymentMethod: 'CASH',
        source: 'MANUAL',
        classification: 'NORMAL',
      }),
    ).toBeRejectedWithError(/positive/);
  });

  it('rejects a non-integer paise amount', async () => {
    const service = new TransactionService({} as any);
    await expectAsync(
      service.create({
        type: 'EXPENSE',
        amountPaise: 99.5,
        categoryId: 'x',
        dateKey: '2026-10-12',
        occurredAt: Date.now(),
        paymentMethod: 'CASH',
        source: 'MANUAL',
        classification: 'NORMAL',
      }),
    ).toBeRejectedWithError(/integer paise/);
  });
});

describe('TransactionService — persistence (real IndexedDB)', () => {
  let transactionService: TransactionService;
  let categoryService: CategoryService;
  let categoryId: string;
  const createdTransactionIds: string[] = [];

  beforeAll(() => {
    TestBed.configureTestingModule({});
    transactionService = TestBed.inject(TransactionService);
    categoryService = TestBed.inject(CategoryService);
  });

  beforeEach(async () => {
    const category = await categoryService.create({
      name: `Test Category ${generateId()}`,
      type: 'EXPENSE',
      icon: 'category',
      color: '#000000',
      isActive: true,
      isDefault: false,
    });
    categoryId = category.id;
  });

  afterEach(async () => {
    for (const id of createdTransactionIds.splice(0)) {
      await transactionService.delete(id);
    }
    await categoryService.delete(categoryId).catch(() => undefined);
  });

  it('persists a created transaction and retrieves it by id', async () => {
    const created = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 12550,
      categoryId,
      dateKey: '2026-10-12',
      occurredAt: Date.now(),
      paymentMethod: 'UPI',
      source: 'MANUAL',
      classification: 'NORMAL',
    });
    createdTransactionIds.push(created.id);

    const fetched = await transactionService.getById(created.id);
    expect(fetched?.amountPaise).toBe(12550);
    expect(fetched?.categoryId).toBe(categoryId);
  });

  it('updates a transaction in place', async () => {
    const created = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 1000,
      categoryId,
      dateKey: '2026-10-12',
      occurredAt: Date.now(),
      paymentMethod: 'CASH',
      source: 'MANUAL',
      classification: 'NORMAL',
    });
    createdTransactionIds.push(created.id);

    await transactionService.update(created.id, { amountPaise: 5000 });
    const fetched = await transactionService.getById(created.id);
    expect(fetched?.amountPaise).toBe(5000);
  });

  it('deletes a transaction', async () => {
    const created = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 1000,
      categoryId,
      dateKey: '2026-10-12',
      occurredAt: Date.now(),
      paymentMethod: 'CASH',
      source: 'MANUAL',
      classification: 'NORMAL',
    });

    await transactionService.delete(created.id);
    const fetched = await transactionService.getById(created.id);
    expect(fetched).toBeUndefined();
  });

  it('filters by date range via the query() method', async () => {
    const inRange = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 1000,
      categoryId,
      dateKey: '2026-10-12',
      occurredAt: Date.now(),
      paymentMethod: 'CASH',
      source: 'MANUAL',
      classification: 'NORMAL',
    });
    const outOfRange = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 1000,
      categoryId,
      dateKey: '2025-01-01',
      occurredAt: Date.now(),
      paymentMethod: 'CASH',
      source: 'MANUAL',
      classification: 'NORMAL',
    });
    createdTransactionIds.push(inRange.id, outOfRange.id);

    const page = await transactionService.query({
      range: { startKey: '2026-10-01', endKey: '2026-10-31', label: '' },
      categoryId,
    });
    expect(page.items.some((t) => t.id === inRange.id)).toBeTrue();
    expect(page.items.some((t) => t.id === outOfRange.id)).toBeFalse();
  });
});
