import { ArrowRight, CheckCircle, Info, Lock } from '@phosphor-icons/react';
import type {
  CivicPassportSession,
  PassportHolderBindingResult,
  PassportSessionPort,
} from 'midnight-referendum-api';
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CapybaraMascot } from '@/components/mascot';
import { CountryFlag, CountryPicker, JourneyTopBar, SuccessMark } from '@/components/system';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { OnboardingStage } from '@/integration/civic-state';
import { countryName, findAssignedCountry } from '@/integration/country-catalog';
import { type CicoLocale, detectLocale, persistLocale } from '@/integration/locale';
import { passportHolderBindingPort } from '@/integration/passport-session-port';
import {
  type DocumentReadResult,
  DocumentVerificationJourney,
} from './DocumentVerificationJourney';
import { PassportScanTutorial } from './PassportScanTutorial';
import './journey.css';

type OnboardingMode = 'demo' | 'showcase' | 'undeployed';

interface UnifiedPassportOnboardingProps {
  mode: OnboardingMode;
  passportPort?: PassportSessionPort;
  onClose: () => void;
  /** Required first-run onboarding cannot exit into an unexplained dashboard. */
  dismissible?: boolean;
  onCredentialReady?: (credential: DemoCredentialSummary) => void;
  onPassportConnected?: (session: CivicPassportSession | null) => void;
  /**
   * Where the journey opens. First run starts at the welcome screen, but
   * someone who already has a Passport session and taps Verify wants the
   * document step -- not to be re-asked for consent they have already given.
   */
  initialStage?: OnboardingStage;
  initialLocale?: CicoLocale;
  onLocaleChange?: (locale: CicoLocale) => void;
}

const DEFAULT_DEMO_COUNTRY = 'FR';
/**
 * The shortlist shown before anyone searches. It exists to make the point the
 * screen is making -- that the consultation is open from anywhere -- visible
 * without typing, rather than to privilege these six places.
 */
const SUGGESTED_COUNTRIES = ['FR', 'AR'] as const;

/**
 * Six screens across four named stages.
 *
 * The stage names are no longer drawn as four numbered pills above every card;
 * they are the accessible label on one filling bar. That is why `welcome` and
 * `privacy` can share a stage without the header looking frozen the way the
 * old discrete stepper did -- the bar still advances a sixth on every screen.
 *
 * `demo-country` is gone as a screen. Choosing a test country was never a step
 * in its own right: it is the input the eligibility step needs, so it sits on
 * the eligibility screen next to the button that consumes it. The stage value
 * stays in the shared vocabulary for the legacy state helpers.
 */
