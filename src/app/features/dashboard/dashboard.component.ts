import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ChartConfiguration } from 'chart.js/auto';

import { TransactionService } from '../../core/services/transaction.service';
import { ReportsService, CategoryBreakdownEntry } from '../../core/services/reports.service';
import { BudgetService } from '../../core/services/budget.service';
import { SettingsService } from '../../core/services/settings.service';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';
import { Transaction } from '../../core/models/transaction.model';
import { formatPaiseAsInr } from '../../core/utils/currency.util';
import { getPresetRange, todayKey } from '../../core/utils/date-range.util';
import { ChartCanvasComponent } from '../../shared/chart-canvas/chart-canvas.component';
import { inrTickCallback } from '../../shared/chart-inr.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    ChartCanvasComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly loading = signal(true);
  readonly hasAnyTransactions = signal(true);

  readonly todayExpensePaise = signal(0);
  readonly monthExpensePaise = signal(0);
  readonly monthIncomePaise = signal(0);
  readonly netBalancePaise = signal(0);

  readonly hasBudget = signal(false);
  readonly budgetLimitPaise = signal(0);
  readonly budgetSpentPaise = signal(0);
  readonly budgetRemainingPaise = signal(0);
  readonly budgetPercentUsed = signal(0);
  readonly budgetExceeded = signal(false);
  readonly budgetWarning = signal(false);

  readonly recentTransactions = signal<Transaction[]>([]);
  readonly categoriesById = signal<Map<string, Category>>(new Map());
  readonly topCategories = signal<CategoryBreakdownEntry[]>([]);

  readonly lastBackupLabel = signal('Never backed up');

  dailyChartConfig?: ChartConfiguration;
  monthlyChartConfig?: ChartConfiguration;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly reportsService: ReportsService,
    private readonly budgetService: BudgetService,
    private readonly settingsService: SettingsService,
    private readonly categoryService: CategoryService,
  ) {}

  async ngOnInit(): Promise<void> {
    const totalCount = await this.transactionService.countAll();
    this.hasAnyTransactions.set(totalCount > 0);
    if (totalCount === 0) {
      this.loading.set(false);
      return;
    }

    const today = todayKey();
    const todayRange = getPresetRange('TODAY', today);
    const monthRange = getPresetRange('THIS_MONTH', today);

    const [todayTotals, monthTotals, categories, recentPage, topCategories, dailySeries, monthlySeries, overallBudget, lastBackupAt] =
      await Promise.all([
        this.reportsService.getTotals(todayRange),
        this.reportsService.getTotals(monthRange),
        this.categoryService.getAll(),
        this.transactionService.query({ sortBy: 'date', sortDir: 'desc', limit: 5 }),
        this.reportsService.getTopCategories(monthRange, 'EXPENSE', 3),
        this.reportsService.getDailySeries(getPresetRange('THIS_WEEK', today)),
        this.reportsService.getMonthlySeries(today, 6),
        this.budgetService.getOverallMonthlyUsage(today),
        this.settingsService.get('lastBackupAt'),
      ]);

    this.categoriesById.set(new Map(categories.map((c) => [c.id, c])));
    this.todayExpensePaise.set(todayTotals.expensePaise);
    this.monthExpensePaise.set(monthTotals.expensePaise);
    this.monthIncomePaise.set(monthTotals.incomePaise);
    this.netBalancePaise.set(monthTotals.netPaise);
    this.recentTransactions.set(recentPage.items);
    this.topCategories.set(topCategories);

    if (overallBudget) {
      this.hasBudget.set(true);
      this.budgetLimitPaise.set(overallBudget.limitPaise);
      this.budgetSpentPaise.set(overallBudget.spentPaise);
      this.budgetRemainingPaise.set(overallBudget.remainingPaise);
      this.budgetPercentUsed.set(Math.min(overallBudget.percentUsed, 100));
      this.budgetExceeded.set(overallBudget.isExceeded);
      this.budgetWarning.set(overallBudget.isWarning);
    }

    this.lastBackupLabel.set(
      lastBackupAt ? new Date(lastBackupAt).toLocaleString('en-IN') : 'Never backed up',
    );

    this.dailyChartConfig = {
      type: 'line',
      data: {
        labels: dailySeries.map((p) => p.dateKey.slice(5)),
        datasets: [
          {
            label: 'Expense',
            data: dailySeries.map((p) => p.expensePaise / 100),
            borderColor: '#fb8c00',
            backgroundColor: 'rgba(251,140,0,0.15)',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } },
        },
      },
    };

    this.monthlyChartConfig = {
      type: 'bar',
      data: {
        labels: monthlySeries.map((p) => p.label),
        datasets: [
          {
            label: 'Expense',
            data: monthlySeries.map((p) => p.expensePaise / 100),
            backgroundColor: '#00695c',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } },
        },
      },
    };

    this.loading.set(false);
  }

  formatInr(paise: number): string {
    return formatPaiseAsInr(paise);
  }

  categoryFor(transaction: Transaction): Category | undefined {
    return this.categoriesById().get(transaction.categoryId);
  }
}
