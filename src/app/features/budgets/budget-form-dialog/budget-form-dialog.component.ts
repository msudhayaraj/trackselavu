import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { Budget, NewBudget } from '../../../core/models/budget.model';
import { Category } from '../../../core/models/category.model';
import { parseAmountToPaise, paiseToRupees } from '../../../core/utils/currency.util';

export interface BudgetFormDialogData {
  budget?: Budget;
  expenseCategories: Category[];
}

@Component({
  selector: 'app-budget-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  templateUrl: './budget-form-dialog.component.html',
  styles: [
    `
      .ts-option-icon {
        font-size: 20px;
        height: 20px;
        width: 20px;
        vertical-align: middle;
        margin-right: 8px;
      }
      .ts-full-width {
        width: 100%;
        display: block;
        margin-bottom: 12px;
      }
    `,
  ],
})
export class BudgetFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<BudgetFormDialogComponent>);
  readonly data = inject<BudgetFormDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = !!this.data.budget;

  readonly form = this.fb.nonNullable.group({
    scope: this.fb.nonNullable.control<'OVERALL' | 'CATEGORY'>(this.data.budget?.scope ?? 'OVERALL'),
    categoryId: [this.data.budget?.categoryId ?? ''],
    period: this.fb.nonNullable.control<'MONTHLY' | 'WEEKLY'>(this.data.budget?.period ?? 'MONTHLY'),
    limit: [
      this.data.budget ? paiseToRupees(this.data.budget.limitPaise).toFixed(2) : '',
      [Validators.required],
    ],
    warningThresholdPercent: this.fb.nonNullable.control(this.data.budget?.warningThresholdPercent ?? 80),
    isActive: this.fb.nonNullable.control(this.data.budget?.isActive ?? true),
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.scope === 'CATEGORY' && !v.categoryId) {
      this.form.controls.categoryId.setErrors({ required: true });
      return;
    }
    let limitPaise: number;
    try {
      limitPaise = parseAmountToPaise(v.limit);
    } catch {
      this.form.controls.limit.setErrors({ invalid: true });
      return;
    }

    const result: NewBudget = {
      scope: v.scope,
      categoryId: v.scope === 'CATEGORY' ? v.categoryId : undefined,
      period: v.period,
      limitPaise,
      warningThresholdPercent: v.warningThresholdPercent,
      isActive: v.isActive,
    };
    this.dialogRef.close(result);
  }
}
