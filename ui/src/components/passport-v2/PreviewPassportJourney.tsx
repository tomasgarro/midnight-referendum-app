import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Info,
  Lock,
  QrCode,
  ShieldCheck,
} from '@phosphor-icons/react';
import { iso31661NumericToAlpha2 } from 'iso-3166';
import type {
  CivicActionPort,
  CivicCredentialPort,
  CivicPassportSession,
  CredentialEnrollment,
  CredentialSummary,
  EnrollmentStatusSnapshot,
  PassportHolderBindingResult,
  PassportSessionPort,
} from 'midnight-referendum-api';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CapybaraMascot } from '@/components/mascot';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import { type CicoLocale, persistLocale } from '@/integration/locale';
import { passportHolderBindingPort } from '@/integration/passport-session-port';
import type { PassportV2RuntimeReferendum } from '@/integration/passport-v2-runtime-config';
import { EnrollmentHandoff } from './EnrollmentHandoff';

export interface PreviewPassportJourneyPorts {
  readonly passport: PassportSessionPort;
  readonly credential?: CivicCredentialPort;
  /** Kept in the port bundle for the post-onboarding action flow. */
  readonly actions?: CivicActionPort;
  readonly configurationError?: string;
  /** Kept for the dashboard/action runtime; onboarding does not display ballots. */
  readonly referenda?: readonly PassportV2RuntimeReferendum[];
  readonly runtimeCatalogConfigured?: boolean;
}

export type PreviewPassportJourneyMode = 'preview' | 'undeployed';

interface PreviewPassportJourneyProps {
  readonly ports: PreviewPassportJourneyPorts;
  readonly mode?: PreviewPassportJourneyMode;
  readonly onClose: () => void;
  readonly onCredentialReady?: (credential: DemoCredentialSummary) => void;
  readonly onPassportConnected?: (session: CivicPassportSession | null) => void;
  readonly initialLocale?: CicoLocale;
  readonly onLocaleChange?: (locale: CicoLocale) => void;
}

type PreviewStage = 'consent' | 'provider' | 'enrollment' | 'credential';

