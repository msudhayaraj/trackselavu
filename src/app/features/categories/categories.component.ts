import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { CategoryService, CategoryInUseError } from '../../core/services/category.service';
import { Category, NewCategory } from '../../core/models/category.model';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';
import { ToastService } from '../../shared/toast.service';
import {
  CategoryFormDialogComponent,
  CategoryFormDialogData,
} from './category-form-dialog/category-form-dialog.component';
import {
  ReassignCategoryDialogComponent,
  ReassignCategoryDialogData,
} from './reassign-category-dialog/reassign-category-dialog.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, MatTabsModule, MatIconModule, MatButtonModule, MatSlideToggleModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent implements OnInit {
  readonly expenseCategories = signal<Category[]>([]);
  readonly incomeCategories = signal<Category[]>([]);
  readonly selectedTab = signal<'EXPENSE' | 'INCOME'>('EXPENSE');

  constructor(
    private readonly categoryService: CategoryService,
    private readonly dialog: MatDialog,
    private readonly confirmService: ConfirmService,
    private readonly toast: ToastService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const [expense, income] = await Promise.all([
      this.categoryService.getByType('EXPENSE', true),
      this.categoryService.getByType('INCOME', true),
    ]);
    this.expenseCategories.set(expense);
    this.incomeCategories.set(income);
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index === 0 ? 'EXPENSE' : 'INCOME');
  }

  async openCreateDialog(): Promise<void> {
    const data: CategoryFormDialogData = { defaultType: this.selectedTab() };
    const ref = this.dialog.open(CategoryFormDialogComponent, { width: '420px', data });
    const result: NewCategory | undefined = await firstValueFrom(ref.afterClosed());
    if (!result) return;
    await this.categoryService.create(result);
    this.toast.success('Category created');
    await this.reload();
  }

  async openEditDialog(category: Category): Promise<void> {
    const data: CategoryFormDialogData = { category };
    const ref = this.dialog.open(CategoryFormDialogComponent, { width: '420px', data });
    const result: NewCategory | undefined = await firstValueFrom(ref.afterClosed());
    if (!result) return;
    await this.categoryService.update(category.id, result);
    this.toast.success('Category updated');
    await this.reload();
  }

  async toggleActive(category: Category): Promise<void> {
    await this.categoryService.setActive(category.id, !category.isActive);
    await this.reload();
  }

  async deleteCategory(category: Category): Promise<void> {
    const usageCount = await this.categoryService.countTransactionsUsing(category.id);
    if (usageCount > 0) {
      const candidates = (category.type === 'EXPENSE' ? this.expenseCategories() : this.incomeCategories())
        .filter((c) => c.id !== category.id);
      if (candidates.length === 0) {
        this.toast.error('Create another category of the same type before deleting this one.');
        return;
      }
      const data: ReassignCategoryDialogData = {
        categoryToDelete: category,
        transactionCount: usageCount,
        candidateCategories: candidates,
      };
      const ref = this.dialog.open(ReassignCategoryDialogComponent, { width: '420px', data });
      const targetId: string | undefined = await firstValueFrom(ref.afterClosed());
      if (!targetId) return;
      await this.categoryService.reassignAndDelete(category.id, targetId);
      this.toast.success(`Moved ${usageCount} transaction(s) and deleted "${category.name}"`);
      await this.reload();
      return;
    }

    const confirmed = await this.confirmService.ask({
      title: 'Delete Category',
      message: `Delete "${category.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.categoryService.delete(category.id);
      this.toast.success('Category deleted');
      await this.reload();
    } catch (err) {
      if (err instanceof CategoryInUseError) {
        this.toast.error(err.message);
      } else {
        this.toast.error('Could not delete category');
      }
    }
  }
}
