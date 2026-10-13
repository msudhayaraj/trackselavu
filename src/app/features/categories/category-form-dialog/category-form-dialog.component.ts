import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Category, NewCategory } from '../../../core/models/category.model';
import { CATEGORY_COLOR_CHOICES, CATEGORY_ICON_CHOICES } from '../category-icons';

export interface CategoryFormDialogData {
  category?: Category;
  defaultType?: 'INCOME' | 'EXPENSE';
}

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './category-form-dialog.component.html',
  styleUrl: './category-form-dialog.component.scss',
})
export class CategoryFormDialogComponent {
  readonly icons = CATEGORY_ICON_CHOICES;
  readonly colors = CATEGORY_COLOR_CHOICES;
  readonly isEdit: boolean;

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CategoryFormDialogComponent>);
  readonly data = inject<CategoryFormDialogData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    type: [this.data.category?.type ?? this.data.defaultType ?? 'EXPENSE', Validators.required],
    icon: [this.data.category?.icon ?? CATEGORY_ICON_CHOICES[0], Validators.required],
    color: [this.data.category?.color ?? CATEGORY_COLOR_CHOICES[0], Validators.required],
    isActive: [this.data.category?.isActive ?? true],
  });

  constructor() {
    this.isEdit = !!this.data.category;
    if (this.data.category) {
      this.form.patchValue(this.data.category);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result: NewCategory = {
      name: value.name!.trim(),
      type: value.type as 'INCOME' | 'EXPENSE',
      icon: value.icon!,
      color: value.color!,
      isActive: value.isActive!,
      isDefault: this.data.category?.isDefault ?? false,
    };
    this.dialogRef.close(result);
  }
}
