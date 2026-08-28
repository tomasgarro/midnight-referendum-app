import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChartBar,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  EyeSlash,
  Fingerprint,
  Globe,
  IdentificationCard,
  Info,
  Lock,
  MagnifyingGlass,
  Question,
  ShieldCheck,
  Stamp,
  UserCircle,
  Users,
  Wallet,
  X,
} from '@phosphor-icons/react';
import type {
  CivicPassportSession,
  EligibilityAttestation,
  PrivateState,
  VoteReveal,
} from 'midnight-referendum-api';
import {
  MidnightCivicActionAdapter,
  RarimoCivicCredentialAdapter,
  watchReferendumState,
} from 'midnight-referendum-api';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { DniVerification, type DniVerificationResult } from '@/components/dni-verification';
import { PassportJourney } from '@/components/passport-v2/PassportJourney';
import type { PreviewPassportJourneyPorts } from '@/components/passport-v2/PreviewPassportJourney';
import { WalletWidget } from '@/components/wallet-widget';
import { useWallet } from '@/hooks/use-wallet';
import { resolveAppMode } from '@/integration/app-mode';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { ActionMode, ConsultationArea } from '@/integration/civic-state';
import { ASSIGNED_COUNTRIES, countryName as getCountryName } from '@/integration/country-catalog';
import { PassportIdentityBridge } from '@/integration/passport';
import { MidnightPassportSessionAdapter } from '@/integration/passport-session-port';
import {
  HttpCivicCredentialIssuerPort,
  HttpRarimoVerificationGateway,
} from '@/integration/passport-v2-http-ports';
import { parsePassportV2RuntimeConfig } from '@/integration/passport-v2-runtime-config';
import { countOpenPolls, getPollAvailability } from '@/integration/poll-lifecycle';
import {
  findRuntimeReferendum,
  getPreviewReadiness,
  getPublicReadiness,
  resolvePassportV2ActionRoute,
} from '@/integration/preview';
import { deriveProfileId, deriveReceiptProfileKey } from '@/integration/profile';
import { rarimoIsoCountryMapper } from '@/integration/rarimo-country-mapper';
import {
  loadPassportReceipts,
  type PassportReceiptRecord,
  savePassportReceipt,
} from '@/integration/receipt-store';
import {
  MidnightProvidersProvider,
  RELAYER_MODE,
  useMidnightProviders,
} from '@/providers/midnight-providers';
import { WalletProvider } from '@/providers/wallet-context';

type Tab = 'understand' | 'votes' | 'verify' | 'profile';
type Choice = VoteReveal['choice'];
type FlowStage =
  | 'verify'
  | 'document'
  | 'eligible'
  | 'choose'
  | 'review'
  | 'processing'
  | 'receipt';

interface Poll {
  id: string;
  title: string;
  description: string;
  question: string;
  deadline: string;
  opened: string;
  opensAt: string;
  closesAt: string;
  eligible: string;
  participation: string;
  whyNow: string;
  legalFrame: string;
  evidence: string;
  evidenceLabel: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
  uncertainty: string;
  sources: Array<{ label: string; href: string; detail: string }>;
}

type VoteReceipt = PassportReceiptRecord;

const APP_MODE = resolveAppMode(import.meta.env.MODE, import.meta.env.VITE_APP_MODE);
// Undeployed is an educational/synthetic lane until a valid v2 catalog is
// supplied. It must never silently send the legacy referendum transaction.
const CHAIN_RUNTIME_ENABLED = APP_MODE === 'preview';
const APP_NETWORK_LABEL =
  APP_MODE === 'undeployed'
    ? 'Undeployed local'
    : APP_MODE === 'preview'
      ? 'Preview'
      : 'Demo local';
const CONTRACT_ADDRESS = import.meta.env.VITE_MIDNIGHT_CONTRACT_ADDRESS?.trim() || null;
const PASSPORT_ORIGIN =
  import.meta.env.VITE_PASSPORT_ORIGIN?.trim() || 'https://midnightpassport.com';
const EXPLORER_BASE_URL =
  import.meta.env.VITE_MIDNIGHT_EXPLORER_BASE_URL?.trim() ||
  'https://explorer.preview.midnight.network/tx';
const ONBOARDING_SESSION_KEY = 'cico-wave1-onboarding-complete';

function shouldShowFirstRunOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(ONBOARDING_SESSION_KEY) !== '1';
}

