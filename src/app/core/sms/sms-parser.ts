import { ParsedSms, SmsDetectedKind } from '../models/sms-import.model';
import { PaymentMethod } from '../models/transaction.model';
import { todayKey, toDateKey } from '../utils/date-range.util';

/**
 * Pure, framework-free SMS parsing. Deliberately has no Angular, IndexedDB,
 * or UI dependency so it can run identically in a web paste/import flow and
 * in a future native Android SMS-reader module.
 */

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function extractAmountPaise(text: string): number | undefined {
  const match = text.match(/(?:rs\.?|inr)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100);
}

function extractAccountSuffix(text: string): string | undefined {
  const match = text.match(/(?:a\/?c|acct|account)[^0-9]{0,12}(?:x{2,}|\*{2,})(\d{2,6})\b/i)
    ?? text.match(/\b(?:x{2,}|\*{2,})(\d{3,6})\b/i);
  return match?.[1];
}

function extractReferenceNumber(text: string): string | undefined {
  const match = text.match(/\b(?:ref(?:erence)?\.?\s*(?:no\.?|number)?|rrn|txn\s*id)[:\s]*([a-z0-9]{6,})/i);
  return match?.[1];
}

function extractMerchant(text: string): string | undefined {
  const match = text.match(/\b(?:to|at|from)\s+([A-Za-z0-9&.'\- ]{2,40}?)(?=\s+(?:on|ref|via|using|dated)\b|[.,;]|$)/i);
  const merchant = match?.[1]?.trim();
  if (!merchant) return undefined;
  // Reject obviously non-merchant captures like pure account/ref fragments.
  if (/^(your|a\/c|account|rs\.?|inr)\b/i.test(merchant)) return undefined;
  return merchant;
}

function extractPaymentMethod(text: string): PaymentMethod | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('upi')) return 'UPI';
  if (/\b(neft|imps|rtgs)\b/.test(lower)) return 'BANK_TRANSFER';
  if (lower.includes('credit card') || /\bcc\b/.test(lower)) return 'CREDIT_CARD';
  if (lower.includes('debit card') || /\bdc\b/.test(lower)) return 'DEBIT_CARD';
  if (lower.includes('cash')) return 'CASH';
  if (lower.includes('a/c') || lower.includes('account')) return 'BANK_TRANSFER';
  return undefined;
}

function extractDateKey(text: string): string | undefined {
  const textMatch = text.match(/\b(\d{1,2})[-\s](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s](\d{2,4})\b/i);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const month = MONTH_INDEX[textMatch[2].toLowerCase()];
    let year = Number(textMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return toDateKey(d);
  }

  const numericMatch = text.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/);
  if (numericMatch) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]) - 1;
    let year = Number(numericMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime()) && month >= 0 && month <= 11) return toDateKey(d);
  }

  return undefined;
}

function classify(lower: string): SmsDetectedKind {
  if (/\botp\b/.test(lower) && !/(debited|credited)\b.*\bsuccessful/.test(lower)) {
    return 'OTP';
  }
  if (
    /\b(cashback|offer|discount|pre-?approved|congratulations|you.?ve won|lucky draw|reward points|click here|download (the |our )?app|t&c apply|limited period)\b/.test(
      lower,
    )
  ) {
    return 'PROMOTIONAL';
  }
  if (
    /\b(available balance|avl bal|a\/c balance|account balance)\b/.test(lower) &&
    !/(debited|credited|spent|withdrawn)/.test(lower)
  ) {
    return 'BALANCE_ALERT';
  }
  if (
    (/\bbill\b.*\bdue\b/.test(lower) ||
      /\b(minimum amount due|total amount due|payment due|due date)\b/.test(lower)) &&
    !/(debited|credited|has been (paid|charged))/.test(lower)
  ) {
    return 'CARD_REMINDER';
  }
  if (/\b(fail(ed|ure)?|declined|unsuccessful|insufficient balance)\b/.test(lower)) {
    return 'FAILED';
  }
  if (/\brevers(ed|al)\b/.test(lower)) {
    return 'REVERSAL';
  }
  if (/\brefund(ed)?\b/.test(lower)) {
    return 'REFUND';
  }
  if (/\b(credited|deposited)\b/.test(lower)) {
    return 'CREDIT';
  }
  if (/\b(debited|spent|withdrawn|paid)\b/.test(lower)) {
    return 'DEBIT';
  }
  return 'UNKNOWN';
}

const ACTIONABLE_KINDS: ReadonlySet<SmsDetectedKind> = new Set(['DEBIT', 'CREDIT', 'REFUND', 'REVERSAL']);

function computeConfidence(
  kind: SmsDetectedKind,
  amountPaise: number | undefined,
  dateKey: string | undefined,
  merchantOrRef: boolean,
): number {
  if (!ACTIONABLE_KINDS.has(kind)) return 0;
  let score = 0.5;
  if (amountPaise != null) score += 0.2;
  if (dateKey != null) score += 0.15;
  if (merchantOrRef) score += 0.15;
  return Math.min(score, 0.95);
}

export function parseSms(rawText: string, referenceDateKey: string = todayKey()): ParsedSms {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const kind = classify(lower);

  const amountPaise = extractAmountPaise(text);
  const accountSuffix = extractAccountSuffix(text);
  const referenceNumber = extractReferenceNumber(text);
  const merchant = extractMerchant(text);
  const paymentMethod = extractPaymentMethod(text);
  // Falls back to the import date when the SMS text itself has no parseable date.
  const transactionDateKey = extractDateKey(text) ?? referenceDateKey;

  const isActionable = ACTIONABLE_KINDS.has(kind) && amountPaise != null;

  let suggestedType: ParsedSms['suggestedType'];
  if (kind === 'DEBIT') suggestedType = 'EXPENSE';
  else if (kind === 'CREDIT' || kind === 'REFUND' || kind === 'REVERSAL') suggestedType = 'INCOME';

  return {
    kind,
    isActionable,
    suggestedType,
    amountPaise,
    merchant,
    accountSuffix,
    referenceNumber,
    paymentMethod,
    transactionDateKey,
    confidence: computeConfidence(kind, amountPaise, transactionDateKey, !!(merchant || referenceNumber)),
  };
}
