import type { CivicPassportSession } from 'midnight-referendum-api';
import type { CicoLocale } from '@/integration/locale';

/** Only display fields returned by Passport; never infer or fabricate a domain. */
export function passportDisplay(session: CivicPassportSession | null, locale: CicoLocale) {
  const fallback = {
    en: 'Your citizen Passport',
    es: 'Tu Passport ciudadano',
    fr: 'Votre Passport citoyen',
  }[locale];
  if (session?.status !== 'connected') return fallback;
  const night = [session.profile?.alias, session.profile?.displayName]
    .map((value) => value?.trim())
    .find((value) => value && /^[^\s/]+\.night$/i.test(value));
  if (night) return night;
  const address = session.accountAddress?.trim();
  if (address)
    return address.length > 24 ? `${address.slice(0, 12)}…${address.slice(-8)}` : address;
  const name = session.profile?.displayName?.trim();
  if (name === 'Ciudadano demo')
    return { en: 'Demo Passport', es: 'Passport de demo', fr: 'Passport de démo' }[locale];
  return name || fallback;
}

export const PASSPORT_HELP = {
  en: {
    title: 'Help and security',
    hint: 'How Passport works, privacy and identity.',
    night: '.night identity',
    nightHint:
      'Learn about .night names on Midnight Domains. A name does not establish eligibility.',
  },
  es: {
    title: 'Ayuda y seguridad',
    hint: 'Cómo funciona Passport, privacidad e identidad.',
    night: 'Identidad .night',
    nightHint: 'Conocé los nombres .night en Midnight Domains. Un nombre no acredita elegibilidad.',
  },
  fr: {
    title: 'Aide et sécurité',
    hint: 'Fonctionnement de Passport, confidentialité et identité.',
    night: 'Identité .night',
    nightHint:
      'Découvrez les noms .night sur Midnight Domains. Un nom ne prouve pas l’éligibilité.',
  },
} as const;
