import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { ReportsService, CategoryBreakdownEntry, PeriodTotals } from '../../core/services/reports.service';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';
import { Transaction } from '../../core/models/transaction.model';
import { formatPaiseAsInr } from '../../core/utils/currency.util';
import {
  DateRange,
  ReportPreset,
  getPresetRange,
  getPreviousEquivalentRange,
  toDateKey,
  todayKey,
} from '../../core/utils/date-range.util';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder);

  readonly preset = signal<ReportPreset>('THIS_MONTH');
  readonly customForm = this.fb.group({
    startDate: this.fb.control<Date | null>(null),
    endDate: this.fb.control<Date | null>(null),
  });

  readonly range = signal<DateRange | null>(null);
  readonly totals = signal<PeriodTotals | null>(null);
  readonly previousTotals = signal<PeriodTotals | null>(null);
  readonly topCategories = signal<CategoryBreakdownEntry[]>([]);
  readonly largestTransactions = signal<Transaction[]>([]);
  readonly averageDailyExpense = signal(0);
  readonly highestSpendingDay = signal<{ dateKey: string; expensePaise: number } | null>(null);
  readonly categoriesById = signal<Map<string, Category>>(new Map());

  readonly presets: { value: ReportPreset; label: string }[] = [
    { value: 'TODAY', label: 'Today' },
    { value: 'YESTERDAY', label: 'Yesterday' },
    { value: 'THIS_WEEK', label: 'This Week' },
    { value: 'LAST_WEEK', label: 'Last Week' },
    { value: 'THIS_MONTH', label: 'This Month' },
    { value: 'LAST_MONTH', label: 'Last Month' },
    { value: 'CUSTOM', label: 'Custom' },
  ];

  async ngOnInit(): Promise<void> {
    const categories = await this.categoryService.getAll();
    this.categoriesById.set(new Map(categories.map((c) => [c.id, c])));
    await this.selectPreset('THIS_MONTH');
  }

  async selectPreset(preset: ReportPreset): Promise<void> {
    this.preset.set(preset);
    if (preset === 'CUSTOM') {
      const start = this.customForm.value.startDate;
      const end = this.customForm.value.endDate;
      if (!start || !end) return;
    }
    await this.applyRange();
  }

  async onCustomRangeChange(): Promise<void> {
    if (this.preset() === 'CUSTOM') {
      await this.applyRange();
    }
  }

  private async applyRange(): Promise<void> {
    const today = todayKey();
    let range: DateRange;
    if (this.preset() === 'CUSTOM') {
      const start = this.customForm.value.startDate;
      const end = this.customForm.value.endDate;
      if (!start || !end) return;
      range = getPresetRange('CUSTOM', today, 'MONDAY', {
        startKey: toDateKey(start),
        endKey: toDateKey(end),
      });
    } else {
      range = getPresetRange(this.preset(), today);
    }
    this.range.set(range);

    const previousRange = getPreviousEquivalentRange(range);

    const [totals, previousTotals, topCategories, largest, avgDaily, highestDay] = await Promise.all([
      this.reportsService.getTotals(range),
      this.reportsService.getTotals(previousRange),
      this.reportsService.getTopCategories(range, 'EXPENSE', 5),
      this.reportsService.getLargestTransactions(range, 5),
      this.reportsService.getAverageDailyExpense(range),
      this.reportsService.getHighestSpendingDay(range),
    ]);

    this.totals.set(totals);
    this.previousTotals.set(previousTotals);
    this.topCategories.set(topCategories);
    this.largestTransactions.set(largest);
    this.averageDailyExpense.set(avgDaily);
    this.highestSpendingDay.set(highestDay);
  }

  changePercent(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return ((current - previous) / previous) * 100;
  }

  categoryFor(t: Transaction): Category | undefined {
    return this.categoriesById().get(t.categoryId);
  }

  formatInr(paise: number): string {
    return formatPaiseAsInr(paise);
  }
}
