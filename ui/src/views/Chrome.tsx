import {
  ClockCounterClockwise,
  Fingerprint,
  GlobeHemisphereWest,
  IdentificationBadge,
  IdentificationCard,
  UserCircle,
  X,
} from '@phosphor-icons/react';
import type { CivicPassportSession } from 'midnight-referendum-api';
import { Button } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { APP_COPY, type Tab } from '@/views/app-runtime';
import './chrome.css';

/** Shell strings that never belonged in inline `locale === 'es'` ternaries. */
const CHROME_COPY = {
  es: {
    openPassport: 'Abrir Midnight Passport',
    connectPassport: 'Conectar Midnight Passport',
    passportFailed: 'No se pudo conectar Passport',
    dismissNotice: 'Cerrar aviso',
    retry: 'Reintentar',
    primaryNav: 'Navegación principal',
    verifyQualifier: 'documento físico',
  },
  en: {
    openPassport: 'Open Midnight Passport',
    connectPassport: 'Connect Midnight Passport',
    passportFailed: 'Passport could not connect',
    dismissNotice: 'Dismiss notice',
    retry: 'Try again',
    primaryNav: 'Primary navigation',
    verifyQualifier: 'physical document',
  },
  fr: {
    openPassport: 'Ouvrir Midnight Passport',
    connectPassport: 'Connecter Midnight Passport',
    passportFailed: 'Passport n’a pas pu se connecter',
    dismissNotice: "Fermer l'avis",
    retry: 'Réessayer',
    primaryNav: 'Navigation principale',
    verifyQualifier: 'document physique',
  },
} as const;

/**
 * The app shell: a header that names the product and its identity, and the
 * four-tab capsule and a separate scan action.
 *
 * These were the last surfaces on the legacy sky-blue palette. With the views
 * rebuilt on indigo, every screen was showing two accent hues at once -- the
 * blue header and nav framing an indigo screen -- which is the first thing the
 * slop pre-flight counts. They read from the tokens now, and the accent
 * appears in exactly one place here: the active tab.
 *
 * The header carries identity and nothing else. The language <select> that
 * used to sit beside it lives in Profile, and the mode strip that sat under it
 * is gone -- readiness now surfaces where it is actionable.
 */

export interface AppHeaderProps {
  readonly passportSession: CivicPassportSession | null;
  readonly passportError: string | null;
  readonly onConnectPassport: () => void;
  readonly onDismissPassportError: () => void;
  readonly locale: CicoLocale;
}

export function AppHeader({
  passportSession,
  passportError,
  onConnectPassport,
  onDismissPassportError,
  locale,
}: AppHeaderProps) {
  const copy = APP_COPY[locale];
  const chrome = CHROME_COPY[locale];
  return (
    <header className="chrome-header">
      <div className="chrome-brand">
        <p className="chrome-brand__name">{copy.brand}</p>
        <p className="chrome-brand__note">{copy.brandNote}</p>
      </div>
      <div className="chrome-identity">
        <button
          type="button"
          className={`chrome-chip ${passportSession ? 'chrome-chip--on' : ''}`.trim()}
          onClick={onConnectPassport}
          aria-label={passportSession ? chrome.openPassport : chrome.connectPassport}
        >
          <Fingerprint size={14} weight="bold" />
          <span>{passportSession?.profile?.displayName ?? 'Passport'}</span>
        </button>
        {passportError ? (
          <div className="chrome-popover" role="alert">
            <div className="chrome-popover__head">
              <strong>{chrome.passportFailed}</strong>
              <button
                type="button"
                className="chrome-popover__close"
                onClick={onDismissPassportError}
                aria-label={chrome.dismissNotice}
              >
                <X size={15} />
              </button>
            </div>
            <p>{passportError}</p>
            <Button variant="link" size="sm" onClick={onConnectPassport}>
              {chrome.retry}
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export interface BottomNavProps {
  readonly tab: Tab;
  readonly onChange: (tab: Tab) => void;
  readonly onVerify: () => void;
  readonly locale: CicoLocale;
}

export function BottomNav({ tab, onChange, onVerify, locale }: BottomNavProps) {
  const copy = APP_COPY[locale];
  const chrome = CHROME_COPY[locale];
  const items = [
    { id: 'discover' as const, label: copy.nav.discover, Icon: GlobeHemisphereWest },
    { id: 'credentials' as const, label: copy.nav.credentials, Icon: IdentificationCard },
    { id: 'activity' as const, label: copy.nav.activity, Icon: ClockCounterClockwise },
    { id: 'passport' as const, label: copy.nav.passport, Icon: UserCircle },
  ];
  const verifyLabel = `${copy.nav.verify} · ${chrome.verifyQualifier}`;
  return (
    <div className="chrome-bar">
      <nav className="chrome-nav" aria-label={chrome.primaryNav}>
        {items.map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            className={`chrome-nav__item ${tab === id ? 'chrome-nav__item--active' : ''}`.trim()}
            onClick={() => onChange(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            {/* Tab switching is met 100+ times a day, so it gets the platform
                default and nothing else: no slide, no icon animation. */}
            <span className="chrome-nav__icon">
              <Icon size={22} weight={tab === id ? 'fill' : 'regular'} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {/*
        Verify sits outside the nav, and carries no visible text label.

        It was the third of five buttons inside the same <nav>, which told a
        screen reader there were five navigation items while only four could
        ever be current. And a labelled raised circle reads as a fifth
        destination styled loudly -- the exact meaning this shell removed.
        Every reference app studied leaves the centre action outside the tab
        group; the name lives in aria-label and the tooltip.
      */}
      <button
        type="button"
        className="chrome-verify"
        onClick={onVerify}
        aria-label={verifyLabel}
        title={verifyLabel}
      >
        <span className="chrome-verify__disc">
          <IdentificationBadge size={26} weight="fill" />
        </span>
        <span className="chrome-verify__name">{copy.nav.verify}</span>
      </button>
    </div>
  );
}
