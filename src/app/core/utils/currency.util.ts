const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const INR_FORMATTER_NO_DECIMALS = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Converts a rupee amount (may have paise as decimals) to integer paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Formats integer paise as an INR string using the Indian numbering system, e.g. ₹1,25,000.50 */
export function formatPaiseAsInr(paise: number, decimals = true): string {
  const rupees = paiseToRupees(paise);
  return (decimals ? INR_FORMATTER : INR_FORMATTER_NO_DECIMALS).format(rupees);
}

/** Parses a user-entered amount string (e.g. "125.50", "1,250") into integer paise. Throws on invalid/non-positive input. */
export function parseAmountToPaise(input: string): number {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Amount must be a positive number');
  }
  return rupeesToPaise(value);
}
