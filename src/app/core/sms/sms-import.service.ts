import { Injectable } from '@angular/core';
import { DbService } from '../services/db.service';
import { SettingsService } from '../services/settings.service';
import { MerchantRuleService } from '../services/merchant-rule.service';
import { parseSms } from './sms-parser';
import { fingerprintText } from '../utils/hash.util';
import { generateId } from '../utils/id.util';
import { dateKeyToLocalTimestamp, todayKey } from '../utils/date-range.util';
import {
  NewSmsImportRecord,
  SmsImportRecord,
  SmsImportSource,
} from '../models/sms-import.model';
import { PaymentMethod, Transaction, TransactionType } from '../models/transaction.model';

export interface SmsIngestResult {
  imported: SmsImportRecord[];
  autoApproved: SmsImportRecord[];
  duplicates: number;
  ignored: number;
}

export interface SmsApprovalInput {
  type: TransactionType;
  amountPaise: number;
  categoryId: string;
  dateKey: string;
  paymentMethod: PaymentMethod;
  merchant?: string;
  description?: string;
}

function splitMessages(rawText: string): string[] {
  return rawText
    .split(/\n\s*\n+/)
    .map((m) => m.trim())
    .filter(Boolean);
}

@Injectable({ providedIn: 'root' })
export class SmsImportService {
  constructor(
    private readonly dbService: DbService,
    private readonly settingsService: SettingsService,
    private readonly merchantRuleService: MerchantRuleService,
  ) {}

  /** Parses, dedupes, and stores one or more pasted/imported SMS messages for review. */
  async ingest(rawText: string, source: SmsImportSource): Promise<SmsIngestResult> {
    const db = await this.dbService.getDb();
    const messages = splitMessages(rawText);
    const today = todayKey();

    const result: SmsIngestResult = { imported: [], autoApproved: [], duplicates: 0, ignored: 0 };
    const autoSaveEnabled = await this.settingsService.get('smsAutoSaveEnabled');
    const autoSaveMinConfidence = await this.settingsService.get('smsAutoSaveMinConfidence');
    const defaultCategoryId = await this.defaultCategoryIdFor('EXPENSE');
    const defaultIncomeCategoryId = await this.defaultCategoryIdFor('INCOME');

    for (const text of messages) {
      const parsed = parseSms(text, today);
      if (!parsed.isActionable) {
        result.ignored++;
        continue;
      }

      const fingerprint = fingerprintText(text);
      const isDuplicate = parsed.referenceNumber
        ? !!(await db.getFromIndex('sms_imports', 'by-reference', parsed.referenceNumber))
        : !!(await db.getFromIndex('sms_imports', 'by-fingerprint', fingerprint));
      if (isDuplicate) {
        result.duplicates++;
        continue;
      }

      const record: NewSmsImportRecord = {
        rawText: text,
        fingerprint,
        referenceNumber: parsed.referenceNumber,
        parsed,
        status: 'PENDING_REVIEW',
        source,
      };
      const now = Date.now();
      const saved: SmsImportRecord = { ...record, id: generateId(), createdAt: now, updatedAt: now };
      await db.put('sms_imports', saved);
      result.imported.push(saved);

      const canAutoSave =
        autoSaveEnabled && parsed.confidence >= autoSaveMinConfidence && parsed.amountPaise != null;
      if (canAutoSave) {
        const suggestedCategoryId =
          (await this.merchantRuleService.suggestCategory(parsed.merchant)) ??
          (parsed.suggestedType === 'INCOME' ? defaultIncomeCategoryId : defaultCategoryId);
        if (suggestedCategoryId) {
          const approved = await this.approve(saved.id, {
            type: parsed.suggestedType ?? 'EXPENSE',
            amountPaise: parsed.amountPaise!,
            categoryId: suggestedCategoryId,
            dateKey: parsed.transactionDateKey ?? today,
            paymentMethod: parsed.paymentMethod ?? 'OTHER',
            merchant: parsed.merchant,
          });
          if (approved) result.autoApproved.push(approved);
        }
      }
    }

    return result;
  }

  async getPending(): Promise<SmsImportRecord[]> {
    const db = await this.dbService.getDb();
    const all = await db.getAllFromIndex('sms_imports', 'by-status', 'PENDING_REVIEW');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getAll(): Promise<SmsImportRecord[]> {
    const db = await this.dbService.getDb();
    const all = await db.getAll('sms_imports');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Approves a pending SMS record: creates the real transaction and links it back. Learns the merchant->category mapping. */
  async approve(id: string, input: SmsApprovalInput): Promise<SmsImportRecord | null> {
    const db = await this.dbService.getDb();
    const record = await db.get('sms_imports', id);
    if (!record) return null;

    const occurredAt = dateKeyToLocalTimestamp(input.dateKey, new Date().getHours(), new Date().getMinutes());
    const transaction: Transaction = {
      id: generateId(),
      type: input.type,
      amountPaise: input.amountPaise,
      categoryId: input.categoryId,
      dateKey: input.dateKey,
      occurredAt,
      paymentMethod: input.paymentMethod,
      description: input.description,
      merchant: input.merchant,
      source: 'SMS',
      classification: record.parsed.kind === 'REFUND' || record.parsed.kind === 'REVERSAL' ? 'REFUND' : 'NORMAL',
      smsImportId: record.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const tx = db.transaction(['transactions', 'sms_imports'], 'readwrite');
    await tx.objectStore('transactions').put(transaction);
    const updatedRecord: SmsImportRecord = {
      ...record,
      status: 'APPROVED',
      linkedTransactionId: transaction.id,
      updatedAt: Date.now(),
    };
    await tx.objectStore('sms_imports').put(updatedRecord);
    await tx.done;

    if (input.merchant) {
      await this.merchantRuleService.learn(input.merchant, input.categoryId);
    }

    return updatedRecord;
  }

  async reject(id: string): Promise<void> {
    const db = await this.dbService.getDb();
    const record = await db.get('sms_imports', id);
    if (!record) return;
    await db.put('sms_imports', { ...record, status: 'REJECTED', updatedAt: Date.now() });
  }

  private async defaultCategoryIdFor(type: TransactionType): Promise<string | undefined> {
    const db = await this.dbService.getDb();
    const categories = await db.getAllFromIndex('categories', 'by-type', type);
    const other = categories.find((c) => c.name.toLowerCase().startsWith('other'));
    return (other ?? categories[0])?.id;
  }
}
