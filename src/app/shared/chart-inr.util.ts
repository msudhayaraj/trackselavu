import { formatPaiseAsInr } from '../core/utils/currency.util';

export function inrTickCallback(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return formatPaiseAsInr(n, false);
}

export function inrTooltipLabel(rawLabel: string, paise: number): string {
  return `${rawLabel}: ${formatPaiseAsInr(paise)}`;
}
