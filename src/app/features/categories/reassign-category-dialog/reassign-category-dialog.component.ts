import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Category } from '../../../core/models/category.model';

export interface ReassignCategoryDialogData {
  categoryToDelete: Category;
  transactionCount: number;
  candidateCategories: Category[];
}

@Component({
  selector: 'app-reassign-category-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Reassign Transactions</h2>
    <mat-dialog-content>
      <p>
        "{{ data.categoryToDelete.name }}" is used by {{ data.transactionCount }} transaction(s).
        Choose a category to move them to before deleting.
      </p>
      <mat-form-field appearance="outline" class="ts-full-width">
        <mat-label>Reassign to</mat-label>
        <mat-select [(ngModel)]="targetCategoryId">
          @for (c of data.candidateCategories; track c.id) {
            <mat-option [value]="c.id">{{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" [disabled]="!targetCategoryId" (click)="confirm()">
        Reassign &amp; Delete
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.ts-full-width { width: 100%; margin-top: 8px; }`],
})
export class ReassignCategoryDialogComponent {
  targetCategoryId?: string;

  constructor(
    private readonly dialogRef: MatDialogRef<ReassignCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReassignCategoryDialogData,
  ) {}

  confirm(): void {
    this.dialogRef.close(this.targetCategoryId);
  }
}
