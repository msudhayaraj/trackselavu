import { TestBed } from '@angular/core/testing';
import { CategoryService, CategoryInUseError } from './category.service';
import { TransactionService } from './transaction.service';
import { generateId } from '../utils/id.util';

describe('CategoryService — delete protection and reassignment (real IndexedDB)', () => {
  let categoryService: CategoryService;
  let transactionService: TransactionService;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    categoryService = TestBed.inject(CategoryService);
    transactionService = TestBed.inject(TransactionService);
  });

  it('refuses to delete a category that still has transactions', async () => {
    const category = await categoryService.create({
      name: `In Use ${generateId()}`,
      type: 'EXPENSE',
      icon: 'category',
      color: '#000',
      isActive: true,
      isDefault: false,
    });
    const transaction = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 1000,
      categoryId: category.id,
      dateKey: '2026-10-12',
      occurredAt: Date.now(),
      paymentMethod: 'CASH',
      source: 'MANUAL',
      classification: 'NORMAL',
    });

    await expectAsync(categoryService.delete(category.id)).toBeRejectedWithError(CategoryInUseError);

    await transactionService.delete(transaction.id);
    await categoryService.delete(category.id);
  });

  it('moves transactions to another category and deletes the source category', async () => {
    const source = await categoryService.create({
      name: `Source ${generateId()}`,
      type: 'EXPENSE',
      icon: 'category',
      color: '#000',
      isActive: true,
      isDefault: false,
    });
    const target = await categoryService.create({
      name: `Target ${generateId()}`,
      type: 'EXPENSE',
      icon: 'category',
      color: '#000',
      isActive: true,
      isDefault: false,
    });
    const transaction = await transactionService.create({
      type: 'EXPENSE',
      amountPaise: 1000,
      categoryId: source.id,
      dateKey: '2026-10-12',
      occurredAt: Date.now(),
      paymentMethod: 'CASH',
      source: 'MANUAL',
      classification: 'NORMAL',
    });

    const movedCount = await categoryService.reassignAndDelete(source.id, target.id);
    expect(movedCount).toBe(1);

    const moved = await transactionService.getById(transaction.id);
    expect(moved?.categoryId).toBe(target.id);
    expect(await categoryService.getById(source.id)).toBeUndefined();

    await transactionService.delete(transaction.id);
    await categoryService.delete(target.id);
  });
});
