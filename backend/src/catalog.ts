export const REFERRAL_TIERS = [
  { level: 1, rate: '3.0', maxDays: 3 },
  { level: 2, rate: '2.0', maxDays: 3 },
  { level: 3, rate: '0.8', maxDays: 5 }
] as const;

export const MIN_PAYOUT = '20.00';
export const PROCESSING_WINDOW = '12–18 hours';
export const NETWORK = 'BEP20';
export const TOKEN = 'USDT';

export const TURBINE_PLANS = [
  {
    name: 'Coral Stream Turbine',
    tier: 'Tier 1',
    minDeposit: '20.00',
    maxDeposit: '49.99',
    dailyRoi: '0.85',
    durationDays: 27,
    payoutFee: '10.00',
    speedRpm: 90,
    description: 'Entry-level ocean surface tidal kinetic turbine. Accessible minimum with dependable daily yield.'
  },
  {
    name: 'Deep Current Turbine',
    tier: 'Tier 2',
    minDeposit: '50.00',
    maxDeposit: '99.99',
    dailyRoi: '1.30',
    durationDays: 23,
    payoutFee: '6.00',
    speedRpm: 130,
    description: 'Sub-surface oceanic current turbine harnessing persistent deep-water flow.'
  },
  {
    name: 'Ocean Pulse Turbine',
    tier: 'Tier 3',
    minDeposit: '100.00',
    maxDeposit: '299.99',
    dailyRoi: '1.70',
    durationDays: 21,
    payoutFee: '4.00',
    speedRpm: 175,
    description: 'High-yield oceanic wave surge converter engineered for kinetic amplitude capture.'
  },
  {
    name: 'Abyss Flow Turbine',
    tier: 'Tier 4',
    minDeposit: '300.00',
    maxDeposit: '499.99',
    dailyRoi: '2.30',
    durationDays: 35,
    payoutFee: '0.00',
    speedRpm: 220,
    description: 'Deep-abyss hydrodynamic generator with zero payout fee privilege.'
  },
  {
    name: 'Titan Current Turbine',
    tier: 'Tier 5',
    minDeposit: '500.00',
    maxDeposit: '1000000.00',
    dailyRoi: '3.50',
    durationDays: 48,
    payoutFee: '0.00',
    speedRpm: 280,
    description: 'Industrial ocean-floor thermal-hydro station. Elite yield and zero payout fee. Duration is exactly 48 days.'
  }
] as const;

export const ACTIVE_PAYOUT_STATUSES = ['SUBMITTED', 'PENDING_REVIEW', 'PROCESSING', 'SENT'] as const;
