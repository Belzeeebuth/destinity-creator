/** Placeholder affiché partout où une donnée n'a pas pu être vérifiée. */
export const NA = 'n/d';

const usd = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdPrecise = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const decimal = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatPrice(value: number | null): string {
  if (value === null) return NA;
  return value < 1 ? usdPrecise.format(value) : usd.format(value);
}

/** Prix compact pour les graduations d'axe : pas de décimales inutiles. */
export function formatPriceTick(value: number): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} $`;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return NA;
  return decimal.format(value);
}

/** 1 000 000 → « 1 M », 262 144 → « 262 k ». */
export function formatTokens(value: number | null): string {
  if (value === null) return NA;
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)} M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)} k`;
  return String(value);
}

export function formatDate(iso: string | null): string {
  if (!iso) return NA;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return NA;
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Extrait le domaine d'une URL pour l'afficher comme libellé de lien. */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
