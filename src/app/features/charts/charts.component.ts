import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ChartConfiguration } from 'chart.js/auto';

import { ReportsService } from '../../core/services/reports.service';
import { CategoryService } from '../../core/services/category.service';
import { BudgetService } from '../../core/services/budget.service';
import { TransactionType } from '../../core/models/transaction.model';
import {
  DateRange,
  ReportPreset,
  getPresetRange,
  todayKey,
  addMonthsToKey,
  startOfMonthKey,
  endOfMonthKey,
  monthLabel,
} from '../../core/utils/date-range.util';
import { formatPaiseAsInr } from '../../core/utils/currency.util';
import { ChartCanvasComponent } from '../../shared/chart-canvas/chart-canvas.component';
import { inrTickCallback } from '../../shared/chart-inr.util';

const CATEGORY_PALETTE = [
  '#1976d2', '#fb8c00', '#8e24aa', '#3949ab', '#43a047', '#e53935',
  '#d81b60', '#1e88e5', '#6d4c41', '#fbc02d', '#78909c', '#00acc1',
];

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, MatButtonToggleModule, ChartCanvasComponent],
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss',
})
export class ChartsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly categoryService = inject(CategoryService);
  private readonly budgetService = inject(BudgetService);
  private readonly router = inject(Router);

  readonly periodPreset = signal<ReportPreset>('THIS_MONTH');
  readonly typeFilter = signal<TransactionType>('EXPENSE');

  readonly periods: { value: ReportPreset; label: string }[] = [
    { value: 'THIS_WEEK', label: 'This Week' },
    { value: 'THIS_MONTH', label: 'This Month' },
    { value: 'LAST_MONTH', label: 'Last Month' },
  ];

  trendConfig?: ChartConfiguration;
  trendEmpty = true;

  monthlyTrendConfig?: ChartConfiguration;
  monthlyTrendEmpty = true;

  categoryConfig?: ChartConfiguration;
  categoryEmpty = true;
  categoryLegend: { name: string; color: string; amountPaise: number; percent: number }[] = [];

  incomeVsExpenseConfig?: ChartConfiguration;
  incomeVsExpenseEmpty = true;

  budgetVsActualConfig?: ChartConfiguration;
  budgetVsActualEmpty = true;

  monthlyCategoryConfig?: ChartConfiguration;
  monthlyCategoryEmpty = true;

  private currentCategoryIds: string[] = [];

  async ngOnInit(): Promise<void> {
    await this.reloadAll();
  }

  async onPeriodChange(preset: ReportPreset): Promise<void> {
    this.periodPreset.set(preset);
    await this.reloadAll();
  }

  async onTypeFilterChange(type: TransactionType): Promise<void> {
    this.typeFilter.set(type);
    await this.reloadAll();
  }

  private currentRange(): DateRange {
    return getPresetRange(this.periodPreset(), todayKey());
  }

  private async reloadAll(): Promise<void> {
    const range = this.currentRange();
    await Promise.all([
      this.loadTrend(range),
      this.loadMonthlyTrend(),
      this.loadCategoryBreakdown(range),
      this.loadIncomeVsExpense(),
      this.loadBudgetVsActual(),
      this.loadMonthlyCategoryComparison(),
    ]);
  }

  private async loadTrend(range: DateRange): Promise<void> {
    const series = await this.reportsService.getDailySeries(range);
    this.trendEmpty = series.every((p) => p.incomePaise === 0 && p.expensePaise === 0);
    this.trendConfig = {
      type: 'line',
      data: {
        labels: series.map((p) => p.dateKey.slice(5)),
        datasets: [
          {
            label: 'Expense',
            data: series.map((p) => p.expensePaise / 100),
            borderColor: '#fb8c00',
            backgroundColor: 'rgba(251,140,0,0.15)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Income',
            data: series.map((p) => p.incomePaise / 100),
            borderColor: '#1976d2',
            backgroundColor: 'rgba(25,118,210,0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatPaiseAsInr(Number(ctx.raw) * 100)}` } },
        },
        scales: { y: { ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } } },
      },
    };
  }

  private async loadMonthlyTrend(): Promise<void> {
    const series = await this.reportsService.getMonthlySeries(todayKey(), 6);
    this.monthlyTrendEmpty = series.every((p) => p.expensePaise === 0);
    this.monthlyTrendConfig = {
      type: 'bar',
      data: {
        labels: series.map((p) => p.label),
        datasets: [{ label: 'Expense', data: series.map((p) => p.expensePaise / 100), backgroundColor: '#1976d2' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } } },
      },
    };
  }

  private async loadCategoryBreakdown(range: DateRange): Promise<void> {
    const breakdown = await this.reportsService.getCategoryBreakdown(range, this.typeFilter());
    this.categoryEmpty = breakdown.length === 0;
    this.currentCategoryIds = breakdown.map((b) => b.categoryId);
    this.categoryLegend = breakdown.map((b) => ({
      name: b.categoryName,
      color: b.color,
      amountPaise: b.amountPaise,
      percent: b.percent,
    }));
    this.categoryConfig = {
      type: 'doughnut',
      data: {
        labels: breakdown.map((b) => b.categoryName),
        datasets: [{ data: breakdown.map((b) => b.amountPaise / 100), backgroundColor: breakdown.map((b) => b.color) }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const entry = breakdown[ctx.dataIndex];
                return `${entry.categoryName}: ${formatPaiseAsInr(entry.amountPaise)} (${entry.percent.toFixed(0)}%)`;
              },
            },
          },
        },
      },
    };
  }

  onCategorySegmentClick(index: number): void {
    const categoryId = this.currentCategoryIds[index];
    if (!categoryId) return;
    this.router.navigate(['/transactions'], { queryParams: { categoryId } });
  }

  private async loadIncomeVsExpense(): Promise<void> {
    const series = await this.reportsService.getMonthlySeries(todayKey(), 6);
    this.incomeVsExpenseEmpty = series.every((p) => p.incomePaise === 0 && p.expensePaise === 0);
    this.incomeVsExpenseConfig = {
      type: 'bar',
      data: {
        labels: series.map((p) => p.label),
        datasets: [
          { label: 'Income', data: series.map((p) => p.incomePaise / 100), backgroundColor: '#1976d2' },
          { label: 'Expense', data: series.map((p) => p.expensePaise / 100), backgroundColor: '#fb8c00' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } } },
      },
    };
  }

  private async loadBudgetVsActual(): Promise<void> {
    const usages = await this.budgetService.getAllUsages();
    this.budgetVsActualEmpty = usages.length === 0;
    const labels = usages.map((u) => (u.budget.scope === 'OVERALL' ? 'Overall' : u.categoryName ?? 'Category'));
    this.budgetVsActualConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Budget', data: usages.map((u) => u.limitPaise / 100), backgroundColor: '#90a4ae' },
          {
            label: 'Actual',
            data: usages.map((u) => u.spentPaise / 100),
            backgroundColor: usages.map((u) => (u.isExceeded ? '#e53935' : '#1976d2')),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } } },
      },
    };
  }

  private async loadMonthlyCategoryComparison(): Promise<void> {
    const monthCount = 6;
    const monthKeys: string[] = [];
    for (let i = monthCount - 1; i >= 0; i--) monthKeys.push(addMonthsToKey(todayKey(), -i));

    const perMonthBreakdowns = await Promise.all(
      monthKeys.map((m) =>
        this.reportsService.getCategoryBreakdown(
          { startKey: startOfMonthKey(m), endKey: endOfMonthKey(m), label: monthLabel(m) },
          'EXPENSE',
        ),
      ),
    );

    const totalByCategory = new Map<string, number>();
    for (const month of perMonthBreakdowns) {
      for (const entry of month) {
        totalByCategory.set(entry.categoryId, (totalByCategory.get(entry.categoryId) ?? 0) + entry.amountPaise);
      }
    }
    const topCategoryIds = [...totalByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    this.monthlyCategoryEmpty = topCategoryIds.length === 0;

    const categoryNameById = new Map<string, string>();
    for (const month of perMonthBreakdowns) {
      for (const entry of month) categoryNameById.set(entry.categoryId, entry.categoryName);
    }

    const datasets = topCategoryIds.map((categoryId, i) => ({
      label: categoryNameById.get(categoryId) ?? 'Category',
      data: perMonthBreakdowns.map(
        (month) => (month.find((e) => e.categoryId === categoryId)?.amountPaise ?? 0) / 100,
      ),
      backgroundColor: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));

    this.monthlyCategoryConfig = {
      type: 'bar',
      data: { labels: monthKeys.map((m) => monthLabel(m)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, ticks: { callback: (v) => inrTickCallback(Number(v) * 100) } },
        },
      },
    };
  }
}
