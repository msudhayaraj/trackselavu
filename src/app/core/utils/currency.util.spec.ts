import { formatPaiseAsInr, parseAmountToPaise, paiseToRupees, rupeesToPaise } from './currency.util';

describe('currency.util', () => {
  it('converts rupees to paise without floating point drift', () => {
    expect(rupeesToPaise(125.5)).toBe(12550);
    expect(rupeesToPaise(0.1)).toBe(10);
    expect(rupeesToPaise(19.99)).toBe(1999);
  });

  it('converts paise back to rupees', () => {
    expect(paiseToRupees(12550)).toBeCloseTo(125.5, 5);
  });

  it('formats paise using the Indian numbering system', () => {
    expect(formatPaiseAsInr(2500000)).toContain('25,000.00');
    expect(formatPaiseAsInr(125000000)).toContain('12,50,000.00');
  });

  it('parses a valid amount string into integer paise', () => {
    expect(parseAmountToPaise('125.50')).toBe(12550);
    expect(parseAmountToPaise('₹1,250')).toBe(125000);
  });

  it('rejects zero and negative amounts', () => {
    expect(() => parseAmountToPaise('0')).toThrowError();
    expect(() => parseAmountToPaise('-5')).toThrowError();
  });

  it('rejects non-numeric input', () => {
    expect(() => parseAmountToPaise('abc')).toThrowError();
  });
});
