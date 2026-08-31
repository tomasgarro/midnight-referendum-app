import {
  ArrowUpRight,
  Check,
  Copy,
  Fingerprint,
  LockKey,
  Palette,
  SealCheck,
  Translate,
  Trash,
  Wallet as WalletIcon,
} from '@phosphor-icons/react';
import type { CivicPassportSession } from 'midnight-referendum-api';
import { useState } from 'react';
import { Button, Card, Display, Eyebrow } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import type { ThemePreference } from '@/integration/theme';
import { networkLabel } from '@/views/app-runtime';
import './profile-view.css';

const COPY = {
  es: {
    fallbackName: 'Tu Passport ciudadano',
    stateConnected: 'Midnight Passport conectado',
    statePending: 'Midnight Passport sin conectar',
    lead: 'Tu cuenta para esta experiencia Preview. La elegibilidad y los comprobantes viven en secciones separadas.',
    connect: 'Conectar Midnight Passport',
    account: 'Cuenta Midnight Passport',
    address: 'Dirección Preview',
    unavailable: 'Passport no devolvió una dirección',
    copyAddress: 'Copiar dirección',
    network: 'Red',
    passportStatus: 'Estado',
    connected: 'Conectado',
    wallet: 'Wallet de desarrollo',
    walletConnected: 'Conectada',
    preferences: 'Preferencias',
    language: 'Idioma',
    theme: 'Apariencia',
    themeSystem: 'Según el dispositivo',
    themeLight: 'Crema',
    themeDark: 'Oscuro',
    help: 'Ayuda y seguridad',
    review: 'Revisar cómo funciona',
    reviewHint: 'Passport, documento físico y pase de elegibilidad, paso a paso.',
    domains: 'Identidad .night',
    domainsHint: 'Función externa de Midnight; no cambia tu elegibilidad.',
    session: 'Sesión en este dispositivo',
    lock: 'Bloquear y conservar datos',
    lockHint: 'Cierra la sesión; conserva pases y comprobantes cifrados localmente.',
    remove: 'Eliminar datos locales',
    removeHint:
      'Borra de este navegador el pase y los comprobantes. No elimina tu cuenta Passport.',
    removeConfirm: 'Confirmar eliminación local',
    cancel: 'Cancelar',
  },
  en: {
    fallbackName: 'Your citizen Passport',
    stateConnected: 'Midnight Passport connected',
    statePending: 'Midnight Passport not connected',
    lead: 'Your account for this Preview experience. Eligibility and receipts live in separate sections.',
    connect: 'Connect Midnight Passport',
    account: 'Midnight Passport account',
    address: 'Preview address',
    unavailable: 'Passport did not return an address',
    copyAddress: 'Copy address',
    network: 'Network',
    passportStatus: 'Status',
    connected: 'Connected',
    wallet: 'Developer wallet',
    walletConnected: 'Connected',
    preferences: 'Preferences',
    language: 'Language',
    theme: 'Appearance',
    themeSystem: 'Match device',
    themeLight: 'Cream',
    themeDark: 'Dark',
    help: 'Help and security',
    review: 'Review how it works',
    reviewHint: 'Passport, physical document, and eligibility pass, step by step.',
    domains: '.night identity',
    domainsHint: 'An external Midnight feature; it does not change eligibility.',
    session: 'Session on this device',
    lock: 'Lock and keep data',
    lockHint: 'Ends the session while keeping locally encrypted passes and receipts.',
    remove: 'Remove local data',
    removeHint:
      'Deletes the pass and receipts from this browser. It does not delete your Passport account.',
    removeConfirm: 'Confirm local deletion',
    cancel: 'Cancel',
  },
} as const;

export interface ProfileViewProps {
  readonly passportSession: CivicPassportSession | null;
  readonly profileId: string;
  readonly walletStatus: string;
  readonly onConnectPassport: () => void;
  readonly onReplayOnboarding: () => void;
  readonly onLockAndDisconnect: () => void;
  readonly onRemoveLocalData: () => Promise<void>;
  readonly locale: CicoLocale;
  readonly onLocaleChange: (locale: CicoLocale) => void;
  readonly theme: ThemePreference;
  readonly onThemeChange: (theme: ThemePreference) => void;
}

