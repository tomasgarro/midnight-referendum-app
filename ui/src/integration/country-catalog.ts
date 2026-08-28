import { iso31661 } from 'iso-3166';

export interface AssignedCountry {
  alpha2: string;
  alpha3: string;
  numeric: string;
  name: string;
}

const displayNames = new Map<string, Intl.DisplayNames>();

function getDisplayNames(locale: string): Intl.DisplayNames | null {
  if (typeof Intl === 'undefined' || !('DisplayNames' in Intl)) return null;
  const key = locale.toLowerCase();
  const existing = displayNames.get(key);
  if (existing) return existing;
  const created = new Intl.DisplayNames([locale], { type: 'region' });
  displayNames.set(key, created);
  return created;
}

export const ASSIGNED_COUNTRIES: readonly AssignedCountry[] = iso31661
  .map((entry) => ({
    alpha2: entry.alpha2,
    alpha3: entry.alpha3,
    numeric: entry.numeric,
    name: entry.name,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export function findAssignedCountry(code: string | null | undefined): AssignedCountry | undefined {
  const normalized = code?.trim().toUpperCase();
  return normalized
    ? ASSIGNED_COUNTRIES.find(
        (country) => country.alpha2 === normalized || country.numeric === normalized,
      )
    : undefined;
}

export function countryName(code: string | null | undefined, locale: string = 'en'): string {
  const country = findAssignedCountry(code);
  if (!country) return code ?? 'Unknown country';
  try {
    return getDisplayNames(locale)?.of(country.alpha2) ?? country.name;
  } catch {
    return country.name;
  }
}

export function countryLabel(country: AssignedCountry, locale: string = 'en'): string {
  return `${countryName(country.alpha2, locale)} (${country.alpha2})`;
}
