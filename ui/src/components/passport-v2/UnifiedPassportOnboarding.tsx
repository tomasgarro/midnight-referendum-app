import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Fingerprint,
  Globe,
  Info,
  Lock,
  QrCode,
  ShieldCheck,
} from '@phosphor-icons/react';
import type {
  CivicPassportSession,
  PassportHolderBindingResult,
  PassportSessionPort,
} from 'midnight-referendum-api';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CapybaraMascot } from '@/components/mascot';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { OnboardingStage } from '@/integration/civic-state';
import {
  ASSIGNED_COUNTRIES,
  countryLabel,
  countryName,
  findAssignedCountry,
} from '@/integration/country-catalog';
import { type CicoLocale, detectLocale, persistLocale } from '@/integration/locale';
import {
  detectPlatformPasskeyReadiness,
  type PasskeyReadiness,
} from '@/integration/passkey-readiness';
import { passportHolderBindingPort } from '@/integration/passport-session-port';

type OnboardingMode = 'demo' | 'showcase' | 'undeployed';

interface UnifiedPassportOnboardingProps {
  mode: OnboardingMode;
  passportPort?: PassportSessionPort;
  onClose: () => void;
  /** Required first-run onboarding cannot exit into an unexplained dashboard. */
  dismissible?: boolean;
  onCredentialReady?: (credential: DemoCredentialSummary) => void;
  onPassportConnected?: (session: CivicPassportSession | null) => void;
  initialLocale?: CicoLocale;
  onLocaleChange?: (locale: CicoLocale) => void;
}

const DEFAULT_DEMO_COUNTRY = 'AR';
const PREVIOUS_STAGE: Partial<Record<OnboardingStage, OnboardingStage>> = {
  privacy: 'welcome',
  passport: 'privacy',
  'consent-return': 'passport',
  eligibility: 'consent-return',
  'demo-country': 'eligibility',
  'credential-success': 'demo-country',
};

function createDemoCredential(country: string): DemoCredentialSummary {
  return {
    kind: 'synthetic-demo-credential',
    issuer: 'cico-demo-issuer',
    country,
    ageClass: '18+',
    assurance: 'fixture',
    epoch: 'preview-2026-08',
    validUntil: '2026-09-30',
    commitment: '0x7a91…c420',
  };
}