export function ProfileView({
  passportSession,
  profileId,
  walletStatus,
  onConnectPassport,
  onReplayOnboarding,
  onLockAndDisconnect,
  onRemoveLocalData,
  locale,
  onLocaleChange,
  theme,
  onThemeChange,
}: ProfileViewProps) {
  const copy = COPY[locale];
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const address = passportSession?.accountAddress ?? null;
  const displayId = address ?? (passportSession ? profileId : copy.unavailable);

  const copyIdentifier = async () => {
    if (!passportSession) return;
    await navigator.clipboard.writeText(displayId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="profile">
      <header className="profile__head">
        <div className="profile__identity">
          <span className="profile__avatar" aria-hidden="true">
            <Fingerprint size={26} weight="bold" />
          </span>
          <div className="profile__identity-copy">
            <Display>{passportSession?.profile?.displayName ?? copy.fallbackName}</Display>
            <span className="profile__state" data-on={Boolean(passportSession)}>
              <SealCheck size={14} weight="bold" />
              {passportSession ? copy.stateConnected : copy.statePending}
            </span>
          </div>
        </div>
        <p className="profile__lead">{copy.lead}</p>
        {!passportSession ? <Button onClick={onConnectPassport}>{copy.connect}</Button> : null}
      </header>

      <section className="profile__section" aria-labelledby="passport-account-title">
        <Eyebrow>{copy.account}</Eyebrow>
        <h2 className="sr-only" id="passport-account-title">
          {copy.account}
        </h2>
        <Card className="profile__account">
          <div className="profile__account-row">
            <span>{copy.address}</span>
            <button type="button" onClick={() => void copyIdentifier()} disabled={!passportSession}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="sr-only">{copy.copyAddress}</span>
            </button>
          </div>
          <code>{displayId}</code>
          <dl>
            <div>
              <dt>{copy.network}</dt>
              <dd>{networkLabel(locale)}</dd>
            </div>
            <div>
              <dt>{copy.passportStatus}</dt>
              <dd>{passportSession ? copy.connected : '—'}</dd>
            </div>
            {walletStatus === 'connected' ? (
              <div>
                <dt>{copy.wallet}</dt>
                <dd>{copy.walletConnected}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </section>

      <section className="profile__section">
        <Eyebrow>{copy.preferences}</Eyebrow>
        <Card className="profile__rows" flush>
          <div className="profile__row">
            <label className="profile__row-label" htmlFor="profile-language">
              <Translate size={18} aria-hidden="true" /> {copy.language}
            </label>
            <select
              id="profile-language"
              className="profile__select"
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as CicoLocale)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="profile__row">
            <label className="profile__row-label" htmlFor="profile-theme">
              <Palette size={18} aria-hidden="true" /> {copy.theme}
            </label>
            <select
              id="profile-theme"
              className="profile__select"
              value={theme}
              onChange={(event) => onThemeChange(event.target.value as ThemePreference)}
            >
              <option value="system">{copy.themeSystem}</option>
              <option value="light">{copy.themeLight}</option>
              <option value="dark">{copy.themeDark}</option>
            </select>
          </div>
        </Card>
      </section>

      <section className="profile__section">
        <Eyebrow>{copy.help}</Eyebrow>
        <Card className="profile__rows" flush>
          <button
            type="button"
            className="profile__row profile__row--action"
            onClick={onReplayOnboarding}
          >
            <Fingerprint size={18} aria-hidden="true" />
            <span>
              <strong>{copy.review}</strong>
              <small>{copy.reviewHint}</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
          <a
            className="profile__row profile__row--action"
            href="https://midnight.domains/"
            target="_blank"
            rel="noreferrer"
          >
            <WalletIcon size={18} aria-hidden="true" />
            <span>
              <strong>{copy.domains}</strong>
              <small>{copy.domainsHint}</small>
            </span>
            <ArrowUpRight size={17} />
          </a>
        </Card>
      </section>

      <section className="profile__section">
        <Eyebrow>{copy.session}</Eyebrow>
        <Card className="profile__rows" flush>
          <button
            type="button"
            className="profile__row profile__row--action"
            onClick={onLockAndDisconnect}
            disabled={!passportSession}
          >
            <LockKey size={18} aria-hidden="true" />
            <span>
              <strong>{copy.lock}</strong>
              <small>{copy.lockHint}</small>
            </span>
          </button>
          {!confirmRemove ? (
            <button
              type="button"
              className="profile__row profile__row--action profile__row--danger"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash size={18} aria-hidden="true" />
              <span>
                <strong>{copy.remove}</strong>
                <small>{copy.removeHint}</small>
              </span>
            </button>
          ) : (
            <div className="profile__remove-confirm" role="alert">
              <p>{copy.removeHint}</p>
              <div>
                <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(false)}>
                  {copy.cancel}
                </Button>
                <Button variant="danger" size="sm" onClick={() => void onRemoveLocalData()}>
                  {copy.removeConfirm}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}
