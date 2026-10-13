import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { SettingsService } from './settings.service';
import {
  BACKUP_SCHEMA_VERSION,
  BackupFile,
  BackupPreview,
  RestoreMode,
  RestoreResult,
} from '../models/backup.model';
import { downloadTextFile } from '../../shared/download.util';
import { AppSettings } from '../models/settings.model';

export class InvalidBackupError extends Error {}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(
    private readonly dbService: DbService,
    private readonly settingsService: SettingsService,
  ) {}

  async buildBackup(): Promise<BackupFile> {
    const db = await this.dbService.getDb();
    const [transactions, categories, budgets, accounts, smsImports, settings] = await Promise.all([
      db.getAll('transactions'),
      db.getAll('categories'),
      db.getAll('budgets'),
      db.getAll('accounts'),
      db.getAll('sms_imports'),
      this.settingsService.getAll(),
    ]);

    return {
      app: 'TrackSelavu',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: Date.now(),
      data: { transactions, categories, budgets, accounts, smsImports, settings },
    };
  }

  async downloadBackup(): Promise<void> {
    const backup = await this.buildBackup();
    const now = new Date();
    const filename = `TrackSelavu_Backup_${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}.json`;
    downloadTextFile(filename, JSON.stringify(backup, null, 2), 'application/json');
    await this.settingsService.setMany({ lastBackupAt: now.getTime(), lastBackupFilename: filename });
  }

  /** Throws InvalidBackupError with a user-facing message on any structural problem. */
  parseAndValidate(rawText: string): BackupFile {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new InvalidBackupError('This file is not valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new InvalidBackupError('Backup file is empty or malformed.');
    }
    const file = parsed as Partial<BackupFile>;
    if (file.app !== 'TrackSelavu') {
      throw new InvalidBackupError('This file was not created by TrackSelavu.');
    }
    if (typeof file.schemaVersion !== 'number' || file.schemaVersion < 1) {
      throw new InvalidBackupError('Backup file is missing a valid schema version.');
    }
    if (file.schemaVersion > BACKUP_SCHEMA_VERSION) {
      throw new InvalidBackupError(
        'This backup was created by a newer version of TrackSelavu. Please update the app before restoring.',
      );
    }
    if (!file.data || typeof file.data !== 'object') {
      throw new InvalidBackupError('Backup file is missing its data section.');
    }
    const requiredArrays: (keyof BackupFile['data'])[] = [
      'transactions', 'categories', 'budgets', 'accounts', 'smsImports',
    ];
    for (const key of requiredArrays) {
      if (!Array.isArray(file.data[key])) {
        throw new InvalidBackupError(`Backup file's "${key}" section is missing or malformed.`);
      }
    }
    return file as BackupFile;
  }

  async preview(backup: BackupFile): Promise<BackupPreview> {
    const db = await this.dbService.getDb();
    const [existingTxIds, existingSmsImports] = await Promise.all([
      db.getAllKeys('transactions'),
      db.getAll('sms_imports'),
    ]);
    const existingTxIdSet = new Set(existingTxIds);
    const existingFingerprintSet = new Set(existingSmsImports.map((s) => s.fingerprint));

    return {
      exportedAt: backup.exportedAt,
      schemaVersion: backup.schemaVersion,
      counts: {
        transactions: backup.data.transactions.length,
        categories: backup.data.categories.length,
        budgets: backup.data.budgets.length,
        accounts: backup.data.accounts.length,
        smsImports: backup.data.smsImports.length,
      },
      duplicateTransactionIds: backup.data.transactions.filter((t) => existingTxIdSet.has(t.id)).length,
      duplicateSmsFingerprints: backup.data.smsImports.filter((s) => existingFingerprintSet.has(s.fingerprint)).length,
    };
  }

  /** Restores within a single IndexedDB transaction: any failure aborts the whole operation, leaving prior data untouched. */
  async restore(backup: BackupFile, mode: RestoreMode): Promise<RestoreResult> {
    const db = await this.dbService.getDb();
    const tx = db.transaction(
      ['transactions', 'categories', 'budgets', 'accounts', 'sms_imports', 'settings'],
      'readwrite',
    );

    const result: RestoreResult = {
      mode,
      transactionsImported: 0,
      transactionsSkipped: 0,
      smsImportsImported: 0,
      smsImportsSkipped: 0,
      categoriesImported: 0,
      budgetsImported: 0,
      accountsImported: 0,
    };

    if (mode === 'REPLACE') {
      await Promise.all([
        tx.objectStore('transactions').clear(),
        tx.objectStore('categories').clear(),
        tx.objectStore('budgets').clear(),
        tx.objectStore('accounts').clear(),
        tx.objectStore('sms_imports').clear(),
        tx.objectStore('settings').clear(),
      ]);

      for (const t of backup.data.transactions) await tx.objectStore('transactions').put(t);
      for (const c of backup.data.categories) await tx.objectStore('categories').put(c);
      for (const b of backup.data.budgets) await tx.objectStore('budgets').put(b);
      for (const a of backup.data.accounts) await tx.objectStore('accounts').put(a);
      for (const s of backup.data.smsImports) await tx.objectStore('sms_imports').put(s);
      for (const [key, value] of Object.entries(backup.data.settings)) {
        await tx.objectStore('settings').put({ key: key as keyof AppSettings, value });
      }

      result.transactionsImported = backup.data.transactions.length;
      result.smsImportsImported = backup.data.smsImports.length;
      result.categoriesImported = backup.data.categories.length;
      result.budgetsImported = backup.data.budgets.length;
      result.accountsImported = backup.data.accounts.length;
    } else {
      const existingTxIds = new Set(await tx.objectStore('transactions').getAllKeys());
      for (const t of backup.data.transactions) {
        if (existingTxIds.has(t.id)) {
          result.transactionsSkipped++;
        } else {
          await tx.objectStore('transactions').put(t);
          result.transactionsImported++;
        }
      }

      const existingFingerprints = new Set(
        (await tx.objectStore('sms_imports').getAll()).map((s) => s.fingerprint),
      );
      for (const s of backup.data.smsImports) {
        if (existingFingerprints.has(s.fingerprint)) {
          result.smsImportsSkipped++;
        } else {
          await tx.objectStore('sms_imports').put(s);
          existingFingerprints.add(s.fingerprint);
          result.smsImportsImported++;
        }
      }

      for (const c of backup.data.categories) {
        await tx.objectStore('categories').put(c);
        result.categoriesImported++;
      }
      for (const b of backup.data.budgets) {
        await tx.objectStore('budgets').put(b);
        result.budgetsImported++;
      }
      for (const a of backup.data.accounts) {
        await tx.objectStore('accounts').put(a);
        result.accountsImported++;
      }
      // Settings are left untouched on merge so a restore never silently overrides the user's current preferences.
    }

    await tx.done;
    return result;
  }
}
