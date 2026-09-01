import { ArrowRight, Check, Info, Lock, ShieldCheck } from '@phosphor-icons/react';
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
import { JourneyTopBar, SuccessMark } from '@/components/system';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import { countryName } from '@/integration/country-catalog';
import { type CicoLocale, persistLocale } from '@/integration/locale';
import {
  clearPassportAttempt,
  loadPassportAttempt,
  savePassportAttempt,
} from '@/integration/passport-enrollment-state';
import { passportHolderBindingPort } from '@/integration/passport-session-port';
import './journey.css';
import type { PassportV2RuntimeReferendum } from '@/integration/passport-v2-runtime-config';
import { CredentialJourneyTutorial } from './CredentialJourneyTutorial';
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

/**
 * A resumed attempt intentionally contains no provider response or holder
 * material. It is enough to ask the adapter for a status and render the
 * waiting state; the QR is shown only during the original provider handoff.
 */
type ActiveEnrollment = Pick<CredentialEnrollment, 'enrollmentId' | 'expiresAt'> &
  Partial<Pick<CredentialEnrollment, 'status' | 'createdAt' | 'interaction'>>;

const ENROLLMENT_POLL_INTERVAL_MS = 5_000;
const PREVIEW_SCREENS: readonly PreviewStage[] = [
  'consent',
  'provider',
  'enrollment',
  'credential',
];
/** Provider enum values are not citizen copy. */
/**
 * This screen predates the third language and carried its copy as inline
 * English/Spanish ternaries. Rather than restructure a working flow into a copy
 * table mid-submission, those ternaries became three-argument picks: the same
 * shape, one more language, and every string still readable where it is used.
 */
function picker(locale: CicoLocale) {
  return (english: string, spanish: string, french: string) =>
    locale === 'fr' ? french : locale === 'en' ? english : spanish;
}