const SCREEN_ORDER: readonly OnboardingStage[] = [
  'welcome',
  'privacy',
  'passport',
  'consent-return',
  'eligibility',
  'credential-success',
];
const PREVIOUS_STAGE: Partial<Record<OnboardingStage, OnboardingStage>> = {
  privacy: 'welcome',
  passport: 'privacy',
  'consent-return': 'passport',
  eligibility: 'consent-return',
  'credential-success': 'eligibility',
};
/** Which of the four named stages each screen belongs to. */
const SCREEN_STAGE_INDEX: Partial<Record<OnboardingStage, number>> = {
  welcome: 0,
  privacy: 0,
  passport: 1,
  'consent-return': 1,
  eligibility: 2,
  'credential-success': 3,
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
    language: 'Idioma',
    previousStep: 'Paso anterior',
    stages: ['Bienvenida', 'Passport', 'Documento', 'Pase listo'],
    step: (n: number, total: number) => `Paso ${n} de ${total}`,
    demoEnvironment: 'Demo',
    liveEnvironment: 'Passport en vivo',
    origin: 'Origen',
    originSynthetic: 'Pase simulado',
    why: '¿Por qué se necesita esto?',

    // 1 · welcome
    welcomeTitle: 'Demostrá que podés votar. Sin demostrar quién sos.',
    welcomeBody:
      'Midnight Passport abre tu cuenta. Un pasaporte físico puede comprobar elegibilidad. El resultado es un pase pequeño para participar. En esta demo, todo el recorrido es simulado y no se envía un voto real.',
    start: 'Comenzar',
    explore: 'Explorar sin conectar',

    // 2 · privacy
    privacyTitle: 'Qué protege tu voto',
    privacyItems: [
      [
        'Midnight Passport',
        'Tu cuenta segura para esta experiencia Preview y el nombre que elegís mostrar.',
      ],
      [
        'Pasaporte físico',
        'El documento se usa en un paso separado para comprobar elegibilidad. No está guardado dentro de Passport.',
      ],
      [
        'Pase de elegibilidad',
        'Guarda solo el resultado mínimo que una consulta necesita. La demo lo etiqueta siempre como simulado.',
      ],
    ],
    continue: 'Continuar',

    // 3 · passport
    passportTitle: 'Conectá tu Passport',
    passportBody:
      'Passport es tu ingreso seguro. Esta app recibe únicamente los campos de perfil que aprobés.',
    passportWhy:
      'Passport administra tu identidad fuera de esta app, así el prototipo nunca guarda una contraseña ni una cuenta tuya. La sesión sirve para reconocerte entre pantallas; no autoriza pagos, transacciones ni votos.',
    requested: 'Se solicita',
    requestedValue: 'Sesión y perfil aprobado',
    notRequested: 'No se solicita',
    notRequestedValue: 'Wallet, voto, nacionalidad, edad o documento',
    connect: 'Continuar con Passport',
    connectDemo: 'Usar Passport de demo',
    connecting: 'Esperando tu consentimiento…',
    connected: 'Sesión aprobada',

    // 4 · consent return
    consentTitle: 'Esto es lo que Passport compartió',
    consentBody:
      'El nombre visible sirve para mostrar tu cuenta. No se transforma en un dato de nacionalidad, edad ni voto.',
    approved: 'Aprobado por vos',
    approvedValue: 'Sesión Passport y nombre visible',
    walletTitle: '¿Y la wallet?',
    walletBody:
      'Una wallet solo aparece cuando hay que aprobar y pagar una acción real en la red. Este recorrido de demo no la necesita y no te la va a pedir.',

    // 5 · eligibility + country
    eligibilityTitle: 'Creá tu pase de elegibilidad',
    eligibilityBody:
      'El pase representa país y mayoría de edad. Es distinto de tu cuenta Passport y de tu pasaporte físico.',
    demoBanner: 'DEMO · SIN LECTURA NFC NI PRUEBA REAL',
    demoBannerBody:
      'Este entorno no lee ningún documento ni genera una prueba real. Elegí Francia o Argentina y te damos un pase simulado para recorrer la experiencia.',
    evidenceWhy: '¿Cómo funciona con un documento real?',
    evidenceSteps: [
      ['Pedido preparado', 'Se crea un vínculo temporal y de un solo uso con este navegador.'],
      [
        'Lectura NFC en tu teléfono',
        'Apoyás el teléfono sobre el chip del pasaporte. La lectura ocurre en tu dispositivo.',
      ],
      [
        'Datos mínimos',
        'El emisor recibe solo si cumplís la regla — país y mayoría de edad — y nada más.',
      ],
    ],
    countryLabel: '¿Desde qué país participás?',
    countrySearch: 'Buscar Francia o Argentina',
    countryList: 'Países disponibles',
    countrySuggested: 'El piloto comienza con Francia y Argentina.',
    countryEmpty: 'No encontramos ese país. Probá con otro nombre o su código.',
    verifyDocument: 'Verificar mi pasaporte',
    createCredential: 'Crear mi pase simulado',

    // 6 · success
    successTitle: 'Tu pase de elegibilidad está listo',
    successBody: 'Ya podés ver qué consultas están abiertas para vos y emitir un voto de prueba.',
    successMark: 'Pase creado',
    country: 'País de prueba',
    age: 'Clase de edad',
    issuer: 'Emisor',
    issuerValue: 'CICO demo · prueba',
    dashboard: 'Ver las consultas',
    privacy: 'Este pase simulado no contiene un documento ni una elección.',

    // showcase dead-end
    unavailableTitle: 'La credencial todavía no está conectada',
    unavailableBody:
      'Este entorno puede mostrar la sesión Passport, pero no tiene un proveedor de evidencia configurado. Podés explorar sin que inventemos una nacionalidad.',
    unavailableAction: 'Explorar las consultas',

    error: 'No se pudo conectar Passport. Revisá el consentimiento e intentá otra vez.',
    holderBindingVerified:
      'Holder binding verificado para esta sesión. No mostramos sus bytes ni lo tratamos como un dato de elegibilidad.',
    holderBindingUnsupported:
      'Esta versión de Passport todavía no ofrece el vínculo necesario para una elegibilidad real. La demo mantiene la cuenta y el pase separados.',
    mascotWaving: 'Carpincho saludando',
    mascotReading: 'Carpincho leyendo un libro',
    mascotThinking: 'Carpincho pensando',
    mascotAchievement: 'Carpincho con una pequeña bandera en una colina',
  },
  en: {
    back: 'Back to the app',
    language: 'Language',
    previousStep: 'Previous step',
    stages: ['Welcome', 'Passport', 'Document', 'Pass ready'],
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    demoEnvironment: 'Demo',
    liveEnvironment: 'Live Passport',
    origin: 'Origin',
    originSynthetic: 'Simulated pass',
    why: 'Why is this needed?',

    welcomeTitle: 'Prove you can vote. Without proving who you are.',
    welcomeBody:
      'Midnight Passport opens your account. A physical passport can prove eligibility. The result is a small pass for participation. In this demo the whole journey is simulated and no real vote is sent.',
    start: 'Get started',
    explore: 'Explore without connecting',

    privacyTitle: 'What protects your vote',
    privacyItems: [
      [
        'Midnight Passport',
        'Your secure account for this Preview experience and the name you choose to display.',
      ],
      [
        'Physical passport',
        'The document is used in a separate eligibility step. It is not stored inside Passport.',
      ],
      [
        'Eligibility pass',
        'It keeps only the minimum result a consultation needs. The demo always labels it as simulated.',
      ],
    ],
    continue: 'Continue',

    passportTitle: 'Connect your Passport',
    passportBody:
      'Passport is your secure sign-in. This app receives only the profile fields you approve.',
    passportWhy:
      'Passport manages your identity outside this app, so the prototype never stores a password or an account for you. The session is what recognises you between screens; it authorises no payment, transaction, or vote.',
    requested: 'Requested',
    requestedValue: 'Session and approved profile',
    notRequested: 'Not requested',
    notRequestedValue: 'Wallet, vote, nationality, age, or document',
    connect: 'Continue with Passport',
    connectDemo: 'Use demo Passport',
    connecting: 'Waiting for your consent…',
    connected: 'Session approved',

    consentTitle: 'This is what Passport shared',
    consentBody:
      'The display name identifies your account in this interface. It does not become a nationality, age, or voting claim.',
    approved: 'Approved by you',
    approvedValue: 'Passport session and display name',
    walletTitle: 'What about the wallet?',
    walletBody:
      'A wallet only appears when a real on-chain action has to be approved and paid for. This demo journey does not need one and will not ask for it.',

    eligibilityTitle: 'Create your eligibility pass',
    eligibilityBody:
      'The pass represents country and adult status. It is separate from your Passport account and your physical passport.',
    demoBanner: 'DEMO · NO NFC READ OR REAL PROOF',
    demoBannerBody:
      'This environment reads no document and generates no real proof. Pick France or Argentina and we will issue a simulated pass so you can walk the experience.',
    evidenceWhy: 'How does this work with a real document?',
    evidenceSteps: [
      ['Request prepared', 'A temporary, single-use link is created with this browser.'],
      [
        'NFC read on your phone',
        'You hold the phone against the passport chip. The read happens on your device.',
      ],
      [
        'Minimal data',
        'The issuer learns only whether you meet the rule — country and adult class — and nothing else.',
      ],
    ],
    countryLabel: 'Which country are you taking part from?',
    countrySearch: 'Search France or Argentina',
    countryList: 'Available countries',
    countrySuggested: 'The pilot begins with France and Argentina.',
    countryEmpty: 'No country matched. Try another name or its code.',
    verifyDocument: 'Verify my passport',
    createCredential: 'Create my simulated pass',

    successTitle: 'Your eligibility pass is ready',
    successBody: 'You can now see which consultations are open to you and cast a test vote.',
    successMark: 'Pass created',
    country: 'Test country',
    age: 'Age class',
    issuer: 'Issuer',
    issuerValue: 'CICO demo · test',
    dashboard: 'See the consultations',
    privacy: 'This simulated pass contains no document or voting choice.',

    unavailableTitle: 'The credential is not connected yet',
    unavailableBody:
      'This environment can show a Passport session, but it has no evidence provider configured. You can explore without us inventing a nationality.',
    unavailableAction: 'Explore the consultations',

    error: 'Passport could not connect. Check consent and try again.',
    holderBindingVerified:
      'Holder binding verified for this session. We do not display its bytes or treat it as an eligibility claim.',
    holderBindingUnsupported:
      'This Passport build does not yet expose the link required for real eligibility. The demo keeps the account and pass separate.',
    mascotWaving: 'Capybara waving hello',
    mascotReading: 'Capybara reading a book',
    mascotThinking: 'Capybara thinking',
    mascotAchievement: 'Capybara holding a small flag on a hill',
  },
  fr: {
    back: "Retour à l'application",
    language: 'Langue',
    previousStep: 'Étape précédente',
    stages: ['Bienvenue', 'Passport', 'Document', 'Laissez-passer'],
    step: (n: number, total: number) => `Étape ${n} sur ${total}`,
    demoEnvironment: 'Démo',
    liveEnvironment: 'Passport réel',
    origin: 'Origine',
    originSynthetic: 'Laissez-passer simulé',
    why: 'Pourquoi est-ce nécessaire ?',

    welcomeTitle: 'Prouvez que vous pouvez voter. Sans prouver qui vous êtes.',
    welcomeBody:
      "Midnight Passport ouvre votre compte. Un passeport physique peut prouver votre éligibilité. Le résultat est un petit laissez-passer de participation. Dans cette démo, tout le parcours est simulé et aucun vote réel n'est envoyé.",
    start: 'Commencer',
    explore: 'Explorer sans se connecter',

    privacyTitle: 'Ce qui protège votre vote',
    privacyItems: [
      [
        'Midnight Passport',
        "Votre compte sécurisé pour cette expérience Preview et le nom que vous choisissez d'afficher.",
      ],
      [
        'Passeport physique',
        "Le document sert à une étape d'éligibilité distincte. Il n'est pas conservé dans Passport.",
      ],
      [
        "Laissez-passer d'éligibilité",
        "Il ne retient que le résultat minimal dont une consultation a besoin. La démo l'indique toujours comme simulé.",
      ],
    ],
    continue: 'Continuer',

    passportTitle: 'Connectez votre Passport',
    passportBody:
      'Passport est votre connexion sécurisée. Cette application ne reçoit que les champs de profil que vous approuvez.',
    passportWhy:
      "Passport gère votre identité en dehors de cette application : le prototype ne conserve jamais de mot de passe ni de compte à votre place. La session est ce qui vous reconnaît d'un écran à l'autre ; elle n'autorise aucun paiement, aucune transaction, aucun vote.",
    requested: 'Demandé',
    requestedValue: 'Session et profil approuvé',
    notRequested: 'Non demandé',
    notRequestedValue: 'Portefeuille, vote, nationalité, âge ou document',
    connect: 'Continuer avec Passport',
    connectDemo: 'Utiliser le Passport de démo',
    connecting: 'En attente de votre consentement…',
    connected: 'Session approuvée',

    consentTitle: 'Voici ce que Passport a partagé',
    consentBody:
      'Le nom affiché identifie votre compte dans cette interface. Il ne devient ni une nationalité, ni un âge, ni une revendication de vote.',
    approved: 'Approuvé par vous',
    approvedValue: 'Session Passport et nom affiché',
    walletTitle: 'Et le portefeuille ?',
    walletBody:
      "Un portefeuille n'apparaît que lorsqu'une action réelle sur la chaîne doit être approuvée et payée. Ce parcours de démo n'en a pas besoin et ne vous en demandera pas.",

    eligibilityTitle: "Créez votre laissez-passer d'éligibilité",
    eligibilityBody:
      'Le laissez-passer représente le pays et la majorité. Il est distinct de votre compte Passport et de votre passeport physique.',
    demoBanner: 'DÉMO · AUCUNE LECTURE NFC NI PREUVE RÉELLE',
    demoBannerBody:
      "Cet environnement ne lit aucun document et ne génère aucune preuve réelle. Choisissez la France ou l'Argentine et nous délivrerons un laissez-passer simulé pour parcourir l'expérience.",
    evidenceWhy: 'Comment cela fonctionne-t-il avec un vrai document ?',
    evidenceSteps: [
      ['Demande préparée', 'Un lien temporaire à usage unique est créé avec ce navigateur.'],
      [
        'Lecture NFC sur votre téléphone',
        'Vous approchez le téléphone de la puce du passeport. La lecture se fait sur votre appareil.',
      ],
      [
        'Données minimales',
        "L'émetteur apprend seulement si vous remplissez la règle — pays et classe d'âge — et rien d'autre.",
      ],
    ],
    countryLabel: 'Depuis quel pays participez-vous ?',
    countrySearch: "Rechercher la France ou l'Argentine",
    countryList: 'Pays disponibles',
    countrySuggested: "Le pilote commence par la France et l'Argentine.",
    countryEmpty: 'Aucun pays ne correspond. Essayez un autre nom ou son code.',
    verifyDocument: 'Vérifier mon passeport',
    createCredential: 'Créer mon laissez-passer simulé',

    successTitle: "Votre laissez-passer d'éligibilité est prêt",
    successBody:
      'Vous pouvez maintenant voir quelles consultations vous sont ouvertes et voter à titre de test.',
    successMark: 'Laissez-passer créé',
    country: 'Pays de test',
    age: "Classe d'âge",
    issuer: 'Émetteur',
    issuerValue: 'CICO démo · test',
    dashboard: 'Voir les consultations',
    privacy: 'Ce laissez-passer simulé ne contient aucun document ni choix de vote.',

    unavailableTitle: "Le justificatif n'est pas encore connecté",
    unavailableBody:
      "Cet environnement peut afficher une session Passport, mais aucun fournisseur de preuve n'est configuré. Vous pouvez explorer sans que nous inventions une nationalité.",
    unavailableAction: 'Explorer les consultations',

    error: 'Passport n’a pas pu se connecter. Vérifiez le consentement et réessayez.',
    holderBindingVerified:
      "Le lien avec le porteur est vérifié pour cette session. Nous n'affichons pas ses octets et ne le traitons pas comme une revendication d'éligibilité.",
    holderBindingUnsupported:
      "Cette version de Passport n'expose pas encore le lien requis pour une éligibilité réelle. La démo garde le compte et le laissez-passer séparés.",
    mascotWaving: 'Capybara qui fait coucou',
    mascotReading: 'Capybara qui lit un livre',
    mascotThinking: 'Capybara qui réfléchit',
    mascotAchievement: 'Capybara tenant un petit drapeau sur une colline',
  },
} as const;

