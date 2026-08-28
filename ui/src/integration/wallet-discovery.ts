import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export interface WalletCandidate {
  /** The injected connector instance; never serialize this into app state. */
  wallet: InitialAPI;
  /** Stable enough for React rendering within one discovery snapshot. */
  id: string;
  /** Text-only, bounded display name from an untrusted connector. */
  name: string;
  rdns: string;
  apiVersion: string;
  /** Only image URLs safe to put in an img src are returned. */
  icon: string | null;
  /** Multiple connectors claimed the same RDNS in this snapshot. */
  duplicateRdns: boolean;
}

export type WalletBrand = 'lace' | '1am' | 'gero' | 'unknown';

const BRAND_RANK: Record<WalletBrand, number> = {
  lace: 0,
  '1am': 1,
  gero: 2,
  unknown: 3,
};

/**
 * Return the connector instances injected by Midnight wallets.
 *
 * A wallet may expose more than one connector instance, and the injection key
 * is not a stable wallet identifier. Selection therefore uses the connector's
 * own RDNS metadata rather than guessing a property name such as `mnLace`.
 */
export function discoverWallets(source?: Window): InitialAPI[] {
  const currentWindow = source ?? (typeof window === 'undefined' ? undefined : window);
  if (!currentWindow?.midnight) return [];
  return Object.values(currentWindow.midnight).filter(isInitialApi);
}

/**
 * Discover only the connector versions this app can actually use and prepare
 * untrusted metadata for a wallet picker. A picker is important when several
 * extensions are installed: silently taking the first injection violates the
 * DApp Connector's user-choice and spoof-warning guidance.
 */
export function discoverCompatibleWallets(source?: Window, expectedMajor = 4): WalletCandidate[] {
  const wallets = discoverWallets(source).filter((wallet) =>
    isCompatibleWalletApi(wallet, expectedMajor),
  );
  const rdnsCounts = new Map<string, number>();
  for (const wallet of wallets) {
    const rdns = wallet.rdns.trim().toLowerCase();
    rdnsCounts.set(rdns, (rdnsCounts.get(rdns) ?? 0) + 1);
  }

  const candidates = wallets.map((wallet, index) => {
    const rdns = wallet.rdns.trim();
    return {
      wallet,
      id: `${rdns.toLowerCase() || 'unknown'}-${index}`,
      name: sanitizeWalletName(wallet.name),
      rdns,
      apiVersion: wallet.apiVersion,
      icon: sanitizeWalletIcon(wallet.icon),
      duplicateRdns: (rdnsCounts.get(rdns.toLowerCase()) ?? 0) > 1,
    };
  });

  return candidates.sort((left, right) => {
    const brandDifference = walletBrandRank(left) - walletBrandRank(right);
    if (brandDifference !== 0) return brandDifference;
    const nameDifference = left.name.localeCompare(right.name, undefined, {
      sensitivity: 'base',
    });
    if (nameDifference !== 0) return nameDifference;
    return left.rdns.localeCompare(right.rdns, undefined, { sensitivity: 'base' });
  });
}

/**
 * This is a display/order hint only. It never turns an unknown connector into
 * a vendor integration and it never changes the connector selected for a
 * request. Exact names are the only currently known public signal; a future
 * deployment can add verified RDNS mappings without changing the picker API.
 */
export function walletBrand(candidate: Pick<WalletCandidate, 'name'>): WalletBrand {
  const normalized = candidate.name.trim().toLowerCase();
  if (normalized === 'lace') return 'lace';
  if (normalized === '1am') return '1am';
  if (normalized === 'gero') return 'gero';
  return 'unknown';
}

export function walletBrandRank(candidate: Pick<WalletCandidate, 'name'>): number {
  return BRAND_RANK[walletBrand(candidate)];
}

export function sanitizeWalletName(value: string): string {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  return (normalized || 'Unknown Midnight wallet').slice(0, 64);
}

/**
 * Connector icons are attacker-controlled metadata. Restrict them to HTTPS
 * or base64 raster data URLs; React still renders them only through <img>.
 */
export function sanitizeWalletIcon(value: string): string | null {
  const icon = value.trim();
  if (/^https:\/\//iu.test(icon)) return icon;
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/iu.test(icon)) {
    return icon;
  }
  return null;
}

function isInitialApi(value: unknown): value is InitialAPI {
  if (!value || typeof value !== 'object') return false;
  const wallet = value as Record<string, unknown>;
  return (
    typeof wallet.connect === 'function' &&
    typeof wallet.rdns === 'string' &&
    typeof wallet.name === 'string' &&
    typeof wallet.icon === 'string' &&
    typeof wallet.apiVersion === 'string'
  );
}

/**
 * Parse an optional, public configuration value used to prefer a wallet.
 * Vendors should confirm their RDNS before it is added to a deployment.
 */
export function parsePreferredWalletRdns(value: string | undefined): string[] {
  const parsed = (value ?? '')
    .split(',')
    .map((rdns) => rdns.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(parsed)];
}

/**
 * The compatibility matrix pins the DApp Connector API to major version 4.
 * Keep this check at discovery time so an older injected API cannot be chosen
 * and fail later with an opaque missing-method error.
 */
export function isCompatibleWalletApi(wallet: InitialAPI, expectedMajor = 4): boolean {
  const match =
    /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.exec(
      wallet.apiVersion.trim(),
    );
  return match !== null && Number(match.groups?.major) === expectedMajor;
}

/**
 * Choose a connector without coupling the app to a wallet vendor. An empty
 * preference list preserves injection order, which keeps the local fallback
 * simple and deterministic.
 */
export function selectWallet(
  wallets: readonly InitialAPI[],
  preferredRdns: readonly string[] = [],
): InitialAPI | undefined {
  if (wallets.length === 0) return undefined;
  if (preferredRdns.length === 0) return wallets[0];

  const preference = new Map(
    preferredRdns.map((rdns, index) => [rdns.trim().toLowerCase(), index]),
  );
  return wallets.reduce(
    (selected, candidate) => {
      if (!selected) return candidate;
      const selectedRank = preference.get(selected.rdns.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const candidateRank = preference.get(candidate.rdns.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      return candidateRank < selectedRank ? candidate : selected;
    },
    undefined as InitialAPI | undefined,
  );
}
