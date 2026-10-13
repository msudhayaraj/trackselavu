import { CsvExportService } from './csv-export.service';
import { Transaction } from '../models/transaction.model';
import { Category } from '../models/category.model';

function makeCategory(id: string, name: string): Category {
  return { id, name, type: 'EXPENSE', icon: 'category', color: '#000', isActive: true, isDefault: false, createdAt: 0, updatedAt: 0 };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'EXPENSE',
    amountPaise: 12550,
    categoryId: 'c1',
    dateKey: '2026-10-12',
    occurredAt: new Date(2026, 9, 12, 14, 30).getTime(),
    paymentMethod: 'UPI',
    merchant: 'ABC Restaurant',
    description: undefined,
    source: 'MANUAL',
    classification: 'NORMAL',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('CsvExportService', () => {
  const service = new CsvExportService();

  it('builds a CSV with a header row and one row per transaction', () => {
    const categoriesById = new Map([['c1', makeCategory('c1', 'Food')]]);
    const csv = service.buildCsv([makeTransaction()], categoriesById);
    const lines = csv.split('\r\n');
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('Date');
    expect(lines[1]).toContain('125.50');
    expect(lines[1]).toContain('Food');
    expect(lines[1]).toContain('ABC Restaurant');
  });

  it('escapes fields containing commas or quotes', () => {
    const categoriesById = new Map([['c1', makeCategory('c1', 'Food')]]);
    const csv = service.buildCsv(
      [makeTransaction({ description: 'Lunch, with "friends"' })],
      categoriesById,
    );
    expect(csv).toContain('"Lunch, with ""friends"""');
  });

  it('falls back to "Uncategorized" when the category is missing', () => {
    const csv = service.buildCsv([makeTransaction({ categoryId: 'missing' })], new Map());
    expect(csv).toContain('Uncategorized');
  });
});
