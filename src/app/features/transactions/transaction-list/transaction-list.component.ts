import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatExpansionModule } from '@angular/material/expansion';

import { TransactionService, TransactionFilter } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';
import { Transaction } from '../../../core/models/transaction.model';
import { formatPaiseAsInr, parseAmountToPaise } from '../../../core/utils/currency.util';
import { toDateKey } from '../../../core/utils/date-range.util';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, TRANSACTION_SOURCE_LABELS } from '../../../shared/labels.util';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';
import { ToastService } from '../../../shared/toast.service';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatExpansionModule,
  ],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.scss',
})
export class TransactionListComponent implements OnInit, OnDestroy {
  readonly paymentMethods = PAYMENT_METHODS;
  readonly paymentMethodLabels = PAYMENT_METHOD_LABELS;
  readonly sourceLabels = TRANSACTION_SOURCE_LABELS;

  readonly categories = signal<Category[]>([]);
  readonly categoriesById = signal<Map<string, Category>>(new Map());
  readonly items = signal<Transaction[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);

  pageIndex = 0;
  pageSize = 25;

  private readonly fb = inject(FormBuilder);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly filterForm = this.fb.group({
    searchText: [''],
    type: [''],
    categoryId: [''],
    paymentMethod: [''],
    source: [''],
    startDate: this.fb.control<Date | null>(null),
    endDate: this.fb.control<Date | null>(null),
    minAmount: [''],
    maxAmount: [''],
    sortBy: this.fb.control<'date' | 'amount' | 'category'>('date'),
    sortDir: this.fb.control<'asc' | 'desc'>('desc'),
  });

  private sub?: Subscription;

  async ngOnInit(): Promise<void> {
    const categories = await this.categoryService.getAll();
    this.categories.set(categories);
    this.categoriesById.set(new Map(categories.map((c) => [c.id, c])));

    const categoryIdParam = this.route.snapshot.queryParamMap.get('categoryId');
    if (categoryIdParam) {
      this.filterForm.patchValue({ categoryId: categoryIdParam }, { emitEvent: false });
    }

    this.sub = this.filterForm.valueChanges.pipe(debounceTime(250)).subscribe(() => {
      this.pageIndex = 0;
      this.refresh();
    });

    await this.refresh();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    const v = this.filterForm.getRawValue();

    const filter: TransactionFilter = {
      searchText: v.searchText || undefined,
      type: (v.type || undefined) as TransactionFilter['type'],
      categoryId: v.categoryId || undefined,
      paymentMethod: (v.paymentMethod || undefined) as TransactionFilter['paymentMethod'],
      source: (v.source || undefined) as TransactionFilter['source'],
      sortBy: v.sortBy ?? 'date',
      sortDir: v.sortDir ?? 'desc',
      limit: this.pageSize,
      offset: this.pageIndex * this.pageSize,
    };

    if (v.startDate && v.endDate) {
      filter.range = { startKey: toDateKey(v.startDate), endKey: toDateKey(v.endDate), label: 'Custom' };
    }
    if (v.minAmount) {
      try {
        filter.minAmountPaise = parseAmountToPaise(v.minAmount);
      } catch {
        /* ignore invalid partial input while typing */
      }
    }
    if (v.maxAmount) {
      try {
        filter.maxAmountPaise = parseAmountToPaise(v.maxAmount);
      } catch {
        /* ignore invalid partial input while typing */
      }
    }

    const page = await this.transactionService.query(filter);
    this.items.set(page.items);
    this.total.set(page.total);
    this.loading.set(false);
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refresh();
  }

  clearFilters(): void {
    this.filterForm.reset({
      searchText: '',
      type: '',
      categoryId: '',
      paymentMethod: '',
      source: '',
      startDate: null,
      endDate: null,
      minAmount: '',
      maxAmount: '',
      sortBy: 'date',
      sortDir: 'desc',
    });
  }

  hasActiveFilters(): boolean {
    const v = this.filterForm.getRawValue();
    return !!(
      v.searchText ||
      v.type ||
      v.categoryId ||
      v.paymentMethod ||
      v.source ||
      v.startDate ||
      v.endDate ||
      v.minAmount ||
      v.maxAmount
    );
  }

  categoryFor(t: Transaction): Category | undefined {
    return this.categoriesById().get(t.categoryId);
  }

  formatInr(paise: number): string {
    return formatPaiseAsInr(paise);
  }

  async deleteTransaction(t: Transaction): Promise<void> {
    const confirmed = await this.confirmService.ask({
      title: 'Delete Transaction',
      message: 'This transaction will be permanently deleted. Continue?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    await this.transactionService.delete(t.id);
    this.toast.success('Transaction deleted');
    await this.refresh();
  }
}
