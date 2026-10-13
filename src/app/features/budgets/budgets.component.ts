import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { BudgetService } from '../../core/services/budget.service';
import { CategoryService } from '../../core/services/category.service';
import { Budget, BudgetUsage, NewBudget } from '../../core/models/budget.model';
import { formatPaiseAsInr } from '../../core/utils/currency.util';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';
import { ToastService } from '../../shared/toast.service';
import { BudgetFormDialogComponent, BudgetFormDialogData } from './budget-form-dialog/budget-form-dialog.component';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent implements OnInit {
  private readonly budgetService = inject(BudgetService);
  private readonly categoryService = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly usages = signal<BudgetUsage[]>([]);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.usages.set(await this.budgetService.getAllUsages());
    this.loading.set(false);
  }

  formatInr(paise: number): string {
    return formatPaiseAsInr(paise);
  }

  progressColor(usage: BudgetUsage): 'primary' | 'accent' | 'warn' {
    if (usage.isExceeded) return 'warn';
    if (usage.isWarning) return 'accent';
    return 'primary';
  }

  async openCreateDialog(): Promise<void> {
    const expenseCategories = await this.categoryService.getByType('EXPENSE', false);
    const data: BudgetFormDialogData = { expenseCategories };
    const ref = this.dialog.open(BudgetFormDialogComponent, { width: '420px', data });
    const result: NewBudget | undefined = await firstValueFrom(ref.afterClosed());
    if (!result) return;
    await this.budgetService.create(result);
    this.toast.success('Budget created');
    await this.reload();
  }

  async openEditDialog(budget: Budget): Promise<void> {
    const expenseCategories = await this.categoryService.getByType('EXPENSE', false);
    const data: BudgetFormDialogData = { budget, expenseCategories };
    const ref = this.dialog.open(BudgetFormDialogComponent, { width: '420px', data });
    const result: NewBudget | undefined = await firstValueFrom(ref.afterClosed());
    if (!result) return;
    await this.budgetService.update(budget.id, result);
    this.toast.success('Budget updated');
    await this.reload();
  }

  async deleteBudget(budget: Budget): Promise<void> {
    const confirmed = await this.confirmService.ask({
      title: 'Delete Budget',
      message: 'This budget will be removed. Continue?',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    await this.budgetService.delete(budget.id);
    this.toast.success('Budget deleted');
    await this.reload();
  }
}
