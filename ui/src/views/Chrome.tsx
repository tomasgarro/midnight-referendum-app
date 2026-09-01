import {
  ChatCircleText,
  ClockCounterClockwise,
  GearSix,
  GlobeHemisphereWest,
  IdentificationCard,
  UserCircle,
  X,
} from '@phosphor-icons/react';
import { MidnightMark, VotingMark } from '@/components/brand/MidnightMark';
import { Button } from '@/components/system';
import { LanguageToggle } from '@/components/system/LanguageToggle';
import type { CicoLocale } from '@/integration/locale';
import { APP_COPY, APP_MODE, type Tab } from '@/views/app-runtime';
import './chrome.css';

/** Shell strings that never belonged in inline `locale === 'es'` ternaries. */
const CHROME_COPY = {
  es: {
    passportFailed: 'No se pudo conectar Passport',
    dismissNotice: 'Cerrar aviso',
    retry: 'Reintentar',
    feedback: 'Abrir feedback',
    language: 'Cambiar idioma',
    settings: 'Abrir ajustes',
    primaryNav: 'Navegación principal',
    verifyQualifier: 'documento físico',
  },
  en: {
    passportFailed: 'Passport could not connect',
    dismissNotice: 'Dismiss notice',
    retry: 'Try again',
    feedback: 'Open feedback',
    language: 'Change language',
    settings: 'Open settings',
    primaryNav: 'Primary navigation',
    verifyQualifier: 'physical document',
  },
  fr: {
    passportFailed: 'Passport n’a pas pu se connecter',
    dismissNotice: "Fermer l'avis",
    retry: 'Réessayer',
    feedback: 'Ouvrir les retours',
    language: 'Changer de langue',
    settings: 'Ouvrir les réglages',
    primaryNav: 'Navigation principale',
    verifyQualifier: 'document physique',
  },
} as const;

/**
 * The app shell: a quiet utility header, the four-tab capsule, and a separate
 * scan action.
 *
 * These were the last surfaces on the legacy sky-blue palette. With the views
 * rebuilt on indigo, every screen was showing two accent hues at once -- the
 * blue header and nav framing an indigo screen -- which is the first thing the
 * slop pre-flight counts. They read from the tokens now, and the accent is
 * reserved for the active state and the small, truthful environment signal.
 *
 * The header keeps the mode truth visible while making feedback, language, and
 * settings available from every dashboard screen. Passport identity belongs
 * in the Passport tab and in the verification journey, not in persistent
 * chrome.
 */

export interface AppHeaderProps {
  readonly passportError: string | null;
  readonly onConnectPassport: () => void;
  readonly onDismissPassportError: () => void;
  readonly onOpenFeedback: () => void;
  readonly onOpenSettings: () => void;
  readonly locale: CicoLocale;
  readonly onLocaleChange: (locale: CicoLocale) => void;
}

export function AppHeader({
  passportError,
  onConnectPassport,
  onDismissPassportError,
  onOpenFeedback,
  onOpenSettings,
  locale,
  onLocaleChange,
}: AppHeaderProps) {
  const chrome = CHROME_COPY[locale];
  const environment =
    APP_MODE === 'showcase'
      ? 'LIVE'
      : APP_MODE === 'preview'
        ? 'PREVIEW'
        : APP_MODE === 'undeployed'
          ? 'LOCAL'
          : 'DEMO';
  return (
    <header className="chrome-header">
      <div className="chrome-header__identity">
        <MidnightMark className="chrome-mark" title="midnight.vote" size={44} />
        <span className={`chrome-environment chrome-environment--${APP_MODE}`}>
          <span className="chrome-environment__dot" aria-hidden="true" />
          {environment}
        </span>
      </div>
      <div className="chrome-actions">
        <button
          type="button"
          className="chrome-utility"
          onClick={onOpenFeedback}
          aria-label={chrome.feedback}
          title={chrome.feedback}
        >
          <ChatCircleText size={19} weight="regular" />
        </button>
        <LanguageToggle locale={locale} onChange={onLocaleChange} label={chrome.language} compact />
        <button
          type="button"
          className="chrome-settings"
          onClick={onOpenSettings}
          aria-label={chrome.settings}
          title={chrome.settings}
        >
          <GearSix size={20} weight="regular" />
        </button>
      </div>
      {passportError ? (
        <div className="chrome-popover chrome-popover--header" role="alert">
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
            aria-label={label}
            title={label}
          >
            {/* Tab switching is met 100+ times a day, so it gets the platform
                default and nothing else: no slide, no icon animation. */}
            <span className="chrome-nav__icon">
              <Icon size={22} weight={tab === id ? 'fill' : 'regular'} />
            </span>
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
          <VotingMark className="chrome-verify__mark" size={44} />
        </span>
      </button>
    </div>
  );
}