const copy = {
  es: {
    back: 'Volver a la app',
    title: 'Tu identidad no es tu voto',
    eyebrow: 'Tu primer recorrido',
    language: 'Idioma',
    stages: ['Bienvenida', 'Passport', 'Evidencia', 'Lista'],
    live: 'Passport en vivo',
    demo: 'Passport de demo',
    demoEnvironment: 'Entorno de demostración',
    origin: 'Origen',
    originSynthetic: 'Credencial sintética',
    providerOwned: 'proveedor responsable',
    beforeStart: 'Antes de empezar',
    welcomeTitle: 'Demostrá que podés votar. Sin demostrar quién sos.',
    welcomeBody:
      'En estas consultas públicas, tu identidad y tu respuesta viajan separadas. Primero te mostramos cómo funciona; después decidís si querés conectar Passport.',
    start: 'Comenzar',
    explore: 'Explorar sin conectar',
    privacyEyebrow: 'Privacidad en tres partes',
    privacyTitle: 'Tres cosas distintas, una experiencia simple',
    privacyBody:
      'Passport identifica tu sesión. Una credencial demuestra una regla de elegibilidad. Tu respuesta cívica queda separada de ambas.',
    privacyItems: [
      ['Passport', 'Es tu inicio de sesión seguro. Solo recibe los campos de perfil que apruebes.'],
      [
        'Credencial',
        'Un proveedor confirma tu evidencia y entrega los datos mínimos, sin conservar tu documento.',
      ],
      ['Respuesta', 'Tu elección o acción nunca se convierte en tu identidad Passport.'],
    ],
    continue: 'Continuar',
    passportStep: 'Paso 1 · consentimiento',
    passportTitle: 'Conectá tu Passport',
    passportBody:
      'Passport es tu inicio de sesión seguro: crea y administra tu identidad. CICO solo recibe los campos de perfil que apruebes; no creamos una cuenta Passport dentro de esta app.',
    requested: 'Se solicita',
    requestedValue: 'Sesión y perfil aprobado',
    notRequested: 'No se solicita',
    notRequestedValue: 'Wallet, voto, nacionalidad, edad o documento',
    connect: 'Continuar con Passport',
    connectDemo: 'Usar Passport de demo',
    connecting: 'Esperando tu consentimiento…',
    connected: 'Sesión aprobada',
    consentStep: 'Paso 2 · regreso seguro',
    consentTitle: 'Esto es lo que Passport compartió',
    consentBody:
      'La sesión volvió correctamente. El nombre visible sirve para mostrar tu cuenta; no se transforma en un claim de nacionalidad, edad o voto.',
    approved: 'Aprobado por vos',
    approvedValue: 'Sesión Passport y nombre visible',
    walletTitle: 'La wallet viene después',
    walletBody:
      'Passport gestiona tu identidad. El proveedor gestiona la evidencia. Una wallet solo aparece más adelante, para aprobar una acción real. Este recorrido de demo no la necesita.',
    eligibilityStep: 'Paso 3 · elegibilidad',
    eligibilityTitle: 'Prepará una credencial, no un voto',
    eligibilityBody:
      'Más adelante vas a poder usar un teléfono con NFC para verificar tu documento de forma segura. Por ahora, esto es una demostración: no leemos ningún documento real ni generamos una prueba real.',
    evidenceSteps: [
      ['Pedido preparado', 'Se crea un vínculo temporal con este navegador.'],
      [
        'Verificación con NFC o QR',
        'Un dispositivo compatible confirma la evidencia fuera de esta pantalla.',
      ],
      ['Datos mínimos', 'El emisor guarda solo lo necesario para confirmar que sos elegible.'],
    ],
    future: 'DEMO · SIN LECTURA NFC NI PRUEBA REAL',
    prepare: 'Preparar credencial',
    countryStep: 'Paso 4 · país de prueba',
    countryTitle: 'Elegí el país de esta demo',
    countryBody:
      'La selección solo configura una credencial sintética para probar la experiencia. No es una nacionalidad real, no se guarda como identidad y podés cambiarla cuando quieras.',
    countryLabel: 'País de prueba',
    countryHelp:
      'Buscá por nombre o código ISO. En una integración real, el proveedor devolverá el país verificado.',
    useCountry: 'Usar este país',
    successStep: 'Listo · credencial creada',
    successTitle: 'Tu credencial está lista',
    successBody:
      'La credencial sintética te permite explorar el panel y ver qué espacios estarían disponibles. No prueba que un documento real haya sido verificado.',
    country: 'País de prueba',
    age: 'Clase de edad',
    issuer: 'Emisor',
    issuerValue: 'CICO demo · prueba',
    dashboard: 'Ir al panel cívico',
    privacy: 'Tu documento, secreto de voto y elección no aparecen en esta credencial.',
    unavailableTitle: 'La credencial todavía no está conectada',
    unavailableBody:
      'Este entorno puede mostrar la sesión Passport, pero no tiene un proveedor de evidencia configurado. Podés explorar World sin inventar una nacionalidad.',
    unavailableAction: 'Explorar World',
    error: 'No se pudo conectar Passport. Revisá el consentimiento e intentá otra vez.',
    passkeyTitle: 'Preparación de este dispositivo',
    passkeyChecking: 'Comprobando si hay un autenticador de plataforma…',
    passkeyAvailable: 'Este dispositivo informa que hay un autenticador de plataforma disponible.',
    passkeyUnavailable: 'Este dispositivo no informó un autenticador de plataforma.',
    passkeyUnknown: 'Este navegador no expuso una señal de autenticador de plataforma.',
    passkeyDisclaimer:
      'Es solo una señal técnica: no crea una passkey, no conecta una wallet y no prueba una integración con Passport o Gero.',
    holderBindingVerified:
      'Holder binding verificado para esta sesión. No mostramos sus bytes ni lo tratamos como un claim de elegibilidad.',
    holderBindingUnsupported:
      'Esta versión de Passport no expone un holder binding verificado. La sesión sigue separada de la credencial.',
  },
  en: {
    back: 'Back to the app',
    title: 'Your identity is not your vote',
    eyebrow: 'Your first journey',
    language: 'Language',
    stages: ['Welcome', 'Passport', 'Evidence', 'Ready'],
    live: 'Live Passport',
    demo: 'Demo Passport',
    demoEnvironment: 'Demo environment',
    origin: 'Origin',
    originSynthetic: 'Synthetic credential',
    providerOwned: 'provider-owned',
    beforeStart: 'Before you start',
    welcomeTitle: 'Prove you can vote. Without proving who you are.',
    welcomeBody:
      'In these public consultations, your identity and your response travel separately. We will show you how it works first, then you decide whether to connect Passport.',
    start: 'Get started',
    explore: 'Explore without connecting',
    privacyEyebrow: 'Privacy in three parts',
    privacyTitle: 'Three separate things, one simple experience',
    privacyBody:
      'Passport identifies your session. A credential proves an eligibility rule. Your civic response stays separate from both.',
    privacyItems: [
      ['Passport', 'Your secure sign-in. It receives only the profile fields you approve.'],
      [
        'Credential',
        'A provider confirms your evidence and hands over minimal data, without keeping your document.',
      ],
      ['Response', 'Your choice or civic action never becomes your Passport identity.'],
    ],
    continue: 'Continue',
    passportStep: 'Step 1 · consent',
    passportTitle: 'Connect your Passport',
    passportBody:
      'Passport is your secure sign-in: it creates and manages your identity. CICO receives only the profile fields you approve; this app never creates a Passport account internally.',
    requested: 'Requested',
    requestedValue: 'Session and approved profile',
    notRequested: 'Not requested',
    notRequestedValue: 'Wallet, vote, nationality, age, or document',
    connect: 'Continue with Passport',
    connectDemo: 'Use demo Passport',
    connecting: 'Waiting for your consent…',
    connected: 'Session approved',
    consentStep: 'Step 2 · secure return',
    consentTitle: 'This is what Passport shared',
    consentBody:
      'The session returned successfully. The display name identifies your account in this interface; it does not become a nationality, age, or voting claim.',
    approved: 'Approved by you',
    approvedValue: 'Passport session and display name',
    walletTitle: 'The wallet comes later',
    walletBody:
      'Passport handles your identity. A provider handles the evidence. A wallet only shows up later, to approve a real action. This demo journey needs no wallet.',
    eligibilityStep: 'Step 3 · eligibility',
    eligibilityTitle: 'Prepare a credential, not a vote',
    eligibilityBody:
      'Later on, you will be able to use an NFC-enabled phone to verify your document securely. For now, this is a demo: no real document is read and nothing real is generated.',
    evidenceSteps: [
      ['Request prepared', 'A temporary link is created with this browser.'],
      ['NFC or QR check', 'A compatible device confirms the evidence outside this screen.'],
      ['Minimal data', 'The issuer keeps only what is needed to confirm you are eligible.'],
    ],
    future: 'DEMO · NO NFC READ OR REAL PROOF',
    prepare: 'Prepare credential',
    countryStep: 'Step 4 · test country',
    countryTitle: 'Choose this demo’s country',
    countryBody:
      'This selection only configures a synthetic credential for testing the experience. It is not a real nationality, is not saved as identity, and can be changed at any time.',
    countryLabel: 'Test country',
    countryHelp:
      'Search by name or ISO code. In a real integration, the provider returns the verified country.',
    useCountry: 'Use this country',
    successStep: 'Ready · credential created',
    successTitle: 'Your credential is ready',
    successBody:
      'The synthetic credential lets you explore the dashboard and see which areas would be available. It does not prove a real document was verified.',
    country: 'Test country',
    age: 'Age class',
    issuer: 'Issuer',
    issuerValue: 'CICO demo · test',
    dashboard: 'Go to civic dashboard',
    privacy: 'Your document, voting secret, and choice do not appear in this credential.',
    unavailableTitle: 'The credential is not connected yet',
    unavailableBody:
      'This environment can show a Passport session, but it has no evidence provider configured. You can explore World without inventing a nationality.',
    unavailableAction: 'Explore World',
    error: 'Passport could not connect. Check consent and try again.',
    passkeyTitle: 'Device readiness',
    passkeyChecking: 'Checking for a platform authenticator…',
    passkeyAvailable: 'This device reports that a platform authenticator is available.',
    passkeyUnavailable: 'This device did not report a platform authenticator.',
    passkeyUnknown: 'This browser did not expose a platform-authenticator signal.',
    passkeyDisclaimer:
      'This is only a technical signal: it creates no passkey, connects no wallet, and does not prove a Passport or Gero integration.',
    holderBindingVerified:
      'Holder binding verified for this session. We do not display its bytes or treat it as an eligibility claim.',
    holderBindingUnsupported:
      'This Passport build does not expose a verified holder binding. The session remains separate from any credential.',
  },
} as const;

