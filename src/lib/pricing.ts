export interface CurrencyConfig {
  code: string;
  symbol: string;
  unitSystem: 'metric' | 'imperial';
}

export interface TripPriceEstimate {
  d1Km: number;
  d2Km: number;
  totalDistanceKm: number;
  d1DurationMin: number;
  d2DurationMin: number;
  baseFee: number;
  distanceFee: number;
  totalPrice: number;
  currency: CurrencyConfig;
}

// Supported currencies — easily extensible
export const CURRENCIES: Record<string, CurrencyConfig> = {
  DH: { code: 'DH', symbol: 'د.م', unitSystem: 'metric' },
  SAR: { code: 'SAR', symbol: 'ر.س', unitSystem: 'metric' },
  USD: { code: 'USD', symbol: '$', unitSystem: 'imperial' },
  EUR: { code: 'EUR', symbol: '€', unitSystem: 'metric' },
  GBP: { code: 'GBP', symbol: '£', unitSystem: 'imperial' },
  AED: { code: 'AED', symbol: 'د.إ', unitSystem: 'metric' },
  EGP: { code: 'EGP', symbol: 'ج.م', unitSystem: 'metric' },
  TND: { code: 'TND', symbol: 'د.ت', unitSystem: 'metric' },
};

// Default currency
export const DEFAULT_CURRENCY = 'DH';

// Pricing constants
const BASE_FEE = 0;
const RATE_PER_KM = 3;
const MIN_FARE = 3;

// Commission rate (admin takes 5%)
export const COMMISSION_RATE = 0.05;

/** Calculate driver net earnings after commission */
export function driverNetEarnings(totalPrice: number): number {
  return Math.round(totalPrice * (1 - COMMISSION_RATE) * 100) / 100;
}

/** Calculate commission amount */
export function commissionAmount(totalPrice: number): number {
  return Math.round(totalPrice * COMMISSION_RATE * 100) / 100;
}

/**
 * Total_Price = 5 + ((D1 + D2) * 3)
 * D1 = Driver → Customer distance in km
 * D2 = Customer → Destination distance in km
 */
export function calculateTripPrice(
  d1Meters: number,
  d2Meters: number,
  currencyCode: string = DEFAULT_CURRENCY
): TripPriceEstimate {
  const currency = CURRENCIES[currencyCode] || CURRENCIES[DEFAULT_CURRENCY];
  const d1Km = d1Meters / 1000;
  const d2Km = d2Meters / 1000;
  const totalDistanceKm = d1Km + d2Km;
  const distanceFee = totalDistanceKm * RATE_PER_KM;
  const rawPrice = BASE_FEE + distanceFee;
  const totalPrice = Math.max(MIN_FARE, rawPrice);

  return {
    d1Km: Math.round(d1Km * 10) / 10,
    d2Km: Math.round(d2Km * 10) / 10,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    d1DurationMin: 0,
    d2DurationMin: 0,
    baseFee: BASE_FEE,
    distanceFee: Math.round(distanceFee * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    currency,
  };
}

export function formatPrice(amount: number, currency: CurrencyConfig): string {
  return `${amount.toFixed(2)} ${currency.symbol}`;
}
