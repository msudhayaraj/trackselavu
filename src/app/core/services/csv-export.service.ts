import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import { Category } from '../models/category.model';
import { paiseToRupees } from '../utils/currency.util';
import { PAYMENT_METHOD_LABELS, TRANSACTION_SOURCE_LABELS } from '../../shared/labels.util';
import { downloadTextFile } from '../../shared/download.util';

const CSV_HEADERS = [
  'Date', 'Time', 'Type', 'Amount (INR)', 'Category', 'Payment Method',
  'Merchant', 'Description', 'Source', 'Classification',
];

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  buildCsv(transactions: Transaction[], categoriesById: Map<string, Category>): string {
    const rows = transactions.map((t) => {
      const date = new Date(t.occurredAt);
      return [
        t.dateKey,
        date.toTimeString().slice(0, 5),
        t.type,
        paiseToRupees(t.amountPaise).toFixed(2),
        categoriesById.get(t.categoryId)?.name ?? 'Uncategorized',
        PAYMENT_METHOD_LABELS[t.paymentMethod],
        t.merchant ?? '',
        t.description ?? '',
        TRANSACTION_SOURCE_LABELS[t.source],
        t.classification,
      ].map((v) => escapeCsvField(String(v)));
    });

    return [CSV_HEADERS, ...rows].map((row) => row.join(',')).join('\r\n');
  }

  exportAndDownload(transactions: Transaction[], categoriesById: Map<string, Category>): void {
    const csv = this.buildCsv(transactions, categoriesById);
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`TrackSelavu_Transactions_${dateStamp}.csv`, csv, 'text/csv;charset=utf-8;');
  }
}