const ENROLLMENT_STATUS_LABEL = {
  es: {
    pending: 'esperando al proveedor',
    issued: 'credencial emitida',
    expired: 'el enlace venció',
    denied: 'el proveedor rechazó la verificación',
    failed: 'la verificación falló',
  },
  en: {
    pending: 'waiting for the provider',
    issued: 'credential issued',
    expired: 'the link expired',
    denied: 'the provider rejected the verification',
    failed: 'the verification failed',
  },
  fr: {
    pending: 'en attente du fournisseur',
    issued: 'justificatif émis',
    expired: 'le lien a expiré',
    denied: 'le fournisseur a refusé la vérification',
    failed: 'la vérification a échoué',
  },
} as const;
const PREVIEW_STAGE_LABEL = {
  es: { consent: 'Passport', provider: 'Sesión', enrollment: 'Evidencia', credential: 'Lista' },
  en: { consent: 'Passport', provider: 'Session', enrollment: 'Evidence', credential: 'Ready' },
  fr: { consent: 'Passport', provider: 'Session', enrollment: 'Preuve', credential: 'Prêt' },
} as const;

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
  const [enrollment, setEnrollment] = useState<ActiveEnrollment | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusSnapshot | null>(null);
  const [credential, setCredential] = useState<CredentialSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [holderBinding, setHolderBinding] = useState<PassportHolderBindingResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pollingRef = useRef(false);
  const checkEnrollmentRef = useRef<(automatic?: boolean) => Promise<void>>(async () => {});
  const en = locale === 'en';
  const pick = picker(locale);
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

  // A refresh can safely resume the opaque provider attempt. The adapter owns
  // the actual holder binding and provider state; the UI restores only the
  // enrollment handle and expiry from sessionStorage.
  useEffect(() => {
    let active = true;
    const attempt = loadPassportAttempt();
    if (!attempt)
      return () => {
        active = false;
      };

    void ports.passport
      .getSession()
      .then((restored) => {
        if (!active) return;
        if (restored?.status !== 'connected') {
          clearPassportAttempt();
          return;
        }
        setSession(restored);
        onPassportConnected?.(restored);
        setEnrollment({
          enrollmentId: attempt.enrollmentId,
          expiresAt: attempt.expiresAt,
          status: 'pending',
        });
        setEnrollmentStatus({
          enrollmentId: attempt.enrollmentId,
          status: 'pending',
          updatedAt: new Date().toISOString(),
        });
        setStage('enrollment');
      })
      .catch(() => {
        // A stale opaque handle is not evidence of a credential. Drop it and
        // require a fresh Passport consent + provider handoff.
        if (active) clearPassportAttempt();
      });
    return () => {
      active = false;
    };
  }, [onPassportConnected, ports.passport]);

  const enrollmentExpired =
    Boolean(
      enrollment &&
        Number.isFinite(Date.parse(enrollment.expiresAt)) &&
        Date.parse(enrollment.expiresAt) <= now,
    ) || enrollmentStatus?.status === 'expired';
  const enrollmentId = enrollment?.enrollmentId;
  const displayStatus = (
    enrollmentExpired ? 'expired' : (enrollmentStatus?.status ?? enrollment?.status ?? 'pending')
  ) as keyof (typeof ENROLLMENT_STATUS_LABEL)['es'];
  /* An expired link, a denial, or a provider failure all need the same thing:
     a new attempt. Checking again cannot help, so it stops being offered. */
  const needsFreshAttempt =
    enrollmentExpired ||
    Boolean(
      enrollmentStatus &&
        enrollmentStatus.status !== 'pending' &&
        enrollmentStatus.status !== 'issued',
    );

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
        clearPassportAttempt();
        await loadCredential();
      } else {
        savePassportAttempt({
          enrollmentId: created.enrollmentId,
          expiresAt: created.expiresAt,
        });
        setStage('enrollment');
      }
    });

  const checkEnrollment = async (automatic = false) => {
    if (pollingRef.current) return;
    if (!enrollment || !ports.credential) {
      if (!automatic) setError('No hay enrolamiento activo.');
      return;
    }
    if (enrollmentExpired && automatic) return;

    pollingRef.current = true;
    setPolling(true);
    setBusy(true);
    if (!automatic) setError(null);
    try {
      setLastCheckedAt(new Date().toISOString());
      const status = await ports.credential.getEnrollmentStatus(enrollment.enrollmentId);
      setEnrollmentStatus(status);
      if (status.status === 'pending') return;
      if (status.status !== 'issued') {
        setError(`La verificación terminó con estado ${status.status}.`);
        return;
      }
      clearPassportAttempt();
      await loadCredential();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : automatic
            ? 'No pudimos consultar el estado. Reintentaremos automáticamente.'
            : 'No pudimos consultar el estado.',
      );
    } finally {
      pollingRef.current = false;
      setPolling(false);
      setBusy(false);
    }
  };

  checkEnrollmentRef.current = checkEnrollment;

  useEffect(() => {
    if (
      stage !== 'enrollment' ||
      !enrollmentId ||
      enrollmentExpired ||
      enrollmentStatus?.status !== 'pending'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void checkEnrollmentRef.current(true);
    }, ENROLLMENT_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enrollmentId, enrollmentExpired, enrollmentStatus?.status, stage]);

  const restartEnrollment = () =>
    run(async () => {
      await ports.credential?.clearCredential();
      clearPassportAttempt();
      setEnrollment(null);
      setEnrollmentStatus(null);
      setCredential(null);
      setLastCheckedAt(null);
      setStage('provider');
    });

  const previousStage: Partial<Record<PreviewStage, PreviewStage>> = {
    provider: 'consent',
    enrollment: 'provider',
    credential: 'enrollment',
  };
  const screenIndex = Math.max(PREVIEW_SCREENS.indexOf(stage), 0);

  const finish = () => {
    if (!credential) return;
    onCredentialReady?.(toDisplayCredential(credential));
    onClose();
  };

  return (
    <main className="page-content passport-journey-page unified-onboarding preview-journey">
      {/* The same two-row header the demo journey uses. What it replaces here
          was eight stacked blocks: an exit link, a labelled language select, a
          mode label, an eyebrow, a display-size page title, two truth chips, a
          four-pill stepper, and a "Previous step" link -- all above a card
          whose own eyebrow announced a *different* step number than the pills
          did, because the pills counted screens and the eyebrows counted
          stages. There is one count now. */}
      <JourneyTopBar
        locale={locale}
        onLocaleChange={setLanguage}
        languageLabel={pick('Language', 'Idioma', 'Langue')}
        onExit={onClose}
        exitLabel={pick('Back to app', 'Volver a la app', "Retour à l'application")}
        {...(previousStage[stage]
          ? { onBack: () => setStage(previousStage[stage] as PreviewStage) }
          : {})}
        backLabel={pick('Previous step', 'Paso anterior', 'Étape précédente')}
        badge={
          mode === 'undeployed' ? pick('Local chain', 'Cadena local', 'Chaîne locale') : 'Preview'
        }
        current={screenIndex + 1}
        total={PREVIEW_SCREENS.length}
        stageLabel={PREVIEW_STAGE_LABEL[locale][stage]}
        progressLabel={
          en
            ? `Step ${screenIndex + 1} of ${PREVIEW_SCREENS.length}`
            : `Paso ${screenIndex + 1} de ${PREVIEW_SCREENS.length}`
        }
      />

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
          <h2 id="preview-consent-title" ref={headingRef} tabIndex={-1}>
            {pick(
              'Connect Midnight Passport',
              'Conectá Midnight Passport',
              'Connectez Midnight Passport',
            )}
          </h2>
          <p>
            {pick(
              'Passport establishes your session and profile consent. It does not share your response or replace a country credential.',
              'Passport establece la sesión y el consentimiento de perfil. No comparte tu respuesta ni se usa como sustituto de una credencial de país.',
              'Passport établit votre session et le consentement de profil. Il ne partage pas votre réponse et ne remplace pas un justificatif de pays.',
            )}
          </p>
          {/* The boundary belongs at the moment consent is asked for, not one
              screen later as a summary of what already happened. Two stacked
              lock notices used to make the same promise twice here; this is
              the same promise, itemised once. */}
          <dl className="unified-consent-grid">
            <div>
              <dt>{pick('Requested', 'Se solicita', 'Demandé')}</dt>
              <dd>
                <Check size={16} />
                {pick(
                  'Session and approved profile',
                  'Sesión y perfil aprobado',
                  'Session et profil approuvé',
                )}
              </dd>
            </div>
            <div>
              <dt>{pick('Not requested', 'No se solicita', 'Non demandé')}</dt>
              <dd>
                <Lock size={16} />
                {pick(
                  'Wallet, vote, witnesses, or transaction approval',
                  'Wallet, voto, witnesses ni autorización de transacción',
                  'Portefeuille, vote, témoins ou approbation de transaction',
                )}
              </dd>
            </div>
          </dl>
          {mode === 'undeployed' ? (
            <details className="journey-why">
              <summary>
                {pick(
                  'Which network am I connecting to?',
                  '¿A qué red me estoy conectando?',
                  'À quel réseau est-ce que je me connecte ?',
                )}
              </summary>
              <div>
                {pick(
                  'Your Passport account connects on Preview. This environment’s local chain is a separate surface and has no deployed contract; connecting an account does not turn it into a local account.',
                  'Tu cuenta Passport se conecta en Preview. La cadena local de este entorno es otra superficie y sigue sin contrato desplegado; conectar una cuenta no la convierte en una cuenta local.',
                  "Votre compte Passport se connecte sur Preview. La chaîne locale de cet environnement est une surface distincte et n'a aucun contrat déployé ; connecter un compte n'en fait pas un compte local.",
                )}
              </div>
            </details>
          ) : null}
          <JourneyButton locale={locale} busy={busy} onClick={connect}>
            {pick('Connect Passport', 'Conectar Passport', 'Connecter Passport')}{' '}
            <ArrowRight size={19} />
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
          <h2 id="preview-provider-title" ref={headingRef} tabIndex={-1}>
            {pick(
              'Passport session connected',
              'Sesión Passport conectada',
              'Session Passport connectée',
            )}
          </h2>
          <dl className="credential-summary">
            <div>
              <dt>{pick('Profile', 'Perfil', 'Profil')}</dt>
              <dd>
                {session?.profile?.displayName ??
                  pick('Approved profile', 'Perfil aprobado', 'Profil approuvé')}
              </dd>
            </div>
            <div>
              <dt>{pick('Network', 'Red', 'Réseau')}</dt>
              <dd>{session?.network}</dd>
            </div>
            <div>
              <dt>{pick('Capabilities', 'Capacidades', 'Capacités')}</dt>
              <dd>{session?.capabilities.join(', ')}</dd>
            </div>
          </dl>
          {mode === 'undeployed' ? (
            <div className="passport-notice info" role="status">
              <Info size={18} />
              <p>
                {pick('Passport account:', 'Cuenta Passport:', 'Compte Passport :')}{' '}
                <strong>{session?.network ?? 'preview'}</strong>.{' '}
                {pick('App chain:', 'Cadena de la aplicación:', "Chaîne de l'application :")}{' '}
                <strong>
                  {pick('undeployed local', 'local no desplegada', 'locale non déployée')}
                </strong>
                .{' '}
                {pick(
                  'These networks stay separate.',
                  'Estas redes no se mezclan.',
                  'Ces réseaux restent séparés.',
                )}
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
                  ? pick(
                      'Holder binding verified for this Passport session. The binding is not shown or treated as a claim.',
                      'Holder binding verificado para esta sesión Passport. El binding no se muestra ni se trata como un claim.',
                      "Le lien avec le porteur est vérifié pour cette session Passport. Il n'est ni affiché ni traité comme une revendication.",
                    )
                  : pick(
                      'This Passport build does not expose a verified holder binding. The session is not presented as a credential.',
                      'Esta versión de Passport no expone un holder binding verificado. La sesión no se presenta como una credencial.',
                      "Cette version de Passport n'expose pas de lien vérifié avec le porteur. La session n'est pas présentée comme un justificatif.",
                    )}
              </p>
            </div>
          ) : null}
          {/* The boundary was agreed on the previous screen and is not
              restated here; what belongs on this screen is what came back. */}
          {ports.credential ? (
            <>
              <PrivacyNotice>
                {pick(
                  'Evidence is processed through the configured adapter; Passport remains the session and consent surface.',
                  'La evidencia se procesa mediante el adaptador configurado; Passport sigue siendo la superficie de sesión y consentimiento.',
                  "Les preuves passent par l'adaptateur configuré ; Passport reste la surface de session et de consentement.",
                )}
              </PrivacyNotice>
              <JourneyButton locale={locale} busy={busy} onClick={beginEnrollment}>
                {pick(
                  'Start evidence verification',
                  'Iniciar verificación documental',
                  'Démarrer la vérification documentaire',
                )}{' '}
                <ArrowRight size={19} />
              </JourneyButton>
            </>
          ) : (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>
                {ports.configurationError ??
                  pick(
                    'Passport works, but the evidence gateway and credential issuer are not configured in this deployment. They will not be replaced with synthetic data.',
                    'Passport funciona, pero el gateway de evidencia y el emisor de credenciales aún no están configurados en este despliegue. No se sustituirán por datos sintéticos.',
                    "Passport fonctionne, mais la passerelle de preuves et l'émetteur de justificatifs ne sont pas configurés dans ce déploiement. Ils ne seront pas remplacés par des données synthétiques.",
                  )}
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
          <h2 id="preview-evidence-title" ref={headingRef} tabIndex={-1}>
            {pick(
              'Complete verification on your phone',
              'Completá la verificación en tu teléfono',
              'Terminez la vérification sur votre téléphone',
            )}
          </h2>
          <p>
            {pick(
              'The browser keeps the holder binding. The backend receives provider proof and returns only minimal verified evidence.',
              'El navegador conserva el holder binding. El backend recibe la prueba del proveedor y devuelve únicamente evidencia mínima verificada.',
              'Le navigateur conserve le lien avec le porteur. Le serveur reçoit la preuve du fournisseur et ne renvoie que des preuves minimales vérifiées.',
            )}
          </p>
          <dl className="credential-summary">
            <div>
              <dt>{pick('Status', 'Estado', 'Statut')}</dt>
              {/* Once the link's own expiry has passed, "waiting for the
                  provider" is no longer true: the attempt cannot succeed. The
                  clock outranks the last status the provider reported. */}
              <dd>{ENROLLMENT_STATUS_LABEL[locale][displayStatus] ?? displayStatus}</dd>
            </div>
            <div>
              <dt>{pick('Expires', 'Vence', 'Expire')}</dt>
              <dd>{enrollment ? new Date(enrollment.expiresAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
          {/* "Última comprobación" used to print here AND again inside the
              polling status a few rows down, with the same value. One clock. */}
          {enrollment?.interaction ? (
            <EnrollmentHandoff
              uri={enrollment.interaction.uri}
              expiresAt={enrollment.interaction.expiresAt}
              locale={locale}
            />
          ) : null}
          <CredentialJourneyTutorial locale={locale} />
          {enrollmentExpired ? (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>
                {pick(
                  'The link expired. Create a new link to try verification again.',
                  'El enlace venció. Generá un enlace nuevo para volver a intentar la verificación.',
                  'Le lien a expiré. Créez un nouveau lien pour réessayer la vérification.',
                )}
              </p>
            </div>
          ) : null}
          {/* The handoff block above already itemises what is requested, what
              is not, who is asking, and what is retained. Repeating the
              retention line here made the same promise twice on one screen. */}
          <div className="passport-poll-status" role="status" aria-live="polite">
            <span
              className={polling ? 'passport-poll-dot active' : 'passport-poll-dot'}
              aria-hidden="true"
            />
            <span>
              <strong>
                {polling
                  ? pick(
                      'Checking with the provider…',
                      'Consultando al proveedor…',
                      'Consultation du fournisseur…',
                    )
                  : pick(
                      'Waiting for the provider',
                      'Esperando al proveedor',
                      'En attente du fournisseur',
                    )}
              </strong>
              <small>
                {lastCheckedAt
                  ? `${pick('Last checked', 'Última comprobación', 'Dernière vérification')}: ${new Date(lastCheckedAt).toLocaleTimeString()}`
                  : pick(
                      'Automatic checks every few seconds',
                      'Comprobación automática cada pocos segundos',
                      'Vérification automatique toutes les quelques secondes',
                    )}
              </small>
            </span>
          </div>
          {/* One primary action, decided by the state the attempt is actually
              in. Three filled buttons used to stack here -- "Check", "Cancel"
              and "Start over" -- all the same weight, so the screen offered no
              opinion about what to do next. Recovery is still one tap away; it
              is just no longer competing with the thing that usually works. */}
          {needsFreshAttempt ? (
            <JourneyButton locale={locale} busy={busy} onClick={restartEnrollment}>
              {pick('Get a new link', 'Generar un enlace nuevo', 'Générer un nouveau lien')}{' '}
              <ArrowRight size={19} />
            </JourneyButton>
          ) : (
            <>
              <JourneyButton locale={locale} busy={busy} onClick={() => void checkEnrollment()}>
                {error
                  ? pick(
                      'Retry verification',
                      'Reintentar verificación',
                      'Réessayer la vérification',
                    )
                  : pick('Check now', 'Comprobar ahora', 'Vérifier maintenant')}{' '}
                <ArrowRight size={19} />
              </JourneyButton>
              <button
                type="button"
                className="passport-action-button quiet"
                disabled={busy}
                onClick={restartEnrollment}
              >
                {pick(
                  'Cancel and start over',
                  'Cancelar y empezar de nuevo',
                  'Annuler et recommencer',
                )}
              </button>
            </>
          )}
        </section>
      ) : null}

      {stage === 'credential' && credential ? (
        <section
          className="passport-journey-card unified-card credential-success-card"
          aria-labelledby="preview-success-title"
        >
          <div className="journey-success-hero">
            <CapybaraMascot variant="achievement" decorative size={168} />
            <SuccessMark
              label={pick('Credential created', 'Credencial creada', 'Justificatif créé')}
              size="sm"
            />
          </div>
          <h2 id="preview-success-title" ref={headingRef} tabIndex={-1}>
            {pick(
              'Your credential is ready',
              'Tu credencial está lista',
              'Votre justificatif est prêt',
            )}
          </h2>
          <p>
            {pick(
              'This credential can be used to explore consultations. Your response and any later action remain separate and do not appear in it.',
              'La credencial se puede usar para explorar consultas. La respuesta y cualquier acción posterior siguen separadas y no aparecen en esta credencial.',
              "Ce justificatif permet d'explorer les consultations. Votre réponse et toute action ultérieure restent séparées et n'y figurent pas.",
            )}
          </p>
          <div className="credential-success-summary">
            <span className="synthetic-credential-banner">
              <ShieldCheck size={16} />{' '}
              {pick('VERIFIED CREDENTIAL', 'CREDENCIAL VERIFICADA', 'JUSTIFICATIF VÉRIFIÉ')}
            </span>
            <dl>
              <div>
                <dt>{pick('Verified country', 'País verificado', 'Pays vérifié')}</dt>
                <dd className="credential-country-value">
                  <span>
                    {countryName(
                      iso31661NumericToAlpha2[String(credential.country)] ?? credential.country,
                      locale,
                    )}
                  </span>
                  <small>
                    {iso31661NumericToAlpha2[String(credential.country)] ?? credential.country}
                  </small>
                </dd>
              </div>
              <div>
                <dt>{pick('Age class', 'Clase de edad', "Classe d'âge")}</dt>
                <dd>{credential.ageClass === '18-plus' ? '18+' : credential.ageClass}</dd>
              </div>
              <div>
                <dt>{pick('Issuer', 'Emisor', 'Émetteur')}</dt>
                <dd>{credential.issuerId}</dd>
              </div>
              <div>
                <dt>Assurance</dt>
                <dd>{credential.assurance}</dd>
              </div>
              <div>
                <dt>{pick('Valid until', 'Válida hasta', "Valable jusqu'au")}</dt>
                <dd>{new Date(credential.validUntil).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
          <div className="passport-notice success">
            <ShieldCheck size={18} />
            <p>
              {pick(
                'Your evidence and future choice do not appear in the identity receipt.',
                'Tu evidencia y tu futura elección no aparecen en el comprobante de identidad.',
                "Vos preuves et votre futur choix n'apparaissent pas dans le reçu d'identité.",
              )}
            </p>
          </div>
          <JourneyButton locale={locale} busy={false} onClick={finish}>
            {pick(
              'Go to civic dashboard',
              'Ir al panel cívico',
              'Aller au tableau de bord civique',
            )}{' '}
            <ArrowRight size={19} />
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
      {busy ? picker(locale)('Processing…', 'Procesando…', 'Traitement…') : children}
    </button>
  );
}