export function UnifiedPassportOnboarding({
  mode,
  passportPort,
  onClose,
  dismissible = true,
  onCredentialReady,
  onPassportConnected,
  initialLocale,
  onLocaleChange,
}: UnifiedPassportOnboardingProps) {
  const [locale, setLocale] = useState<CicoLocale>(() => initialLocale ?? detectLocale());
  const [stage, setStage] = useState<OnboardingStage>('welcome');
  const [session, setSession] = useState<CivicPassportSession | null>(null);
  const [holderBinding, setHolderBinding] = useState<PassportHolderBindingResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCountry, setDemoCountry] = useState(DEFAULT_DEMO_COUNTRY);
  const [countryInputValue, setCountryInputValue] = useState('Argentina (AR)');
  const [passkeyReadiness, setPasskeyReadiness] = useState<PasskeyReadiness | 'checking'>(
    'checking',
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const initialRender = useRef(false);
  const t = copy[locale];
  const previousStage =
    mode === 'showcase' && stage === 'credential-success' ? 'eligibility' : PREVIOUS_STAGE[stage];
  const selectedCountry = useMemo(() => findAssignedCountry(demoCountry), [demoCountry]);

  useLayoutEffect(() => {
    if (!initialRender.current) {
      initialRender.current = true;
      return;
    }
    if (stage) headingRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    let active = true;
    void detectPlatformPasskeyReadiness().then((readiness) => {
      if (active) setPasskeyReadiness(readiness);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = (next: CicoLocale) => {
    setLocale(next);
    persistLocale(next);
    onLocaleChange?.(next);
  };

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      let next: CivicPassportSession;
      if (mode !== 'demo') {
        if (!passportPort) throw new Error(t.error);
        next = await passportPort.connect({
          origin: window.location.origin,
          network: 'preview',
          requestedCapabilities: ['session', 'profile'],
        });
      } else {
        next = {
          sessionId: `local-demo-${mode}`,
          origin: window.location.origin,
          network: 'devnet',
          status: 'connected',
          profile: { displayName: 'Ciudadano demo' },
          capabilities: ['session', 'profile'],
        };
      }
      if (mode !== 'demo' && passportPort) {
        const holderBindingPort = passportHolderBindingPort(passportPort);
        if (holderBindingPort) {
          const result = await holderBindingPort.getHolderBinding({
            session: next,
            network: 'preview',
          });
          setHolderBinding(result);
        }
      }
      setSession(next);
      onPassportConnected?.(next);
      setStage('consent-return');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.error);
    } finally {
      setConnecting(false);
    }
  };

  const finish = () => {
    if (mode !== 'showcase' && selectedCountry) {
      onCredentialReady?.(createDemoCredential(selectedCountry.alpha2));
    }
    onClose();
  };

  const progressIndex =
    stage === 'welcome' || stage === 'privacy'
      ? 0
      : stage === 'passport' || stage === 'consent-return'
        ? 1
        : stage === 'eligibility' || stage === 'demo-country'
          ? 2
          : 3;
  const truthLabel = mode === 'showcase' ? t.live : t.demo;
  const localizedLocale = locale === 'es' ? 'es' : 'en';

  return (
    <main className="page-content passport-journey-page unified-onboarding">
      <div
        className={`showcase-toolbar unified-onboarding-toolbar${dismissible ? '' : ' required'}`}
      >
        {dismissible ? (
          <button className="back-button" onClick={onClose} type="button">
            <ArrowLeft size={18} /> {t.back}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
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

      <header className="unified-onboarding-header">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
        </div>
        <div className="unified-truth-labels">
          <span className={mode === 'showcase' ? 'live' : ''}>
            {mode === 'showcase' ? <Fingerprint size={14} /> : <ShieldCheck size={14} />}
            {mode === 'showcase' ? `${truthLabel} · ${t.providerOwned}` : t.demoEnvironment}
          </span>
        </div>
      </header>

      <ol className="unified-progress" aria-label={t.eyebrow}>
        {t.stages.map((label, index) => (
          <li
            className={index < progressIndex ? 'done' : index === progressIndex ? 'current' : ''}
            aria-current={index === progressIndex ? 'step' : undefined}
            key={label}
          >
            <span aria-hidden="true">
              {index < progressIndex ? <Check size={13} /> : index + 1}
            </span>
            <small>{label}</small>
          </li>
        ))}
      </ol>

      {previousStage ? (
        <button
          className="showcase-step-back"
          onClick={() => setStage(previousStage)}
          type="button"
        >
          <ArrowLeft size={16} /> {locale === 'es' ? 'Paso anterior' : 'Previous step'}
        </button>
      ) : null}

      {stage === 'welcome' ? (
        <section
          className="passport-journey-card unified-card unified-welcome-card"
          aria-labelledby="onboarding-welcome-title"
        >
          <div className="unified-hero-icon">
            <Globe size={38} />
          </div>
          <p className="eyebrow">{t.beforeStart}</p>
          <h2 id="onboarding-welcome-title" ref={headingRef} tabIndex={-1}>
            {t.welcomeTitle}
          </h2>
          <p>{t.welcomeBody}</p>
          <CapybaraMascot
            variant="waving"
            alt={locale === 'es' ? 'Carpincho saludando' : 'Capybara waving hello'}
            size="lg"
            priority
          />
          <button
            className="passport-action-button primary"
            onClick={() => setStage('privacy')}
            type="button"
          >
            {t.start} <ArrowRight size={19} />
          </button>
          {dismissible ? (
            <button className="passport-action-button quiet" onClick={onClose} type="button">
              {t.explore}
            </button>
          ) : null}
          <details className="unified-passkey-details">
            <summary>
              <Fingerprint size={17} />
              <span>{t.passkeyTitle}</span>
            </summary>
            <div className={`unified-passkey-check ${passkeyReadiness}`} role="status">
              <Fingerprint size={17} />
              <span>
                <strong>{t.passkeyTitle}</strong>
                <small>
                  {passkeyReadiness === 'checking'
                    ? t.passkeyChecking
                    : passkeyReadiness === 'available'
                      ? t.passkeyAvailable
                      : passkeyReadiness === 'unavailable'
                        ? t.passkeyUnavailable
                        : t.passkeyUnknown}
                </small>
                <small>{t.passkeyDisclaimer}</small>
              </span>
            </div>
          </details>
        </section>
      ) : null}

      {stage === 'privacy' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="onboarding-privacy-title"
        >
          <div className="unified-hero-icon">
            <ShieldCheck size={38} />
          </div>
          <p className="eyebrow">{t.privacyEyebrow}</p>
          <h2 id="onboarding-privacy-title" ref={headingRef} tabIndex={-1}>
            {t.privacyTitle}
          </h2>
          <p>{t.privacyBody}</p>
          <div className="unified-explanation-list">
            {t.privacyItems.map(([title, body], index) => (
              <article key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="passport-notice info">
            <Info size={18} />
            <p>{t.privacy}</p>
          </div>
          <button
            className="passport-action-button primary"
            onClick={() => setStage('passport')}
            type="button"
          >
            {t.continue} <ArrowRight size={19} />
          </button>
        </section>
      ) : null}

      {stage === 'passport' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="onboarding-passport-title"
        >
          <div className="unified-hero-icon passport">
            <Fingerprint size={38} />
          </div>
          <p className="eyebrow">{t.passportStep}</p>
          <h2 id="onboarding-passport-title" ref={headingRef} tabIndex={-1}>
            {t.passportTitle}
          </h2>
          <p>{t.passportBody}</p>
          <dl className="unified-consent-grid">
            <div>
              <dt>{t.requested}</dt>
              <dd>
                <CheckCircle size={16} />
                {t.requestedValue}
              </dd>
            </div>
            <div>
              <dt>{t.notRequested}</dt>
              <dd>
                <Lock size={16} />
                {t.notRequestedValue}
              </dd>
            </div>
          </dl>
          {error ? (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>{error}</p>
            </div>
          ) : null}
          <button
            className="passport-action-button primary"
            disabled={connecting}
            onClick={() => void connect()}
            type="button"
          >
            {connecting ? t.connecting : mode === 'showcase' ? t.connect : t.connectDemo}{' '}
            <ArrowRight size={19} />
          </button>
        </section>
      ) : null}

      {stage === 'consent-return' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="onboarding-consent-title"
        >
          <div className="unified-hero-icon passport">
            <CheckCircle size={38} />
          </div>
          <p className="eyebrow">{t.consentStep}</p>
          <h2 id="onboarding-consent-title" ref={headingRef} tabIndex={-1}>
            {t.consentTitle}
          </h2>
          <p>{t.consentBody}</p>
          <div className="unified-session-confirmation" role="status">
            <CheckCircle size={22} />
            <span>
              <strong>{t.connected}</strong>
              <small>{session?.profile?.displayName ?? 'Passport'}</small>
            </span>
          </div>
          <dl className="unified-consent-grid">
            <div>
              <dt>{t.approved}</dt>
              <dd>
                <CheckCircle size={16} />
                {t.approvedValue}
              </dd>
            </div>
            <div>
              <dt>{t.notRequested}</dt>
              <dd>
                <Lock size={16} />
                {t.notRequestedValue}
              </dd>
            </div>
          </dl>
          <div className="passport-notice info">
            <Info size={18} />
            <p>
              <strong>{t.walletTitle}</strong>
              <br />
              {t.walletBody}
            </p>
          </div>
          {holderBinding ? (
            <div
              className={`passport-notice ${holderBinding.status === 'verified' ? 'success' : 'info'}`}
              role="status"
            >
              {holderBinding.status === 'verified' ? <CheckCircle size={18} /> : <Info size={18} />}
              <p>
                {holderBinding.status === 'verified'
                  ? t.holderBindingVerified
                  : t.holderBindingUnsupported}
              </p>
            </div>
          ) : null}
          <button
            className="passport-action-button primary"
            onClick={() => setStage('eligibility')}
            type="button"
          >
            {t.continue} <ArrowRight size={19} />
          </button>
        </section>
      ) : null}

      {stage === 'eligibility' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="onboarding-evidence-title"
        >
          <div className="unified-hero-icon evidence">
            <QrCode size={38} />
          </div>
          <p className="eyebrow">{t.eligibilityStep}</p>
          <h2 id="onboarding-evidence-title" ref={headingRef} tabIndex={-1}>
            {t.eligibilityTitle}
          </h2>
          <p>{t.eligibilityBody}</p>
          <div className="unified-evidence-status" role="status" aria-label={t.future}>
            <span>{t.future}</span>
          </div>
          <ol className="unified-evidence-list">
            {t.evidenceSteps.map(([title, body], index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{body}</small>
                </div>
              </li>
            ))}
          </ol>
          <button
            className="passport-action-button primary"
            onClick={() => setStage(mode === 'showcase' ? 'credential-success' : 'demo-country')}
            type="button"
          >
            {t.prepare} <ArrowRight size={19} />
          </button>
        </section>
      ) : null}

      {stage === 'demo-country' ? (
        <section
          className="passport-journey-card unified-card"
          aria-labelledby="onboarding-country-title"
        >
          <div className="unified-hero-icon">
            <Globe size={38} />
          </div>
          <p className="eyebrow">{t.countryStep}</p>
          <h2 id="onboarding-country-title" ref={headingRef} tabIndex={-1}>
            {t.countryTitle}
          </h2>
          <p>{t.countryBody}</p>
          <label className="country-search-label" htmlFor="demo-country-input">
            {t.countryLabel}
          </label>
          <input
            id="demo-country-input"
            className="country-search-input"
            list="assigned-country-options"
            aria-describedby="demo-country-help"
            value={countryInputValue}
            onChange={(event) => {
              const value = event.target.value.trim();
              const code = value.match(/\(([A-Z]{2})\)$/)?.[1] ?? value;
              setCountryInputValue(value);
              setDemoCountry(code.toUpperCase());
            }}
          />
          <datalist id="assigned-country-options">
            {ASSIGNED_COUNTRIES.map((country) => (
              <option key={country.alpha2} value={countryLabel(country, localizedLocale)} />
            ))}
          </datalist>
          <p className="country-selector-help" id="demo-country-help">
            {t.countryHelp}
          </p>
          <div className="unified-selected-country" role="status">
            <Globe size={20} />
            <strong>
              {selectedCountry
                ? countryName(selectedCountry.alpha2, localizedLocale)
                : countryInputValue}
            </strong>
            <small>{selectedCountry?.alpha2 ?? '—'}</small>
          </div>
          <button
            className="passport-action-button primary"
            disabled={!selectedCountry}
            onClick={() => setStage('credential-success')}
            type="button"
          >
            {t.useCountry} <ArrowRight size={19} />
          </button>
        </section>
      ) : null}

      {stage === 'credential-success' ? (
        <section
          className="passport-journey-card unified-card credential-success-card"
          aria-labelledby="onboarding-success-title"
        >
          {mode === 'showcase' ? (
            <>
              <div className="credential-success-icon unavailable" aria-hidden="true">
                <Info size={42} />
              </div>
              <p className="eyebrow">{t.live}</p>
              <h2 id="onboarding-success-title" ref={headingRef} tabIndex={-1}>
                {t.unavailableTitle}
              </h2>
              <p>{t.unavailableBody}</p>
              <div className="passport-notice warning" role="status">
                <Info size={18} />
                <p>{t.unavailableBody}</p>
              </div>
              <button className="passport-action-button primary" onClick={finish} type="button">
                {t.unavailableAction} <ArrowRight size={19} />
              </button>
            </>
          ) : (
            <>
              <div className="credential-success-icon" aria-hidden="true">
                <Check size={42} />
              </div>
              <CapybaraMascot
                variant="achievement"
                alt={
                  locale === 'es'
                    ? 'Carpincho con una pequeña bandera en una colina'
                    : 'Capybara holding a small flag on a hill'
                }
                size="lg"
              />
              <p className="eyebrow">{t.successStep}</p>
              <h2 id="onboarding-success-title" ref={headingRef} tabIndex={-1}>
                {t.successTitle}
              </h2>
              <p>{t.successBody}</p>
              <div className="credential-success-summary">
                <dl>
                  <div>
                    <dt>{t.origin}</dt>
                    <dd>{t.originSynthetic}</dd>
                  </div>
                  <div>
                    <dt>{t.country}</dt>
                    <dd>
                      {selectedCountry
                        ? countryLabel(selectedCountry, localizedLocale)
                        : countryInputValue}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.age}</dt>
                    <dd>18+</dd>
                  </div>
                  <div>
                    <dt>{t.issuer}</dt>
                    <dd>{t.issuerValue}</dd>
                  </div>
                </dl>
              </div>
              <div className="passport-notice success">
                <CheckCircle size={18} />
                <p>{t.privacy}</p>
              </div>
              <button className="passport-action-button primary" onClick={finish} type="button">
                {t.dashboard} <ArrowRight size={19} />
              </button>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
