import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';

import { SmsImportService } from '../../core/sms/sms-import.service';
import { MerchantRuleService } from '../../core/services/merchant-rule.service';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';
import { SmsImportRecord } from '../../core/models/sms-import.model';
import { parseAmountToPaise, paiseToRupees } from '../../core/utils/currency.util';
import { fromDateKey, toDateKey } from '../../core/utils/date-range.util';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_COLORS,
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_LABELS,
} from '../../shared/labels.util';
import { readFileAsText } from '../../shared/download.util';
import { ToastService } from '../../shared/toast.service';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';
import { LoadingService } from '../../shared/loading/loading.service';

interface PendingItem {
  record: SmsImportRecord;
  form: FormGroup;
}

@Component({
  selector: 'app-sms-import',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
  ],
  templateUrl: './sms-import.component.html',
  styleUrl: './sms-import.component.scss',
})
export class SmsImportComponent implements OnInit {
  private readonly smsImportService = inject(SmsImportService);
  private readonly merchantRuleService = inject(MerchantRuleService);
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly loadingService = inject(LoadingService);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly paymentMethodLabels = PAYMENT_METHOD_LABELS;
  readonly paymentMethodIcons = PAYMENT_METHOD_ICONS;
  readonly paymentMethodColors = PAYMENT_METHOD_COLORS;

  readonly pasteText = signal('');
  readonly ingesting = signal(false);
  readonly loading = signal(true);

  readonly pendingItems = signal<PendingItem[]>([]);
  readonly expenseCategories = signal<Category[]>([]);
  readonly incomeCategories = signal<Category[]>([]);

  async ngOnInit(): Promise<void> {
    const [expense, income] = await Promise.all([
      this.categoryService.getByType('EXPENSE', false),
      this.categoryService.getByType('INCOME', false),
    ]);
    this.expenseCategories.set(expense);
    this.incomeCategories.set(income);
    await this.reloadPending();
    this.loading.set(false);
  }

  categoriesFor(type: 'INCOME' | 'EXPENSE'): Category[] {
    return type === 'INCOME' ? this.incomeCategories() : this.expenseCategories();
  }

  private async reloadPending(): Promise<void> {
    const records = await this.smsImportService.getPending();
    const items = await Promise.all(records.map((r) => this.buildPendingItem(r)));
    this.pendingItems.set(items);
  }

  private async buildPendingItem(record: SmsImportRecord): Promise<PendingItem> {
    const parsed = record.parsed;
    const type = parsed.suggestedType ?? 'EXPENSE';
    const suggestedCategoryId =
      (await this.merchantRuleService.suggestCategory(parsed.merchant)) ??
      this.categoriesFor(type)[0]?.id ??
      '';

    const form = this.fb.nonNullable.group({
      type: this.fb.nonNullable.control<'INCOME' | 'EXPENSE'>(type),
      amount: [
        parsed.amountPaise != null ? paiseToRupees(parsed.amountPaise).toFixed(2) : '',
        Validators.required,
      ],
      categoryId: [suggestedCategoryId, Validators.required],
      date: this.fb.nonNullable.control<Date>(fromDateKey(parsed.transactionDateKey ?? toDateKey(new Date()))),
      paymentMethod: this.fb.nonNullable.control(parsed.paymentMethod ?? 'OTHER'),
      merchant: [parsed.merchant ?? ''],
    });

    return { record, form };
  }

  async ingestPasted(): Promise<void> {
    const text = this.pasteText().trim();
    if (!text) return;
    this.ingesting.set(true);
    this.loadingService.show();
    try {
      const result = await this.smsImportService.ingest(text, 'PASTE');
      this.pasteText.set('');
      this.toast.success(
        `${result.imported.length} message(s) ready for review` +
          (result.autoApproved.length ? `, ${result.autoApproved.length} auto-saved` : '') +
          (result.duplicates ? `, ${result.duplicates} duplicate(s) skipped` : '') +
          (result.ignored ? `, ${result.ignored} ignored (promo/OTP/balance alert)` : ''),
      );
      await this.reloadPending();
    } catch {
      this.toast.error('Could not process the pasted text');
    } finally {
      this.ingesting.set(false);
      this.loadingService.hide();
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.ingesting.set(true);
    this.loadingService.show();
    try {
      const text = await readFileAsText(file);
      const result = await this.smsImportService.ingest(text, 'FILE_IMPORT');
      this.toast.success(
        `${result.imported.length} message(s) ready for review, ${result.duplicates} duplicate(s) skipped`,
      );
      await this.reloadPending();
    } catch {
      this.toast.error('Could not read this file');
    } finally {
      this.ingesting.set(false);
      this.loadingService.hide();
    }
  }

  async approve(item: PendingItem): Promise<void> {
    if (item.form.invalid) {
      item.form.markAllAsTouched();
      this.toast.error('Please complete the required fields');
      return;
    }
    const v = item.form.getRawValue();
    let amountPaise: number;
    try {
      amountPaise = parseAmountToPaise(v.amount);
    } catch {
      this.toast.error('Enter a valid amount');
      return;
    }

    await this.loadingService.wrap(
      this.smsImportService.approve(item.record.id, {
        type: v.type,
        amountPaise,
        categoryId: v.categoryId,
        dateKey: toDateKey(v.date),
        paymentMethod: v.paymentMethod,
        merchant: v.merchant || undefined,
      }),
    );
    this.toast.success('Transaction saved');
    await this.reloadPending();
  }

  async reject(item: PendingItem): Promise<void> {
    const confirmed = await this.confirmService.ask({
      title: 'Ignore this message?',
      message: 'This SMS will be marked as rejected and will not be imported as a transaction.',
      confirmLabel: 'Ignore',
    });
    if (!confirmed) return;
    await this.loadingService.wrap(this.smsImportService.reject(item.record.id));
    this.toast.success('Message rejected');
    await this.reloadPending();
  }
}
