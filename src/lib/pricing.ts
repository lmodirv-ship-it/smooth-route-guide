export interface PricingConfig {
  baseFee: number;
  ratePerKm: number;
  ratePerMile: number;
  currency: string;
  currencySymbol: string;
  unitSystem: 'metric' | 'imperial';
}

export interface PriceEstimate {
  baseFee: number;
  distanceFee: number;
  total: number;
  distanceText: string;
  durationText: string;
  currency: string;
  currencySymbol: string;
}

// Regional pricing configs
export const PRICING_CONFIGS: Record<string, PricingConfig> = {
  SAR: {
    baseFee: 5,
    ratePerKm: 2.5,
    ratePerMile: 4.0,
    currency: 'SAR',
    currencySymbol: 'ر.س',
    unitSystem: 'metric',
  },
  USD: {
    baseFee: 3,
    ratePerKm: 1.5,
    ratePerMile: 2.4,
    currency: 'USD',
    currencySymbol: '$',
    unitSystem: 'imperial',
  },
  EUR: {
    baseFee: 3.5,
    ratePerKm: 1.8,
    ratePerMile: 2.9,
    currency: 'EUR',
    currencySymbol: '€',
    unitSystem: 'metric',
  },
};

export function calculatePrice(
  distanceMeters: number,
  config: PricingConfig
): { baseFee: number; distanceFee: number; total: number } {
  const distanceKm = distanceMeters / 1000;
  const distanceMiles = distanceMeters / 1609.34;

  const distanceFee =
    config.unitSystem === 'metric'
      ? distanceKm * config.ratePerKm
      : distanceMiles * config.ratePerMile;

  const total = config.baseFee + distanceFee;

  return {
    baseFee: Math.round(config.baseFee * 100) / 100,
    distanceFee: Math.round(distanceFee * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function formatPrice(amount: number, config: PricingConfig): string {
  return `${amount.toFixed(2)} ${config.currencySymbol}`;
}

export function formatDistance(meters: number, unitSystem: 'metric' | 'imperial'): string {
  if (unitSystem === 'metric') {
    return `${(meters / 1000).toFixed(1)} كم`;
  }
  return `${(meters / 1609.34).toFixed(1)} mi`;
}
