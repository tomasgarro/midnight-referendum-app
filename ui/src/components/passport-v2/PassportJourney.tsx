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
  Stamp,
  UserCircle,
  WifiHigh,
} from '@phosphor-icons/react';
import type { PassportSessionPort } from 'midnight-referendum-api';
import { useState } from 'react';
import {
  advanceDemoSubmission,
  connectDemoPassport,
  DEMO_POLL,
  finishDemoEnrollment,
  INITIAL_PASSPORT_JOURNEY_STATE,
  type JourneyChoice,
  type JourneyScope,
  openDemoScope,
  type PassportJourneyState,
  selectDemoChoice,
  selectDemoScope,
  startDemoEnrollment,
  startDemoSubmission,
} from '@/integration/cico-passport-journey';
import { PreviewPassportJourney, type PreviewPassportJourneyPorts } from './PreviewPassportJourney';
import { ShowcasePassportJourney } from './ShowcasePassportJourney';

type JourneyMode = 'demo' | 'showcase' | 'preview';

interface PassportJourneyProps {
  mode: JourneyMode;
  onClose: () => void;
  passportPort?: PassportSessionPort;
  previewPorts?: PreviewPassportJourneyPorts;
}

const STAGES = [
  ['consent', 'Passport'],
  ['provider', 'Evidencia'],
  ['enrollment', 'Enrolamiento'],
  ['credential', 'Credencial'],
  ['scope', 'Alcance'],
  ['choice', 'Respuesta'],
  ['review', 'Revisión'],
  ['receipt', 'Comprobante'],
] as const;

