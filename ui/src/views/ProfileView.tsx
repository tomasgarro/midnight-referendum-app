import { ArrowUpRight } from '@phosphor-icons/react';
import type { CivicPassportSession } from 'midnight-referendum-api';
import {
  Button,
  Callout,
  Card,
  Display,
  EmptyState,
  Eyebrow,
  StatGroup,
  StatRow,
} from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { networkLabel } from '@/views/app-runtime';
import { CopyReceiptButton } from '@/views/CopyReceiptButton';
import { localizePoll, type Poll, type VoteReceipt } from '@/views/poll-model';
import { ReceiptVerifier } from '@/views/ReceiptVerifier';
import './profile-view.css';

/**
 * Your identity, your receipts, and the app's settings.
 *
 * This was five cards, each with an eyebrow, an h2, a Phosphor icon and a
 * paragraph, to carry what is really a settings list: three facts about the
 * profile, two links, and a list of receipts. It is now the pattern every
 * settings screen in the reference set uses -- an uppercase group label on the
 * ground, then a run of rows -- which is the same information in roughly a
 * third of the height.
 *
 * The language <select> moved here from the app header. A control used once,
 * if ever, does not belong in chrome that is on screen for every second of
 * every session; the header now carries identity and nothing else.
 *
 * The .night domains card was an icon, an eyebrow, an h2, a paragraph, a link
 * and a small print line for something that is not built yet. It is one row
 * that says so.
 */

const COPY = {
  es: {
    eyebrow: 'Mi identidad',
    fallbackName: 'Tu espacio ciudadano',
    lead: 'Tus comprobantes viven acá. Tu identidad Passport nunca se convierte en tu voto.',
    connect: 'Conectar Passport',
    profile: 'Tu perfil',
    identifier: 'Identificador',
    passport: 'Passport',
    connected: 'conectado',
    pendingM: 'pendiente',
    wallet: 'Wallet',
    walletConnected: 'conectada',
    walletPending: 'no conectada',
    identifierNote:
      'El identificador es solo de presentación. No participa en la elegibilidad, ni en el compromiso, ni en la marca anónima.',
    preferences: 'Preferencias',
    language: 'Idioma',
    help: 'Ayuda',
    review: 'Revisar el recorrido',
    reviewHint: 'Volvé a la explicación de Passport sin cambiar tu identidad.',
    domains: 'Identidad .night',
    domainsHint: 'Registrar un alias requiere wallet y DUST; todavía no se hace acá.',
    receipts: 'Mis comprobantes',
    privacy:
      'Estos comprobantes se guardan cifrados solo en este dispositivo; la red nunca puede vincularlos con vos.',
    empty: 'Todavía no tenés comprobantes en este navegador.',
    consultation: 'Consulta ciudadana',
    confirmedOn: 'Confirmado en',
    simulatedOn: 'Simulado en',
  },
  en: {
    eyebrow: 'My identity',
    fallbackName: 'Your civic space',
    lead: 'Your receipts live here. Your Passport identity never becomes your vote.',
    connect: 'Connect Passport',
    profile: 'Your profile',
    identifier: 'Identifier',
    passport: 'Passport',
    connected: 'connected',
    pendingM: 'pending',
    wallet: 'Wallet',
    walletConnected: 'connected',
    walletPending: 'not connected',
    identifierNote:
      'The identifier is for presentation only. It is not part of eligibility, the commitment, or the anonymous marker.',
    preferences: 'Preferences',
    language: 'Language',
    help: 'Help',
    review: 'Review the journey',
    reviewHint: 'Revisit the Passport explanation without changing your identity.',
    domains: '.night identity',
    domainsHint: 'Registering an alias needs a wallet and DUST; it does not happen here yet.',
    receipts: 'My receipts',
    privacy:
      'These receipts are stored encrypted on this device only; the network can never link them to you.',
    empty: 'You have no receipts in this browser yet.',
    consultation: 'Civic consultation',
    confirmedOn: 'Confirmed on',
    simulatedOn: 'Simulated on',
  },
} as const;

