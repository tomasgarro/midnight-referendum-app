import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Globe,
  Lock,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react';
import type { CivicPassportSession, PassportSessionPort } from 'midnight-referendum-api';
import { useState } from 'react';
import { type CicoLocale, detectLocale, persistLocale } from '@/integration/locale';

type Stage = 'promise' | 'consent' | 'profile' | 'credential' | 'polls' | 'vote' | 'receipt';

interface ShowcasePassportJourneyProps {
  readonly passport: PassportSessionPort;
  readonly onClose: () => void;
}

const copy = {
  en: {
    back: 'Back to CICO',
    title: 'Passport-first civic participation',
    eyebrow: 'Public showcase',
    language: 'Language',
    live: 'LIVE PASSPORT',
    synthetic: 'SYNTHETIC CREDENTIAL',
    simulated: 'SIMULATED VOTE',
    promiseTitle: 'Know what is live before you begin',
    promiseBody:
      'Midnight Passport provides profile consent. Nationality credentials and voting are clearly simulated in this public showcase.',
    identity: 'Passport profile and .night name',
    credential: 'Private eligibility credential holder',
    nullifier: 'Referendum-specific vote nullifier',
    begin: 'Begin privacy walkthrough',
    consentTitle: 'Connect Midnight Passport',
    consentBody:
      'CICO asks only for your approved display name. It does not request a wallet address and never turns your Passport profile into a vote identifier.',
    request: 'Requested field',
    displayName: 'Display name only',
    network: 'Passport network: Stagenet · ledger-9',
    connect: 'Connect Passport',
    explore: 'Explore without connecting',
    connecting: 'Waiting for Passport consent…',
    retry: 'Try Passport again',
    errorTitle: 'Passport did not connect',
    fallback: 'Continue without a Passport session',
    profileTitle: 'Your approved profile',
    profileBody:
      'This visible name is presentation data only. Manage or claim a .night name inside Midnight Passport.',
    anonymous: 'Exploring anonymously',
    manage: 'Manage identity in Passport',
    continue: 'Continue',
    credentialTitle: 'Nationality is a separate capability',
    credentialBody:
      'Rarimo NFC verification is not active in this showcase. The next step uses a synthetic eligibility credential and never claims residency.',
    createSynthetic: 'Create synthetic credential',
    pollsTitle: 'Choose a participation space',
    global: 'Global ideas',
    globalBody: 'Open-ended consultations available to eligible participants from any country.',
    country: 'Argentina-specific',
    countryBody:
      'A future policy can prove nationality privately. This showcase only simulates that proof.',
    chooseGlobal: 'Explore global poll',
    chooseCountry: 'Explore country poll',
    voteTitle: 'A clearly simulated referendum',
    question:
      'Should communities be able to publish privacy-preserving, non-binding civic consultations?',
    yes: 'Yes',
    no: 'No',
    abstain: 'Abstain',
    review: 'Create simulated receipt',
    receiptTitle: 'Your receipt does not reveal your choice',
    receiptBody: 'This is a local simulation, not a transaction or official-election record.',
    publicFacts: 'Public: poll, synthetic status, completion time',
    privateFacts: 'Private: choice, Passport profile, credential opening',
    done: 'Return to CICO',
  },
  es: {
    back: 'Volver a CICO',
    title: 'Participación cívica centrada en Passport',
    eyebrow: 'Showcase público',
    language: 'Idioma',
    live: 'PASSPORT EN VIVO',
    synthetic: 'CREDENCIAL SINTÉTICA',
    simulated: 'VOTO SIMULADO',
    promiseTitle: 'Sabé qué está activo antes de empezar',
    promiseBody:
      'Midnight Passport brinda consentimiento de perfil. La credencial de nacionalidad y el voto están claramente simulados en este showcase público.',
    identity: 'Perfil Passport y nombre .night',
    credential: 'Titular de credencial privada de elegibilidad',
    nullifier: 'Nullifier específico del referéndum',
    begin: 'Comenzar recorrido de privacidad',
    consentTitle: 'Conectá Midnight Passport',
    consentBody:
      'CICO pide únicamente tu nombre visible aprobado. No solicita una dirección de wallet ni convierte tu perfil Passport en un identificador de voto.',
    request: 'Campo solicitado',
    displayName: 'Solo nombre visible',
    network: 'Red Passport: Stagenet · ledger-9',
    connect: 'Conectar Passport',
    explore: 'Explorar sin conectar',
    connecting: 'Esperando consentimiento de Passport…',
    retry: 'Reintentar Passport',
    errorTitle: 'Passport no se conectó',
    fallback: 'Continuar sin sesión Passport',
    profileTitle: 'Tu perfil aprobado',
    profileBody:
      'Este nombre visible es solo un dato de presentación. Gestioná o reclamá tu nombre .night dentro de Midnight Passport.',
    anonymous: 'Explorando de forma anónima',
    manage: 'Gestionar identidad en Passport',
    continue: 'Continuar',
    credentialTitle: 'La nacionalidad es una capacidad separada',
    credentialBody:
      'La verificación NFC de Rarimo no está activa en este showcase. El siguiente paso usa una credencial sintética y nunca afirma residencia.',
    createSynthetic: 'Crear credencial sintética',
    pollsTitle: 'Elegí un espacio de participación',
    global: 'Ideas globales',
    globalBody: 'Consultas abiertas para participantes elegibles de cualquier país.',
    country: 'Específico de Argentina',
    countryBody:
      'Una política futura podrá probar nacionalidad en privado. Este showcase solo simula esa prueba.',
    chooseGlobal: 'Explorar consulta global',
    chooseCountry: 'Explorar consulta nacional',
    voteTitle: 'Un referéndum claramente simulado',
    question:
      '¿Deberían las comunidades poder publicar consultas cívicas no vinculantes y con privacidad?',
    yes: 'Sí',
    no: 'No',
    abstain: 'Abstenerme',
    review: 'Crear comprobante simulado',
    receiptTitle: 'Tu comprobante no revela tu elección',
    receiptBody:
      'Esto es una simulación local, no una transacción ni un registro electoral oficial.',
    publicFacts: 'Público: consulta, estado sintético, hora de finalización',
    privateFacts: 'Privado: elección, perfil Passport, apertura de credencial',
    done: 'Volver a CICO',
  },
} as const;