function toDisplayCredential(summary: CredentialSummary): DemoCredentialSummary {
  const country = iso31661NumericToAlpha2[String(summary.country)] ?? String(summary.country);
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

export function PreviewPassportJourney({
  ports,
  mode = 'preview',
  onClose,
  onCredentialReady,
  onPassportConnected,
  initialLocale,
  onLocaleChange,
}: PreviewPassportJourneyProps) {
  const [locale, setLocale] = useState<CicoLocale>(initialLocale ?? 'es');
  const [stage, setStage] = useState<PreviewStage>('consent');
  const [session, setSession] = useState<CivicPassportSession | null>(null);
  const [enrollment, setEnrollment] = useState<CredentialEnrollment | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusSnapshot | null>(null);
  const [credential, setCredential] = useState<CredentialSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [holderBinding, setHolderBinding] = useState<PassportHolderBindingResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const en = locale === 'en';
  const setLanguage = (next: CicoLocale) => {
    setLocale(next);
    persistLocale(next);
    onLocaleChange?.(next);
  };

  useLayoutEffect(() => {
    if (stage) headingRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage !== 'enrollment' || !enrollment) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [enrollment, stage]);

  const enrollmentExpired =
    Boolean(
      enrollment &&
        Number.isFinite(Date.parse(enrollment.expiresAt)) &&
        Date.parse(enrollment.expiresAt) <= now,
    ) || enrollmentStatus?.status === 'expired';

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos completar esta operación.');
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    run(async () => {
      const connected = await ports.passport.connect({
        origin: window.location.origin,
        network: 'preview',
        requestedCapabilities: ['session', 'profile'],
      });
      setSession(connected);
      const holderBindingPort = passportHolderBindingPort(ports.passport);
      if (holderBindingPort) {
        const result = await holderBindingPort.getHolderBinding({
          session: connected,
          network: 'preview',
        });
        setHolderBinding(result);
      }
      onPassportConnected?.(connected);
      setStage('provider');
    });

  const loadCredential = async () => {
    if (!ports.credential) throw new Error('El emisor cívico no está configurado.');
    const summary = await ports.credential.getCredentialSummary();
    if (summary?.status !== 'issued') {
      throw new Error('El emisor no devolvió una credencial vigente.');
    }
    setCredential(summary);
    setStage('credential');
  };

  const beginEnrollment = () =>
    run(async () => {
      if (!session || !ports.credential) throw new Error('La sesión Passport no está lista.');
      const created = await ports.credential.beginEnrollment({
        session,
        policy: { minimumAssurance: 'document-nfc', requireAdult: true },
      });
      setEnrollment(created);
      setLastCheckedAt(null);
      setEnrollmentStatus({
        enrollmentId: created.enrollmentId,
        status: created.status,
        updatedAt: created.createdAt,
      });
      if (created.status === 'issued') {
        await loadCredential();
      } else {
        setStage('enrollment');
      }
    });

  const checkEnrollment = () =>
    run(async () => {
      if (!enrollment || !ports.credential) throw new Error('No hay enrolamiento activo.');
      const status = await ports.credential.getEnrollmentStatus(enrollment.enrollmentId);
      setEnrollmentStatus(status);
      setLastCheckedAt(new Date().toISOString());
      if (status.status === 'pending') return;
      if (status.status !== 'issued') {
        setError(`La verificación terminó con estado ${status.status}.`);
        return;
      }
      await loadCredential();
    });

  const restartEnrollment = () =>
    run(async () => {
      await ports.credential?.clearCredential();
      setEnrollment(null);
      setEnrollmentStatus(null);
      setCredential(null);
      setLastCheckedAt(null);
      setStage('provider');
    });

  const finish = () => {
    if (!credential) return;
    onCredentialReady?.(toDisplayCredential(credential));
    onClose();
  };

  const previousStage: Partial<Record<PreviewStage, PreviewStage>> = {
    provider: 'consent',
    enrollment: 'provider',
    credential: 'enrollment',
  };

  return (
    <main className="page-content passport-journey-page unified-onboarding">
      <div className="showcase-toolbar unified-onboarding-toolbar">
        <button className="back-button" onClick={onClose} type="button">
          <ArrowLeft size={18} /> {en ? 'Back to app' : 'Volver a la app'}
        </button>
        <label>
          <span className="sr-only">{en ? 'Language' : 'Idioma'}</span>
          <select
            aria-label={en ? 'Language' : 'Idioma'}
            value={locale}
            onChange={(event) => setLanguage(event.target.value as CicoLocale)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <span className="passport-demo-label">
          {mode === 'undeployed'
            ? 'UNDEPLOYED · PASSPORT PREVIEW'
            : en
              ? 'PREVIEW · CREDENTIAL'
              : 'PREVIEW · CREDENCIAL'}
        </span>
      </div>

      <header className="unified-onboarding-header">
        <div>
          <p className="eyebrow">{en ? 'Your first journey' : 'Tu primer recorrido'}</p>
          <h1>{en ? 'Your identity is not your vote' : 'Tu identidad no es tu voto'}</h1>
        </div>
        <div className="unified-truth-labels">
          <span className="live">
            <Fingerprint size={14} /> PASSPORT EN VIVO
            {mode === 'undeployed' ? ' · CUENTA PREVIEW' : ''}
          </span>
          <span>
            {mode === 'undeployed' ? (
              <>
                <Info size={14} /> CADENA LOCAL · NO DESPLEGADA
              </>
            ) : (
              <>
                <ShieldCheck size={14} /> CREDENCIAL VERIFICADA
              </>
            )}
          </span>
        </div>
      </header>

      <ol className="unified-progress" aria-label="Tu primer recorrido">
        {(en
          ? ['Learn', 'Passport', 'Evidence', 'Ready']
          : ['Entender', 'Passport', 'Evidencia', 'Lista']
        ).map((label, index) => {
          const activeIndex = ['consent', 'provider', 'enrollment', 'credential'].indexOf(stage);
          return (
            <li
              className={index < activeIndex ? 'done' : index === activeIndex ? 'current' : ''}
              aria-current={index === activeIndex ? 'step' : undefined}
              key={label}
            >
              <span aria-hidden="true">
                {index < activeIndex ? <Check size={13} /> : index + 1}
              </span>
              <small>{label}</small>
            </li>
          );
        })}
      </ol>

      {previousStage[stage] ? (
        <button
          className="showcase-step-back"
          onClick={() => setStage(previousStage[stage] as PreviewStage)}
          type="button"
        >
          <ArrowLeft size={16} /> {en ? 'Previous step' : 'Paso anterior'}
        </button>
      ) : null}

      {error ? (
        <div className="passport-notice warning" role="alert">
          <Info size={18} />
          <p>{error}</p>
        </div>
      ) : null}

      {stage === 'consent' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="preview-consent-title"
        >
          <div className="unified-hero-icon">
            <Fingerprint size={38} />
          </div>
          <p className="eyebrow">{en ? 'Before you start' : 'Antes de empezar'}</p>
          <h2 id="preview-consent-title" ref={headingRef} tabIndex={-1}>
            {en ? 'Connect Midnight Passport' : 'Conectá Midnight Passport'}
          </h2>
          <p>
            {en
              ? 'Passport establishes your session and profile consent. It does not share your response or replace a country credential.'
              : 'Passport establece la sesión y el consentimiento de perfil. No comparte tu respuesta ni se usa como sustituto de una credencial de país.'}
          </p>
          {mode === 'undeployed' ? (
            <PrivacyNotice>
              {en
                ? 'Your Passport account connects on Preview. This environment’s local chain is a separate surface and has no deployed contract; connecting an account does not turn it into a local account.'
                : 'Tu cuenta Passport se conecta en Preview. La cadena local de este entorno es otra superficie y sigue sin contrato desplegado; conectar una cuenta no la convierte en una cuenta local.'}
            </PrivacyNotice>
          ) : null}
          <PrivacyNotice>
            {en
              ? 'We request only a session and visible profile. We do not request a wallet, vote, witnesses, or transaction approval.'
              : 'Solicitamos únicamente sesión y perfil visible. No pedimos wallet, voto, witnesses ni autorización de transacción.'}
          </PrivacyNotice>
          <JourneyButton locale={locale} busy={busy} onClick={connect}>
            {en ? 'Connect Passport' : 'Conectar Passport'} <ArrowRight size={19} />
          </JourneyButton>
        </section>
      ) : null}

      {stage === 'provider' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="preview-provider-title"
        >
          <div className="unified-hero-icon passport">
            <ShieldCheck size={38} />
          </div>
          <p className="eyebrow">{en ? 'Step 1 · session' : 'Paso 1 · sesión'}</p>
          <h2 id="preview-provider-title" ref={headingRef} tabIndex={-1}>
            {en ? 'Passport session connected' : 'Sesión Passport conectada'}
          </h2>
          <dl className="credential-summary">
            <div>
              <dt>{en ? 'Profile' : 'Perfil'}</dt>
              <dd>
                {session?.profile?.displayName ?? (en ? 'Approved profile' : 'Perfil aprobado')}
              </dd>
            </div>
            <div>
              <dt>{en ? 'Network' : 'Red'}</dt>
              <dd>{session?.network}</dd>
            </div>
            <div>
              <dt>{en ? 'Capabilities' : 'Capacidades'}</dt>
              <dd>{session?.capabilities.join(', ')}</dd>
            </div>
          </dl>
          {mode === 'undeployed' ? (
            <div className="passport-notice info" role="status">
              <Info size={18} />
              <p>
                {en ? 'Passport account:' : 'Cuenta Passport:'}{' '}
                <strong>{session?.network ?? 'preview'}</strong>.{' '}
                {en ? 'App chain:' : 'Cadena de la aplicación:'}{' '}
                <strong>{en ? 'undeployed local' : 'local no desplegada'}</strong>.{' '}
                {en ? 'These networks stay separate.' : 'Estas redes no se mezclan.'}
              </p>
            </div>
          ) : null}
          {holderBinding ? (
            <div
              className={`passport-notice ${holderBinding.status === 'verified' ? 'success' : 'info'}`}
              role="status"
            >
              {holderBinding.status === 'verified' ? <Check size={18} /> : <Info size={18} />}
              <p>
                {holderBinding.status === 'verified'
                  ? en
                    ? 'Holder binding verified for this Passport session. The binding is not shown or treated as a claim.'
                    : 'Holder binding verificado para esta sesión Passport. El binding no se muestra ni se trata como un claim.'
                  : en
                    ? 'This Passport build does not expose a verified holder binding. The session is not presented as a credential.'
                    : 'Esta versión de Passport no expone un holder binding verificado. La sesión no se presenta como una credencial.'}
              </p>
            </div>
          ) : null}
          {ports.credential ? (
            <>
              <PrivacyNotice>
                {en
                  ? 'Evidence is processed through the configured adapter; Passport remains the session and consent surface.'
                  : 'La evidencia se procesa mediante el adaptador configurado; Passport sigue siendo la superficie de sesión y consentimiento.'}
              </PrivacyNotice>
              <JourneyButton locale={locale} busy={busy} onClick={beginEnrollment}>
                {en ? 'Start evidence verification' : 'Iniciar verificación documental'}{' '}
                <ArrowRight size={19} />
              </JourneyButton>
            </>
          ) : (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>
                {ports.configurationError ??
                  (en
                    ? 'Passport works, but the evidence gateway and credential issuer are not configured in this deployment. They will not be replaced with synthetic data.'
                    : 'Passport funciona, pero el gateway de evidencia y el emisor de credenciales aún no están configurados en este despliegue. No se sustituirán por datos sintéticos.')}
              </p>
            </div>
          )}
        </section>
      ) : null}

      {stage === 'enrollment' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="preview-evidence-title"
        >
          <div className="unified-hero-icon evidence">
            <QrCode size={38} />
          </div>
          <p className="eyebrow">{en ? 'Step 2 · NFC/QR evidence' : 'Paso 2 · evidencia NFC/QR'}</p>
          <h2 id="preview-evidence-title" ref={headingRef} tabIndex={-1}>
            {en ? 'Complete verification on your phone' : 'Completá la verificación en tu teléfono'}
          </h2>
          <p>
            {en
              ? 'The browser keeps the holder binding. The backend receives provider proof and returns only minimal verified evidence.'
              : 'El navegador conserva el holder binding. El backend recibe la prueba del proveedor y devuelve únicamente evidencia mínima verificada.'}
          </p>
          <dl className="credential-summary">
            <div>
              <dt>{en ? 'Status' : 'Estado'}</dt>
              <dd>{enrollmentStatus?.status ?? enrollment?.status ?? 'pending'}</dd>
            </div>
            <div>
              <dt>{en ? 'Expires' : 'Vence'}</dt>
              <dd>{enrollment ? new Date(enrollment.expiresAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
          {lastCheckedAt ? (
            <p className="enrollment-last-checked" role="status">
              {en ? 'Last checked: ' : 'Última comprobación: '}
              {new Date(lastCheckedAt).toLocaleTimeString()}
            </p>
          ) : null}
          {enrollment?.interaction ? (
            <EnrollmentHandoff
              uri={enrollment.interaction.uri}
              expiresAt={enrollment.interaction.expiresAt}
            />
          ) : null}
          {enrollmentExpired ? (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>
                {en
                  ? 'The link expired. Create a new link to try verification again.'
                  : 'El enlace venció. Generá un enlace nuevo para volver a intentar la verificación.'}
              </p>
            </div>
          ) : null}
          <PrivacyNotice>
            {en
              ? 'CICO does not display or retain MRZ, date of birth, images, NFC data, or raw proof in the browser.'
              : 'CICO no muestra ni conserva MRZ, fecha de nacimiento, imagen, NFC o prueba cruda en el navegador.'}
          </PrivacyNotice>
          <JourneyButton locale={locale} busy={busy} onClick={checkEnrollment}>
            {error
              ? en
                ? 'Retry verification'
                : 'Reintentar verificación'
              : en
                ? 'Check verification'
                : 'Comprobar verificación'}{' '}
            <ArrowRight size={19} />
          </JourneyButton>
          {enrollmentStatus?.status === 'pending' && !enrollmentExpired ? (
            <JourneyButton
              locale={locale}
              busy={busy}
              variant="secondary"
              onClick={restartEnrollment}
            >
              {en ? 'Cancel verification' : 'Cancelar verificación'}
            </JourneyButton>
          ) : null}
          {enrollmentExpired ||
          (enrollmentStatus &&
            enrollmentStatus.status !== 'pending' &&
            enrollmentStatus.status !== 'issued') ? (
            <JourneyButton locale={locale} busy={busy} onClick={restartEnrollment}>
              {en ? 'Start over' : 'Empezar de nuevo'} <ArrowRight size={19} />
            </JourneyButton>
          ) : null}
        </section>
      ) : null}

      {stage === 'credential' && credential ? (
        <section
          className="passport-journey-card unified-card credential-success-card"
          aria-labelledby="preview-success-title"
        >
          <div className="credential-success-icon" aria-hidden="true">
            <Check size={42} />
          </div>
          <CapybaraMascot variant="achievement" decorative size="lg" />
          <p className="eyebrow">
            {en ? 'Step 3 · credential created' : 'Paso 3 · credencial creada'}
          </p>
          <h2 id="preview-success-title" ref={headingRef} tabIndex={-1}>
            {en ? 'Your credential is ready' : 'Tu credencial está lista'}
          </h2>
          <p>
            {en
              ? 'This credential can be used to explore consultations. Your response and any later action remain separate and do not appear in it.'
              : 'La credencial se puede usar para explorar consultas. La respuesta y cualquier acción posterior siguen separadas y no aparecen en esta credencial.'}
          </p>
          <div className="credential-success-summary">
            <span className="synthetic-credential-banner">
              <ShieldCheck size={16} /> {en ? 'VERIFIED CREDENTIAL' : 'CREDENCIAL VERIFICADA'}
            </span>
            <dl>
              <div>
                <dt>{en ? 'Country' : 'Nacionalidad'}</dt>
                <dd>{iso31661NumericToAlpha2[String(credential.country)] ?? credential.country}</dd>
              </div>
              <div>
                <dt>{en ? 'Age class' : 'Clase de edad'}</dt>
                <dd>{credential.ageClass === '18-plus' ? '18+' : credential.ageClass}</dd>
              </div>
              <div>
                <dt>Assurance</dt>
                <dd>{credential.assurance}</dd>
              </div>
              <div>
                <dt>{en ? 'Valid until' : 'Válida hasta'}</dt>
                <dd>{new Date(credential.validUntil).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
          <div className="passport-notice success">
            <ShieldCheck size={18} />
            <p>
              {en
                ? 'Your evidence and future choice do not appear in the identity receipt.'
                : 'Tu evidencia y tu futura elección no aparecen en el comprobante de identidad.'}
            </p>
          </div>
          <JourneyButton locale={locale} busy={false} onClick={finish}>
            {en ? 'Go to civic dashboard' : 'Ir al panel cívico'} <ArrowRight size={19} />
          </JourneyButton>
        </section>
      ) : null}
    </main>
  );
}

function PrivacyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="passport-notice info">
      <Lock size={18} />
      <p>{children}</p>
    </div>
  );
}

function JourneyButton({
  busy,
  locale = 'es',
  children,
  disabled = false,
  variant = 'primary',
  onClick,
}: {
  busy: boolean;
  locale?: CicoLocale;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}) {
  return (
    <button
      className={`passport-action-button ${variant}`}
      disabled={busy || disabled}
      onClick={onClick}
      type="button"
    >
      {busy ? (locale === 'es' ? 'Procesando…' : 'Processing…') : children}
    </button>
  );
}
