import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartBar,
  Check,
  CheckCircle,
  Fingerprint,
  Globe,
  Info,
  Lock,
  MagnifyingGlass,
  ShieldCheck,
  Stamp,
  UserCircle,
  Wallet,
  X,
} from '@phosphor-icons/react';
import type { CivicPassportSession, CredentialSummary } from 'midnight-referendum-api';
import {
  browserCivicCredentialVault,
  MidnightCivicActionAdapter,
  RarimoCivicCredentialAdapter,
} from 'midnight-referendum-api';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { PassportJourney } from '@/components/passport-v2/PassportJourney';
import type { PreviewPassportJourneyPorts } from '@/components/passport-v2/PreviewPassportJourney';
import { WalletWidget } from '@/components/wallet-widget';
import { useWallet } from '@/hooks/use-wallet';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { ActionMode } from '@/integration/civic-state';
import { ASSIGNED_COUNTRIES, countryName as getCountryName } from '@/integration/country-catalog';
import { type CicoLocale, detectLocale, persistLocale } from '@/integration/locale';
import { PassportIdentityBridge } from '@/integration/passport';
import { MidnightPassportSessionAdapter } from '@/integration/passport-session-port';
import {
  HttpCivicCredentialIssuerPort,
  HttpRarimoVerificationGateway,
} from '@/integration/passport-v2-http-ports';
import { parsePassportV2RuntimeConfig } from '@/integration/passport-v2-runtime-config';
import { getPollAvailability } from '@/integration/poll-lifecycle';
import {
  findRuntimeReferendum,
  getPreviewReadiness,
  getPublicReadiness,
  resolvePassportV2ActionRoute,
} from '@/integration/preview';
import { deriveProfileId, deriveReceiptProfileKey } from '@/integration/profile';
import { rarimoIsoCountryMapper } from '@/integration/rarimo-country-mapper';
import { loadPassportReceipts, savePassportReceipt } from '@/integration/receipt-store';
import {
  MidnightProvidersProvider,
  RELAYER_MODE,
  useMidnightProviders,
} from '@/providers/midnight-providers';
import { WalletProvider } from '@/providers/wallet-context';
import {
  APP_COPY,
  APP_MODE,
  APP_NETWORK_LABEL,
  CHAIN_RUNTIME_ENABLED,
  type FlowStage,
  networkLabel,
  ONBOARDING_SESSION_KEY,
  PASSPORT_ORIGIN,
  shouldShowFirstRunOnboarding,
  type Tab,
} from '@/views/app-runtime';
import { CopyReceiptButton } from '@/views/CopyReceiptButton';
import { ExploreView } from '@/views/ExploreView';
import { PolicyDetailView } from '@/views/PolicyDetailView';
import {
  type Choice,
  DEFAULT_POLL,
  localizePoll,
  POLLS,
  type Poll,
  toRuntimePolls,
  type VoteReceipt,
} from '@/views/poll-model';
import { VotesView } from '@/views/VotesView';

/** Re-exported so the runtime-catalog conversion keeps its existing test entry point. */
export { toRuntimePolls };

function toDisplayCredential(summary: CredentialSummary): DemoCredentialSummary {
  const country =
    ASSIGNED_COUNTRIES.find((entry) => entry.numeric === String(summary.country))?.alpha2 ??
    String(summary.country);
  return {
    kind: 'verified-credential',
    issuer: summary.issuerId,
    country,
    ageClass: summary.ageClass === '18-plus' ? '18+' : summary.ageClass,
    assurance: summary.assurance,
    epoch: String(summary.credentialEpoch),
    validUntil: summary.validUntil,
  };
}

