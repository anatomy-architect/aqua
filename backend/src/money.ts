import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Decimal.Value;

export function D(value: MoneyInput | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(value);
}

/** Canonical 2-decimal store string used by SQLite / JSON. */
export function money(value: MoneyInput): string {
  return D(value).toFixed(2);
}

export function dailyEarnings(amount: MoneyInput, dailyRoiPercent: MoneyInput): Decimal {
  return D(amount).mul(D(dailyRoiPercent).div(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function cycleProfit(amount: MoneyInput, dailyRoiPercent: MoneyInput, durationDays: number): Decimal {
  return dailyEarnings(amount, dailyRoiPercent).mul(durationDays).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function payoutFeeAmount(amount: MoneyInput, feePercent: MoneyInput): Decimal {
  return D(amount).mul(D(feePercent).div(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function assertNonNegative(value: MoneyInput, label: string): Decimal {
  const n = D(value);
  if (n.isNegative()) {
    throw new Error(`Financial invariant: ${label} cannot be negative`);
  }
  return n;
}