const POLLS: Poll[] = [
  {
    id: 'tierras-rurales',
    title: 'Tierras rurales y propiedad extranjera',
    description:
      'Una consulta sobre límites y controles nacionales a la titularidad y posesión extranjera de tierras rurales.',
    question:
      '¿Debería Argentina mantener un régimen nacional de límites y controles sobre la titularidad y posesión extranjera de tierras rurales, con revisión pública periódica?',
    opened: '8 de agosto de 2026',
    deadline: '16 de agosto de 2026',
    opensAt: '2026-08-08T00:00:00-03:00',
    closesAt: '2026-08-16T23:59:59-03:00',
    eligible: '143.820',
    participation: '8.914 participaciones de demo',
    whyNow:
      'La Ley 26.737 continúa bajo debate: el DNU 70/2023 intentó derogarla y una medida cautelar restituyó su vigencia. El expediente PE-13/26 también sigue su propio trámite legislativo.',
    legalFrame:
      'Ley 26.737: régimen de tierras rurales, Registro Nacional de Tierras Rurales y límites nacionales, provinciales y departamentales.',
    evidence:
      'El registro oficial publicó en agosto de 2025 que más de treinta departamentos superaban el 15% registrado.',
    evidenceLabel: 'HECHO · registro oficial, agosto de 2025',
    argumentsFor: [
      'Más trazabilidad sobre titularidad y posesión de tierras rurales.',
      'Reglas comunes para zonas de frontera, agua y otros recursos estratégicos.',
    ],
    argumentsAgainst: [
      'Los límites uniformes pueden no reflejar diferencias provinciales y productivas.',
      'Una revisión podría mejorar seguridad jurídica, inversión y trámites.',
    ],
    uncertainty:
      'No se conoce el texto final ni el alcance que tendrá el expediente PE-13/26, ni el efecto de una reforma sobre inversión, producción y ambiente.',
    sources: [
      {
        label: 'Ley 26.737',
        href: 'https://www.argentina.gob.ar/normativa/nacional/ley-26737-192150/actualizacion',
        detail: 'Norma primaria',
      },
      {
        label: 'Registro de Tierras Rurales',
        href: 'https://www.argentina.gob.ar/justicia/tierrasrurales/datos/extranjerizacion-departamento',
        detail: 'Datos publicados, agosto de 2025',
      },
      {
        label: 'Expediente PE-13/26',
        href: 'https://www.senado.gob.ar/parlamentario/comisiones/verExp/13.26/PE/PL',
        detail: 'Estado legislativo',
      },
    ],
  },
  {
    id: 'federalismo-fiscal',
    title: 'Federalismo fiscal y coparticipación',
    description:
      'Cómo se distribuyen recursos entre Nación, provincias y CABA, y qué puede cambiar una nueva fórmula.',
    question:
      '¿Debería Argentina reformar el régimen de distribución de recursos entre la Nación, las provincias y la Ciudad Autónoma de Buenos Aires para hacerlo más transparente, previsible y revisable?',
    opened: '8 de agosto de 2026',
    deadline: '23 de agosto de 2026',
    opensAt: '2026-08-08T00:00:00-03:00',
    closesAt: '2026-08-23T23:59:59-03:00',
    eligible: '126.540',
    participation: '6.382 participaciones de demo',
    whyNow:
      'La distribución de recursos, los ATN y las transferencias automáticas siguen siendo centrales para financiar servicios públicos en las jurisdicciones.',
    legalFrame:
      'Ley 23.548 y artículo 75 de la Constitución Nacional: reglas de coparticipación y marco para una ley-convenio.',
    evidence:
      'La serie oficial de Recursos de Origen Nacional publica montos diarios e informes consolidados para provincias desde 2003.',
    evidenceLabel: 'HECHO · Secretaría de Hacienda, series 2003–2025',
    argumentsFor: [
      'Una fórmula publicada podría dar mayor previsibilidad y rendición de cuentas.',
      'Una reforma puede incorporar transiciones y mecanismos de revisión explícitos.',
    ],
    argumentsAgainst: [
      'Cambiar la fórmula puede generar perdedores relativos y conflictos de transición.',
      'Mantener reglas conocidas puede evitar incertidumbre fiscal de corto plazo.',
    ],
    uncertainty:
      'No existe una única fórmula acordada ni se conocen sus efectos netos sobre cada provincia, CABA y municipio.',
    sources: [
      {
        label: 'Ley 23.548',
        href: 'https://www.argentina.gob.ar/normativa/nacional/ley-23548-21108/actualizacion',
        detail: 'Régimen vigente',
      },
      {
        label: 'Recursos de Origen Nacional',
        href: 'https://www.argentina.gob.ar/economia/sechacienda/asuntosprovinciales/ron',
        detail: 'Datos y metodología',
      },
      {
        label: 'Gasto Público Consolidado',
        href: 'https://www.argentina.gob.ar/economia/politicaeconomica/macroeconomica/gastopublicoconsolidado',
        detail: 'Base hasta 2024; actualización marzo de 2026',
      },
    ],
  },
  {
    id: 'reforma-laboral',
    title: 'Reforma laboral y empleo registrado',
    description:
      'Una consulta sobre formalización, creación de empleo y garantías laborales explícitas.',
    question:
      '¿Debería Argentina modificar el marco laboral vigente para priorizar la formalización y la creación de empleo, manteniendo garantías laborales explícitas y evaluación pública de impacto?',
    opened: '8 de agosto de 2026',
    deadline: '30 de agosto de 2026',
    opensAt: '2026-08-08T00:00:00-03:00',
    closesAt: '2026-08-30T23:59:59-03:00',
    eligible: '119.760',
    participation: '5.107 participaciones de demo',
    whyNow:
      'La Ley 27.802 y sus mecanismos de transición abren una discusión sobre costos, negociación colectiva, derechos y empleo registrado.',
    legalFrame:
      'Ley 27.802 y estadísticas del mercado de trabajo: la consulta no reemplaza el texto legal ni su reglamentación.',
    evidence:
      'La EPH de INDEC y los registros SIPA miden universos distintos; por eso sus cifras no deben confundirse.',
    evidenceLabel: 'HECHO · metodología INDEC / Secretaría de Trabajo',
    argumentsFor: [
      'Cambiar incentivos podría facilitar la registración y la creación de puestos formales.',
      'La evaluación pública permitiría seguir costos e impactos de implementación.',
    ],
    argumentsAgainst: [
      'La formalización no garantiza por sí sola empleo de calidad ni mejores salarios.',
      'Cambios amplios pueden debilitar protecciones si no se definen límites y transición.',
    ],
    uncertainty:
      'No se puede atribuir un cambio futuro del empleo a una ley sin aislar el ciclo económico, el cumplimiento y la reglamentación.',
    sources: [
      {
        label: 'Ley 27.802',
        href: 'https://www.argentina.gob.ar/normativa/nacional/ley-27802-423680/texto',
        detail: 'Norma primaria',
      },
      {
        label: 'Mercado de trabajo INDEC',
        href: 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-4-31-58',
        detail: 'EPH y metodología',
      },
      {
        label: 'Empleo registrado',
        href: 'https://www.argentina.gob.ar/trabajo/estadisticas/situacion-y-evolucion-del-trabajo-registrado',
        detail: 'Informe administrativo, abril de 2026',
      },
    ],
  },
  {
    id: 'jubilaciones',
    title: 'Jubilaciones y sostenibilidad previsional',
    description:
      'Cobertura, suficiencia de prestaciones y sostenibilidad financiera del sistema previsional.',
    question:
      '¿Debería Argentina reformar el sistema previsional para mejorar simultáneamente su sostenibilidad financiera, la cobertura y la suficiencia de las prestaciones, protegiendo a quienes no completan aportes?',
    opened: '8 de agosto de 2026',
    deadline: '6 de septiembre de 2026',
    opensAt: '2026-08-08T00:00:00-03:00',
    closesAt: '2026-09-06T23:59:59-03:00',
    eligible: '132.900',
    participation: '4.618 participaciones de demo',
    whyNow:
      'El debate previsional combina movilidad, financiamiento, cobertura contributiva y no contributiva, y protección a trayectorias laborales incompletas.',
    legalFrame:
      'Ley 24.241: estructura del SIPA, prestaciones, requisitos y reglas de movilidad dentro del marco previsional nacional.',
    evidence:
      'ANSES publica caracterizaciones e informes estadísticos que deben leerse con su fecha de corte y metodología.',
    evidenceLabel: 'HECHO · ANSES, informe a junio de 2025',
    argumentsFor: [
      'Una revisión integral puede hacer visibles los parámetros de cobertura, financiamiento y transición.',
      'La protección explícita de aportes incompletos puede ordenar reglas hoy fragmentadas.',
    ],
    argumentsAgainst: [
      'Reformas de parámetros pueden trasladar costos a jubilados actuales o futuros.',
      'La sostenibilidad financiera no garantiza por sí sola prestaciones suficientes.',
    ],
    uncertainty:
      'No hay una propuesta única que resuelva a la vez cobertura, suficiencia y financiamiento; sus efectos dependen del diseño y la transición.',
    sources: [
      {
        label: 'Ley 24.241',
        href: 'https://www.argentina.gob.ar/normativa/nacional/639/actualizacion',
        detail: 'Marco previsional',
      },
      {
        label: 'Caracterización ANSES',
        href: 'https://www.anses.gob.ar/caracterizacion-de-las-prestaciones-previsionales',
        detail: 'Alcance y metodología',
      },
      {
        label: 'Estadísticas de la seguridad social',
        href: 'https://www.anses.gob.ar/sites/default/files/2025-11/Informe%20de%20Estad%C3%ADsticas%20de%20la%20SS%20II%20Trim.%202025.pdf',
        detail: 'Datos a junio de 2025',
      },
    ],
  },
  {
    id: 'energia-renovable',
    title: 'Energía, tarifas y transición renovable',
    description: 'Más renovables y redes, con protección focalizada para usuarios vulnerables.',
    question:
      '¿Debería Argentina priorizar una transición energética con mayor participación renovable, expansión de redes y protección focalizada para usuarios vulnerables?',
    opened: '8 de agosto de 2026',
    deadline: '13 de septiembre de 2026',
    opensAt: '2026-08-08T00:00:00-03:00',
    closesAt: '2026-09-13T23:59:59-03:00',
    eligible: '138.260',
    participation: '7.246 participaciones de demo',
    whyNow:
      'Las metas de renovables, la generación distribuida, las tarifas y el esquema de subsidios focalizados requieren decisiones que combinan inversión y protección.',
    legalFrame:
      'Leyes 27.191 y 27.424, junto con el esquema de Subsidios Energéticos Focalizados (SEF).',
    evidence:
      'La meta legal de 20% renovable al 31 de diciembre de 2025 es un objetivo normativo; no es un dato observado.',
    evidenceLabel: 'HECHO · Ley 27.191, meta normativa',
    argumentsFor: [
      'Renovables, redes y generación distribuida pueden diversificar la matriz y atraer inversión.',
      'La focalización puede concentrar protección en usuarios que más la necesitan.',
    ],
    argumentsAgainst: [
      'La expansión exige red, respaldo y financiamiento; los costos no desaparecen.',
      'Una transición rápida puede aumentar tarifas o dejar fuera a usuarios mal clasificados.',
    ],
    uncertainty:
      'La tecnología, el presupuesto, el cronograma y el alcance del SEF no están definidos por esta pregunta; tampoco hay un único indicador de pobreza energética.',
    sources: [
      {
        label: 'Ley 27.191',
        href: 'https://www.argentina.gob.ar/normativa/nacional/ley-27191-253626/actualizacion',
        detail: 'Fomento de renovables',
      },
      {
        label: 'Ley 27.424',
        href: 'https://www.argentina.gob.ar/normativa/nacional/ley-27424-305179/actualizacion',
        detail: 'Generación distribuida',
      },
      {
        label: 'Subsidios Energéticos Focalizados',
        href: 'https://www.argentina.gob.ar/normativa/nacional/decreto-943-2025-422016',
        detail: 'Decreto 943/2025',
      },
    ],
  },
];
function requireDefaultPoll(polls: readonly Poll[]): Poll {
  const poll = polls.at(0);
  if (!poll) throw new Error('At least one civic consultation must be configured.');
  return poll;
}

