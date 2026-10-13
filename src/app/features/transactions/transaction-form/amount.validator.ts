import { AbstractControl, ValidationErrors } from '@angular/forms';

export function positiveAmountValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').toString().replace(/[₹,\s]/g, '');
  if (!raw) return { required: true };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { invalidAmount: true };
  if (value <= 0) return { nonPositive: true };
  return null;
}