export function ShowcasePassportJourney({ passport, onClose }: ShowcasePassportJourneyProps) {
  const [locale, setLocale] = useState<CicoLocale>(() => detectLocale());
  const [stage, setStage] = useState<Stage>('promise');
  const [session, setSession] = useState<CivicPassportSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const t = copy[locale];
  const setLanguage = (next: CicoLocale) => {
    setLocale(next);
    persistLocale(next);
  };
  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const next = await passport.connect({
        origin: window.location.origin,
        network: 'preview',
        requestedCapabilities: ['session', 'profile'],
      });
      setSession(next);
      setStage('profile');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.errorTitle);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="page-content passport-journey-page showcase-journey">
      <div className="showcase-toolbar">
        <button className="back-button" onClick={onClose} type="button">
          <ArrowLeft size={18} /> {t.back}
        </button>
        <label>
          {t.language}
          <select
            aria-label={t.language}
            value={locale}
            onChange={(event) => setLanguage(event.target.value as CicoLocale)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>
      <header className="passport-journey-heading">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
        </div>
      </header>
      <div className="showcase-truth-labels">
        <span className="live">
          <Fingerprint size={14} /> {t.live}
        </span>
        <span>
          <ShieldCheck size={14} /> {t.synthetic}
        </span>
        <span>
          <Check size={14} /> {t.simulated}
        </span>
      </div>

      {stage === 'promise' ? (
        <ShowcaseCard title={t.promiseTitle} icon={<ShieldCheck size={34} />}>
          <p>{t.promiseBody}</p>
          <div className="showcase-identity-stack">
            <span>
              <UserCircle size={19} />
              {t.identity}
            </span>
            <span>
              <Lock size={19} />
              {t.credential}
            </span>
            <span>
              <Globe size={19} />
              {t.nullifier}
            </span>
          </div>
          <Primary onClick={() => setStage('consent')}>{t.begin}</Primary>
        </ShowcaseCard>
      ) : null}

      {stage === 'consent' ? (
        <ShowcaseCard title={t.consentTitle} icon={<Fingerprint size={34} />}>
          <p>{t.consentBody}</p>
          <dl className="showcase-consent-fields">
            <div>
              <dt>{t.request}</dt>
              <dd>{t.displayName}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{t.network}</dd>
            </div>
          </dl>
          {error ? (
            <div className="passport-notice warning" role="alert">
              <ShieldCheck size={18} />
              <p>
                <strong>{t.errorTitle}</strong>
                <br />
                {error}
              </p>
            </div>
          ) : null}
          <Primary disabled={connecting} onClick={() => void connect()}>
            {connecting ? t.connecting : error ? t.retry : t.connect}
          </Primary>
          <Secondary
            onClick={() => {
              setSession(null);
              setStage('profile');
            }}
          >
            {error ? t.fallback : t.explore}
          </Secondary>
        </ShowcaseCard>
      ) : null}

      {stage === 'profile' ? (
        <ShowcaseCard title={t.profileTitle} icon={<UserCircle size={34} />}>
          <p>{t.profileBody}</p>
          <div className="showcase-profile">
            <Fingerprint size={22} />
            <strong>{session?.profile?.displayName ?? t.anonymous}</strong>
            {session ? <small>{t.live}</small> : null}
          </div>
          <a
            className="passport-action-button secondary"
            href="https://midnightpassport.com"
            rel="noreferrer"
            target="_blank"
          >
            {t.manage} <ArrowRight size={17} />
          </a>
          <Primary onClick={() => setStage('credential')}>{t.continue}</Primary>
        </ShowcaseCard>
      ) : null}

      {stage === 'credential' ? (
        <ShowcaseCard title={t.credentialTitle} icon={<ShieldCheck size={34} />}>
          <p>{t.credentialBody}</p>
          <div className="passport-notice warning">
            <Lock size={18} />
            <p>{t.synthetic}</p>
          </div>
          <Primary onClick={() => setStage('polls')}>{t.createSynthetic}</Primary>
        </ShowcaseCard>
      ) : null}

      {stage === 'polls' ? (
        <ShowcaseCard title={t.pollsTitle} icon={<Globe size={34} />}>
          <div className="showcase-poll-grid">
            <article>
              <h3>{t.global}</h3>
              <p>{t.globalBody}</p>
              <Secondary onClick={() => setStage('vote')}>{t.chooseGlobal}</Secondary>
            </article>
            <article>
              <h3>{t.country}</h3>
              <p>{t.countryBody}</p>
              <Secondary onClick={() => setStage('vote')}>{t.chooseCountry}</Secondary>
            </article>
          </div>
        </ShowcaseCard>
      ) : null}

      {stage === 'vote' ? (
        <ShowcaseCard title={t.voteTitle} icon={<Check size={34} />}>
          <p>{t.question}</p>
          <div className="showcase-choice-grid">
            {[t.yes, t.no, t.abstain].map((item) => (
              <button
                className={choice === item ? 'selected' : ''}
                key={item}
                onClick={() => setChoice(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <Primary disabled={!choice} onClick={() => setStage('receipt')}>
            {t.review}
          </Primary>
        </ShowcaseCard>
      ) : null}

      {stage === 'receipt' ? (
        <ShowcaseCard title={t.receiptTitle} icon={<Check size={34} />}>
          <p>{t.receiptBody}</p>
          <div className="choice-free-receipt">
            <span>{t.simulated}</span>
            <strong>showcase-local-{new Date().getUTCFullYear()}</strong>
          </div>
          <ul className="showcase-receipt-facts">
            <li>{t.publicFacts}</li>
            <li>{t.privateFacts}</li>
          </ul>
          <Primary onClick={onClose}>{t.done}</Primary>
        </ShowcaseCard>
      ) : null}
    </main>
  );
}

function ShowcaseCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="passport-journey-card" aria-labelledby="showcase-stage-title">
      <div className="passport-journey-icon">{icon}</div>
      <h2 id="showcase-stage-title">{title}</h2>
      {children}
    </section>
  );
}
function Primary({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="passport-action-button primary"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children} <ArrowRight size={18} />
    </button>
  );
}
function Secondary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="passport-action-button secondary" onClick={onClick} type="button">
      {children}
    </button>
  );
}
