import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';

import { BackupService, InvalidBackupError } from '../../core/services/backup.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { SettingsService } from '../../core/services/settings.service';
import { BackupFile, BackupPreview, RestoreMode } from '../../core/models/backup.model';
import { readFileAsText } from '../../shared/download.util';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';
import { ToastService } from '../../shared/toast.service';
import { LoadingService } from '../../shared/loading/loading.service';

@Component({
  selector: 'app-backup-restore',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatRadioModule],
  templateUrl: './backup-restore.component.html',
  styleUrl: './backup-restore.component.scss',
})
export class BackupRestoreComponent implements OnInit {
  private readonly backupService = inject(BackupService);
  private readonly csvExportService = inject(CsvExportService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly settingsService = inject(SettingsService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly loadingService = inject(LoadingService);

  readonly lastBackupLabel = signal('Never backed up');
  readonly transactionCount = signal(0);
  readonly exporting = signal(false);
  readonly restoring = signal(false);

  readonly pendingBackup = signal<BackupFile | null>(null);
  readonly preview = signal<BackupPreview | null>(null);
  readonly restoreMode = signal<RestoreMode>('MERGE');
  readonly fileError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.refreshStatus();
  }

  private async refreshStatus(): Promise<void> {
    const lastBackupAt = await this.settingsService.get('lastBackupAt');
    this.lastBackupLabel.set(lastBackupAt ? new Date(lastBackupAt).toLocaleString('en-IN') : 'Never backed up');
    this.transactionCount.set(await this.transactionService.countAll());
  }

  async exportJsonBackup(): Promise<void> {
    this.exporting.set(true);
    this.loadingService.show();
    try {
      await this.backupService.downloadBackup();
      this.toast.success('Backup downloaded');
      await this.refreshStatus();
    } catch {
      this.toast.error('Could not create backup');
    } finally {
      this.exporting.set(false);
      this.loadingService.hide();
    }
  }

  async exportCsv(): Promise<void> {
    const [transactions, categories] = await this.loadingService.wrap(
      Promise.all([this.transactionService.getAll(), this.categoryService.getAll()]),
    );
    if (transactions.length === 0) {
      this.toast.error('No transactions to export');
      return;
    }
    this.csvExportService.exportAndDownload(transactions, new Map(categories.map((c) => [c.id, c])));
    this.toast.success('CSV exported');
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.fileError.set(null);
    this.pendingBackup.set(null);
    this.preview.set(null);

    try {
      const text = await readFileAsText(file);
      const backup = this.backupService.parseAndValidate(text);
      const preview = await this.backupService.preview(backup);
      this.pendingBackup.set(backup);
      this.preview.set(preview);
    } catch (err) {
      const message = err instanceof InvalidBackupError ? err.message : 'Could not read this file.';
      this.fileError.set(message);
      this.toast.error(message);
    }
  }

  cancelRestore(): void {
    this.pendingBackup.set(null);
    this.preview.set(null);
    this.fileError.set(null);
  }

  async confirmRestore(): Promise<void> {
    const backup = this.pendingBackup();
    if (!backup) return;
    const mode = this.restoreMode();

    if (mode === 'REPLACE') {
      const confirmed = await this.confirmService.ask({
        title: 'Replace All Data',
        message:
          'This will permanently delete all current transactions, categories, budgets, and settings, replacing them with the backup contents. This cannot be undone.',
        confirmLabel: 'Replace Everything',
        danger: true,
      });
      if (!confirmed) return;
    }

    this.restoring.set(true);
    this.loadingService.show();
    try {
      const result = await this.backupService.restore(backup, mode);
      this.toast.success(
        `Restored ${result.transactionsImported} transaction(s)` +
          (result.transactionsSkipped ? `, skipped ${result.transactionsSkipped} duplicate(s)` : ''),
      );
      this.cancelRestore();
      await this.refreshStatus();
    } catch {
      this.toast.error('Restore failed — your existing data was not changed.');
    } finally {
      this.restoring.set(false);
      this.loadingService.hide();
    }
  }
}
