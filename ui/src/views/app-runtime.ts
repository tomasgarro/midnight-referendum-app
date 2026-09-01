/*
 * App-level runtime facts: which mode the build is in, what the network is
 * called in each locale, and the shell copy the chrome needs.
 *
 * Extracted from App.tsx unchanged so views can read them without importing
 * the app itself.
 */
import { resolveAppMode } from '@/integration/app-mode';
import type { CicoLocale } from '@/integration/locale';

export type Tab = 'discover' | 'credentials' | 'activity' | 'passport';
/**
 * `verify` and `eligible` are gone. Nothing ever set them: `startVote` sends a
 * credentialled user straight to `choose` and everyone else into the Passport
 * journey, so the two screens they named were unreachable -- which is why the
 * vote flow opened on "Paso 3 de 3", a progress counter that started at the
 * end.
 */
export type FlowStage = 'choose' | 'review' | 'processing' | 'receipt';

/** The active app keeps the same language across identity, jury, and receipt surfaces. */
export const APP_COPY = {
  es: {
    brand: 'referendum.earth',
    brandNote: 'Privacidad con Midnight',
    language: 'Idioma',
    nav: {
      discover: 'Descubrir',
      credentials: 'Credenciales',
      verify: 'Verificar',
      activity: 'Actividad',
      passport: 'Passport',
    },
    network: { undeployed: 'Local no desplegado', preview: 'Preview', demo: 'Demo local' },
  },
  en: {
    brand: 'referendum.earth',
    brandNote: 'Privacy powered by Midnight',
    language: 'Language',
    nav: {
      discover: 'Discover',
      credentials: 'Credentials',
      verify: 'Verify',
      activity: 'Activity',
      passport: 'Passport',
    },
    network: { undeployed: 'Undeployed local', preview: 'Preview', demo: 'Local demo' },
  },
  fr: {
    brand: 'referendum.earth',
    brandNote: 'Confidentialité assurée par Midnight',
    language: 'Langue',
    nav: {
      discover: 'Découvrir',
      credentials: 'Justificatifs',
      verify: 'Vérifier',
      activity: 'Activité',
      passport: 'Passport',
    },
    network: { undeployed: 'Local non déployé', preview: 'Preview', demo: 'Démo locale' },
  },
} as const;

export const APP_MODE = resolveAppMode(import.meta.env.MODE, import.meta.env.VITE_APP_MODE);
// Demo/showcase are presentation boundaries. Undeployed and Preview both use
// the real v2 catalog and fail closed when it is missing or invalid.
export const CHAIN_RUNTIME_ENABLED = APP_MODE === 'preview' || APP_MODE === 'undeployed';
export const APP_NETWORK_LABEL =
  APP_MODE === 'undeployed'
    ? 'Undeployed local'
    : APP_MODE === 'preview'
      ? 'Preview'
      : 'Demo local';
export function networkLabel(locale: CicoLocale): string {
  return APP_MODE === 'undeployed'
    ? APP_COPY[locale].network.undeployed
    : APP_MODE === 'preview'
      ? APP_COPY[locale].network.preview
      : APP_COPY[locale].network.demo;
}
export const PASSPORT_ORIGIN =
  import.meta.env.VITE_PASSPORT_ORIGIN?.trim() || 'https://midnightpassport.com';
export const ONBOARDING_SESSION_KEY = 'cico-wave1-onboarding-complete';

export function shouldShowFirstRunOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(ONBOARDING_SESSION_KEY) !== '1';
}
