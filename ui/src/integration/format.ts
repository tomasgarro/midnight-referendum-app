import type { CicoLocale } from '@/integration/locale';

/**
 * One place that turns an ISO instant into something a person reads.
 *
 * Screens were each calling `toLocaleString` with their own hand-written BCP-47
 * tag, which drifted, and several printed `poll.deadline` instead -- a
 * pre-rendered string that is French on the French fixture whatever the reader
 * chose. Formatting from the machine-readable `closesAt` is the only way the
 * date follows the language.
 */
const INTL_TAG: Record<CicoLocale, string> = {
  es: 'es-AR',
  en: 'en-GB',
  fr: 'fr-FR',
};

function parse(iso: string): Date | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** Day and month, for a deadline. Returns null rather than "Invalid Date". */
export function formatDate(iso: string, locale: CicoLocale): string | null {
  const date = parse(iso);
  if (!date) return null;
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Day and time, for something that happened at a moment. */
export function formatDateTime(iso: string, locale: CicoLocale): string | null {
  const date = parse(iso);
  if (!date) return null;
  return new Intl.DateTimeFormat(INTL_TAG[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