function Header({
  passportSession,
  passportError,
  onConnectPassport,
  onDismissPassportError,
  locale,
  onLocaleChange,
}: {
  passportSession: CivicPassportSession | null;
  passportError: string | null;
  onConnectPassport: () => void;
  onDismissPassportError: () => void;
  locale: CicoLocale;
  onLocaleChange: (locale: CicoLocale) => void;
}) {
  const copy = APP_COPY[locale];
  return (
    <header className="site-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <Globe size={24} weight="duotone" />
        </span>
        <div>
          <p className="brand-name">{copy.brand}</p>
          <p className="brand-note">{copy.brandNote}</p>
        </div>
      </div>
      <div className="wallet-area">
        <button
          type="button"
          className={`wallet-chip ${passportSession ? 'connected' : ''}`}
          onClick={onConnectPassport}
          title={
            passportError ??
            (locale === 'es'
              ? 'Identidad pública de Midnight Passport'
              : 'Public Midnight Passport identity')
          }
          aria-label={
            passportSession
              ? locale === 'es'
                ? 'Abrir Midnight Passport'
                : 'Open Midnight Passport'
              : locale === 'es'
                ? 'Conectar Midnight Passport'
                : 'Connect Midnight Passport'
          }
        >
          <Fingerprint size={14} weight="bold" />{' '}
          <span>{passportSession?.profile?.displayName ?? 'Passport'}</span>
        </button>
        {passportError ? (
          <div className="wallet-status-popover" role="alert">
            <button
              type="button"
              className="popover-close"
              onClick={onDismissPassportError}
              aria-label="Cerrar aviso"
            >
              <X size={15} />
            </button>
            <strong>
              {locale === 'es' ? 'No se pudo conectar Passport' : 'Passport could not connect'}
            </strong>
            <p>{passportError}</p>
            <button type="button" className="popover-action" onClick={onConnectPassport}>
              {locale === 'es' ? 'Reintentar' : 'Try again'}
            </button>
          </div>
        ) : null}
        <label className="app-language-switcher">
          <span className="sr-only">{copy.language}</span>
          <select
            aria-label={copy.language}
            value={locale}
            onChange={(event) => onLocaleChange(event.target.value as CicoLocale)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>
    </header>
  );
}

function BottomNav({
  tab,
  onChange,
  locale,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  locale: CicoLocale;
}) {
  const copy = APP_COPY[locale];
  const items = [
    { id: 'explore' as const, label: copy.nav.explore, Icon: BookOpen },
    { id: 'votes' as const, label: copy.nav.votes, Icon: Stamp },
    { id: 'profile' as const, label: copy.nav.profile, Icon: UserCircle },
  ];
  return (
    <nav
      className="bottom-nav"
      aria-label={locale === 'es' ? 'Navegación principal' : 'Primary navigation'}
    >
      {items.map(({ id, label, Icon }) => (
        <button
          type="button"
          key={id}
          className={`nav-item ${tab === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
          aria-current={tab === id ? 'page' : undefined}
        >
          <span className="nav-icon">
            <Icon size={22} weight={tab === id ? 'fill' : 'regular'} />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function _StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="status-pill">
      <span className="status-dot" />
      {children}
    </span>
  );
}

/**
 * Receipt lookup + explanation, folded into the profile from the former
 * standalone Verify tab. Checks only against receipts already loaded for
 * this profile (local-first: see the privacy note rendered alongside the
 * receipt list in ProfileView) — it never queries a third party.
 */
function ReceiptVerifier({ receipts, locale }: { receipts: VoteReceipt[]; locale: CicoLocale }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'found' | 'missing' | null>(null);
  const matched = receipts.find((receipt) => receipt.id === query.trim());
  return (
    <section className="profile-history verify-section" aria-labelledby="verify-receipt-title">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">
            {locale === 'es' ? 'Transparencia pública' : 'Public transparency'}
          </p>
          <h2 id="verify-receipt-title">
            {locale === 'es' ? 'Verificá un comprobante' : 'Verify a receipt'}
          </h2>
        </div>
        <ShieldCheck size={22} />
      </div>
      <p>
        {locale === 'es'
          ? `Buscá el identificador para consultar si fue confirmado en ${networkLabel(locale)}.`
          : `Search the identifier to see whether it was confirmed on ${networkLabel(locale)}.`}
      </p>
      <form
        className="verify-form"
        onSubmit={(event) => {
          event.preventDefault();
          setResult(matched ? 'found' : 'missing');
        }}
      >
        <label htmlFor="receipt-id">
          {locale === 'es' ? 'Identificador del comprobante' : 'Receipt identifier'}
        </label>
        <div className="search-control">
          <MagnifyingGlass size={20} />
          <input
            id="receipt-id"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResult(null);
            }}
            placeholder={locale === 'es' ? 'tx-...' : 'tx-...'}
          />
          <button type="submit" disabled={!query.trim()}>
            {locale === 'es' ? 'Buscar' : 'Search'}
          </button>
        </div>
      </form>
      {result === 'found' && matched ? (
        <section className="verify-result success" aria-live="polite">
          <CheckCircle size={28} />
          <div>
            <strong>
              {matched.status === 'confirmed'
                ? locale === 'es'
                  ? 'Comprobante confirmado'
                  : 'Receipt confirmed'
                : locale === 'es'
                  ? 'Comprobante simulado'
                  : 'Simulated receipt'}
            </strong>
            <p>
              {locale === 'es' ? 'La opción permanece privada. ' : 'Your choice remains private. '}
              {matched.status === 'confirmed'
                ? locale === 'es'
                  ? `El registro está confirmado en ${matched.network}.`
                  : `The record is confirmed on ${matched.network}.`
                : locale === 'es'
                  ? 'Este registro local no representa una transacción ni una prueba de voto real.'
                  : 'This local record is not a transaction or a real vote proof.'}
            </p>
            <div className="receipt-actions">
              <code>{matched.id}</code>
              <CopyReceiptButton receiptId={matched.id} compact locale={locale} />
            </div>
            {matched.explorerUrl ? (
              <a href={matched.explorerUrl} target="_blank" rel="noreferrer">
                {locale === 'es' ? 'Abrir en explorer' : 'Open in explorer'}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
      {result === 'missing' ? (
        <section className="verify-result missing" aria-live="polite">
          <Info size={24} />
          <div>
            <strong>
              {locale === 'es'
                ? 'No encontramos ese comprobante'
                : 'We could not find that receipt'}
            </strong>
            <p>
              {locale === 'es'
                ? 'Revisá el identificador o esperá la confirmación.'
                : 'Check the identifier or wait for confirmation.'}
            </p>
          </div>
        </section>
      ) : null}
      <section className="verify-explanation">
        <h2>{locale === 'es' ? '¿Qué podés comprobar?' : 'What can you verify?'}</h2>
        <ul>
          <li>
            <Check size={18} />{' '}
            {locale === 'es' ? 'Que el comprobante existe.' : 'That the receipt exists.'}
          </li>
          <li>
            <Check size={18} />{' '}
            {locale === 'es'
              ? 'Que tiene estado confirmado o simulado.'
              : 'That it is confirmed or simulated.'}
          </li>
          <li>
            <Check size={18} />{' '}
            {locale === 'es'
              ? 'Que no necesitás compartir tus datos personales otra vez.'
              : 'That you do not need to share personal data again.'}
          </li>
        </ul>
      </section>
    </section>
  );
}

function ProfileView({
  polls,
  passportSession,
  profileId,
  receipts,
  walletStatus,
  onConnectPassport,
  onReplayOnboarding,
  locale,
}: {
  polls: readonly Poll[];
  passportSession: CivicPassportSession | null;
  profileId: string;
  receipts: VoteReceipt[];
  walletStatus: string;
  onConnectPassport: () => void;
  onReplayOnboarding: () => void;
  locale: CicoLocale;
}) {
  return (
    <main className="page-content">
      <section className="profile-hero">
        <div className="profile-avatar">
          <UserCircle size={34} weight="duotone" />
        </div>
        <p className="eyebrow">{locale === 'es' ? 'Mi identidad' : 'My identity'}</p>
        <h1>
          {passportSession?.profile?.displayName ??
            (locale === 'es' ? 'Tu espacio ciudadano' : 'Your civic space')}
        </h1>
        <p>
          {locale === 'es'
            ? 'Un perfil para reunir tus comprobantes sin convertir tu identidad Passport en tu voto.'
            : 'A profile for your receipts that never turns your Passport identity into your vote.'}
        </p>
        {passportSession ? (
          <div className="profile-status">
            <CheckCircle size={17} />{' '}
            {locale === 'es' ? 'Passport conectado' : 'Passport connected'}
          </div>
        ) : (
          <button type="button" className="secondary-button" onClick={onConnectPassport}>
            <Fingerprint size={18} /> {locale === 'es' ? 'Conectar Passport' : 'Connect Passport'}
          </button>
        )}
      </section>
      <section className="profile-card" aria-labelledby="profile-id-title">
        <div className="profile-card-heading">
          <div>
            <p className="eyebrow">
              {locale === 'es' ? 'Identificador de perfil' : 'Profile identifier'}
            </p>
            <h2 id="profile-id-title">{profileId}</h2>
          </div>
          <ShieldCheck size={24} />
        </div>
        <p>
          {locale === 'es'
            ? 'Es un identificador de presentación específico para esta app. No participa en la elegibilidad, el compromiso ni la marca anónima.'
            : 'A presentation identifier for this app. It is not part of eligibility, the commitment, or the anonymous marker.'}
        </p>
        <div className="profile-connections">
          <span>
            <Fingerprint size={17} /> Passport:{' '}
            {passportSession
              ? locale === 'es'
                ? 'conectado'
                : 'connected'
              : locale === 'es'
                ? 'pendiente'
                : 'pending'}
          </span>
          <span>
            <Wallet size={17} /> Wallet:{' '}
            {walletStatus === 'connected'
              ? locale === 'es'
                ? 'conectada'
                : 'connected'
              : locale === 'es'
                ? 'no conectada'
                : 'not connected'}
          </span>
        </div>
      </section>
      <section className="profile-card profile-help-card" aria-labelledby="profile-help-title">
        <div className="profile-card-heading">
          <div>
            <p className="eyebrow">{locale === 'es' ? 'Ayuda' : 'Help'}</p>
            <h2 id="profile-help-title">
              {locale === 'es' ? 'Revisar cómo funciona' : 'Review how it works'}
            </h2>
          </div>
          <Info size={24} />
        </div>
        <p>
          {locale === 'es'
            ? 'Volvé a la explicación de Passport, credenciales y acciones sin cambiar tu identidad ni conectar una wallet.'
            : 'Review Passport, credential, and action boundaries without changing your identity or connecting a wallet.'}
        </p>
        <button type="button" className="secondary-button" onClick={onReplayOnboarding}>
          {locale === 'es' ? 'Revisar el recorrido' : 'Review the journey'} <ArrowRight size={18} />
        </button>
      </section>
      <section className="profile-history" aria-labelledby="profile-history-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{locale === 'es' ? 'Actividad local' : 'Local activity'}</p>
            <h2 id="profile-history-title">
              {locale === 'es'
                ? `Mis comprobantes ${networkLabel(locale)}`
                : `My receipts · ${networkLabel(locale)}`}
            </h2>
          </div>
          <span className="profile-count">{receipts.length}</span>
        </div>
        <p className="receipt-privacy-note">
          <Lock size={15} />{' '}
          {locale === 'es'
            ? 'Estos comprobantes se guardan cifrados solo en este dispositivo; la red nunca puede vincularlos con vos.'
            : 'These receipts are stored encrypted on this device only; the network can never link them to you.'}
        </p>
        {receipts.length ? (
          <div className="profile-receipts">
            {receipts.map((receipt) => (
              <article className="profile-receipt" key={receipt.id}>
                <div>
                  <strong>
                    {receipt.pollId
                      ? (() => {
                          const found = polls.find((poll) => poll.id === receipt.pollId);
                          return found
                            ? localizePoll(found, locale).title
                            : locale === 'es'
                              ? 'Consulta ciudadana'
                              : 'Civic consultation';
                        })()
                      : locale === 'es'
                        ? 'Consulta ciudadana'
                        : 'Civic consultation'}
                  </strong>
                  <small>
                    {new Date(receipt.createdAt).toLocaleDateString('es-AR')} ·{' '}
                    {receipt.status === 'confirmed'
                      ? locale === 'es'
                        ? `Confirmado en ${receipt.network}`
                        : `Confirmed on ${receipt.network}`
                      : locale === 'es'
                        ? `Simulado en ${receipt.network}`
                        : `Simulated on ${receipt.network}`}
                  </small>
                </div>
                <div className="profile-receipt-actions">
                  <code>{receipt.id}</code>
                  <CopyReceiptButton receiptId={receipt.id} compact locale={locale} />
                  {receipt.explorerUrl ? (
                    <a
                      href={receipt.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Abrir ${receipt.id} en explorer`}
                    >
                      <ArrowRight size={17} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="profile-empty">
            <p>
              {locale === 'es'
                ? 'Todavía no tenés comprobantes guardados en este navegador.'
                : 'You have no receipts saved in this browser yet.'}
            </p>
            <span>
              {locale === 'es'
                ? 'Cuando participes, aparecerán acá sin publicar tu elección.'
                : 'After you participate, they will appear here without publishing your choice.'}
            </span>
          </div>
        )}
      </section>
      <ReceiptVerifier receipts={receipts} locale={locale} />
      <section className="domains-card" aria-labelledby="domains-title">
        <div className="domains-icon">
          <Globe size={25} />
        </div>
        <div>
          <p className="eyebrow">{locale === 'es' ? 'Próximamente' : 'Coming soon'}</p>
          <h2 id="domains-title">
            {locale === 'es' ? 'Tu identidad .night' : 'Your .night identity'}
          </h2>
          <p>
            {locale === 'es'
              ? 'Podés registrar un alias en Midnight Domains y usarlo como una identidad legible para tu perfil.'
              : 'You can register an alias in Midnight Domains and use it as a readable profile identity.'}
          </p>
          <a
            className="text-link"
            href="https://midnight.domains/"
            target="_blank"
            rel="noreferrer"
          >
            {locale === 'es' ? 'Explorar Midnight Domains' : 'Explore Midnight Domains'}{' '}
            <ArrowRight size={16} />
          </a>
          <small>
            {locale === 'es'
              ? 'El registro y el pago requieren una wallet compatible y DUST; todavía no se ejecutan dentro de esta app.'
              : 'Registration and payment require a compatible wallet and DUST; they do not run inside this app yet.'}
          </small>
        </div>
      </section>
    </main>
  );
}

function FlowStepper({ active, locale }: { active: number; locale: CicoLocale }) {
  const steps = locale === 'es' ? ['Entendé', 'Verificá', 'Votá'] : ['Learn', 'Verify', 'Vote'];
  return (
    <div className="flow-stepper">
      {steps.map((step, index) => (
        <div
          className={`flow-step ${index + 1 === active ? 'current' : index + 1 < active ? 'done' : ''}`}
          key={step}
        >
          <span>{index + 1 < active ? <Check size={16} /> : index + 1}</span>
          <small>{step}</small>
        </div>
      ))}
    </div>
  );
}

function VoteFlow({
  poll,
  stage,
  choice,
  onChoice,
  onStage,
  onClose,
  onConfirm,
  onViewReceipt,
  walletStatus,
  passportSession,
  onConnectPassport,
  credentialCountry,
  previewError,
  receipt,
  previewReady,
  dustBalance = null,
  locale,
}: {
  poll: Poll;
  stage: FlowStage;
  choice: Choice | null;
  onChoice: (choice: Choice) => void;
  onStage: (stage: FlowStage) => void;
  onClose: () => void;
  onConfirm: () => void;
  onViewReceipt: () => void;
  walletStatus: string;
  passportSession: CivicPassportSession | null;
  onConnectPassport: () => void;
  credentialCountry: string | null;
  previewError: string | null;
  receipt: VoteReceipt | null;
  previewReady: boolean;
  dustBalance?: bigint | null;
  locale: CicoLocale;
}) {
  const actionMode: ActionMode = CHAIN_RUNTIME_ENABLED ? 'live' : 'simulated';
  const activeStep = stage === 'verify' || stage === 'eligible' ? 2 : 3;
  return (
    <main className="page-content flow-page">
      <button type="button" className="back-button" onClick={onClose}>
        <ArrowLeft size={18} /> {locale === 'es' ? 'Volver a la propuesta' : 'Back to proposal'}
      </button>
      <FlowStepper active={activeStep} locale={locale} />
      {stage === 'verify' ? (
        <section className="flow-card">
          <div className="flow-card-icon">
            <Fingerprint size={32} />
          </div>
          <p className="eyebrow">
            {locale === 'es' ? 'Identidad y elegibilidad' : 'Identity and eligibility'}
          </p>
          <h1>{locale === 'es' ? 'Antes de votar' : 'Before you vote'}</h1>
          <h2>
            {locale === 'es'
              ? 'Conectá Midnight Passport (opcional)'
              : 'Connect Midnight Passport (optional)'}
          </h2>
          <p>
            {locale === 'es'
              ? 'Passport aporta onboarding y un perfil visible. No firma el voto: una wallet compatible aprueba la transacción y el secreto anónimo permanece separado.'
              : 'Passport provides onboarding and a visible profile. It does not sign the vote: a compatible wallet approves the transaction while the anonymous secret stays separate.'}
          </p>
          {passportSession ? (
            <div className="data-summary">
              <span>
                <CheckCircle size={18} />{' '}
                {locale === 'es' ? 'Passport conectado' : 'Passport connected'}
                {passportSession.profile?.displayName
                  ? ` · ${passportSession.profile.displayName}`
                  : ''}
              </span>
              <span>
                <ShieldCheck size={18} />{' '}
                {locale === 'es' ? 'Secreto anónimo separado' : 'Anonymous secret kept separate'}
              </span>
            </div>
          ) : (
            <button type="button" className="secondary-button" onClick={onConnectPassport}>
              <Fingerprint size={18} /> {locale === 'es' ? 'Conectar Passport' : 'Connect Passport'}
            </button>
          )}
          <div className="flow-requirements">
            <strong>{locale === 'es' ? 'Reglas de esta demo' : 'Demo rules'}</strong>
            <span>
              {credentialCountry
                ? `${getCountryName(credentialCountry, locale)} · 18+ · ${locale === 'es' ? 'credencial verificable' : 'verifiable credential'}`
                : locale === 'es'
                  ? 'Credencial compatible · 18+ · evidencia verificable'
                  : 'Compatible credential · 18+ · verifiable evidence'}
            </span>
          </div>
          <button
            type="button"
            className="primary-button yellow"
            disabled={actionMode === 'live' && !previewReady}
            onClick={() => onStage('eligible')}
          >
            {locale === 'es' ? 'Validar elegibilidad' : 'Check eligibility'}{' '}
            <ArrowRight size={20} />
          </button>
          {actionMode === 'simulated' ? (
            <p className="flow-hint">
              {locale === 'es'
                ? 'Modo local: podés recorrer la interfaz, pero no se crea ningún comprobante.'
                : 'Local mode: you can explore the interface, but no receipt is created.'}
            </p>
          ) : null}
        </section>
      ) : null}
      {stage === 'eligible' ? (
        <section className="flow-card success-card">
          <div className="success-symbol">
            <Check size={34} />
          </div>
          <p className="eyebrow">
            {locale === 'es' ? 'Credencial v2 verificada' : 'Verified v2 credential'}
          </p>
          <h1>{locale === 'es' ? 'Listo, podés votar' : 'You are ready to vote'}</h1>
          <p>
            {locale === 'es'
              ? 'La elegibilidad se convierte en un compromiso anónimo. La evidencia cruda no se guarda en esta interfaz.'
              : 'Eligibility becomes an anonymous commitment. Raw evidence is not stored in this interface.'}
          </p>
          <div className="data-summary">
            <span>
              <CheckCircle size={18} />{' '}
              {locale === 'es' ? 'Elegibilidad validada' : 'Eligibility verified'}
            </span>
            <span>
              <ShieldCheck size={18} />{' '}
              {locale === 'es'
                ? 'La evidencia cruda no salió de tu dispositivo'
                : 'Raw evidence did not leave your device'}
            </span>
          </div>
          <button type="button" className="primary-button blue" onClick={() => onStage('choose')}>
            {locale === 'es' ? 'Continuar al voto' : 'Continue to vote'} <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
      {stage === 'choose' ? (
        <section className="flow-card">
          <p className="eyebrow">{locale === 'es' ? 'Paso 3 de 3' : 'Step 3 of 3'}</p>
          <h1>{locale === 'es' ? 'Elegí tu respuesta' : 'Choose your response'}</h1>
          <p>{localizePoll(poll, locale).question}</p>
          <div className="choice-list">
            <button
              type="button"
              className={`choice-button yes ${choice === 'YES' ? 'selected' : ''}`}
              onClick={() => onChoice('YES')}
            >
              <span>{locale === 'es' ? 'Sí' : 'Yes'}</span>
              <small>
                {locale === 'es'
                  ? 'Estoy de acuerdo con priorizar esta propuesta'
                  : 'I support prioritising this proposal'}
              </small>
              <span className="choice-check">{choice === 'YES' ? <Check size={18} /> : null}</span>
            </button>
            <button
              type="button"
              className={`choice-button no ${choice === 'NO' ? 'selected' : ''}`}
              onClick={() => onChoice('NO')}
            >
              <span>No</span>
              <small>
                {locale === 'es'
                  ? 'No estoy de acuerdo con priorizarla así'
                  : 'I do not support prioritising it this way'}
              </small>
              <span className="choice-check">{choice === 'NO' ? <Check size={18} /> : null}</span>
            </button>
            <button
              type="button"
              className={`choice-button abstain ${choice === 'ABSTAIN' ? 'selected' : ''}`}
              onClick={() => onChoice('ABSTAIN')}
            >
              <span>{locale === 'es' ? 'Abstención' : 'Abstain'}</span>
              <small>
                {locale === 'es'
                  ? 'Prefiero no tomar una posición binaria'
                  : 'I prefer not to take a binary position'}
              </small>
              <span className="choice-check">
                {choice === 'ABSTAIN' ? <Check size={18} /> : null}
              </span>
            </button>
          </div>
          <button
            type="button"
            className="primary-button blue"
            disabled={!choice}
            onClick={() => onStage('review')}
          >
            {locale === 'es' ? 'Revisar mi voto' : 'Review my vote'} <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
      {stage === 'review' ? (
        <section className="flow-card">
          <p className="eyebrow">
            {locale === 'es' ? 'Revisá antes de confirmar' : 'Review before confirming'}
          </p>
          <h1>{locale === 'es' ? 'Tu compromiso' : 'Your commitment'}</h1>
          <p className="review-poll-title">{localizePoll(poll, locale).title}</p>
          <div
            className={`review-choice ${choice === 'NO' ? 'no' : choice === 'ABSTAIN' ? 'abstain' : 'yes'}`}
          >
            <span>
              {choice === 'YES'
                ? locale === 'es'
                  ? 'Sí'
                  : 'Yes'
                : choice === 'NO'
                  ? 'No'
                  : locale === 'es'
                    ? 'Abstención'
                    : 'Abstain'}
            </span>
            <small>
              {locale === 'es'
                ? 'La opción se mantiene privada hasta el recuento.'
                : 'Your choice stays private until counting.'}
            </small>
          </div>
          <div className="review-notice">
            <Info size={20} />
            <p>
              {locale === 'es'
                ? 'Passport gestiona la identidad y la credencial; no firma el voto. '
                : 'Passport handles identity and the credential; it does not sign the vote. '}
              {RELAYER_MODE
                ? locale === 'es'
                  ? 'El navegador prueba localmente y el relay atómico aporta DUST y envía sin recibir tu elección ni tu credencial.'
                  : 'The browser proves locally; the atomic relay supplies DUST and submits without receiving your choice or credential.'
                : locale === 'es'
                  ? `La wallet aprueba la acción real. Estado: ${walletStatus === 'connected' ? 'conectada' : 'pendiente'}. DUST: ${dustBalance === null ? 'saldo no disponible' : `${dustBalance.toString()} disponible`}.`
                  : `The wallet approves the real action. Status: ${walletStatus === 'connected' ? 'connected' : 'pending'}. DUST: ${dustBalance === null ? 'balance unavailable' : `${dustBalance.toString()} available`}.`}
            </p>
          </div>
          {CHAIN_RUNTIME_ENABLED && !RELAYER_MODE ? <WalletWidget /> : null}
          {previewError ? (
            <div className="verify-result missing">
              <Info size={20} />
              <div>
                <strong>
                  {locale === 'es'
                    ? `${networkLabel(locale)} todavía no puede enviar`
                    : `${networkLabel(locale)} cannot submit yet`}
                </strong>
                <p>{previewError}</p>
              </div>
            </div>
          ) : null}
          {!CHAIN_RUNTIME_ENABLED ? (
            <p className="flow-hint">
              {locale === 'es'
                ? 'Este comprobante será simulado y se guardará localmente. La prueba real requiere una red compatible, contrato desplegado y wallet aprobando la transacción.'
                : 'This receipt will be simulated and saved locally. A real proof requires a compatible network, deployed contract, and wallet approval.'}
            </p>
          ) : null}
          <button type="button" className="primary-button yellow" onClick={onConfirm}>
            {actionMode === 'live'
              ? locale === 'es'
                ? 'Confirmar acción real'
                : 'Confirm real action'
              : locale === 'es'
                ? 'Crear comprobante simulado'
                : 'Create simulated receipt'}{' '}
            <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
      {stage === 'processing' ? (
        <section className="flow-card processing-card">
          <div className="processing-spinner">
            <ChartBar size={34} />
          </div>
          <p className="eyebrow">{locale === 'es' ? 'Procesando' : 'Processing'}</p>
          <h1>{locale === 'es' ? 'Preparando tu comprobante' : 'Preparing your receipt'}</h1>
          <p>
            {RELAYER_MODE
              ? locale === 'es'
                ? 'La prueba se crea localmente; el relay reserva DUST, envía una vez y espera confirmación del indexer.'
                : 'The proof is created locally; the relay reserves DUST, submits once, and waits for indexer confirmation.'
              : locale === 'es'
                ? 'El flujo reúne prueba, balanceo DUST/NIGHT, aprobación del wallet y confirmación canónica.'
                : 'The flow combines proof, DUST/NIGHT balancing, wallet approval, and canonical confirmation.'}
          </p>
          <div className="processing-track">
            <span />
          </div>
        </section>
      ) : null}
      {stage === 'receipt' ? (
        <section className="flow-card success-card">
          <div className="success-symbol">
            <Check size={34} />
          </div>
          <p className="eyebrow">
            {locale === 'es' ? 'Compromiso registrado' : 'Commitment recorded'}
          </p>
          <h1>{locale === 'es' ? 'Gracias por participar' : 'Thank you for participating'}</h1>
          <p>
            {locale === 'es'
              ? 'Guardá este identificador para verificar el resultado.'
              : 'Save this identifier to verify the result.'}
          </p>
          <div className="receipt-box">
            <span>
              {receipt?.status === 'confirmed'
                ? locale === 'es'
                  ? 'Comprobante confirmado'
                  : 'Receipt confirmed'
                : locale === 'es'
                  ? 'Comprobante simulado'
                  : 'Simulated receipt'}{' '}
              · {receipt?.network ?? networkLabel(locale)}
            </span>
            <div className="receipt-box-id">
              <strong>
                {receipt?.id ??
                  (locale === 'es' ? 'Disponible en tu perfil' : 'Available in your profile')}
              </strong>
              {receipt ? <CopyReceiptButton receiptId={receipt.id} locale={locale} /> : null}
            </div>
            <small>
              {receipt?.status === 'confirmed'
                ? locale === 'es'
                  ? `Confirmado en ${receipt.network}.`
                  : `Confirmed on ${receipt.network}.`
                : locale === 'es'
                  ? 'No representa una transacción ni una prueba de voto real.'
                  : 'This is not a transaction or a real vote proof.'}
            </small>
          </div>
          {receipt?.explorerUrl ? (
            <a className="text-link" href={receipt.explorerUrl} target="_blank" rel="noreferrer">
              {locale === 'es' ? 'Abrir transacción en explorer' : 'Open transaction in explorer'}{' '}
              <ArrowRight size={16} />
            </a>
          ) : null}
          <button type="button" className="primary-button blue" onClick={onViewReceipt}>
            {locale === 'es' ? 'Ver mi comprobante' : 'View my receipt'} <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
    </main>
  );
}

function CivicApp() {
  const initialOnboardingRequired = shouldShowFirstRunOnboarding();
  // Spanish is the product's default; an explicit persisted choice still wins.
  const [locale, setLocale] = useState<CicoLocale>(() => detectLocale('es-AR'));
  const [tab, setTab] = useState<Tab>('votes');
  const [flowStage, setFlowStage] = useState<FlowStage | null>(null);
  const [passportJourneyOpen, setPassportJourneyOpen] = useState(initialOnboardingRequired);
  const [onboardingRequired, setOnboardingRequired] = useState(initialOnboardingRequired);
  const [policyDetailId, setPolicyDetailId] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  // Runtime modes intentionally start without a fixture ID. The v2 catalog below
  // selects the first configured referendum once it has been parsed.
  const [activePollId, setActivePollId] = useState(APP_MODE === 'demo' ? DEFAULT_POLL.id : '');
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
  const [receipts, setReceipts] = useState<VoteReceipt[]>([]);
  const [credential, setCredential] = useState<DemoCredentialSummary | null>(null);
  const [passportSession, setPassportSession] = useState<CivicPassportSession | null>(null);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [receiptToastVisible, setReceiptToastVisible] = useState(false);
  const changeLocale = (nextLocale: CicoLocale) => {
    setLocale(nextLocale);
    persistLocale(nextLocale);
  };
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'es'
        ? 'Referéndum Cívico · Voto verificable'
        : 'Civic Referendum · Verifiable vote';
  }, [locale]);
  const closeOnboarding = () => {
    window.sessionStorage.setItem(ONBOARDING_SESSION_KEY, '1');
    setOnboardingRequired(false);
    setPassportJourneyOpen(false);
    setTab('votes');
  };
  const replayOnboarding = () => {
    setFlowStage(null);
    setPolicyDetailId(null);
    setPassportJourneyOpen(true);
  };
  const { status: walletStatus, dustBalance } = useWallet();
  const {
    publicReadReady,
    publicReadError,
    referendumV2Providers,
    referendumV2ActionContext,
    isReady,
    error: providersError,
  } = useMidnightProviders();
  const passportSessionPort = useMemo(
    () =>
      new MidnightPassportSessionAdapter({
        bridge: new PassportIdentityBridge({ passportOrigin: PASSPORT_ORIGIN }),
      }),
    [],
  );
  const passportV2Runtime = useMemo(() => {
    if (!CHAIN_RUNTIME_ENABLED) return { config: null, error: null };

    try {
      return {
        config: parsePassportV2RuntimeConfig(
          import.meta.env as unknown as Readonly<Record<string, string | undefined>>,
        ),
        error: null,
      };
    } catch (runtimeError) {
      return {
        config: null,
        error:
          runtimeError instanceof Error
            ? runtimeError.message
            : 'La configuración de Passport no es válida.',
      };
    }
  }, []);
  const polls = useMemo(
    () =>
      CHAIN_RUNTIME_ENABLED && passportV2Runtime.config
        ? toRuntimePolls(passportV2Runtime.config.referenda)
        : CHAIN_RUNTIME_ENABLED
          ? []
          : POLLS,
    [passportV2Runtime.config],
  );
  useEffect(() => {
    if ((!activePollId || !polls.some((poll) => poll.id === activePollId)) && polls[0]) {
      setActivePollId(polls[0].id);
    }
  }, [activePollId, polls]);
  const passportJourneyPorts = useMemo<PreviewPassportJourneyPorts>(() => {
    const base = { passport: passportSessionPort };
    if (passportV2Runtime.error) {
      return {
        ...base,
        configurationError: passportV2Runtime.error,
        runtimeCatalogConfigured: true,
      };
    }
    if (!passportV2Runtime.config) return { ...base, runtimeCatalogConfigured: false };
    const gateway = new HttpRarimoVerificationGateway({
      baseUrl: passportV2Runtime.config.apiUrl,
    });
    const issuer = new HttpCivicCredentialIssuerPort({
      baseUrl: passportV2Runtime.config.apiUrl,
    });
    const credential = new RarimoCivicCredentialAdapter({
      gateway,
      issuer,
      issuerId: passportV2Runtime.config.issuerId,
      credentialEpoch: passportV2Runtime.config.credentialEpoch,
      credentialTtlMs: passportV2Runtime.config.credentialTtlMs,
      vault: browserCivicCredentialVault(
        `${APP_MODE}:${passportV2Runtime.config.issuerId}:${passportV2Runtime.config.credentialEpoch}`,
      ),
      countryMapper: rarimoIsoCountryMapper,
      uniquenessTimestampUpperBoundUnixSeconds:
        passportV2Runtime.config.uniquenessTimestampUpperBoundUnixSeconds,
    });
    const actions = referendumV2Providers
      ? new MidnightCivicActionAdapter({
          providers: referendumV2Providers,
          credential,
          referenda: passportV2Runtime.config.referenda,
          ...(referendumV2ActionContext
            ? { actionExecutionContext: referendumV2ActionContext }
            : {}),
        })
      : undefined;
    return {
      ...base,
      credential,
      ...(actions ? { actions } : {}),
      referenda: passportV2Runtime.config.referenda,
      runtimeCatalogConfigured: true,
    };
  }, [passportSessionPort, passportV2Runtime, referendumV2ActionContext, referendumV2Providers]);
  const runtimeContractAddress = passportV2Runtime.config?.referenda[0]?.contractAddress ?? null;
  useEffect(() => {
    let active = true;
    const credentialPort = passportJourneyPorts.credential;
    if (!credentialPort)
      return () => {
        active = false;
      };
    void credentialPort.getCredentialSummary().then((stored) => {
      if (active && stored?.status === 'issued') setCredential(toDisplayCredential(stored));
    });
    return () => {
      active = false;
    };
  }, [passportJourneyPorts.credential]);
  const profileId = useMemo(() => deriveProfileId(passportSession), [passportSession]);
  const previewReadiness = getPreviewReadiness({
    appMode: APP_MODE === 'preview' ? 'preview' : APP_MODE === 'undeployed' ? 'undeployed' : 'demo',
    contractAddress: runtimeContractAddress,
    walletConnected: walletStatus === 'connected',
    providersReady: isReady && (!passportV2Runtime.config || referendumV2Providers !== null),
    providersError: providersError ?? passportV2Runtime.error,
    relayerMode: RELAYER_MODE,
    v2RuntimeConfigured: CHAIN_RUNTIME_ENABLED,
    credentialVerified: credential?.kind === 'verified-credential',
  });
  const publicReadiness = getPublicReadiness({
    appMode: APP_MODE === 'preview' ? 'preview' : APP_MODE === 'undeployed' ? 'undeployed' : 'demo',
    contractAddress: runtimeContractAddress,
    publicProviderReady: publicReadReady,
    publicProviderError: publicReadError,
  });
  useEffect(() => {
    let active = true;
    if (!passportSession) {
      setReceipts([]);
      return () => {
        active = false;
      };
    }
    void deriveReceiptProfileKey(passportSession).then((receiptProfileKey) =>
      loadPassportReceipts(receiptProfileKey).then((stored) => {
        if (active) setReceipts(stored);
      }),
    );
    return () => {
      active = false;
    };
  }, [passportSession]);
  useEffect(() => {
    if (!receipt) {
      setReceiptToastVisible(false);
      return;
    }
    setReceiptToastVisible(true);
    const timeout = window.setTimeout(() => setReceiptToastVisible(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [receipt]);
  const connectPassport = async () => {
    setPassportError(null);
    if (APP_MODE === 'demo') {
      setPassportSession({
        sessionId: 'local-demo-session',
        origin: window.location.origin,
        network: 'devnet',
        status: 'connected',
        profile: { displayName: 'Ciudadano demo' },
        capabilities: ['session', 'profile'],
      });
      return;
    }
    try {
      const session = await passportSessionPort.connect({
        origin: window.location.origin,
        network: 'preview',
        requestedCapabilities: ['session', 'profile'],
      });
      setPassportSession(session);
    } catch (error) {
      setPassportError(error instanceof Error ? error.message : 'No se pudo conectar Passport');
    }
  };

  const startVote = async (pollId: string) => {
    const poll = polls.find((item) => item.id === pollId);
    if (!poll || !getPollAvailability(poll).isOpen) {
      setPreviewError('Esta votación está cerrada y no acepta nuevas participaciones.');
      return;
    }
    setActivePollId(pollId);
    setPolicyDetailId(null);
    setChoice(null);
    setReceipt(null);
    setPreviewError(null);
    if (credential) {
      setFlowStage('choose');
    } else {
      // Eligibility is a Passport-v2 credential journey. Never fall back to a legacy document reader.
      setPassportJourneyOpen(true);
    }
  };

  const confirmVote = async () => {
    if (CHAIN_RUNTIME_ENABLED) {
      if (previewReadiness.state !== 'ready') {
        setPreviewError(previewReadiness.message);
        return;
      }
      const poll = polls.find((item) => item.id === activePollId);
      if (!poll || !getPollAvailability(poll).isOpen) {
        setPreviewError('Esta votación está cerrada y no acepta nuevas participaciones.');
        return;
      }
      if (!choice) {
        setPreviewError('Elegí una respuesta antes de firmar.');
        return;
      }
      setPreviewError(null);
      setFlowStage('processing');
      try {
        if (passportV2Runtime.error) {
          throw new Error(
            `La configuración Passport v2 es inválida; el voto fue bloqueado: ${passportV2Runtime.error}`,
          );
        }
        if (passportV2Runtime.config) {
          const referendum = findRuntimeReferendum(
            passportV2Runtime.config.referenda,
            activePollId,
          );
          const actionPort = passportJourneyPorts.actions;
          const credentialPort = passportJourneyPorts.credential;
          const route = resolvePassportV2ActionRoute({
            runtimeConfigured: true,
            credentialVerified: credential?.kind === 'verified-credential',
            actionPortAvailable: Boolean(actionPort && credentialPort),
            referendumId: referendum?.referendumId ?? null,
          });
          if (route.mode === 'blocked') throw new Error(route.message);
          if (route.mode !== 'v2' || !actionPort || !credentialPort) {
            throw new Error('La acción v2 no está disponible; el voto fue bloqueado.');
          }
          const authorization = await credentialPort.getActionAuthorization();
          if (!authorization) {
            throw new Error(
              'La credencial Passport no tiene autorización vigente para una acción cívica.',
            );
          }
          const confirmed = await actionPort.castVote({
            referendumId: route.referendumId,
            choice,
            authorization,
          });
          const nextReceipt: VoteReceipt = {
            id: confirmed.transactionId,
            pollId: activePollId,
            createdAt: new Date().toISOString(),
            status: 'confirmed',
            network: confirmed.network,
            explorerUrl: confirmed.explorerUrl,
          };
          if (passportSession) {
            const receiptProfileKey = await deriveReceiptProfileKey(passportSession);
            await savePassportReceipt(receiptProfileKey, nextReceipt);
          }
          setReceipts((previous) => [
            nextReceipt,
            ...previous.filter((item) => item.id !== nextReceipt.id),
          ]);
          setReceipt(nextReceipt);
          setFlowStage('receipt');
          return;
        }

        throw new Error(
          `${APP_NETWORK_LABEL} requiere un manifiesto v2 completo; el flujo legado está deshabilitado.`,
        );
      } catch (error) {
        setPreviewError(
          error instanceof Error ? error.message : `Falló la transacción en ${APP_NETWORK_LABEL}`,
        );
        setFlowStage('review');
      }
      return;
    }
    const nextReceipt: VoteReceipt = {
      id: 'demo-tx-cico-2026-0001',
      pollId: activePollId,
      createdAt: new Date().toISOString(),
      status: 'simulated',
      network: 'local-demo',
    };
    if (passportSession) {
      const receiptProfileKey = await deriveReceiptProfileKey(passportSession);
      await savePassportReceipt(receiptProfileKey, nextReceipt);
    }
    setReceipts((previous) => [
      nextReceipt,
      ...previous.filter((item) => item.id !== nextReceipt.id),
    ]);
    setReceipt(nextReceipt);
    setPreviewError(null);
    setFlowStage('receipt');
  };

  const currentTabContent =
    tab === 'explore' ? (
      <ExploreView
        polls={polls}
        publicContractAddress={runtimeContractAddress}
        onOpenPolicy={setPolicyDetailId}
        locale={locale}
      />
    ) : tab === 'profile' ? (
      <ProfileView
        polls={polls}
        passportSession={passportSession}
        profileId={profileId}
        receipts={receipts}
        walletStatus={walletStatus}
        onConnectPassport={() => void connectPassport()}
        onReplayOnboarding={replayOnboarding}
        locale={locale}
      />
    ) : (
      <VotesView
        polls={polls}
        credential={credential}
        publicContractAddress={runtimeContractAddress}
        onStartVote={startVote}
        onOpenPolicy={setPolicyDetailId}
        onOpenPassportJourney={() => setPassportJourneyOpen(true)}
        locale={locale}
      />
    );
  const selectedPolicy = policyDetailId
    ? (polls.find((poll) => poll.id === policyDetailId) ?? null)
    : null;
  const navigate = (nextTab: Tab) => {
    setTab(nextTab);
    setFlowStage(null);
    setPolicyDetailId(null);
    setReceiptToastVisible(false);
  };
  return (
    <div className="app-shell">
      {!passportJourneyOpen ? (
        <>
          <Header
            passportSession={passportSession}
            passportError={passportError}
            onConnectPassport={() => void connectPassport()}
            onDismissPassportError={() => setPassportError(null)}
            locale={locale}
            onLocaleChange={changeLocale}
          />
          <div className="mode-strip">
            <div className="mode-copy">
              <span>
                <span className="status-dot" />
                {publicReadiness.label}
              </span>
              <span className="mode-help">
                {passportSession
                  ? 'Passport conectado · acción real separada'
                  : APP_MODE === 'showcase'
                    ? 'Passport en vivo · credencial pendiente'
                    : APP_MODE === 'undeployed'
                      ? 'Passport oficial · contratos v2 en la red local'
                      : 'Recorrido educativo · wallet solo para una acción real'}
              </span>
            </div>
            <details className="mode-details">
              <summary aria-label="Qué significa este estado">
                <Info size={14} />
                <span>Info</span>
              </summary>
              <p>
                {publicReadiness.message} {previewReadiness.message}
              </p>
            </details>
          </div>
        </>
      ) : null}
      {passportJourneyOpen ? (
        <PassportJourney
          mode={APP_MODE}
          onClose={closeOnboarding}
          dismissible={!onboardingRequired}
          onCredentialReady={(nextCredential) => setCredential(nextCredential)}
          onPassportConnected={setPassportSession}
          initialLocale={locale}
          onLocaleChange={changeLocale}
          passportPort={passportSessionPort}
          previewPorts={passportJourneyPorts}
        />
      ) : flowStage ? (
        (() => {
          const activePoll = polls.find((poll) => poll.id === activePollId);
          if (!activePoll) {
            return (
              <main className="page-content flow-page">
                <section className="flow-card" role="alert">
                  <h1>Consulta no disponible</h1>
                  <p>El catálogo v2 cambió o todavía no está listo para esta acción.</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setFlowStage(null)}
                  >
                    Volver a votaciones
                  </button>
                </section>
              </main>
            );
          }
          return (
            <VoteFlow
              poll={activePoll}
              stage={flowStage}
              choice={choice}
              onChoice={setChoice}
              onStage={setFlowStage}
              onClose={() => setFlowStage(null)}
              onConfirm={() => void confirmVote()}
              onViewReceipt={() => {
                setFlowStage(null);
                setTab('profile');
              }}
              walletStatus={walletStatus}
              passportSession={passportSession}
              onConnectPassport={() => void connectPassport()}
              credentialCountry={credential?.country ?? null}
              previewError={previewError}
              receipt={receipt}
              previewReady={previewReadiness.state === 'ready'}
              dustBalance={dustBalance}
              locale={locale}
            />
          );
        })()
      ) : selectedPolicy ? (
        <PolicyDetailView
          poll={selectedPolicy}
          onBack={() => setPolicyDetailId(null)}
          onStartVote={startVote}
          credential={credential}
          onOpenPassportJourney={() => setPassportJourneyOpen(true)}
          locale={locale}
        />
      ) : (
        currentTabContent
      )}
      {!passportJourneyOpen && !flowStage && !selectedPolicy ? (
        <BottomNav
          tab={tab}
          onChange={(nextTab) => {
            setPassportJourneyOpen(false);
            navigate(nextTab);
          }}
          locale={locale}
        />
      ) : null}
      {receipt && receiptToastVisible ? (
        <div className="receipt-toast" role="status">
          <button
            type="button"
            className="receipt-toast-open"
            onClick={() => {
              setReceiptToastVisible(false);
              setFlowStage(null);
              setTab('profile');
            }}
          >
            <CheckCircle size={18} /> Último comprobante listo <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="receipt-toast-close"
            onClick={() => setReceiptToastVisible(false)}
            aria-label="Cerrar notificación"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function App() {
  return (
    <WalletProvider runtimeEnabled={CHAIN_RUNTIME_ENABLED}>
      <MidnightProvidersProvider>
        <CivicApp />
      </MidnightProvidersProvider>
    </WalletProvider>
  );
}
