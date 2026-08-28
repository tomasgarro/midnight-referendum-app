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
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
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
}: PreviewPassportJourneyProps) {
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
          <ArrowLeft size={18} /> Volver a la app
        </button>
        <span className="passport-demo-label">
          {mode === 'undeployed' ? 'UNDEPLOYED · PASSPORT PREVIEW' : 'PREVIEW · CREDENCIAL'}
        </span>
      </div>

      <header className="unified-onboarding-header">
        <div>
          <p className="eyebrow">Tu primer recorrido</p>
          <h1>Tu identidad no es tu voto</h1>
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
        {['Entender', 'Passport', 'Evidencia', 'Lista'].map((label, index) => {
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
          <ArrowLeft size={16} /> Paso anterior
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
          <p className="eyebrow">Antes de empezar</p>
          <h2 id="preview-consent-title" ref={headingRef} tabIndex={-1}>
            Conectá Midnight Passport
          </h2>
          <p>
            Passport establece la sesión y el consentimiento de perfil. No comparte tu respuesta ni
            se usa como sustituto de una credencial de nacionalidad.
          </p>
          {mode === 'undeployed' ? (
            <PrivacyNotice>
              Tu cuenta Passport se conecta en Preview. La cadena local de este entorno es otra
              superficie y sigue sin contrato desplegado; conectar una cuenta no la convierte en una
              cuenta local.
            </PrivacyNotice>
          ) : null}
          <PrivacyNotice>
            Solicitamos únicamente sesión y perfil visible. No pedimos wallet, voto, witnesses ni
            autorización de transacción.
          </PrivacyNotice>
          <JourneyButton busy={busy} onClick={connect}>
            Conectar Passport <ArrowRight size={19} />
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
          <p className="eyebrow">Paso 1 · sesión</p>
          <h2 id="preview-provider-title" ref={headingRef} tabIndex={-1}>
            Sesión Passport conectada
          </h2>
          <dl className="credential-summary">
            <div>
              <dt>Perfil</dt>
              <dd>{session?.profile?.displayName ?? 'Perfil aprobado'}</dd>
            </div>
            <div>
              <dt>Red</dt>
              <dd>{session?.network}</dd>
            </div>
            <div>
              <dt>Capacidades</dt>
              <dd>{session?.capabilities.join(', ')}</dd>
            </div>
          </dl>
          {mode === 'undeployed' ? (
            <div className="passport-notice info" role="status">
              <Info size={18} />
              <p>
                Cuenta Passport: <strong>{session?.network ?? 'preview'}</strong>. Cadena de la
                aplicación: <strong>local no desplegada</strong>. Estas redes no se mezclan.
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
                  ? 'Holder binding verificado para esta sesión Passport. El binding no se muestra ni se trata como un claim.'
                  : 'Esta versión de Passport no expone un holder binding verificado. La sesión no se presenta como una credencial.'}
              </p>
            </div>
          ) : null}
          {ports.credential ? (
            <>
              <PrivacyNotice>
                La evidencia documental se procesa mediante el adaptador configurado; Passport sigue
                siendo la superficie de sesión y consentimiento.
              </PrivacyNotice>
              <JourneyButton busy={busy} onClick={beginEnrollment}>
                Iniciar verificación documental <ArrowRight size={19} />
              </JourneyButton>
            </>
          ) : (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>
                {ports.configurationError ??
                  'Passport funciona, pero el gateway de evidencia y el emisor de credenciales aún no están configurados en este despliegue. No se sustituirán por datos sintéticos.'}
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
          <p className="eyebrow">Paso 2 · evidencia NFC/QR</p>
          <h2 id="preview-evidence-title" ref={headingRef} tabIndex={-1}>
            Completá la verificación en tu teléfono
          </h2>
          <p>
            El navegador conserva el holder binding. El backend recibe la prueba del proveedor y
            devuelve únicamente evidencia mínima verificada.
          </p>
          <dl className="credential-summary">
            <div>
              <dt>Estado</dt>
              <dd>{enrollmentStatus?.status ?? enrollment?.status ?? 'pending'}</dd>
            </div>
            <div>
              <dt>Vence</dt>
              <dd>{enrollment ? new Date(enrollment.expiresAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
          {lastCheckedAt ? (
            <p className="enrollment-last-checked" role="status">
              Última comprobación: {new Date(lastCheckedAt).toLocaleTimeString()}
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
                El enlace venció. Generá un enlace nuevo para volver a intentar la verificación.
              </p>
            </div>
          ) : null}
          <PrivacyNotice>
            CICO no muestra ni conserva MRZ, fecha de nacimiento, imagen, NFC o prueba cruda en el
            navegador.
          </PrivacyNotice>
          <JourneyButton busy={busy} onClick={checkEnrollment}>
            {error ? 'Reintentar verificación' : 'Comprobar verificación'} <ArrowRight size={19} />
          </JourneyButton>
          {enrollmentStatus?.status === 'pending' && !enrollmentExpired ? (
            <JourneyButton busy={busy} variant="secondary" onClick={restartEnrollment}>
              Cancelar verificación
            </JourneyButton>
          ) : null}
          {enrollmentExpired ||
          (enrollmentStatus &&
            enrollmentStatus.status !== 'pending' &&
            enrollmentStatus.status !== 'issued') ? (
            <JourneyButton busy={busy} onClick={restartEnrollment}>
              Empezar de nuevo <ArrowRight size={19} />
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
          <div className="mascot-reserved-slot" data-mascot="future-capybara" aria-hidden="true" />
          <p className="eyebrow">Paso 3 · credencial creada</p>
          <h2 id="preview-success-title" ref={headingRef} tabIndex={-1}>
            Tu credencial está lista
          </h2>
          <p>
            La credencial se puede usar para explorar consultas. La respuesta y cualquier acción
            posterior siguen separadas y no aparecen en esta credencial.
          </p>
          <div className="credential-success-summary">
            <span className="synthetic-credential-banner">
              <ShieldCheck size={16} /> CREDENCIAL VERIFICADA
            </span>
            <dl>
              <div>
                <dt>Nacionalidad</dt>
                <dd>{iso31661NumericToAlpha2[String(credential.country)] ?? credential.country}</dd>
              </div>
              <div>
                <dt>Clase de edad</dt>
                <dd>{credential.ageClass === '18-plus' ? '18+' : credential.ageClass}</dd>
              </div>
              <div>
                <dt>Assurance</dt>
                <dd>{credential.assurance}</dd>
              </div>
              <div>
                <dt>Válida hasta</dt>
                <dd>{new Date(credential.validUntil).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
          <div className="passport-notice success">
            <ShieldCheck size={18} />
            <p>Tu documento y tu futura elección no aparecen en el comprobante de identidad.</p>
          </div>
          <JourneyButton busy={false} onClick={finish}>
            Ir al panel cívico <ArrowRight size={19} />
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
  children,
  disabled = false,
  variant = 'primary',
  onClick,
}: {
  busy: boolean;
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
      {busy ? 'Procesando…' : children}
    </button>
  );
}
