import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

import { TransactionService } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';
import { Transaction, TransactionClassification } from '../../../core/models/transaction.model';
import { parseAmountToPaise, paiseToRupees } from '../../../core/utils/currency.util';
import { dateKeyToLocalTimestamp, fromDateKey, toDateKey } from '../../../core/utils/date-range.util';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_COLORS,
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_LABELS,
} from '../../../shared/labels.util';
import { ToastService } from '../../../shared/toast.service';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { LoadingService } from '../../../shared/loading/loading.service';
import { positiveAmountValidator } from './amount.validator';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
})
export class TransactionFormComponent implements OnInit {
  readonly paymentMethods = PAYMENT_METHODS;
  readonly paymentMethodLabels = PAYMENT_METHOD_LABELS;
  readonly paymentMethodIcons = PAYMENT_METHOD_ICONS;
  readonly paymentMethodColors = PAYMENT_METHOD_COLORS;
  readonly categories = signal<Category[]>([]);
  readonly isEdit = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly sourceIsSms = signal(false);

  private readonly fb = inject(FormBuilder);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly loadingService = inject(LoadingService);

  readonly form = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<'INCOME' | 'EXPENSE'>('EXPENSE'),
    amount: ['', [positiveAmountValidator]],
    categoryId: ['', Validators.required],
    date: this.fb.nonNullable.control<Date>(new Date()),
    time: [this.currentTimeString(), Validators.required],
    paymentMethod: this.fb.nonNullable.control<
      'CASH' | 'UPI' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OTHER'
    >('UPI'),
    merchant: [''],
    description: [''],
    classification: this.fb.nonNullable.control<TransactionClassification>('NORMAL'),
  });

  async ngOnInit(): Promise<void> {
    const queryType = this.route.snapshot.queryParamMap.get('type');
    if (queryType === 'INCOME' || queryType === 'EXPENSE') {
      this.form.controls.type.setValue(queryType);
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editingId.set(id);
      const existing = await this.transactionService.getById(id);
      if (existing) {
        this.populateForm(existing);
        this.sourceIsSms.set(existing.source === 'SMS');
      }
    }

    await this.loadCategories();
    this.form.controls.type.valueChanges.subscribe(() => this.loadCategories());
  }

  private async loadCategories(): Promise<void> {
    const type = this.form.controls.type.value;
    const categories = await this.categoryService.getByType(type, false);
    this.categories.set(categories);
    const currentCategoryId = this.form.controls.categoryId.value;
    if (currentCategoryId && !categories.some((c) => c.id === currentCategoryId)) {
      this.form.controls.categoryId.setValue('');
    }
  }

  private populateForm(t: Transaction): void {
    this.form.patchValue({
      type: t.type,
      amount: paiseToRupees(t.amountPaise).toFixed(2),
      categoryId: t.categoryId,
      date: fromDateKey(t.dateKey),
      time: new Date(t.occurredAt).toTimeString().slice(0, 5),
      paymentMethod: t.paymentMethod,
      merchant: t.merchant ?? '',
      description: t.description ?? '',
      classification: t.classification,
    });
  }

  private currentTimeString(): string {
    return new Date().toTimeString().slice(0, 5);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please fix the highlighted fields');
      return;
    }
    const value = this.form.getRawValue();
    const amountPaise = parseAmountToPaise(value.amount);
    const dateKey = toDateKey(value.date);
    const [hours, minutes] = value.time.split(':').map(Number);
    const occurredAt = dateKeyToLocalTimestamp(dateKey, hours, minutes);

    const payload = {
      type: value.type,
      amountPaise,
      categoryId: value.categoryId,
      dateKey,
      occurredAt,
      paymentMethod: value.paymentMethod,
      description: value.description || undefined,
      merchant: value.merchant || undefined,
      source: this.sourceIsSms() ? ('SMS' as const) : ('MANUAL' as const),
      classification: value.classification,
    };

    try {
      if (this.isEdit() && this.editingId()) {
        await this.loadingService.wrap(this.transactionService.update(this.editingId()!, payload));
        this.toast.success('Transaction updated');
      } else {
        await this.loadingService.wrap(this.transactionService.create(payload));
        this.toast.success('Transaction added');
      }
      this.router.navigate(['/transactions']);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Could not save transaction');
    }
  }

  async deleteTransaction(): Promise<void> {
    const id = this.editingId();
    if (!id) return;
    const confirmed = await this.confirmService.ask({
      title: 'Delete Transaction',
      message: 'This transaction will be permanently deleted. Continue?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    await this.loadingService.wrap(this.transactionService.delete(id));
    this.toast.success('Transaction deleted');
    this.router.navigate(['/transactions']);
  }

  cancel(): void {
    this.router.navigate(['/transactions']);
  }
}