export interface ProfileViewProps {
  readonly polls: readonly Poll[];
  readonly passportSession: CivicPassportSession | null;
  readonly profileId: string;
  readonly receipts: readonly VoteReceipt[];
  readonly walletStatus: string;
  readonly onConnectPassport: () => void;
  readonly onReplayOnboarding: () => void;
  readonly locale: CicoLocale;
  readonly onLocaleChange: (locale: CicoLocale) => void;
}

export function ProfileView({
  polls,
  passportSession,
  profileId,
  receipts,
  walletStatus,
  onConnectPassport,
  onReplayOnboarding,
  locale,
  onLocaleChange,
}: ProfileViewProps) {
  const copy = COPY[locale];

  const receiptTitle = (receipt: VoteReceipt): string => {
    if (!receipt.pollId) return copy.consultation;
    const found = polls.find((poll) => poll.id === receipt.pollId);
    return found ? localizePoll(found, locale).title : copy.consultation;
  };

  return (
    <main className="profile">
      <header className="profile__head">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Display>{passportSession?.profile?.displayName ?? copy.fallbackName}</Display>
        <p className="profile__lead">{copy.lead}</p>
        {passportSession ? null : (
          <Button variant="secondary" onClick={onConnectPassport}>
            {copy.connect}
          </Button>
        )}
      </header>

      <Card>
        <StatGroup label={copy.profile}>
          <StatRow
            label={copy.identifier}
            value={<code className="profile__code">{profileId}</code>}
          />
          <StatRow label={copy.passport} value={passportSession ? copy.connected : copy.pendingM} />
          <StatRow
            label={copy.wallet}
            value={walletStatus === 'connected' ? copy.walletConnected : copy.walletPending}
          />
        </StatGroup>
      </Card>
      <Callout>{copy.identifierNote}</Callout>

      <section className="profile__section">
        <Eyebrow>{copy.preferences}</Eyebrow>
        <Card className="profile__rows" flush>
          <div className="profile__row">
            <label className="profile__row-label" htmlFor="profile-language">
              {copy.language}
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
            <span>
              <strong>{copy.domains}</strong>
              <small>{copy.domainsHint}</small>
            </span>
            <ArrowUpRight size={17} />
          </a>
        </Card>
      </section>

      <section className="profile__section" aria-labelledby="profile-history-title">
        <Eyebrow>{`${copy.receipts} · ${networkLabel(locale)}`}</Eyebrow>
        <h2 className="sr-only" id="profile-history-title">
          {copy.receipts}
        </h2>
        <p className="profile__hint">{copy.privacy}</p>
        {receipts.length ? (
          <ul className="profile__receipts">
            {receipts.map((receipt) => (
              <li key={receipt.id}>
                <Card className="profile__receipt">
                  <strong className="profile__receipt-title">{receiptTitle(receipt)}</strong>
                  <span className="profile__receipt-meta">
                    {new Date(receipt.createdAt).toLocaleDateString(
                      locale === 'es' ? 'es-AR' : 'en-GB',
                    )}{' '}
                    ·{' '}
                    {receipt.status === 'confirmed'
                      ? `${copy.confirmedOn} ${receipt.network}`
                      : `${copy.simulatedOn} ${receipt.network}`}
                  </span>
                  <span className="profile__receipt-actions">
                    <code className="profile__code">{receipt.id}</code>
                    <CopyReceiptButton receiptId={receipt.id} locale={locale} />
                    {receipt.explorerUrl ? (
                      <a
                        className="profile__link"
                        href={receipt.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ArrowUpRight size={16} aria-label={`${receipt.id} · explorer`} />
                      </a>
                    ) : null}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message={copy.empty} />
        )}
      </section>

      <ReceiptVerifier receipts={receipts} locale={locale} />
    </main>
  );
}
