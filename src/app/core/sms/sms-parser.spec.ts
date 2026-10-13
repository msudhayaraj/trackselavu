import { parseSms } from './sms-parser';

describe('parseSms', () => {
  it('parses a UPI debit message', () => {
    const result = parseSms(
      'Rs. 250.00 debited from your account for UPI payment to ABC Restaurant on 12-Oct-2026.',
      '2026-10-12',
    );
    expect(result.kind).toBe('DEBIT');
    expect(result.isActionable).toBeTrue();
    expect(result.suggestedType).toBe('EXPENSE');
    expect(result.amountPaise).toBe(25000);
    expect(result.merchant).toContain('ABC Restaurant');
    expect(result.paymentMethod).toBe('UPI');
    expect(result.transactionDateKey).toBe('2026-10-12');
  });

  it('parses a NEFT credit message', () => {
    const result = parseSms(
      'Rs.5000.00 credited to your account XXXX1234 on 12-10-2026 towards NEFT from EMPLOYER LTD Ref No 987654321012.',
    );
    expect(result.kind).toBe('CREDIT');
    expect(result.isActionable).toBeTrue();
    expect(result.suggestedType).toBe('INCOME');
    expect(result.amountPaise).toBe(500000);
    expect(result.accountSuffix).toBe('1234');
    expect(result.referenceNumber).toBe('987654321012');
    expect(result.paymentMethod).toBe('BANK_TRANSFER');
  });

  it('parses a refund message', () => {
    const result = parseSms('Rs. 199.00 has been refunded to your account from Amazon.');
    expect(result.kind).toBe('REFUND');
    expect(result.isActionable).toBeTrue();
    expect(result.suggestedType).toBe('INCOME');
    expect(result.amountPaise).toBe(19900);
  });

  it('parses a reversal message', () => {
    const result = parseSms('Your transaction of Rs 500.00 has been reversed. Ref No AB12345678.');
    expect(result.kind).toBe('REVERSAL');
    expect(result.isActionable).toBeTrue();
    expect(result.suggestedType).toBe('INCOME');
    expect(result.amountPaise).toBe(50000);
  });

  it('parses a failed payment message as non-actionable', () => {
    const result = parseSms('Your UPI payment of Rs 300.00 to MERCHANT has failed due to insufficient balance.');
    expect(result.kind).toBe('FAILED');
    expect(result.isActionable).toBeFalse();
  });

  it('ignores promotional messages', () => {
    const result = parseSms('Get 10% cashback on your next UPI transaction! Use code SAVE10. T&C apply.');
    expect(result.kind).toBe('PROMOTIONAL');
    expect(result.isActionable).toBeFalse();
  });

  it('ignores OTP messages', () => {
    const result = parseSms('123456 is your OTP for transaction of Rs 500.00 at MERCHANT. Valid for 10 mins. Do not share.');
    expect(result.kind).toBe('OTP');
    expect(result.isActionable).toBeFalse();
  });

  it('ignores balance-only alerts', () => {
    const result = parseSms('Your available balance as on 12-Oct-2026 is Rs 15,000.00.');
    expect(result.kind).toBe('BALANCE_ALERT');
    expect(result.isActionable).toBeFalse();
  });

  it('does not treat a credit card bill reminder as a transaction', () => {
    const result = parseSms('Your credit card bill of Rs 5,000.00 is due on 15-Oct-2026. Pay now to avoid late fees.');
    expect(result.kind).toBe('CARD_REMINDER');
    expect(result.isActionable).toBeFalse();
  });

  it('handles unknown/unrelated messages safely', () => {
    const result = parseSms('Your package has been shipped and will arrive tomorrow.');
    expect(result.kind).toBe('UNKNOWN');
    expect(result.isActionable).toBeFalse();
    expect(result.amountPaise).toBeUndefined();
  });

  it('produces higher confidence when more fields are extracted', () => {
    const rich = parseSms('Rs. 250.00 debited from your account for UPI payment to ABC Restaurant on 12-Oct-2026. Ref No 123456789012.');
    const sparse = parseSms('Rs. 250.00 debited.');
    expect(rich.confidence).toBeGreaterThan(sparse.confidence);
  });
});