/**
 * The escape valve for detail.
 *
 * Every screen used to carry its technical justification inline, as a stack of
 * lock-icon notices the reader had to scroll past to reach the button. The
 * justification is still there and still complete -- it is one tap away
 * instead of permanently in the path.
 */
function WhyDetails({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="journey-why">
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}

export function UnifiedPassportOnboarding({
  mode,
  passportPort,
  onClose,
  dismissible = true,
  onCredentialReady,
  onPassportConnected,
  initialStage = 'welcome',
  initialLocale,
  onLocaleChange,
}: UnifiedPassportOnboardingProps) {
  const [locale, setLocale] = useState<CicoLocale>(() => initialLocale ?? detectLocale());
  const [stage, setStage] = useState<OnboardingStage>(initialStage);
  const [session, setSession] = useState<CivicPassportSession | null>(null);
  const [holderBinding, setHolderBinding] = useState<PassportHolderBindingResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCountry, setDemoCountry] = useState(DEFAULT_DEMO_COUNTRY);
  const [documentJourney, setDocumentJourney] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const initialRender = useRef(false);
  const t = copy[locale];
  // Back never walks out of the entry point: opening at the document step
  // must not offer a route into a consent screen this visit never showed.
  const previousStage = stage === initialStage ? undefined : PREVIOUS_STAGE[stage];
  const selectedCountry = useMemo(() => findAssignedCountry(demoCountry), [demoCountry]);

  /**
   * A real document read gives a country; a typed one does not, because the
   * nationality is not in the block people transcribe. Either way the chip is
   * the authority, so a read without a country falls back to the picker rather
   * than inventing one.
   */
  const handleDocumentRead = (result: DocumentReadResult) => {
    if (result.country) {
      const matched = findAssignedCountry(result.country);
      if (matched) setDemoCountry(matched.alpha2);
    }
    setDocumentJourney(false);
  };

  useLayoutEffect(() => {
    if (!initialRender.current) {
      initialRender.current = true;
      return;
    }
    if (stage) headingRef.current?.focus();
  }, [stage]);

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

  const screenIndex = Math.max(SCREEN_ORDER.indexOf(stage), 0);
  const stageIndex = SCREEN_STAGE_INDEX[stage] ?? 0;
  const localizedLocale = locale === 'es' ? 'es' : 'en';

  return (
    <main className="page-content passport-journey-page unified-onboarding">
      <JourneyTopBar
        locale={locale}
        onLocaleChange={setLanguage}
        languageLabel={t.language}
        {...(dismissible ? { onExit: onClose, exitLabel: t.back } : {})}
        {...(previousStage ? { onBack: () => setStage(previousStage) } : {})}
        backLabel={t.previousStep}
        badge={mode === 'showcase' ? t.liveEnvironment : t.demoEnvironment}
        current={screenIndex + 1}
        total={SCREEN_ORDER.length}
        stageLabel={t.stages[stageIndex] ?? t.stages[0]}
        progressLabel={t.step(screenIndex + 1, SCREEN_ORDER.length)}
      />

      {stage === 'welcome' ? (
        <section className="journey-screen" aria-labelledby="onboarding-welcome-title">
          {/* The hero globe is gone. It said nothing the headline did not, and
              it competed with the mascot for the same job two elements apart. */}
          <CapybaraMascot variant="waving" alt={t.mascotWaving} size={190} priority />
          <h1 className="journey-screen__title" id="onboarding-welcome-title" ref={headingRef}>
            {t.welcomeTitle}
          </h1>
          <p className="journey-screen__body">{t.welcomeBody}</p>
          <div className="journey-screen__actions">
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
          </div>
        </section>
      ) : null}

      {stage === 'privacy' ? (
        <section className="journey-screen" aria-labelledby="onboarding-privacy-title">
          <CapybaraMascot variant="reading" alt={t.mascotReading} size={150} />
          <h1 className="journey-screen__title" id="onboarding-privacy-title" ref={headingRef}>
            {t.privacyTitle}
          </h1>
          {/* The paragraph that used to sit here summarised the three items
              below it in one sentence, so the reader read the same idea twice
              before reaching either. The items are the explanation. */}
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
          <div className="journey-screen__actions">
            <button
              className="passport-action-button primary"
              onClick={() => setStage('passport')}
              type="button"
            >
              {t.continue} <ArrowRight size={19} />
            </button>
          </div>
        </section>
      ) : null}

      {stage === 'passport' ? (
        <section className="journey-screen" aria-labelledby="onboarding-passport-title">
          <h1 className="journey-screen__title" id="onboarding-passport-title" ref={headingRef}>
            {t.passportTitle}
          </h1>
          <p className="journey-screen__body">{t.passportBody}</p>
          {/* This is the consent moment, so this is the one place the full
              boundary is stated. It is not repeated on the screen after it. */}
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
          <WhyDetails summary={t.why}>{t.passportWhy}</WhyDetails>
          {error ? (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>{error}</p>
            </div>
          ) : null}
          <div className="journey-screen__actions">
            <button
              className="passport-action-button primary"
              disabled={connecting}
              onClick={() => void connect()}
              type="button"
            >
              {connecting ? t.connecting : mode === 'showcase' ? t.connect : t.connectDemo}{' '}
              <ArrowRight size={19} />
            </button>
          </div>
        </section>
      ) : null}

      {stage === 'consent-return' ? (
        <section className="journey-screen" aria-labelledby="onboarding-consent-title">
          <h1 className="journey-screen__title" id="onboarding-consent-title" ref={headingRef}>
            {t.consentTitle}
          </h1>
          <p className="journey-screen__body">{t.consentBody}</p>
          <div className="unified-session-confirmation" role="status">
            <CheckCircle size={22} />
            <span>
              <strong>{t.connected}</strong>
              <small>{session?.profile?.displayName ?? 'Passport'}</small>
            </span>
          </div>
          {/* Only the half that changed. The "not requested" row was identical
              to the previous screen's, word for word, one tap apart. */}
          <dl className="unified-consent-grid">
            <div>
              <dt>{t.approved}</dt>
              <dd>
                <CheckCircle size={16} />
                {t.approvedValue}
              </dd>
            </div>
          </dl>
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
          <WhyDetails summary={t.walletTitle}>{t.walletBody}</WhyDetails>
          <div className="journey-screen__actions">
            <button
              className="passport-action-button primary"
              onClick={() => setStage('eligibility')}
              type="button"
            >
              {t.continue} <ArrowRight size={19} />
            </button>
          </div>
        </section>
      ) : null}

      {stage === 'eligibility' ? (
        <section className="journey-screen" aria-labelledby="onboarding-evidence-title">
          {documentJourney ? (
            /* The document journey replaces this screen entirely once started.
               Running the teaching steps and a country picker side by side put
               two different mental models of "prove eligibility" on one page. */
            <DocumentVerificationJourney
              locale={locale}
              onDocumentRead={handleDocumentRead}
              onCancel={() => setDocumentJourney(false)}
            />
          ) : (
            <>
              <CapybaraMascot variant="thinking" alt={t.mascotThinking} size={140} />
              <h1 className="journey-screen__title" id="onboarding-evidence-title" ref={headingRef}>
                {t.eligibilityTitle}
              </h1>
              <p className="journey-screen__body">{t.eligibilityBody}</p>
              {/* The demo label stays visible and stays above the action, because
                  the reader has to know what they are about to get before they
                  tap, not after. */}
              <div className="journey-demo-banner" role="status">
                <strong>{t.demoBanner}</strong>
                <small>{t.demoBannerBody}</small>
              </div>
              {/* The walkthrough carries its own three steps, and they are the
                  same three this list used to describe in the abstract. Two
                  numbered lists of three, one above the other, inside one
                  disclosure, is the repetition this pass exists to remove. */}
              <WhyDetails summary={t.evidenceWhy}>
                <PassportScanTutorial locale={locale} />
              </WhyDetails>
              {mode === 'showcase' ? null : (
                <div className="journey-field">
                  <CountryPicker
                    value={demoCountry}
                    onChange={setDemoCountry}
                    locale={locale}
                    searchLabel={t.countryLabel}
                    searchPlaceholder={t.countrySearch}
                    listLabel={t.countryList}
                    suggested={SUGGESTED_COUNTRIES}
                    allowed={SUGGESTED_COUNTRIES}
                    searchable={false}
                    suggestedLabel={t.countrySuggested}
                    emptyLabel={t.countryEmpty}
                  />
                </div>
              )}
              <div className="journey-screen__actions">
                {/* Reading the real document page is the primary path now. The
                    simulated pass stays, clearly named, because demo has no
                    provider behind it and a jury still has to walk the flow. */}
                <button
                  className="passport-action-button primary"
                  onClick={() => setDocumentJourney(true)}
                  type="button"
                >
                  {t.verifyDocument} <ArrowRight size={19} />
                </button>
                <button
                  className="passport-action-button secondary"
                  disabled={mode !== 'showcase' && !selectedCountry}
                  onClick={() => setStage('credential-success')}
                  type="button"
                >
                  {t.createCredential}
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {stage === 'credential-success' ? (
        <section className="journey-screen" aria-labelledby="onboarding-success-title">
          {mode === 'showcase' ? (
            <>
              <div className="credential-success-icon unavailable" aria-hidden="true">
                <Info size={42} />
              </div>
              <h1 className="journey-screen__title" id="onboarding-success-title" ref={headingRef}>
                {t.unavailableTitle}
              </h1>
              <p className="journey-screen__body">{t.unavailableBody}</p>
              <div className="journey-screen__actions">
                <button className="passport-action-button primary" onClick={finish} type="button">
                  {t.unavailableAction} <ArrowRight size={19} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* One hero, not two. The mark used to stack above the mascot,
                  so the screen opened with 250px of celebration before the
                  sentence that says what happened. It is a badge on the
                  mascot now, which is also where the eye already is. */}
              <div className="journey-success-hero">
                <CapybaraMascot variant="achievement" alt={t.mascotAchievement} size={168} />
                <SuccessMark label={t.successMark} size="sm" />
              </div>
              <h1 className="journey-screen__title" id="onboarding-success-title" ref={headingRef}>
                {t.successTitle}
              </h1>
              <p className="journey-screen__body">{t.successBody}</p>
              <dl className="credential-summary-rows">
                <div>
                  <dt>{t.origin}</dt>
                  <dd>{t.originSynthetic}</dd>
                </div>
                <div>
                  <dt>{t.country}</dt>
                  <dd>
                    <span className="credential-country">
                      <CountryFlag alpha2={demoCountry} size="sm" />
                      {countryName(demoCountry, localizedLocale)}
                    </span>
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
              <div className="passport-notice success">
                <CheckCircle size={18} />
                <p>{t.privacy}</p>
              </div>
              <div className="journey-screen__actions">
                <button className="passport-action-button primary" onClick={finish} type="button">
                  {t.dashboard} <ArrowRight size={19} />
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
