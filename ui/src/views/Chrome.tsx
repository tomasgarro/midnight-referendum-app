import { BookOpen, Fingerprint, Stamp, UserCircle, X } from '@phosphor-icons/react';
import type { CivicPassportSession } from 'midnight-referendum-api';
import { Button } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { APP_COPY, type Tab } from '@/views/app-runtime';
import './chrome.css';

/**
 * The app shell: a header that names the product and its identity, and the
 * three-tab bar.
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
  const es = locale === 'es';
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
          aria-label={
            passportSession
              ? es
                ? 'Abrir Midnight Passport'
                : 'Open Midnight Passport'
              : es
                ? 'Conectar Midnight Passport'
                : 'Connect Midnight Passport'
          }
        >
          <Fingerprint size={14} weight="bold" />
          <span>{passportSession?.profile?.displayName ?? 'Passport'}</span>
        </button>
        {passportError ? (
          <div className="chrome-popover" role="alert">
            <div className="chrome-popover__head">
              <strong>{es ? 'No se pudo conectar Passport' : 'Passport could not connect'}</strong>
              <button
                type="button"
                className="chrome-popover__close"
                onClick={onDismissPassportError}
                aria-label={es ? 'Cerrar aviso' : 'Dismiss notice'}
              >
                <X size={15} />
              </button>
            </div>
            <p>{passportError}</p>
            <Button variant="link" size="sm" onClick={onConnectPassport}>
              {es ? 'Reintentar' : 'Try again'}
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
  readonly locale: CicoLocale;
}

export function BottomNav({ tab, onChange, locale }: BottomNavProps) {
  const copy = APP_COPY[locale];
  const items = [
    { id: 'explore' as const, label: copy.nav.explore, Icon: BookOpen },
    { id: 'votes' as const, label: copy.nav.votes, Icon: Stamp },
    { id: 'profile' as const, label: copy.nav.profile, Icon: UserCircle },
  ];
  return (
    <nav
      className="chrome-nav"
      aria-label={locale === 'es' ? 'Navegación principal' : 'Primary navigation'}
    >
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
          <Icon size={22} weight={tab === id ? 'fill' : 'regular'} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