function JourneyProgress({ stage }: { stage: PassportJourneyState['stage'] }) {
  const activeIndex = Math.max(
    0,
    STAGES.findIndex(([key]) => key === stage),
  );
  return (
    <ol className="passport-journey-progress" aria-label="Progreso del recorrido">
      {STAGES.map(([key, label], index) => (
        <li
          className={index < activeIndex ? 'done' : index === activeIndex ? 'current' : ''}
          key={key}
        >
          <span aria-hidden="true">{index < activeIndex ? <Check size={13} /> : index + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  );
}

function Shell({
  children,
  state,
  onClose,
}: {
  children: React.ReactNode;
  state: PassportJourneyState;
  onClose: () => void;
}) {
  return (
    <main className="page-content passport-journey-page">
      <button className="back-button" onClick={onClose} type="button">
        <ArrowLeft size={18} /> Volver a la app
      </button>
      <div className="passport-journey-heading">
        <div>
          <p className="eyebrow">Recorrido Passport v2</p>
          <h1>Una credencial, muchas consultas</h1>
        </div>
        <span className="passport-demo-label">DEMO LOCAL</span>
      </div>
      <JourneyProgress stage={state.stage} />
      {children}
    </main>
  );
}

function Notice({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'warning' | 'success';
}) {
  return (
    <div className={`passport-notice ${tone}`} role={tone === 'warning' ? 'alert' : undefined}>
      <Info size={18} />
      <p>{children}</p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      className={`passport-action-button ${variant}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ConsentStage({ onConnect, onClose }: { onConnect: () => void; onClose: () => void }) {
  return (
    <section className="passport-journey-card" aria-labelledby="passport-consent-title">
      <div className="passport-journey-icon">
        <Fingerprint size={36} />
      </div>
      <p className="eyebrow">Paso 1 · sesión y consentimiento</p>
      <h2 id="passport-consent-title">Conectá Midnight Passport</h2>
      <p>
        Passport es la capa de sesión y consentimiento de esta aplicación. Te permite decidir qué
        capacidades puede solicitar CICO, sin convertir tu perfil en tu voto.
      </p>
      <div className="passport-capability-list">
        <div>
          <UserCircle size={20} />
          <span>
            <strong>Perfil visible</strong>
            <small>Solo para mostrar tu sesión en la interfaz.</small>
          </span>
          <CheckCircle size={18} />
        </div>
        <div>
          <ShieldCheck size={20} />
          <span>
            <strong>Consentimiento</strong>
            <small>Autoriza este recorrido de demostración.</small>
          </span>
          <CheckCircle size={18} />
        </div>
        <div>
          <Lock size={20} />
          <span>
            <strong>Secreto separado</strong>
            <small>No se comparte con Passport ni con CICO.</small>
          </span>
          <CheckCircle size={18} />
        </div>
      </div>
      <Notice>
        En esta pantalla no se verifica nacionalidad, edad ni autenticidad documental. Esas
        afirmaciones pertenecen a la evidencia y la credencial, que todavía son un adaptador
        separado.
      </Notice>
      <ActionButton onClick={onConnect}>
        Dar consentimiento de demo <ArrowRight size={19} />
      </ActionButton>
      <ActionButton onClick={onClose} variant="secondary">
        Cancelar recorrido
      </ActionButton>
    </section>
  );
}

function ProviderStage({ onContinue }: { onContinue: () => void }) {
  const rows = [
    {
      icon: <Fingerprint size={21} />,
      title: 'Midnight Passport',
      body: 'Sesión, consentimiento y capacidades. No es el verificador de nacionalidad.',
    },
    {
      icon: <QrCode size={21} />,
      title: 'Rarimo · adaptador temporal',
      body: 'En producción podría aportar evidencia NFC/QR; aquí solo explicamos el puente.',
    },
    {
      icon: <Stamp size={21} />,
      title: 'CICO credential issuer',
      body: 'Une claims verificados con un holder binding sin recibir tu secreto de voto.',
    },
    {
      icon: <Lock size={21} />,
      title: 'Voto Midnight',
      body: 'Prueba elegibilidad y unicidad sin revelar tu elección ni tu perfil.',
    },
  ];
  return (
    <section className="passport-journey-card" aria-labelledby="passport-provider-title">
      <p className="eyebrow">Paso 2 · capacidades explícitas</p>
      <h2 id="passport-provider-title">Qué hace cada pieza</h2>
      <p>
        La separación importa: Passport mantiene el centro de la experiencia, mientras el
        verificador de pasaporte y la acción cívica evolucionan como adaptadores independientes.
      </p>
      <div className="passport-provider-list">
        {rows.map(({ icon, title, body }) => (
          <article key={title}>
            <span className="passport-provider-icon">{icon}</span>
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </article>
        ))}
      </div>
      <Notice tone="warning">
        El proveedor Rarimo mostrado aquí no está conectado. En modo demo no se leen documentos ni
        se crea una atestación real.
      </Notice>
      <ActionButton onClick={onContinue}>
        Continuar al enrolamiento local <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function EnrollmentStage({ onComplete }: { onComplete: () => void }) {
  return (
    <section className="passport-journey-card" aria-labelledby="passport-enrollment-title">
      <div className="passport-journey-icon enrollment">
        <QrCode size={36} />
      </div>
      <p className="eyebrow">Paso 3 · evidencia de prueba</p>
      <h2 id="passport-enrollment-title">Enrolá una credencial de prueba</h2>
      <p>
        Recorremos los estados que después ocupará el flujo NFC/QR. La fixture es sintética y está
        marcada como tal en todo momento.
      </p>
      <ol className="passport-enrollment-list">
        <li>
          <span>
            <Check size={15} />
          </span>
          <div>
            <strong>Solicitud preparada</strong>
            <small>El navegador crea un holder binding local.</small>
          </div>
        </li>
        <li>
          <span>
            <QrCode size={15} />
          </span>
          <div>
            <strong>QR / NFC de ejemplo</strong>
            <small>Simulado; ningún pasaporte real es leído.</small>
          </div>
        </li>
        <li>
          <span>
            <WifiHigh size={15} />
          </span>
          <div>
            <strong>Respuesta del proveedor</strong>
            <small>Se carga un resultado fixture, no una afirmación oficial.</small>
          </div>
        </li>
      </ol>
      <ActionButton onClick={onComplete}>
        Ejecutar fixture local <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function CredentialStage({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="passport-journey-card" aria-labelledby="passport-credential-title">
      <div className="passport-journey-icon success">
        <ShieldCheck size={36} />
      </div>
      <p className="eyebrow">Paso 4 · credencial preparada</p>
      <h2 id="passport-credential-title">Credencial lista para la demo</h2>
      <div className="synthetic-credential-banner">
        <span>SYNTHETIC DEMO CREDENTIAL</span>
        <small>No es una prueba oficial ni una credencial de Passport.</small>
      </div>
      <dl className="credential-summary">
        <div>
          <dt>Emisor</dt>
          <dd>cico-demo-issuer</dd>
        </div>
        <div>
          <dt>País del fixture</dt>
          <dd>Argentina (AR)</dd>
        </div>
        <div>
          <dt>Clase de edad</dt>
          <dd>18+</dd>
        </div>
        <div>
          <dt>Assurance</dt>
          <dd>fixture</dd>
        </div>
        <div>
          <dt>Epoch</dt>
          <dd>preview-2026-08</dd>
        </div>
        <div>
          <dt>Commitment</dt>
          <dd>0x7a91…c420</dd>
        </div>
      </dl>
      <Notice>
        La credencial liga claims, emisor, época y validez a un commitment. El secreto del votante y
        la apertura permanecen en el navegador.
      </Notice>
      <ActionButton onClick={onContinue}>
        Elegir alcance de la consulta <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function ScopeStage({ onSelect }: { onSelect: (scope: JourneyScope) => void }) {
  return (
    <section className="passport-journey-card" aria-labelledby="passport-scope-title">
      <p className="eyebrow">Paso 5 · política de elegibilidad</p>
      <h2 id="passport-scope-title">¿En qué espacio querés participar?</h2>
      <p>
        La credencial puede habilitar consultas abiertas a todas las personas o una consulta
        restringida al país que prueba la política. La elección sigue siendo privada.
      </p>
      <div className="scope-options">
        <button type="button" onClick={() => onSelect('global')}>
          <Globe size={28} />
          <span>
            <strong>World</strong>
            <small>Consulta global para cualquier credencial válida.</small>
          </span>
          <ArrowRight size={18} />
        </button>
        <button type="button" onClick={() => onSelect('country')}>
          <span className="scope-flag">AR</span>
          <span>
            <strong>Mi país · Argentina</strong>
            <small>Solo credenciales con país AR dentro de la política.</small>
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
      <Notice>
        El país se usa como predicado privado de elegibilidad. No viaja junto a tu elección ni
        aparece en el comprobante.
      </Notice>
    </section>
  );
}

function ChoiceStage({
  scope,
  onSelect,
}: {
  scope: JourneyScope;
  onSelect: (choice: JourneyChoice) => void;
}) {
  const [choice, setChoice] = useState<JourneyChoice | null>(null);
  const scopeLabel = scope === 'global' ? 'World' : 'Mi país · Argentina';
  return (
    <section className="passport-journey-card" aria-labelledby="passport-choice-title">
      <p className="eyebrow">Paso 6 · consulta {scopeLabel}</p>
      <h2 id="passport-choice-title">Elegí tu respuesta</h2>
      <p>{DEMO_POLL.question}</p>
      <div className="passport-choice-list">
        {(
          [
            ['YES', 'Sí', 'Apoyo priorizar esta propuesta'],
            ['NO', 'No', 'No apoyo priorizarla así'],
            ['ABSTAIN', 'Abstención', 'Prefiero no tomar una posición binaria'],
          ] as const
        ).map(([value, label, detail]) => (
          <button
            key={value}
            className={choice === value ? 'selected' : ''}
            type="button"
            onClick={() => setChoice(value)}
          >
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <span className="choice-check">{choice === value ? <Check size={17} /> : null}</span>
          </button>
        ))}
      </div>
      <Notice>
        La elección queda dentro del compromiso de voto. Ni Passport, ni el emisor, ni el relayer
        reciben esta selección en claro.
      </Notice>
      <ActionButton
        disabled={!choice}
        onClick={() => {
          if (choice) onSelect(choice);
        }}
      >
        Revisar compromiso <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function ReviewStage({ state, onConfirm }: { state: PassportJourneyState; onConfirm: () => void }) {
  const choiceLabel = state.choice === 'YES' ? 'Sí' : state.choice === 'NO' ? 'No' : 'Abstención';
  return (
    <section className="passport-journey-card" aria-labelledby="passport-review-title">
      <p className="eyebrow">Paso 7 · revisión</p>
      <h2 id="passport-review-title">Revisá antes de probar</h2>
      <div className="review-credential-row">
        <ShieldCheck size={21} />
        <span>
          <strong>Credencial fixture válida</strong>
          <small>Argentina · 18+ · epoch preview-2026-08</small>
        </span>
        <CheckCircle size={18} />
      </div>
      <div className="passport-review-choice">
        <span>Tu respuesta</span>
        <strong>{choiceLabel}</strong>
        <small>Se cifra en un ballot commitment para esta consulta.</small>
      </div>
      <div className="review-scope-row">
        <Globe size={20} />
        <span>
          <strong>Alcance</strong>
          <small>
            {state.scope === 'global' ? 'World · política global' : 'Mi país · Argentina'}
          </small>
        </span>
      </div>
      <Notice>
        El recibo final será choice-free: confirma una participación válida, pero no incluye tu
        identidad, tu país, tu credencial ni {`la opción ${choiceLabel.toLowerCase()}`}.
      </Notice>
      <ActionButton onClick={onConfirm}>
        Preparar prueba local <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function SubmissionStage({
  state,
  onAdvance,
}: {
  state: PassportJourneyState;
  onAdvance: () => void;
}) {
  const copy = {
    proving: {
      eyebrow: 'Paso 8 · proving',
      title: 'Generando prueba local',
      body: 'Se prueba elegibilidad, raíz congelada y nullifier sin revelar la credencial ni la respuesta.',
      button: 'Enviar prueba al relayer demo',
    },
    relaying: {
      eyebrow: 'Paso 8 · relaying',
      title: 'Relayer autorizado',
      body: 'El relayer valida red, contrato y circuito antes de enviar la transacción de demostración.',
      button: 'Esperar confirmación del indexer',
    },
    indexer: {
      eyebrow: 'Paso 8 · indexer',
      title: 'Confirmando en el indexer',
      body: 'Todavía no hay comprobante confirmado. El recibo solo nace cuando la lectura canónica coincide.',
      button: 'Ver comprobante confirmado',
    },
  }[state.stage as 'proving' | 'relaying' | 'indexer'];
  const progress = state.stage === 'proving' ? 33 : state.stage === 'relaying' ? 66 : 90;
  return (
    <section
      className="passport-journey-card passport-processing-card"
      aria-live="polite"
      aria-labelledby="passport-submission-title"
    >
      <div className="passport-processing-orb">
        <Stamp size={32} />
      </div>
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 id="passport-submission-title">{copy.title}</h2>
      <p>{copy.body}</p>
      <progress
        className="passport-processing-track"
        aria-label="Progreso de envío"
        max={100}
        value={progress}
      />
      <ol className="passport-processing-list">
        <li className={state.stage === 'proving' ? 'active' : 'done'}>
          <span>{state.stage === 'proving' ? '1' : <Check size={14} />}</span>
          <strong>Prueba ZK</strong>
        </li>
        <li
          className={
            state.stage === 'relaying' ? 'active' : state.stage === 'indexer' ? 'done' : ''
          }
        >
          <span>
            {state.stage === 'proving' || state.stage === 'relaying' ? '2' : <Check size={14} />}
          </span>
          <strong>Relayer</strong>
        </li>
        <li className={state.stage === 'indexer' ? 'active' : ''}>
          <span>3</span>
          <strong>Indexer</strong>
        </li>
      </ol>
      <Notice tone="warning">
        Demo local: este recorrido no llama al proof server, al relayer ni al indexer de Preview.
      </Notice>
      <ActionButton onClick={onAdvance}>
        {copy.button} <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function ReceiptStage({ state, onClose }: { state: PassportJourneyState; onClose: () => void }) {
  const receipt = state.receipt;
  return (
    <section
      className="passport-journey-card passport-receipt-card"
      aria-labelledby="passport-receipt-title"
    >
      <div className="passport-journey-icon success">
        <Check size={36} />
      </div>
      <p className="eyebrow">Paso 9 · confirmado localmente</p>
      <h2 id="passport-receipt-title">Tu comprobante no revela tu elección</h2>
      <p>
        La demo completó la secuencia prueba → relayer → indexer. En Preview real, esta pantalla
        solo aparecería después de la confirmación canónica.
      </p>
      <div className="choice-free-receipt">
        <span>Comprobante local</span>
        <strong>{receipt?.receiptId}</strong>
        <small>Red: local-demo · Consulta: {DEMO_POLL.referendumId}</small>
      </div>
      <div className="receipt-privacy-grid">
        <div>
          <h3>
            <EyeIcon /> Público
          </h3>
          <ul>
            {receipt?.publicFacts.map((item) => (
              <li key={item}>
                <Check size={14} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>
            <EyeSlashIcon /> Privado
          </h3>
          <ul>
            {receipt?.privateFacts.map((item) => (
              <li key={item}>
                <Lock size={14} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Notice tone="success">
        La elección no aparece en este comprobante. Passport y la credencial tampoco se convierten
        en un identificador de voto.
      </Notice>
      <ActionButton onClick={onClose}>
        Volver a votaciones <ArrowRight size={19} />
      </ActionButton>
    </section>
  );
}

function EyeIcon() {
  return <span aria-hidden="true">◉</span>;
}

function EyeSlashIcon() {
  return <span aria-hidden="true">◌</span>;
}

export function PassportJourney({
  mode,
  onClose,
  passportPort,
  previewPorts,
}: PassportJourneyProps) {
  const [state, setState] = useState<PassportJourneyState>(INITIAL_PASSPORT_JOURNEY_STATE);

  if (mode === 'showcase') {
    if (!passportPort) throw new Error('Showcase mode requires a Passport session port');
    return <ShowcasePassportJourney passport={passportPort} onClose={onClose} />;
  }

  if (mode === 'preview') {
    if (previewPorts) {
      return <PreviewPassportJourney ports={previewPorts} onClose={onClose} />;
    }
    return (
      <Shell state={state} onClose={onClose}>
        <section className="passport-journey-card" aria-labelledby="passport-preview-title">
          <div className="passport-journey-icon">
            <Fingerprint size={36} />
          </div>
          <p className="eyebrow">Modo Preview</p>
          <h2 id="passport-preview-title">Passport todavía no emite credenciales aquí</h2>
          <p>
            La sesión y el consentimiento Passport pueden existir como superficie de identidad, pero
            la credencial cívica Passport-native todavía no está conectada a este entorno.
          </p>
          <Notice tone="warning">
            No vamos a presentar una fixture como una credencial real en Preview. Rarimo permanece
            como un adaptador temporal pendiente de configuración y verificación server-side.
          </Notice>
          <ActionButton onClick={onClose} variant="secondary">
            Volver a la app
          </ActionButton>
        </section>
      </Shell>
    );
  }

  const transition = (next: PassportJourneyState) => setState(next);
  return (
    <Shell state={state} onClose={onClose}>
      {state.stage === 'consent' ? (
        <ConsentStage onConnect={() => transition(connectDemoPassport(state))} onClose={onClose} />
      ) : null}
      {state.stage === 'provider' ? (
        <ProviderStage onContinue={() => transition(startDemoEnrollment(state))} />
      ) : null}
      {state.stage === 'enrollment' ? (
        <EnrollmentStage onComplete={() => transition(finishDemoEnrollment(state))} />
      ) : null}
      {state.stage === 'credential' ? (
        <CredentialStage onContinue={() => transition(openDemoScope(state))} />
      ) : null}
      {state.stage === 'scope' ? (
        <ScopeStage onSelect={(scope) => transition(selectDemoScope(state, scope))} />
      ) : null}
      {state.stage === 'choice' && state.scope ? (
        <ChoiceStage
          scope={state.scope}
          onSelect={(choice) => transition(selectDemoChoice(state, choice))}
        />
      ) : null}
      {state.stage === 'review' ? (
        <ReviewStage state={state} onConfirm={() => transition(startDemoSubmission(state))} />
      ) : null}
      {(['proving', 'relaying', 'indexer'] as const).includes(
        state.stage as 'proving' | 'relaying' | 'indexer',
      ) ? (
        <SubmissionStage state={state} onAdvance={() => transition(advanceDemoSubmission(state))} />
      ) : null}
      {state.stage === 'receipt' ? <ReceiptStage state={state} onClose={onClose} /> : null}
    </Shell>
  );
}