const DEFAULT_POLL = requireDefaultPoll(POLLS);
const COUNTRY_POLL_IDS = new Set(['tierras-rurales']);
const COUNTRY_POLL_COUNTRIES = new Map([['tierras-rurales', 'AR']]);
const DASHBOARD_COUNTRIES = ASSIGNED_COUNTRIES.map((country) => ({
  code: country.alpha2,
  name: getCountryName(country.alpha2, 'es'),
  numeric: country.numeric,
}));

function isCountryPoll(poll: Poll): boolean {
  return COUNTRY_POLL_IDS.has(poll.id);
}

function isCountryPollForCountry(poll: Poll, countryCode: string): boolean {
  return COUNTRY_POLL_COUNTRIES.get(poll.id) === countryCode;
}

async function copyReceiptId(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document === 'undefined') throw new Error('Clipboard unavailable');
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}

function CopyReceiptButton({
  receiptId,
  compact = false,
}: {
  receiptId: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await copyReceiptId(receiptId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      className={`copy-receipt ${compact ? 'compact' : ''}`}
      onClick={() => void handleCopy()}
      aria-label={`Copiar comprobante ${receiptId}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? 'Copiado' : 'Copiar'}</span>
    </button>
  );
}

function Header({
  passportSession,
  passportError,
  onConnectPassport,
  onDismissPassportError,
}: {
  passportSession: CivicPassportSession | null;
  passportError: string | null;
  onConnectPassport: () => void;
  onDismissPassportError: () => void;
}) {
  return (
    <header className="site-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <Globe size={24} weight="duotone" />
        </span>
        <div>
          <p className="brand-name">Referéndum Cívico</p>
          <p className="brand-note">Prototipo independiente</p>
        </div>
      </div>
      <div className="wallet-area">
        <button
          type="button"
          className={`wallet-chip ${passportSession ? 'connected' : ''}`}
          onClick={onConnectPassport}
          title={passportError ?? 'Identidad pública de Midnight Passport'}
          aria-label={passportSession ? 'Abrir Midnight Passport' : 'Conectar Midnight Passport'}
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
            <strong>No se pudo conectar Passport</strong>
            <p>{passportError}</p>
            <button type="button" className="popover-action" onClick={onConnectPassport}>
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const items = [
    { id: 'understand' as const, label: 'Entendé', Icon: BookOpen },
    { id: 'votes' as const, label: 'Votaciones', Icon: Stamp },
    { id: 'verify' as const, label: 'Verificá', Icon: ShieldCheck },
    { id: 'profile' as const, label: 'Mi perfil', Icon: UserCircle },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
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

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="status-pill">
      <span className="status-dot" />
      {children}
    </span>
  );
}

const PHASE_COPY = {
  COMMIT: {
    label: 'Votación abierta',
    note: 'Los votos están sellados. Todavía no hay nada que contar.',
  },
  REVEAL: {
    label: 'Recuento en curso',
    note: 'Cada voto se suma a su total sin revelar de quién vino.',
  },
  FINALIZED: { label: 'Resultado final', note: 'El recuento está cerrado y publicado.' },
} as const;

interface PublicReferendumState {
  state: import('midnight-referendum-api').ContractState | null;
  error: string | null;
  loading: boolean;
}

/** Live aggregates read from the contract. Never a hardcoded number. */
function usePublicReferendumState(): PublicReferendumState {
  const { publicDataProvider, publicReadError } = useMidnightProviders();
  const [state, setState] = useState<import('midnight-referendum-api').ContractState | null>(null);
  const [error, setError] = useState<string | null>(publicReadError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicDataProvider || !CONTRACT_ADDRESS) {
      setState(null);
      setLoading(false);
      setError(publicReadError);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(publicReadError);
    const subscription = watchReferendumState({ publicDataProvider }, CONTRACT_ADDRESS).subscribe({
      next: (next) => {
        if (cancelled) return;
        setState(next);
        setError(null);
        setLoading(false);
      },
      error: (reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'No se pudo leer el estado público');
        setLoading(false);
      },
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [publicDataProvider, publicReadError]);

  return { state, error, loading };
}

function ResultsPanel() {
  const { state, error, loading } = usePublicReferendumState();

  if (error) {
    return (
      <section className="results-panel">
        <div className="results-note">
          <Info size={20} />
          <p>No pudimos leer el estado del contrato: {error}</p>
        </div>
      </section>
    );
  }
  if (loading && !state) return <CommitPhasePanel />;
  if (!state) return <CommitPhasePanel />;

  const phase = PHASE_COPY[state.phase];
  const votes = (['YES', 'NO', 'ABSTAIN'] as const).map((key) => ({
    key,
    label: key === 'YES' ? 'Sí' : key === 'NO' ? 'No' : 'Abstención',
    count: state.tally.get(key) ?? 0n,
  }));
  const total = votes.reduce((sum, vote) => sum + vote.count, 0n);

  return (
    <section className="results-panel" aria-labelledby="results-title">
      <div className="results-heading">
        <ChartBar size={22} />
        <div>
          <h2 id="results-title">{phase.label}</h2>
          <p>{phase.note}</p>
        </div>
      </div>
      {state.phase === 'COMMIT' ? (
        <div className="results-note">
          <ShieldCheck size={20} />
          <p>
            {state.issuedVoters.toString()}{' '}
            {state.issuedVoters === 1n ? 'persona habilitada' : 'personas habilitadas'}. Los totales
            aparecen recién cuando se abre el recuento.
          </p>
        </div>
      ) : (
        <div className="tally-list">
          {votes.map(({ key, label, count }) => {
            const pct = total === 0n ? 0 : Number((count * 1000n) / total) / 10;
            return (
              <div className="tally-row" key={key}>
                <div className="tally-head">
                  <strong>{label}</strong>
                  <span>
                    {count.toString()} · {pct.toFixed(1)}%
                  </span>
                </div>
                <progress
                  aria-label={`${label}: ${pct}%`}
                  className={`tally-bar ${key.toLowerCase()}`}
                  max={100}
                  value={pct}
                />
              </div>
            );
          })}
          <p className="tally-total">
            {total.toString()} de {state.issuedVoters.toString()} habilitadas · leído del contrato
          </p>
        </div>
      )}
    </section>
  );
}

function CommitPhasePanel() {
  return (
    <section className="results-panel" aria-labelledby="results-title">
      <div className="results-heading">
        <ChartBar size={22} />
        <div>
          <h2 id="results-title">Compromiso privado durante la votación</h2>
          <p>Las respuestas se revelan y agregan después del cierre.</p>
        </div>
      </div>
      <div className="results-note">
        <ShieldCheck size={20} />
        <p>
          El contrato registra compromisos anónimos, nullifiers de un voto y publica solo el
          agregado YES/NO/ABSTAIN durante reveal.
        </p>
      </div>
    </section>
  );
}

function VotesView({
  credential,
  onStartVote,
  onOpenPolicy,
  onOpenPassportJourney,
}: {
  credential: DemoCredentialSummary | null;
  onStartVote: (pollId: string) => void;
  onOpenPolicy: (pollId: string) => void;
  onOpenPassportJourney: () => void;
}) {
  const [area, setArea] = useState<ConsultationArea>('world');
  const [selectedCountry, setSelectedCountry] = useState(credential?.country ?? 'AR');
  const [countrySearch, setCountrySearch] = useState('');
  const [now, setNow] = useState(() => new Date());
  const selectedCountryName =
    DASHBOARD_COUNTRIES.find((country) => country.code === selectedCountry)?.name ??
    selectedCountry;
  const filteredCountries = countrySearch.trim()
    ? DASHBOARD_COUNTRIES.filter((country) =>
        `${country.name} ${country.code} ${country.numeric}`
          .toLocaleLowerCase()
          .includes(countrySearch.trim().toLocaleLowerCase()),
      )
    : DASHBOARD_COUNTRIES;
  useEffect(() => {
    if (credential?.country) setSelectedCountry(credential.country);
  }, [credential?.country]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const visiblePolls =
    area === 'world'
      ? POLLS.filter((poll) => !isCountryPoll(poll))
      : selectedCountry === credential?.country
        ? POLLS.filter((poll) => isCountryPollForCountry(poll, selectedCountry))
        : [];
  const openPollCount = countOpenPolls(visiblePolls, now);
  return (
    <main className="page-content civic-dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Tu panel cívico</p>
          <h1>Consultas para vos</h1>
        </div>
        <span className="open-count">
          <span className="status-dot" />
          {openPollCount} disponibles
        </span>
      </div>
      {credential ? (
        <section className="credential-status-card" aria-label="Estado de tu credencial">
          <span className="credential-status-icon">
            <ShieldCheck size={22} />
          </span>
          <span>
            <strong>Credencial lista</strong>
            <small>
              {getCountryName(credential.country, 'es')} ({credential.country}) ·{' '}
              {credential.ageClass} · solo para elegibilidad
            </small>
          </span>
          <span className="synthetic-badge">
            {credential.kind === 'synthetic-demo-credential' ? 'SINTÉTICA' : 'VERIFICADA'}
          </span>
        </section>
      ) : (
        <section
          className="passport-entry-card dashboard-onboarding-card"
          aria-labelledby="passport-entry-title"
        >
          <div className="passport-entry-icon">
            <Fingerprint size={24} />
          </div>
          <div>
            <p className="eyebrow">Empezá por tu identidad</p>
            <h2 id="passport-entry-title">Prepará tu credencial para explorar</h2>
            <p>
              Conectá Passport, revisá la evidencia y después elegí qué consulta querés conocer. No
              necesitás wallet para este recorrido.
            </p>
            <button className="passport-entry-button" onClick={onOpenPassportJourney} type="button">
              Preparar mi credencial <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      <div className="dashboard-area-tabs" role="tablist" aria-label="Espacio de participación">
        <button
          type="button"
          role="tab"
          aria-selected={area === 'world'}
          className={area === 'world' ? 'active' : ''}
          onClick={() => setArea('world')}
        >
          <Globe size={18} /> World
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={area === 'countries'}
          className={area === 'countries' ? 'active' : ''}
          onClick={() => setArea('countries')}
        >
          <IdentificationCard size={18} /> Countries
        </button>
      </div>

      {area === 'countries' ? (
        <section className="country-selector-card" aria-labelledby="country-selector-title">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Consultas por país</p>
              <h2 id="country-selector-title">Elegí un país</h2>
            </div>
            <Globe size={22} />
          </div>
          <label htmlFor="country-selector">País</label>
          <input
            id="country-search"
            className="country-search-input"
            type="search"
            value={countrySearch}
            onChange={(event) => setCountrySearch(event.target.value)}
            placeholder="Buscar por nombre o código"
            aria-label="Buscar un país"
          />
          <select
            id="country-selector"
            value={selectedCountry}
            onChange={(event) => setSelectedCountry(event.target.value)}
          >
            {filteredCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <p className="country-selector-help">
            {credential
              ? `Tu credencial prueba ${getCountryName(credential.country, 'es')}; solo ese espacio está desbloqueado.`
              : 'Completá el recorrido Passport para desbloquear tu espacio.'}
          </p>
        </section>
      ) : (
        <section className="dashboard-intro-card">
          <div>
            <p className="eyebrow">World</p>
            <h2>Ideas que cualquier credencial válida puede explorar</h2>
          </div>
          <p>
            Leé el contexto antes de decidir. La wallet solo aparece si después elegís realizar una
            acción real.
          </p>
        </section>
      )}

      {area === 'countries' && selectedCountry !== credential?.country ? (
        <section className="locked-country-card" role="status">
          <Lock size={24} />
          <div>
            <strong>{selectedCountryName} todavía está bloqueado</strong>
            <p>
              Tu credencial no prueba elegibilidad para este espacio. No se habilita por elegirlo en
              el selector.
            </p>
          </div>
        </section>
      ) : visiblePolls.length ? (
        <section className="dashboard-consultations" aria-labelledby="consultations-title">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">
                {area === 'world' ? 'Consultas globales' : selectedCountryName}
              </p>
              <h2 id="consultations-title">Conocé antes de participar</h2>
            </div>
            <BookOpen size={22} />
          </div>
          <div className="dashboard-poll-list">
            {visiblePolls.map((poll) => (
              <article className="dashboard-poll-card" key={poll.id}>
                <div className="poll-meta">
                  <StatusPill>
                    {getPollAvailability(poll, now).isOpen
                      ? 'Votación abierta'
                      : 'Votación cerrada'}
                  </StatusPill>
                  <span>Cierra el {poll.deadline}</span>
                </div>
                <h3>{poll.title}</h3>
                <p>{poll.description}</p>
                <div className="poll-card-actions">
                  <button type="button" className="text-link" onClick={() => onOpenPolicy(poll.id)}>
                    Leer propuesta <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="primary-button yellow"
                    disabled={!getPollAvailability(poll, now).isOpen}
                    onClick={() => (credential ? onStartVote(poll.id) : onOpenPassportJourney())}
                  >
                    <Stamp size={19} />{' '}
                    {getPollAvailability(poll, now).isOpen
                      ? credential
                        ? 'Votá ahora'
                        : 'Preparar credencial'
                      : 'Votación cerrada'}
                  </button>
                </div>
                <p className="demo-stat">
                  <Info size={14} /> {poll.participation}. Cifra simulada para este prototipo.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="dashboard-empty-card">
          <Lock size={24} />
          <div>
            <strong>No hay consultas disponibles en este espacio</strong>
            <p>Volvé a World o elegí el país desbloqueado por tu credencial.</p>
          </div>
        </section>
      )}

      {area === 'world' ? <ResultsPanel /> : null}
    </main>
  );
}

function PolicyDetailView({
  poll,
  onBack,
  onStartVote,
  credential,
  onOpenPassportJourney,
}: {
  poll: Poll;
  onBack: () => void;
  onStartVote: (pollId: string) => void;
  credential: DemoCredentialSummary | null;
  onOpenPassportJourney: () => void;
}) {
  const consultationCountry = COUNTRY_POLL_COUNTRIES.get(poll.id);
  const pollAvailability = getPollAvailability(poll);
  const consultationCountryName = consultationCountry
    ? getCountryName(consultationCountry, 'es')
    : null;
  return (
    <main className="page-content policy-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> Volver a votaciones
      </button>
      <div className="policy-status">
        <StatusPill>{pollAvailability.isOpen ? 'Votación abierta' : 'Votación cerrada'}</StatusPill>
        <span>Actualizado: 8 de agosto de 2026</span>
      </div>
      <section className="policy-hero">
        <p className="eyebrow">Resumen para decidir</p>
        <h1>{poll.title}</h1>
        <p>{poll.question}</p>
        <div className="policy-facts">
          <span>
            <Calendar size={17} /> Cierra: <strong>{poll.deadline}</strong>
          </span>
          <span>
            <Users size={17} /> <strong>{poll.eligible}</strong> habilitadas*
          </span>
        </div>
      </section>

      <section className="policy-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">En dos minutos</p>
            <h2>¿De qué se trata?</h2>
          </div>
          <BookOpen size={22} />
        </div>
        <p>{poll.whyNow}</p>
        <div className="evidence-card">
          <span>{poll.evidenceLabel}</span>
          <p>{poll.evidence}</p>
        </div>
      </section>

      <section className="policy-section policy-frame">
        <p className="eyebrow">Marco vigente</p>
        <p>{poll.legalFrame}</p>
      </section>

      <section className="policy-section" aria-labelledby="arguments-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Perspectivas</p>
            <h2 id="arguments-title">Argumentos en discusión</h2>
          </div>
          <Question size={22} />
        </div>
        <p className="policy-section-intro">
          Son posiciones para evaluar, no recomendaciones del proyecto.
        </p>
        <div className="argument-columns">
          <article className="argument-card for">
            <h3>A favor de la propuesta</h3>
            <ul>
              {poll.argumentsFor.map((item) => (
                <li key={item}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="argument-card against">
            <h3>A favor de revisar o limitar</h3>
            <ul>
              {poll.argumentsAgainst.map((item) => (
                <li key={item}>
                  <Info size={15} /> {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="policy-section uncertainty-card">
        <p className="eyebrow">Incertidumbre</p>
        <p>{poll.uncertainty}</p>
      </section>

      <section className="policy-section" aria-labelledby="outcomes-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Qué expresa cada opción</p>
            <h2 id="outcomes-title">Tu voto no cambia la ley</h2>
          </div>
          <Stamp size={22} />
        </div>
        <div className="outcome-list">
          <div>
            <strong>Sí</strong>
            <p>Expresa apoyo a priorizar la propuesta en los términos de esta consulta.</p>
          </div>
          <div>
            <strong>No</strong>
            <p>Expresa que no apoyás priorizarla en estos términos.</p>
          </div>
          <div>
            <strong>Abstención</strong>
            <p>Registra que preferís no tomar una posición binaria.</p>
          </div>
        </div>
      </section>

      <section className="policy-section eligibility-card">
        <p className="eyebrow">Reglas de esta demo</p>
        <p>
          La credencial Passport prueba una regla de elegibilidad sin exponer tu documento. En esta
          experiencia la credencial de fixture representa la nacionalidad elegida y clase de edad
          18+.
          {consultationCountryName
            ? ` Esta consulta está configurada para ${consultationCountryName}.`
            : ''}{' '}
          No es un padrón oficial.
        </p>
      </section>

      <section className="policy-section" aria-labelledby="sources-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Para profundizar</p>
            <h2 id="sources-title">Fuentes primarias</h2>
          </div>
          <Globe size={22} />
        </div>
        <div className="source-list">
          {poll.sources.map((source) => (
            <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
              <span>
                <strong>{source.label}</strong>
                <small>{source.detail}</small>
              </span>
              <ArrowRight size={17} />
            </a>
          ))}
        </div>
      </section>

      <p className="independent-note">
        <Info size={16} /> * Las personas habilitadas y la participación son cifras simuladas. Esta
        consulta no es un referéndum oficial ni tiene efecto legal.
      </p>
      <button
        type="button"
        className="primary-button yellow"
        disabled={!pollAvailability.isOpen}
        onClick={() => (credential ? onStartVote(poll.id) : onOpenPassportJourney())}
      >
        <Stamp size={22} />{' '}
        {pollAvailability.isOpen
          ? credential
            ? 'Votar esta consulta'
            : 'Preparar mi credencial'
          : 'Votación cerrada'}
      </button>
    </main>
  );
}

const HOW_IT_WORKS = [
  {
    Icon: IdentificationCard,
    title: 'Probás que podés votar',
    body: 'Leemos el código del dorso de tu DNI en tu propio teléfono para confirmar tu edad. El documento no se sube a ningún lado.',
  },
  {
    Icon: Stamp,
    title: 'Votás en secreto',
    body: 'Tu respuesta se guarda como un compromiso cifrado. Ni nosotros ni la red pueden leerla mientras la votación está abierta.',
  },
  {
    Icon: ChartBar,
    title: 'Se cuenta a la vista de todos',
    body: 'Al cerrar, se publican solo los totales de Sí, No y Abstención. Cualquiera puede recontarlos; nadie puede vincularlos a una persona.',
  },
];

/** The separation the whole design rests on, stated in plain language. */
const SEPARATION = [
  {
    Icon: Fingerprint,
    label: 'Tu identidad Passport',
    knows: 'Tu nombre visible y tu perfil.',
    never: 'Nunca ve tu voto.',
  },
  {
    Icon: Lock,
    label: 'Tu secreto de votante',
    knows: 'Que alguien habilitado votó una sola vez.',
    never: 'Nunca sabe quién sos.',
  },
  {
    Icon: EyeSlash,
    label: 'Tu elección',
    knows: 'Se suma al total cuando se abre el recuento.',
    never: 'Nunca se guarda junto a tu identidad.',
  },
];

const PUBLIC_DATA = [
  'Que se emitió un voto válido.',
  'Una marca única que impide votar dos veces.',
  'Los totales de Sí, No y Abstención al cerrar.',
];

const PRIVATE_DATA = [
  'Tu nombre, tu número de DNI y tu foto.',
  'Qué votaste, mientras la votación sigue abierta.',
  'La relación entre tu identidad y tu voto, siempre.',
];

const FAQ = [
  {
    q: '¿Qué estamos construyendo?',
    a: 'Un prototipo de consulta ciudadana sobre Midnight, una red donde se puede demostrar algo sin revelar los datos que lo respaldan. Sirve para mostrar que se puede votar de forma anónima y verificable a la vez.',
  },
  {
    q: '¿Pueden saber qué voté?',
    a: 'No mientras la votación está abierta: tu elección viaja como un compromiso cifrado que ni el equipo ni la red pueden abrir. Al cerrar se publican únicamente los totales, sin ninguna forma de volver desde un total hasta una persona.',
  },
  {
    q: '¿Cómo evitan que alguien vote dos veces?',
    a: 'Cada persona habilitada genera una marca única e irrepetible para esta consulta, derivada de un secreto que solo vive en tu dispositivo. Si esa marca ya figura, el contrato rechaza el segundo voto. La marca no permite averiguar de quién es.',
  },
  {
    q: '¿Qué pasa con mi DNI?',
    a: 'Se lee en tu navegador y se descarta. No se sube, no se guarda y no queda ninguna imagen. Lo único que sale de tu teléfono es un código derivado que sirve para que el mismo documento no se registre dos veces, y que cambia en cada consulta.',
  },
  {
    q: '¿Es un referéndum oficial?',
    a: 'No. Es un prototipo independiente hecho para un hackathon. No tiene validez legal ni vínculo con ningún organismo público.',
  },
  {
    q: '¿Qué NO puede prometer todavía?',
    a: 'Leer el código del DNI demuestra que tenés los datos de un documento, no que el documento sea auténtico: eso requiere validar el chip contra RENAPER. La prueba de presencia detecta que hay alguien moviéndose frente a la cámara, pero no es un cotejo biométrico. Y el contrato no fue auditado.',
  },
];

const GLOSSARY = [
  {
    term: 'Compromiso',
    meaning: 'Una caja cerrada con tu voto adentro. Se puede probar que no cambió, sin abrirla.',
  },
  {
    term: 'Marca única (nullifier)',
    meaning: 'Una huella que delata un segundo voto sin decir de quién es el primero.',
  },
  {
    term: 'Prueba de conocimiento cero',
    meaning: 'Una demostración de que algo es cierto que no revela por qué lo es.',
  },
];

function UnderstandView({ onOpenPolicy }: { onOpenPolicy: (pollId: string) => void }) {
  return (
    <main className="page-content">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <p className="eyebrow">Bienvenido/a</p>
          <h1>Decidir en comunidad, con información clara.</h1>
          <p>
            Antes de votar, entendé qué se hace público, qué queda privado y por qué podés
            comprobarlo vos.
          </p>
        </div>
        <img
          className="gaucho"
          src="/assets/gaucho-waving.png"
          alt="Ilustración de un gaucho saludando"
        />
      </section>

      <section className="library-section" aria-labelledby="library-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Biblioteca editorial</p>
            <h2 id="library-title">Antes de votar, leé</h2>
          </div>
          <BookOpen size={22} />
        </div>
        <p className="section-lead">
          Cinco dossiers con marco vigente, puntos de vista contrapuestos, incertidumbres y fuentes
          oficiales fechadas.
        </p>
        <div className="library-list">
          {POLLS.map((poll) => (
            <button type="button" key={poll.id} onClick={() => onOpenPolicy(poll.id)}>
              <span>
                <strong>{poll.title}</strong>
                <small>Consulta, fuentes y consecuencias posibles</small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Cómo funciona</p>
            <h2 id="how-title">Tres pasos, una sola vez</h2>
          </div>
          <BookOpen size={22} />
        </div>
        <ol className="how-list">
          {HOW_IT_WORKS.map(({ Icon, title, body }, index) => (
            <li key={title}>
              <span className="how-step">
                <Icon size={20} />
                <small>{index + 1}</small>
              </span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="separation-section" aria-labelledby="separation-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">La idea central</p>
            <h2 id="separation-title">Tres piezas que nunca se cruzan</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        <p className="section-lead">
          La privacidad no depende de que confíes en nosotros. Depende de que estas tres cosas se
          mantengan separadas por diseño.
        </p>
        <div className="separation-grid">
          {SEPARATION.map(({ Icon, label, knows, never }) => (
            <article key={label}>
              <span className="separation-icon">
                <Icon size={20} />
              </span>
              <strong>{label}</strong>
              <p>{knows}</p>
              <small>
                <X size={13} /> {never}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="visibility-section" aria-labelledby="visibility-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Transparencia</p>
            <h2 id="visibility-title">Qué se ve y qué no</h2>
          </div>
          <Eye size={22} />
        </div>
        <div className="visibility-columns">
          <div className="visibility-column public">
            <h3>
              <Eye size={17} /> Queda público
            </h3>
            <ul>
              {PUBLIC_DATA.map((item) => (
                <li key={item}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="visibility-column private">
            <h3>
              <EyeSlash size={17} /> Nunca sale de tu teléfono
            </h3>
            <ul>
              {PRIVATE_DATA.map((item) => (
                <li key={item}>
                  <X size={15} /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="timeline-section" aria-labelledby="timeline-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Etapas</p>
            <h2 id="timeline-title">De tu voto al resultado</h2>
          </div>
          <Clock size={22} />
        </div>
        <ol className="timeline-list">
          <li>
            <span />
            <div>
              <strong>Votación abierta</strong>
              <p>
                Se reciben compromisos cifrados. Los totales no existen todavía: no hay nada que
                filtrar.
              </p>
            </div>
          </li>
          <li>
            <span />
            <div>
              <strong>Recuento</strong>
              <p>Cerrada la votación, cada voto se suma a su total sin revelar de quién vino.</p>
            </div>
          </li>
          <li>
            <span />
            <div>
              <strong>Resultado final</strong>
              <p>Los totales quedan publicados y cualquiera puede verificarlos contra la red.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2 id="faq-title">Entendé la propuesta</h2>
          </div>
          <Question size={24} />
        </div>
        <div className="faq-list">
          {FAQ.map(({ q, a }) => (
            <details className="faq-item" key={q}>
              <summary>
                <span>{q}</span>
                <ArrowRight size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="glossary-section" aria-labelledby="glossary-title">
        <h2 id="glossary-title">En criollo</h2>
        <dl className="glossary-list">
          {GLOSSARY.map(({ term, meaning }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="independent-note">
        <Info size={16} /> Prototipo independiente para hackathon. No es un referéndum oficial ni
        tiene validez legal.
      </p>
    </main>
  );
}

function VerifyView({ receipts }: { receipts: VoteReceipt[] }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'found' | 'missing' | null>(null);
  const matched = receipts.find((receipt) => receipt.id === query.trim());
  return (
    <main className="page-content">
      <section className="verify-hero">
        <div className="verify-icon">
          <ShieldCheck size={32} />
        </div>
        <p className="eyebrow">Transparencia pública</p>
        <h1>Verificá un comprobante</h1>
        <p>Buscá el identificador para consultar si fue confirmado en {APP_NETWORK_LABEL}.</p>
      </section>
      <form
        className="verify-form"
        onSubmit={(event) => {
          event.preventDefault();
          setResult(matched ? 'found' : 'missing');
        }}
      >
        <label htmlFor="receipt-id">Identificador del comprobante</label>
        <div className="search-control">
          <MagnifyingGlass size={20} />
          <input
            id="receipt-id"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResult(null);
            }}
            placeholder="tx-..."
          />
          <button type="submit" disabled={!query.trim()}>
            Buscar
          </button>
        </div>
      </form>
      {result === 'found' && matched ? (
        <section className="verify-result success" aria-live="polite">
          <CheckCircle size={28} />
          <div>
            <strong>
              {matched.status === 'confirmed' ? 'Comprobante confirmado' : 'Comprobante simulado'}
            </strong>
            <p>
              La opción permanece privada.{' '}
              {matched.status === 'confirmed'
                ? `El registro está confirmado en ${matched.network}.`
                : 'Este registro local no representa una transacción ni una prueba de voto real.'}
            </p>
            <div className="receipt-actions">
              <code>{matched.id}</code>
              <CopyReceiptButton receiptId={matched.id} compact />
            </div>
            {matched.explorerUrl ? (
              <a href={matched.explorerUrl} target="_blank" rel="noreferrer">
                Abrir en explorer
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
      {result === 'missing' ? (
        <section className="verify-result missing" aria-live="polite">
          <Info size={24} />
          <div>
            <strong>No encontramos ese comprobante</strong>
            <p>Revisá el identificador o esperá la confirmación.</p>
          </div>
        </section>
      ) : null}
      <section className="verify-explanation">
        <h2>¿Qué podés comprobar?</h2>
        <ul>
          <li>
            <Check size={18} /> Que el comprobante existe.
          </li>
          <li>
            <Check size={18} /> Que tiene estado confirmado o simulado.
          </li>
          <li>
            <Check size={18} /> Que no necesitás compartir tus datos personales otra vez.
          </li>
        </ul>
      </section>
    </main>
  );
}

function ProfileView({
  passportSession,
  profileId,
  receipts,
  walletStatus,
  onConnectPassport,
  onReplayOnboarding,
}: {
  passportSession: CivicPassportSession | null;
  profileId: string;
  receipts: VoteReceipt[];
  walletStatus: string;
  onConnectPassport: () => void;
  onReplayOnboarding: () => void;
}) {
  return (
    <main className="page-content">
      <section className="profile-hero">
        <div className="profile-avatar">
          <UserCircle size={34} weight="duotone" />
        </div>
        <p className="eyebrow">Mi identidad</p>
        <h1>{passportSession?.profile?.displayName ?? 'Tu espacio ciudadano'}</h1>
        <p>
          Un perfil para reunir tus comprobantes sin convertir tu identidad Passport en tu voto.
        </p>
        {passportSession ? (
          <div className="profile-status">
            <CheckCircle size={17} /> Passport conectado
          </div>
        ) : (
          <button type="button" className="secondary-button" onClick={onConnectPassport}>
            <Fingerprint size={18} /> Conectar Passport
          </button>
        )}
      </section>
      <section className="profile-card" aria-labelledby="profile-id-title">
        <div className="profile-card-heading">
          <div>
            <p className="eyebrow">Identificador de perfil</p>
            <h2 id="profile-id-title">{profileId}</h2>
          </div>
          <ShieldCheck size={24} />
        </div>
        <p>
          Es un identificador de presentación específico para esta app. No participa en la
          elegibilidad, el compromiso ni el nullifier anónimo.
        </p>
        <div className="profile-connections">
          <span>
            <Fingerprint size={17} /> Passport: {passportSession ? 'conectado' : 'pendiente'}
          </span>
          <span>
            <Wallet size={17} /> Wallet:{' '}
            {walletStatus === 'connected' ? 'conectada' : 'no conectada'}
          </span>
        </div>
      </section>
      <section className="profile-card profile-help-card" aria-labelledby="profile-help-title">
        <div className="profile-card-heading">
          <div>
            <p className="eyebrow">Ayuda</p>
            <h2 id="profile-help-title">Revisar cómo funciona</h2>
          </div>
          <Info size={24} />
        </div>
        <p>
          Volvé a la explicación de Passport, credenciales y acciones sin cambiar tu identidad ni
          conectar una wallet.
        </p>
        <button type="button" className="secondary-button" onClick={onReplayOnboarding}>
          Revisar el recorrido <ArrowRight size={18} />
        </button>
      </section>
      <section className="profile-history" aria-labelledby="profile-history-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Actividad local</p>
            <h2 id="profile-history-title">Mis comprobantes {APP_NETWORK_LABEL}</h2>
          </div>
          <span className="profile-count">{receipts.length}</span>
        </div>
        {receipts.length ? (
          <div className="profile-receipts">
            {receipts.map((receipt) => (
              <article className="profile-receipt" key={receipt.id}>
                <div>
                  <strong>
                    {receipt.pollId
                      ? (POLLS.find((poll) => poll.id === receipt.pollId)?.title ??
                        'Consulta ciudadana')
                      : 'Consulta ciudadana'}
                  </strong>
                  <small>
                    {new Date(receipt.createdAt).toLocaleDateString('es-AR')} ·{' '}
                    {receipt.status === 'confirmed'
                      ? `Confirmado en ${receipt.network}`
                      : `Simulado en ${receipt.network}`}
                  </small>
                </div>
                <div className="profile-receipt-actions">
                  <code>{receipt.id}</code>
                  <CopyReceiptButton receiptId={receipt.id} compact />
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
            <p>Todavía no tenés comprobantes guardados en este navegador.</p>
            <span>Cuando participes, aparecerán acá sin publicar tu elección.</span>
          </div>
        )}
      </section>
      <section className="domains-card" aria-labelledby="domains-title">
        <div className="domains-icon">
          <Globe size={25} />
        </div>
        <div>
          <p className="eyebrow">Próximamente</p>
          <h2 id="domains-title">Tu identidad .night</h2>
          <p>
            Podés registrar un alias en Midnight Domains y usarlo como una identidad legible para tu
            perfil.
          </p>
          <a
            className="text-link"
            href="https://midnight.domains/"
            target="_blank"
            rel="noreferrer"
          >
            Explorar Midnight Domains <ArrowRight size={16} />
          </a>
          <small>
            El registro y el pago requieren una wallet compatible y DUST; todavía no se ejecutan
            dentro de esta app.
          </small>
        </div>
      </section>
    </main>
  );
}

function FlowStepper({ active }: { active: number }) {
  return (
    <div className="flow-stepper">
      {['Entendé', 'Verificá', 'Votá'].map((step, index) => (
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
  pollId,
  dniResult,
  onDniVerified,
}: {
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
  pollId: string;
  dniResult: DniVerificationResult | null;
  onDniVerified: (result: DniVerificationResult) => void;
}) {
  const poll = POLLS.find((item) => item.id === pollId) ?? DEFAULT_POLL;
  const actionMode: ActionMode = CHAIN_RUNTIME_ENABLED ? 'live' : 'simulated';
  const activeStep = stage === 'verify' || stage === 'document' || stage === 'eligible' ? 2 : 3;
  return (
    <main className="page-content flow-page">
      <button type="button" className="back-button" onClick={onClose}>
        <ArrowLeft size={18} /> Volver a la propuesta
      </button>
      <FlowStepper active={activeStep} />
      {stage === 'verify' ? (
        <section className="flow-card">
          <div className="flow-card-icon">
            <Fingerprint size={32} />
          </div>
          <p className="eyebrow">Identidad y elegibilidad</p>
          <h1>Antes de votar</h1>
          <h2>Conectá Midnight Passport (opcional)</h2>
          <p>
            Passport aporta onboarding y un perfil visible. No firma el voto: una wallet compatible
            aprueba la transacción y el secreto anónimo permanece separado.
          </p>
          {passportSession ? (
            <div className="data-summary">
              <span>
                <CheckCircle size={18} /> Passport conectado
                {passportSession.profile?.displayName
                  ? ` · ${passportSession.profile.displayName}`
                  : ''}
              </span>
              <span>
                <ShieldCheck size={18} /> Secreto anónimo separado
              </span>
            </div>
          ) : (
            <button type="button" className="secondary-button" onClick={onConnectPassport}>
              <Fingerprint size={18} /> Conectar Passport
            </button>
          )}
          <div className="flow-requirements">
            <strong>Reglas de esta demo</strong>
            <span>
              {credentialCountry
                ? `${getCountryName(credentialCountry, 'es')} · 16+ · DNI verificable`
                : 'Credencial compatible · 16+ · evidencia verificable'}
            </span>
          </div>
          <button
            type="button"
            className="primary-button yellow"
            disabled={actionMode === 'live' && !previewReady}
            onClick={() => onStage('document')}
          >
            Validar elegibilidad <ArrowRight size={20} />
          </button>
          {actionMode === 'simulated' ? (
            <p className="flow-hint">
              Modo local: podés recorrer la interfaz, pero no se crea ningún comprobante.
            </p>
          ) : null}
        </section>
      ) : null}
      {stage === 'document' ? (
        <DniVerification
          demoOnly={APP_MODE !== 'preview'}
          eventSalt={pollId}
          onVerified={onDniVerified}
          onCancel={() => onStage('verify')}
        />
      ) : null}
      {stage === 'eligible' ? (
        <section className="flow-card success-card">
          <div className="success-symbol">
            <Check size={34} />
          </div>
          <p className="eyebrow">
            {dniResult?.source === 'demo' ? 'Documento de demostración' : 'Documento verificado'}
          </p>
          <h1>Listo, podés votar</h1>
          <p>
            La elegibilidad se convierte en un compromiso de membresía anónimo. El documento se leyó
            en tu dispositivo y no se guardó.
          </p>
          <div className="data-summary">
            {dniResult ? (
              <>
                <span>
                  <CheckCircle size={18} /> {dniResult.summary.initials} ·{' '}
                  {dniResult.summary.maskedNumber} · {dniResult.summary.age} años
                </span>
                <span>
                  {dniResult.livenessPassed ? (
                    <>
                      <CheckCircle size={18} /> Prueba de presencia superada
                    </>
                  ) : (
                    <>
                      <Info size={18} /> Sin comprobación de presencia
                    </>
                  )}
                </span>
              </>
            ) : (
              <span>
                <CheckCircle size={18} /> Elegibilidad validada
              </span>
            )}
            <span>
              <ShieldCheck size={18} /> Ni el número ni las imágenes salieron del teléfono
            </span>
          </div>
          <button type="button" className="primary-button blue" onClick={() => onStage('choose')}>
            Continuar al voto <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
      {stage === 'choose' ? (
        <section className="flow-card">
          <p className="eyebrow">Paso 3 de 3</p>
          <h1>Elegí tu respuesta</h1>
          <p>{poll.question}</p>
          <div className="choice-list">
            <button
              type="button"
              className={`choice-button yes ${choice === 'YES' ? 'selected' : ''}`}
              onClick={() => onChoice('YES')}
            >
              <span>Sí</span>
              <small>Estoy de acuerdo con priorizar esta propuesta</small>
              <span className="choice-check">{choice === 'YES' ? <Check size={18} /> : null}</span>
            </button>
            <button
              type="button"
              className={`choice-button no ${choice === 'NO' ? 'selected' : ''}`}
              onClick={() => onChoice('NO')}
            >
              <span>No</span>
              <small>No estoy de acuerdo con priorizarla así</small>
              <span className="choice-check">{choice === 'NO' ? <Check size={18} /> : null}</span>
            </button>
            <button
              type="button"
              className={`choice-button abstain ${choice === 'ABSTAIN' ? 'selected' : ''}`}
              onClick={() => onChoice('ABSTAIN')}
            >
              <span>Abstención</span>
              <small>Prefiero no tomar una posición binaria</small>
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
            Revisar mi voto <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
      {stage === 'review' ? (
        <section className="flow-card">
          <p className="eyebrow">Revisá antes de confirmar</p>
          <h1>Tu compromiso</h1>
          <p className="review-poll-title">{poll.title}</p>
          <div
            className={`review-choice ${choice === 'NO' ? 'no' : choice === 'ABSTAIN' ? 'abstain' : 'yes'}`}
          >
            <span>{choice === 'YES' ? 'Sí' : choice === 'NO' ? 'No' : 'Abstención'}</span>
            <small>La opción se mantiene privada hasta reveal.</small>
          </div>
          <div className="review-notice">
            <Info size={20} />
            <p>
              Passport gestiona la identidad y la credencial; no firma el voto. La wallet solo se
              solicita para una acción real. Estado de aprobación:{' '}
              {walletStatus === 'connected' ? 'wallet conectada' : 'wallet pendiente'}. DUST:{' '}
              {dustBalance === null
                ? 'saldo no disponible'
                : `${dustBalance.toString()} disponible`}
              .
            </p>
          </div>
          {CHAIN_RUNTIME_ENABLED ? <WalletWidget /> : null}
          {previewError ? (
            <div className="verify-result missing">
              <Info size={20} />
              <div>
                <strong>{APP_NETWORK_LABEL} todavía no puede enviar</strong>
                <p>{previewError}</p>
              </div>
            </div>
          ) : null}
          {!CHAIN_RUNTIME_ENABLED ? (
            <p className="flow-hint">
              Este comprobante será simulado y se guardará localmente. La prueba real requiere una
              red compatible, contrato desplegado y wallet aprobando la transacción.
            </p>
          ) : null}
          <button type="button" className="primary-button yellow" onClick={onConfirm}>
            {actionMode === 'live' ? 'Confirmar acción real' : 'Crear comprobante simulado'}{' '}
            <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
      {stage === 'processing' ? (
        <section className="flow-card processing-card">
          <div className="processing-spinner">
            <ChartBar size={34} />
          </div>
          <p className="eyebrow">Procesando</p>
          <h1>Preparando tu comprobante</h1>
          <p>
            El flujo reúne prueba, balanceo DUST/NIGHT, aprobación del wallet y confirmación
            canónica.
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
          <p className="eyebrow">Compromiso registrado</p>
          <h1>Gracias por participar</h1>
          <p>Guardá este identificador para verificar el resultado.</p>
          <div className="receipt-box">
            <span>
              {receipt?.status === 'confirmed' ? 'Comprobante confirmado' : 'Comprobante simulado'}{' '}
              · {receipt?.network ?? APP_NETWORK_LABEL}
            </span>
            <div className="receipt-box-id">
              <strong>{receipt?.id ?? 'Disponible en Verificá'}</strong>
              {receipt ? <CopyReceiptButton receiptId={receipt.id} /> : null}
            </div>
            <small>
              {receipt?.status === 'confirmed'
                ? `Confirmado en ${receipt.network}.`
                : 'No representa una transacción ni una prueba de voto real.'}
            </small>
          </div>
          {receipt?.explorerUrl ? (
            <a className="text-link" href={receipt.explorerUrl} target="_blank" rel="noreferrer">
              Abrir transacción en explorer <ArrowRight size={16} />
            </a>
          ) : null}
          <button type="button" className="primary-button blue" onClick={onViewReceipt}>
            Ver mi comprobante <ArrowRight size={20} />
          </button>
        </section>
      ) : null}
    </main>
  );
}

function CivicApp() {
  const initialOnboardingRequired = shouldShowFirstRunOnboarding();
  const [tab, setTab] = useState<Tab>('votes');
  const [flowStage, setFlowStage] = useState<FlowStage | null>(null);
  const [passportJourneyOpen, setPassportJourneyOpen] = useState(initialOnboardingRequired);
  const [onboardingRequired, setOnboardingRequired] = useState(initialOnboardingRequired);
  const [policyDetailId, setPolicyDetailId] = useState<string | null>(null);
  const [dniResult, setDniResult] = useState<DniVerificationResult | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [activePollId, setActivePollId] = useState(DEFAULT_POLL.id);
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
  const [receipts, setReceipts] = useState<VoteReceipt[]>([]);
  const [credential, setCredential] = useState<DemoCredentialSummary | null>(null);
  const [passportSession, setPassportSession] = useState<CivicPassportSession | null>(null);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [receiptToastVisible, setReceiptToastVisible] = useState(false);
  const [eligibility, setEligibility] = useState<{
    attestation: EligibilityAttestation;
    voterSecret: Uint8Array;
  } | null>(null);
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
    providers,
    publicReadReady,
    publicReadError,
    referendumV2Providers,
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
    if (APP_MODE !== 'preview') return { config: null, error: null };

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
      countryMapper: rarimoIsoCountryMapper,
      uniquenessTimestampUpperBoundUnixSeconds:
        passportV2Runtime.config.uniquenessTimestampUpperBoundUnixSeconds,
    });
    const actions = referendumV2Providers
      ? new MidnightCivicActionAdapter({
          providers: referendumV2Providers,
          credential,
          referenda: passportV2Runtime.config.referenda,
        })
      : undefined;
    return {
      ...base,
      credential,
      ...(actions ? { actions } : {}),
      referenda: passportV2Runtime.config.referenda,
      runtimeCatalogConfigured: true,
    };
  }, [passportSessionPort, passportV2Runtime, referendumV2Providers]);
  const profileId = useMemo(() => deriveProfileId(passportSession), [passportSession]);
  const previewReadiness = getPreviewReadiness({
    appMode: APP_MODE === 'preview' ? 'preview' : APP_MODE === 'undeployed' ? 'undeployed' : 'demo',
    contractAddress: CONTRACT_ADDRESS,
    walletConnected: walletStatus === 'connected',
    providersReady: isReady && (!passportV2Runtime.config || referendumV2Providers !== null),
    providersError: providersError ?? passportV2Runtime.error,
    relayerMode: RELAYER_MODE,
    v2RuntimeConfigured: passportV2Runtime.config !== null || passportV2Runtime.error !== null,
    credentialVerified: credential?.kind === 'verified-credential',
  });
  const publicReadiness = getPublicReadiness({
    appMode: APP_MODE === 'preview' ? 'preview' : APP_MODE === 'undeployed' ? 'undeployed' : 'demo',
    contractAddress: CONTRACT_ADDRESS,
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
    if (APP_MODE === 'demo' || APP_MODE === 'undeployed') {
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
    const poll = POLLS.find((item) => item.id === pollId);
    if (!poll || !getPollAvailability(poll).isOpen) {
      setPreviewError('Esta votación está cerrada y no acepta nuevas participaciones.');
      return;
    }
    setActivePollId(pollId);
    setPolicyDetailId(null);
    setChoice(null);
    setReceipt(null);
    setPreviewError(null);
    setDniResult(null);
    setFlowStage(credential ? 'choose' : 'verify');
    // The fixture eligibility provider belongs only to the legacy Preview
    // compatibility lane. A configured v2 runtime must obtain authorization
    // from the verified credential and never fall through to fixture voting.
    if (CHAIN_RUNTIME_ENABLED && !passportV2Runtime.config && !passportV2Runtime.error) {
      try {
        const { createFixtureEligibilityProvider, PRIVATE_STATE_ID } = await import(
          'midnight-referendum-api'
        );
        const previousState = providers
          ? await providers.privateStateProvider.get(PRIVATE_STATE_ID)
          : null;
        const result = await createFixtureEligibilityProvider(previousState?.voterSecret).attest(
          null,
          pollId,
        );
        setEligibility(result);
      } catch (error) {
        setPreviewError(
          error instanceof Error ? error.message : 'No se pudo validar la elegibilidad',
        );
      }
    }
  };

  const confirmVote = async () => {
    if (CHAIN_RUNTIME_ENABLED) {
      if (previewReadiness.state !== 'ready') {
        setPreviewError(previewReadiness.message);
        return;
      }
      const poll = POLLS.find((item) => item.id === activePollId);
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

        if (!providers || !CONTRACT_ADDRESS) {
          setPreviewError(`${APP_NETWORK_LABEL} no está listo para enviar.`);
          setFlowStage('review');
          return;
        }
        if (!eligibility) {
          setPreviewError('Completá la validación de elegibilidad antes de firmar.');
          setFlowStage('review');
          return;
        }
        const { createReferendumExecutor, findEligibilityPath } = await import(
          'midnight-referendum-api'
        );
        const voteSalt = crypto.getRandomValues(new Uint8Array(32));
        const voterPath = await findEligibilityPath(
          providers,
          CONTRACT_ADDRESS,
          eligibility.attestation.subjectCommitment,
        );
        const privateState: PrivateState = {
          voterSecret: eligibility.voterSecret,
          voterChoice: choice,
          voteSalt,
          voterPath,
        };
        const executor = createReferendumExecutor(providers, {
          issuerSecret: new Uint8Array(32),
          organizerSecret: new Uint8Array(32),
          eventId: new Uint8Array(32),
          explorerBaseUrl: EXPLORER_BASE_URL,
        });
        await executor.join(CONTRACT_ADDRESS, privateState);
        const confirmed = await executor.castVote();
        const nextReceipt: VoteReceipt = {
          id: confirmed.txId,
          pollId: activePollId,
          createdAt: new Date().toISOString(),
          status: 'confirmed',
          network: APP_NETWORK_LABEL,
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
    tab === 'understand' ? (
      <UnderstandView onOpenPolicy={setPolicyDetailId} />
    ) : tab === 'verify' ? (
      <VerifyView receipts={receipts} />
    ) : tab === 'profile' ? (
      <ProfileView
        passportSession={passportSession}
        profileId={profileId}
        receipts={receipts}
        walletStatus={walletStatus}
        onConnectPassport={() => void connectPassport()}
        onReplayOnboarding={replayOnboarding}
      />
    ) : (
      <VotesView
        credential={credential}
        onStartVote={startVote}
        onOpenPolicy={setPolicyDetailId}
        onOpenPassportJourney={() => setPassportJourneyOpen(true)}
      />
    );
  const selectedPolicy = policyDetailId
    ? (POLLS.find((poll) => poll.id === policyDetailId) ?? null)
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
                      ? 'Recorrido sintético local · acción real deshabilitada'
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
          passportPort={passportSessionPort}
          previewPorts={passportJourneyPorts}
        />
      ) : flowStage ? (
        <VoteFlow
          stage={flowStage}
          choice={choice}
          onChoice={setChoice}
          onStage={setFlowStage}
          onClose={() => setFlowStage(null)}
          onConfirm={() => void confirmVote()}
          onViewReceipt={() => {
            setFlowStage(null);
            setTab('verify');
          }}
          walletStatus={walletStatus}
          passportSession={passportSession}
          onConnectPassport={() => void connectPassport()}
          credentialCountry={credential?.country ?? null}
          previewError={previewError}
          receipt={receipt}
          previewReady={previewReadiness.state === 'ready'}
          dustBalance={dustBalance}
          pollId={activePollId}
          dniResult={dniResult}
          onDniVerified={(result) => {
            setDniResult(result);
            setFlowStage('eligible');
          }}
        />
      ) : selectedPolicy ? (
        <PolicyDetailView
          poll={selectedPolicy}
          onBack={() => setPolicyDetailId(null)}
          onStartVote={startVote}
          credential={credential}
          onOpenPassportJourney={() => setPassportJourneyOpen(true)}
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
              setTab('verify');
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
