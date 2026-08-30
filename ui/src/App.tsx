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
import type { CivicPassportSession, CredentialSummary, VoteReveal } from 'midnight-referendum-api';
import {
  browserCivicCredentialVault,
  MidnightCivicActionAdapter,
  RarimoCivicCredentialAdapter,
  watchReferendumV2State,
} from 'midnight-referendum-api';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { PassportJourney } from '@/components/passport-v2/PassportJourney';
import type { PreviewPassportJourneyPorts } from '@/components/passport-v2/PreviewPassportJourney';
import { WalletWidget } from '@/components/wallet-widget';
import { useWallet } from '@/hooks/use-wallet';
import { resolveAppMode } from '@/integration/app-mode';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { ActionMode, ConsultationArea } from '@/integration/civic-state';
import { ASSIGNED_COUNTRIES, countryName as getCountryName } from '@/integration/country-catalog';
import { type CicoLocale, detectLocale, persistLocale } from '@/integration/locale';
import { PassportIdentityBridge } from '@/integration/passport';
import { MidnightPassportSessionAdapter } from '@/integration/passport-session-port';
import { countryPolicyCode, toPassportV2Catalog } from '@/integration/passport-v2-catalog';
import {
  HttpCivicCredentialIssuerPort,
  HttpRarimoVerificationGateway,
} from '@/integration/passport-v2-http-ports';
import {
  type PassportV2RuntimeReferendum,
  parsePassportV2RuntimeConfig,
} from '@/integration/passport-v2-runtime-config';
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
import { HowItWorks } from '@/views/HowItWorks';

type Tab = 'explore' | 'votes' | 'profile';
type Choice = VoteReveal['choice'];
type FlowStage = 'verify' | 'eligible' | 'choose' | 'review' | 'processing' | 'receipt';

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
  /** Runtime catalog scope; omitted for synthetic/demo fixture polls. */
  runtimeScope?: 'global' | 'country';
  /** ISO alpha-2 country derived from the private catalog policy, when present. */
  runtimeCountryCode?: string;
  /** Runtime v2 contract address used by the public indexer reader. */
  runtimeContractAddress?: string;
}

type VoteReceipt = PassportReceiptRecord;

/** The active app keeps the same language across identity, jury, and receipt surfaces. */
const APP_COPY = {
  es: {
    brand: 'Referéndum Cívico',
    brandNote: 'Prototipo independiente',
    language: 'Idioma',
    nav: { explore: 'Explorá', votes: 'Votá', profile: 'Mi perfil' },
    network: { undeployed: 'Local no desplegado', preview: 'Preview', demo: 'Demo local' },
  },
  en: {
    brand: 'Civic Referendum',
    brandNote: 'Independent prototype',
    language: 'Language',
    nav: { explore: 'Explore', votes: 'Vote', profile: 'Profile' },
    network: { undeployed: 'Undeployed local', preview: 'Preview', demo: 'Local demo' },
  },
} as const;

const EN_POLL_COPY: Record<string, Partial<Poll>> = {
  'tierras-rurales': {
    title: 'Rural land and foreign ownership',
    description:
      'A consultation on national limits and controls for foreign ownership of rural land.',
    question:
      'Should Argentina keep national limits and controls on foreign ownership and possession of rural land, with regular public review?',
    opened: 'August 8, 2026',
    deadline: 'August 16, 2026',
    whyNow:
      'Law 26.737 remains under debate. The consultation presents the current legal frame and the open questions without taking an institutional position.',
    legalFrame:
      'Law 26.737: rural land rules, the national registry, and national, provincial, and departmental limits.',
    evidence:
      'The official registry published a 2025 report on departments above the registered 15% threshold.',
    evidenceLabel: 'FACT · official registry, August 2025',
    argumentsFor: [
      'More traceability for rural land ownership and possession.',
      'Common rules for border areas, water, and other strategic resources.',
    ],
    argumentsAgainst: [
      'Uniform limits may not reflect provincial and productive differences.',
      'A review could improve legal certainty, investment, and administrative processes.',
    ],
    uncertainty:
      'The final text, its legislative scope, and effects on investment, production, and the environment remain unknown.',
  },
  'federalismo-fiscal': {
    title: 'Fiscal federalism and revenue sharing',
    description:
      'How resources are distributed between the national government, provinces, and the city of Buenos Aires.',
    question:
      'Should Argentina reform revenue sharing to make it more transparent, predictable, and reviewable?',
    opened: 'August 8, 2026',
    deadline: 'August 23, 2026',
    whyNow:
      'Transfers and shared revenue remain central to funding public services across jurisdictions.',
    legalFrame:
      'Law 23.548 and Article 75 of the Constitution: revenue-sharing rules and the framework for an agreement law.',
    evidence:
      'Official series publish daily and consolidated transfers to provinces with a stated methodology.',
    evidenceLabel: 'FACT · Treasury Secretariat, 2003–2025 series',
    argumentsFor: [
      'A published formula could improve predictability and accountability.',
      'A reform could include explicit transition and review mechanisms.',
    ],
    argumentsAgainst: [
      'Changing the formula creates relative winners and losers during the transition.',
      'Known rules can avoid short-term fiscal uncertainty.',
    ],
    uncertainty:
      'There is no agreed formula and the net effects on each jurisdiction are not known.',
  },
  'reforma-laboral': {
    title: 'Labour reform and registered employment',
    description: 'A consultation on formalisation, job creation, and explicit labour protections.',
    question:
      'Should Argentina modify the labour framework to prioritise formal employment while keeping explicit protections and public impact reviews?',
    opened: 'August 8, 2026',
    deadline: 'August 30, 2026',
    whyNow:
      'The discussion combines formalisation costs, collective bargaining, rights, and registered employment.',
    legalFrame:
      'Law 27.802 and labour-market statistics; this consultation does not replace the legal text or regulations.',
    evidence:
      'Household surveys and administrative records cover different populations and should not be conflated.',
    evidenceLabel: 'FACT · national statistics and labour methodology',
    argumentsFor: [
      'Changing incentives could support formal registration and job creation.',
      'Public evaluation could track implementation costs and impacts.',
    ],
    argumentsAgainst: [
      'Formalisation alone does not guarantee good jobs or higher wages.',
      'Broad changes can weaken protections without clear limits and transition.',
    ],
    uncertainty:
      'Future employment effects cannot be attributed to one law without isolating the economic cycle and implementation.',
  },
  jubilaciones: {
    title: 'Pensions and long-term sustainability',
    description: 'Coverage, adequacy, and financial sustainability of the pension system.',
    question:
      'Should Argentina reform pensions to improve sustainability, coverage, and adequacy while protecting people with incomplete contributions?',
    opened: 'August 8, 2026',
    deadline: 'September 6, 2026',
    whyNow:
      'The debate combines indexation, funding, contributory coverage, and protection for incomplete work histories.',
    legalFrame:
      'Law 24.241: the national pension system, benefits, requirements, and indexation rules.',
    evidence:
      'ANSES publishes statistical reports that must be read with their cutoff date and methodology.',
    evidenceLabel: 'FACT · ANSES, June 2025 report',
    argumentsFor: [
      'A comprehensive review can make coverage, funding, and transition parameters visible.',
      'Explicit protection for incomplete contributions can organise fragmented rules.',
    ],
    argumentsAgainst: [
      'Parameter changes may move costs to current or future pensioners.',
      'Financial sustainability alone does not ensure adequate benefits.',
    ],
    uncertainty:
      'No single proposal resolves coverage, adequacy, and funding at once; effects depend on design and transition.',
  },
  'energia-renovable': {
    title: 'Energy, tariffs, and the renewable transition',
    description:
      'More renewable power and networks, with targeted protection for vulnerable users.',
    question:
      'Should Argentina prioritise an energy transition with more renewables, network expansion, and targeted protection for vulnerable users?',
    opened: 'August 8, 2026',
    deadline: 'September 13, 2026',
    whyNow:
      'Renewable targets, distributed generation, tariffs, and targeted subsidies combine investment and protection choices.',
    legalFrame: 'Laws 27.191 and 27.424, together with the targeted energy subsidy framework.',
    evidence: 'The 20% renewable target is a legal objective, not an observed measurement.',
    evidenceLabel: 'FACT · Law 27.191, statutory target',
    argumentsFor: [
      'Renewables, networks, and distributed generation can diversify the mix and attract investment.',
      'Targeting can focus protection on the users who need it most.',
    ],
    argumentsAgainst: [
      'Expansion requires networks, backup, and finance; costs do not disappear.',
      'A fast transition can increase tariffs or exclude misclassified users.',
    ],
    uncertainty:
      'Technology, budget, schedule, and subsidy scope are not defined by this question.',
  },
};

function localizePoll(poll: Poll, locale: CicoLocale): Poll {
  if (locale === 'es' || poll.runtimeContractAddress) return poll;
  return { ...poll, ...EN_POLL_COPY[poll.id] };
}

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

const APP_MODE = resolveAppMode(import.meta.env.MODE, import.meta.env.VITE_APP_MODE);
// Demo/showcase are presentation boundaries. Undeployed and Preview both use
// the real v2 catalog and fail closed when it is missing or invalid.
const CHAIN_RUNTIME_ENABLED = APP_MODE === 'preview' || APP_MODE === 'undeployed';
const APP_NETWORK_LABEL =
  APP_MODE === 'undeployed'
    ? 'Undeployed local'
    : APP_MODE === 'preview'
      ? 'Preview'
      : 'Demo local';
function networkLabel(locale: CicoLocale): string {
  return APP_MODE === 'undeployed'
    ? APP_COPY[locale].network.undeployed
    : APP_MODE === 'preview'
      ? APP_COPY[locale].network.preview
      : APP_COPY[locale].network.demo;
}
const PASSPORT_ORIGIN =
  import.meta.env.VITE_PASSPORT_ORIGIN?.trim() || 'https://midnightpassport.com';
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
  numeric: country.numeric,
}));

function isCountryPoll(poll: Poll): boolean {
  return poll.runtimeScope ? poll.runtimeScope === 'country' : COUNTRY_POLL_IDS.has(poll.id);
}

function isCountryPollForCountry(poll: Poll, countryCode: string): boolean {
  return poll.runtimeCountryCode
    ? poll.runtimeCountryCode === countryCode
    : COUNTRY_POLL_COUNTRIES.get(poll.id) === countryCode;
}

/**
 * Convert only the public, parsed runtime catalog into the existing presentation model.
 * Runtime modes never merge static fixture polls into this list: fixture copy is used only
 * where the catalog does not carry editorial prose, and all routing identity comes from the
 * catalog referendumId.
 */
export function toRuntimePolls(referenda: ReadonlyArray<PassportV2RuntimeReferendum>): Poll[] {
  return toPassportV2Catalog(referenda).map((item) => {
    const countryNumeric = countryPolicyCode(item);
    const countryCode = countryNumeric
      ? ASSIGNED_COUNTRIES.find((entry) => entry.numeric === countryNumeric)?.alpha2
      : undefined;
    return {
      id: item.referendumId,
      title: item.title,
      question: item.question,
      description: item.description ?? 'Consulta ciudadana publicada en el catálogo v2.',
      opened: item.opened ?? 'Según el catálogo v2',
      deadline: item.deadline ?? 'Según el estado del contrato',
      // The catalog currently carries contract identity/policy, not calendar dates. Keep the
      // action available and let the canonical contract phase decide final acceptance.
      opensAt: item.opensAt ?? '1970-01-01T00:00:00.000Z',
      closesAt: item.closesAt ?? '9999-12-31T23:59:59.000Z',
      eligible: item.eligible ?? '—',
      participation: item.participation ?? 'Estado público consultado en Midnight',
      whyNow: 'Esta consulta se publica desde el manifiesto de despliegue v2.',
      legalFrame: 'Consulta independiente; revisá las fuentes publicadas por su organizador.',
      evidence: 'La identidad del contrato y sus reglas provienen del catálogo v2 validado.',
      evidenceLabel: 'CATÁLOGO V2 · configuración publicada',
      argumentsFor: ['Evaluá la propuesta con la información publicada por su organizador.'],
      argumentsAgainst: ['Considerá sus límites, costos e incertidumbres antes de participar.'],
      uncertainty: 'El catálogo no sustituye el debate público ni constituye una decisión oficial.',
      sources: [],
      runtimeScope: item.scope,
      runtimeContractAddress: item.source?.contractAddress,
      ...(countryCode ? { runtimeCountryCode: countryCode } : {}),
    };
  });
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
  locale = 'es',
}: {
  receiptId: string;
  compact?: boolean;
  locale?: CicoLocale;
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
      aria-label={`${locale === 'es' ? 'Copiar comprobante' : 'Copy receipt'} ${receiptId}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>
        {copied ? (locale === 'es' ? 'Copiado' : 'Copied') : locale === 'es' ? 'Copiar' : 'Copy'}
      </span>
    </button>
  );
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

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="status-pill">
      <span className="status-dot" />
      {children}
    </span>
  );
}

const PHASE_COPY = {
  es: {
    COMMIT: {
      label: 'Votación abierta',
      note: 'Los votos están sellados. Todavía no hay nada que contar.',
    },
    REVEAL: {
      label: 'Recuento en curso',
      note: 'Cada voto se suma a su total sin revelar de quién vino.',
    },
    FINALIZED: { label: 'Resultado final', note: 'El recuento está cerrado y publicado.' },
  },
  en: {
    COMMIT: { label: 'Voting open', note: 'Votes are sealed. There is nothing to count yet.' },
    REVEAL: {
      label: 'Counting in progress',
      note: 'Each vote is added without revealing who cast it.',
    },
    FINALIZED: { label: 'Final result', note: 'Counting is closed and published.' },
  },
} as const;

interface PublicReferendumState {
  state: import('midnight-referendum-api').ReferendumV2State | null;
  error: string | null;
  loading: boolean;
}

/** Live aggregates read from the contract. Never a hardcoded number. */
function usePublicReferendumState(contractAddress: string | null): PublicReferendumState {
  const { publicDataProvider, publicReadError } = useMidnightProviders();
  const [state, setState] = useState<import('midnight-referendum-api').ReferendumV2State | null>(
    null,
  );
  const [error, setError] = useState<string | null>(publicReadError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicDataProvider || !contractAddress) {
      setState(null);
      setLoading(false);
      setError(publicReadError);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(publicReadError);
    const subscription = watchReferendumV2State(publicDataProvider, contractAddress).subscribe({
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
  }, [contractAddress, publicDataProvider, publicReadError]);

  return { state, error, loading };
}

function ResultsPanel({
  contractAddress,
  title,
  locale,
}: {
  contractAddress: string | null;
  title?: string;
  locale: CicoLocale;
}) {
  const { state, error, loading } = usePublicReferendumState(contractAddress);

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
  if (loading && !state)
    return <CommitPhasePanel title={title} contractAddress={contractAddress} locale={locale} />;
  if (!state)
    return <CommitPhasePanel title={title} contractAddress={contractAddress} locale={locale} />;

  const phase = PHASE_COPY[locale][state.phase];
  const resultsTitleId = title
    ? `results-title-${contractAddress?.replace(/[^a-z0-9_-]/giu, '-') ?? 'runtime'}`
    : 'results-title';
  const votes = (['YES', 'NO', 'ABSTAIN'] as const).map((key) => ({
    key,
    label:
      key === 'YES'
        ? locale === 'es'
          ? 'Sí'
          : 'Yes'
        : key === 'NO'
          ? 'No'
          : locale === 'es'
            ? 'Abstención'
            : 'Abstain',
    count: state.tally.get(key) ?? 0n,
  }));
  const total = votes.reduce((sum, vote) => sum + vote.count, 0n);

  return (
    <section className="results-panel" aria-labelledby={resultsTitleId}>
      <div className="results-heading">
        <ChartBar size={22} />
        <div>
          <h2 id={resultsTitleId}>{phase.label}</h2>
          <p>{title ? `${title} · ${phase.note}` : phase.note}</p>
        </div>
      </div>
      {state.phase === 'COMMIT' ? (
        <div className="results-note">
          <ShieldCheck size={20} />
          <p>
            {state.issuedVotes.toString()}{' '}
            {locale === 'es'
              ? state.issuedVotes === 1n
                ? 'persona habilitada'
                : 'personas habilitadas'
              : state.issuedVotes === 1n
                ? 'eligible person'
                : 'eligible people'}
            .{' '}
            {locale === 'es'
              ? 'Los totales aparecen recién cuando se abre el recuento.'
              : 'Totals appear only when counting opens.'}
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
            {locale === 'es'
              ? `${total.toString()} de ${state.issuedVotes.toString()} habilitadas · leído del contrato`
              : `${total.toString()} of ${state.issuedVotes.toString()} eligible · read from contract`}
          </p>
        </div>
      )}
    </section>
  );
}

function CommitPhasePanel({
  title,
  contractAddress,
  locale,
}: {
  title?: string;
  contractAddress?: string | null;
  locale: CicoLocale;
}) {
  const resultsTitleId = title
    ? `results-title-${contractAddress?.replace(/[^a-z0-9_-]/giu, '-') ?? 'runtime'}`
    : 'results-title';
  return (
    <section className="results-panel" aria-labelledby={resultsTitleId}>
      <div className="results-heading">
        <ChartBar size={22} />
        <div>
          <h2 id={resultsTitleId}>
            {title
              ? `${title} · ${locale === 'es' ? 'Compromiso privado durante la votación' : 'Private commitment during voting'}`
              : locale === 'es'
                ? 'Compromiso privado durante la votación'
                : 'Private commitment during voting'}
          </h2>
          <p>
            {locale === 'es'
              ? 'Las respuestas se revelan y agregan después del cierre.'
              : 'Responses are revealed and aggregated after closing.'}
          </p>
        </div>
      </div>
      <div className="results-note">
        <ShieldCheck size={20} />
        <p>
          {locale === 'es'
            ? 'El contrato registra compromisos anónimos, marcas de un voto y publica solo el agregado YES/NO/ABSTAIN durante el recuento.'
            : 'The contract records anonymous commitments and one-vote markers, then publishes only the YES/NO/ABSTAIN aggregate during counting.'}
        </p>
      </div>
    </section>
  );
}

function VotesView({
  polls,
  credential,
  publicContractAddress,
  onStartVote,
  onOpenPolicy,
  onOpenPassportJourney,
  locale,
}: {
  polls: readonly Poll[];
  credential: DemoCredentialSummary | null;
  publicContractAddress: string | null;
  onStartVote: (pollId: string) => void;
  onOpenPolicy: (pollId: string) => void;
  onOpenPassportJourney: () => void;
  locale: CicoLocale;
}) {
  const [area, setArea] = useState<ConsultationArea>('world');
  const [selectedCountry, setSelectedCountry] = useState(credential?.country ?? 'AR');
  const [countrySearch, setCountrySearch] = useState('');
  const [now, setNow] = useState(() => new Date());
  const selectedCountryName = getCountryName(selectedCountry, locale);
  const filteredCountries = countrySearch.trim()
    ? DASHBOARD_COUNTRIES.filter((country) =>
        `${getCountryName(country.code, locale)} ${country.code} ${country.numeric}`
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
      ? polls.filter((poll) => !isCountryPoll(poll))
      : selectedCountry === credential?.country
        ? polls.filter((poll) => isCountryPollForCountry(poll, selectedCountry))
        : [];
  const openPollCount = countOpenPolls(visiblePolls, now);
  return (
    <main className="page-content civic-dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{locale === 'es' ? 'Tu panel cívico' : 'Your civic dashboard'}</p>
          <h1>{locale === 'es' ? 'Consultas para vos' : 'Consultations for you'}</h1>
        </div>
        <span className="open-count">
          <span className="status-dot" />
          {openPollCount} {locale === 'es' ? 'disponibles' : 'available'}
        </span>
      </div>
      {credential ? (
        <section
          className="credential-status-card"
          aria-label={locale === 'es' ? 'Estado de tu credencial' : 'Credential status'}
        >
          <span className="credential-status-icon">
            <ShieldCheck size={22} />
          </span>
          <span>
            <strong>{locale === 'es' ? 'Credencial lista' : 'Credential ready'}</strong>
            <small>
              {getCountryName(credential.country, locale)} ({credential.country}) ·{' '}
              {credential.ageClass} ·{' '}
              {locale === 'es' ? 'solo para elegibilidad' : 'eligibility only'}
            </small>
          </span>
          <span className="synthetic-badge">
            {credential.kind === 'synthetic-demo-credential'
              ? locale === 'es'
                ? 'SINTÉTICA'
                : 'SYNTHETIC'
              : locale === 'es'
                ? 'VERIFICADA'
                : 'VERIFIED'}
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
            <p className="eyebrow">
              {locale === 'es' ? 'Empezá por tu identidad' : 'Start with your identity'}
            </p>
            <h2 id="passport-entry-title">
              {locale === 'es'
                ? 'Prepará tu credencial para explorar'
                : 'Prepare your credential to explore'}
            </h2>
            <p>
              {locale === 'es'
                ? 'Conectá Passport, revisá la evidencia y después elegí qué consulta querés conocer. No necesitás wallet para este recorrido.'
                : 'Connect Passport, review the evidence, and then choose a consultation. This journey does not need a wallet.'}
            </p>
            <button className="passport-entry-button" onClick={onOpenPassportJourney} type="button">
              {locale === 'es' ? 'Preparar mi credencial' : 'Prepare my credential'}{' '}
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}

      <div
        className="dashboard-area-tabs"
        role="tablist"
        aria-label={locale === 'es' ? 'Espacio de participación' : 'Participation scope'}
      >
        <button
          type="button"
          role="tab"
          aria-selected={area === 'world'}
          className={area === 'world' ? 'active' : ''}
          onClick={() => setArea('world')}
        >
          <Globe size={18} /> {locale === 'es' ? 'Mundo' : 'World'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={area === 'countries'}
          className={area === 'countries' ? 'active' : ''}
          onClick={() => setArea('countries')}
        >
          <IdentificationCard size={18} /> {locale === 'es' ? 'Países' : 'Countries'}
        </button>
      </div>

      {area === 'countries' ? (
        <section className="country-selector-card" aria-labelledby="country-selector-title">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">
                {locale === 'es' ? 'Consultas por país' : 'Country consultations'}
              </p>
              <h2 id="country-selector-title">
                {locale === 'es' ? 'Elegí un país' : 'Choose a country'}
              </h2>
            </div>
            <Globe size={22} />
          </div>
          <label htmlFor="country-selector">{locale === 'es' ? 'País' : 'Country'}</label>
          <input
            id="country-search"
            className="country-search-input"
            type="search"
            value={countrySearch}
            onChange={(event) => setCountrySearch(event.target.value)}
            placeholder={locale === 'es' ? 'Buscar por nombre o código' : 'Search by name or code'}
            aria-label={locale === 'es' ? 'Buscar un país' : 'Search for a country'}
          />
          <select
            id="country-selector"
            value={selectedCountry}
            onChange={(event) => setSelectedCountry(event.target.value)}
          >
            {filteredCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {getCountryName(country.code, locale)}
              </option>
            ))}
          </select>
          <p className="country-selector-help">
            {credential
              ? locale === 'es'
                ? `Tu credencial prueba ${getCountryName(credential.country, 'es')}; solo ese espacio está desbloqueado.`
                : `Your credential proves ${getCountryName(credential.country, 'en')}; only that scope is unlocked.`
              : locale === 'es'
                ? 'Completá el recorrido Passport para desbloquear tu espacio.'
                : 'Complete the Passport journey to unlock your scope.'}
          </p>
        </section>
      ) : (
        <section className="dashboard-intro-card">
          <div>
            <p className="eyebrow">{locale === 'es' ? 'Mundo' : 'World'}</p>
            <h2>
              {locale === 'es'
                ? 'Ideas que cualquier credencial válida puede explorar'
                : 'Ideas any valid credential can explore'}
            </h2>
          </div>
          <p>
            {locale === 'es'
              ? 'Leé el contexto antes de decidir. La wallet solo aparece si después elegís realizar una acción real.'
              : 'Read the context before deciding. A wallet appears only if you later choose a real action.'}
          </p>
        </section>
      )}

      {area === 'countries' && selectedCountry !== credential?.country ? (
        <section className="locked-country-card" role="status">
          <Lock size={24} />
          <div>
            <strong>
              {locale === 'es'
                ? `${selectedCountryName} todavía está bloqueado`
                : `${selectedCountryName} is still locked`}
            </strong>
            <p>
              {locale === 'es'
                ? 'Tu credencial no prueba elegibilidad para este espacio. No se habilita por elegirlo en el selector.'
                : 'Your credential does not prove eligibility for this scope. Selecting it does not unlock it.'}
            </p>
          </div>
        </section>
      ) : visiblePolls.length ? (
        <section className="dashboard-consultations" aria-labelledby="consultations-title">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">
                {area === 'world'
                  ? locale === 'es'
                    ? 'Consultas globales'
                    : 'Global consultations'
                  : selectedCountryName}
              </p>
              <h2 id="consultations-title">
                {locale === 'es' ? 'Conocé antes de participar' : 'Learn before participating'}
              </h2>
            </div>
            <BookOpen size={22} />
          </div>
          <div className="dashboard-poll-list">
            {visiblePolls.map((poll) => {
              const displayPoll = localizePoll(poll, locale);
              return (
                <article className="dashboard-poll-card" key={poll.id}>
                  <div className="poll-meta">
                    <StatusPill>
                      {getPollAvailability(poll, now).isOpen
                        ? locale === 'es'
                          ? 'Votación abierta'
                          : 'Voting open'
                        : locale === 'es'
                          ? 'Votación cerrada'
                          : 'Voting closed'}
                    </StatusPill>
                    <span>
                      {locale === 'es' ? `Cierra el ${poll.deadline}` : `Closes ${poll.deadline}`}
                    </span>
                  </div>
                  <h3>{displayPoll.title}</h3>
                  <p>{displayPoll.description}</p>
                  <div className="poll-card-actions">
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => onOpenPolicy(poll.id)}
                    >
                      {locale === 'es' ? 'Leer propuesta' : 'Read proposal'}{' '}
                      <ArrowRight size={16} />
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
                          ? locale === 'es'
                            ? 'Votá ahora'
                            : 'Vote now'
                          : locale === 'es'
                            ? 'Preparar credencial'
                            : 'Prepare credential'
                        : locale === 'es'
                          ? 'Votación cerrada'
                          : 'Voting closed'}
                    </button>
                  </div>
                  <p className="demo-stat">
                    <Info size={14} />{' '}
                    {poll.runtimeContractAddress
                      ? locale === 'es'
                        ? 'Catálogo v2 · estado público consultado en Midnight.'
                        : 'v2 catalogue · public state read from Midnight.'
                      : locale === 'es'
                        ? `${poll.participation}. Cifra simulada para este prototipo.`
                        : `${poll.participation}. Simulated figure for this prototype.`}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="dashboard-empty-card">
          <Lock size={24} />
          <div>
            <strong>
              {locale === 'es'
                ? 'No hay consultas disponibles en este espacio'
                : 'No consultations are available in this scope'}
            </strong>
            <p>
              {locale === 'es'
                ? 'Volvé a Mundo o elegí el país desbloqueado por tu credencial.'
                : 'Return to World or choose the country unlocked by your credential.'}
            </p>
          </div>
        </section>
      )}

      {polls.some((poll) => poll.runtimeContractAddress) ? (
        visiblePolls.map((poll) => (
          <ResultsPanel
            key={`results-${poll.id}`}
            contractAddress={poll.runtimeContractAddress ?? null}
            title={localizePoll(poll, locale).title}
            locale={locale}
          />
        ))
      ) : area === 'world' ? (
        <ResultsPanel contractAddress={publicContractAddress} locale={locale} />
      ) : null}
    </main>
  );
}

function PolicyDetailView({
  poll,
  onBack,
  onStartVote,
  credential,
  onOpenPassportJourney,
  locale,
}: {
  poll: Poll;
  onBack: () => void;
  onStartVote: (pollId: string) => void;
  credential: DemoCredentialSummary | null;
  onOpenPassportJourney: () => void;
  locale: CicoLocale;
}) {
  const displayPoll = localizePoll(poll, locale);
  const consultationCountry = poll.runtimeCountryCode ?? COUNTRY_POLL_COUNTRIES.get(poll.id);
  const runtimePoll = Boolean(poll.runtimeContractAddress);
  const pollAvailability = getPollAvailability(poll);
  const consultationCountryName = consultationCountry
    ? getCountryName(consultationCountry, locale)
    : null;
  return (
    <main className="page-content policy-page">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> {locale === 'es' ? 'Volver a votaciones' : 'Back to consultations'}
      </button>
      <div className="policy-status">
        <StatusPill>
          {pollAvailability.isOpen
            ? locale === 'es'
              ? 'Votación abierta'
              : 'Voting open'
            : locale === 'es'
              ? 'Votación cerrada'
              : 'Voting closed'}
        </StatusPill>
        <span>
          {runtimePoll
            ? locale === 'es'
              ? 'Identidad y reglas del catálogo v2'
              : 'v2 catalogue identity and rules'
            : locale === 'es'
              ? 'Actualizado: 8 de agosto de 2026'
              : 'Updated: August 8, 2026'}
        </span>
      </div>
      <section className="policy-hero">
        <p className="eyebrow">{locale === 'es' ? 'Resumen para decidir' : 'Decision summary'}</p>
        <h1>{displayPoll.title}</h1>
        <p>{displayPoll.question}</p>
        <div className="policy-facts">
          <span>
            <Calendar size={17} /> {locale === 'es' ? 'Cierra:' : 'Closes:'}{' '}
            <strong>{displayPoll.deadline}</strong>
          </span>
          <span>
            <Users size={17} />{' '}
            <strong>
              {runtimePoll
                ? locale === 'es'
                  ? 'Estado en el contrato'
                  : 'Contract state'
                : `${displayPoll.eligible} ${locale === 'es' ? 'habilitadas*' : 'eligible*'}`}
            </strong>
          </span>
        </div>
      </section>

      <section className="policy-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{locale === 'es' ? 'En dos minutos' : 'In two minutes'}</p>
            <h2>{locale === 'es' ? '¿De qué se trata?' : 'What is it about?'}</h2>
          </div>
          <BookOpen size={22} />
        </div>
        <p>{displayPoll.whyNow}</p>
        <div className="evidence-card">
          <span>{displayPoll.evidenceLabel}</span>
          <p>{displayPoll.evidence}</p>
        </div>
      </section>

      <section className="policy-section policy-frame">
        <p className="eyebrow">{locale === 'es' ? 'Marco vigente' : 'Current framework'}</p>
        <p>{displayPoll.legalFrame}</p>
      </section>

      <section className="policy-section" aria-labelledby="arguments-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{locale === 'es' ? 'Perspectivas' : 'Perspectives'}</p>
            <h2 id="arguments-title">
              {locale === 'es' ? 'Argumentos en discusión' : 'Arguments in the discussion'}
            </h2>
          </div>
          <Question size={22} />
        </div>
        <p className="policy-section-intro">
          {locale === 'es'
            ? 'Son posiciones para evaluar, no recomendaciones del proyecto.'
            : 'These are positions to evaluate, not recommendations from the project.'}
        </p>
        <div className="argument-columns">
          <article className="argument-card for">
            <h3>{locale === 'es' ? 'A favor de la propuesta' : 'In favour of the proposal'}</h3>
            <ul>
              {displayPoll.argumentsFor.map((item) => (
                <li key={item}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="argument-card against">
            <h3>
              {locale === 'es'
                ? 'A favor de revisar o limitar'
                : 'In favour of reviewing or limiting it'}
            </h3>
            <ul>
              {displayPoll.argumentsAgainst.map((item) => (
                <li key={item}>
                  <Info size={15} /> {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="policy-section uncertainty-card">
        <p className="eyebrow">{locale === 'es' ? 'Incertidumbre' : 'Uncertainty'}</p>
        <p>{displayPoll.uncertainty}</p>
      </section>

      <section className="policy-section" aria-labelledby="outcomes-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">
              {locale === 'es' ? 'Qué expresa cada opción' : 'What each option expresses'}
            </p>
            <h2 id="outcomes-title">
              {locale === 'es' ? 'Tu voto no cambia la ley' : 'Your vote does not change the law'}
            </h2>
          </div>
          <Stamp size={22} />
        </div>
        <div className="outcome-list">
          <div>
            <strong>{locale === 'es' ? 'Sí' : 'Yes'}</strong>
            <p>
              {locale === 'es'
                ? 'Expresa apoyo a priorizar la propuesta en los términos de esta consulta.'
                : 'Expresses support for prioritising the proposal on these terms.'}
            </p>
          </div>
          <div>
            <strong>No</strong>
            <p>
              {locale === 'es'
                ? 'Expresa que no apoyás priorizarla en estos términos.'
                : 'Expresses that you do not support prioritising it on these terms.'}
            </p>
          </div>
          <div>
            <strong>{locale === 'es' ? 'Abstención' : 'Abstain'}</strong>
            <p>
              {locale === 'es'
                ? 'Registra que preferís no tomar una posición binaria.'
                : 'Records that you prefer not to take a binary position.'}
            </p>
          </div>
        </div>
      </section>

      <section className="policy-section eligibility-card">
        <p className="eyebrow">
          {runtimePoll
            ? locale === 'es'
              ? 'Reglas publicadas'
              : 'Published rules'
            : locale === 'es'
              ? 'Reglas de esta demo'
              : 'Demo rules'}
        </p>
        <p>
          {runtimePoll
            ? locale === 'es'
              ? 'La credencial cívica se comprueba en privado contra la política publicada en este catálogo. El perfil Passport, la evidencia y la elección permanecen separados.'
              : 'The civic credential is checked privately against the policy published in this catalogue. The Passport profile, evidence, and choice remain separate.'
            : locale === 'es'
              ? 'La credencial Passport prueba una regla de elegibilidad sin exponer tu evidencia. En esta experiencia la credencial de fixture representa el país elegido y clase de edad 18+.'
              : 'The Passport credential proves an eligibility rule without exposing your evidence. In this experience the fixture represents the selected country and an 18+ age class.'}
          {consultationCountryName
            ? locale === 'es'
              ? ` Esta consulta está configurada para ${consultationCountryName}.`
              : ` This consultation is configured for ${consultationCountryName}.`
            : ''}{' '}
          {locale === 'es' ? 'No es un padrón oficial.' : 'This is not an official register.'}
        </p>
      </section>

      <section className="policy-section" aria-labelledby="sources-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{locale === 'es' ? 'Para profundizar' : 'Read further'}</p>
            <h2 id="sources-title">{locale === 'es' ? 'Fuentes primarias' : 'Primary sources'}</h2>
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
        <Info size={16} />{' '}
        {runtimePoll
          ? locale === 'es'
            ? 'La identidad del contrato y sus resultados públicos se leen desde Midnight; esta consulta no es un referéndum oficial ni tiene efecto legal.'
            : 'Contract identity and public results are read from Midnight; this consultation is not an official referendum and has no legal effect.'
          : locale === 'es'
            ? '* Las personas habilitadas y la participación son cifras simuladas. Esta consulta no es un referéndum oficial ni tiene efecto legal.'
            : '* Eligible people and participation are simulated figures. This consultation is not an official referendum and has no legal effect.'}
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
            ? locale === 'es'
              ? 'Votar esta consulta'
              : 'Vote on this consultation'
            : locale === 'es'
              ? 'Preparar mi credencial'
              : 'Prepare my credential'
          : locale === 'es'
            ? 'Votación cerrada'
            : 'Voting closed'}
      </button>
    </main>
  );
}

const HOW_IT_WORKS = [
  {
    Icon: IdentificationCard,
    title: 'Probás que podés participar',
    body: 'Una credencial Passport verifica una regla de elegibilidad en un proveedor configurado. La evidencia cruda no se comparte con esta app.',
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
  'Tu nombre, tus datos de identidad y la evidencia cruda.',
  'Qué votaste, mientras la votación sigue abierta.',
  'La relación entre tu identidad y tu voto, siempre.',
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

const HOW_IT_WORKS_EN = [
  {
    Icon: IdentificationCard,
    title: 'Prove you can participate',
    body: 'A Passport credential verifies an eligibility rule through a configured provider. Raw evidence is not shared with this app.',
  },
  {
    Icon: Stamp,
    title: 'Vote in private',
    body: 'Your response is recorded as an encrypted commitment. Neither the team nor the network can read it while voting is open.',
  },
  {
    Icon: ChartBar,
    title: 'Count in public',
    body: 'After closing, only Yes, No, and Abstain totals are published. Anyone can recount them without linking them to a person.',
  },
];
const SEPARATION_EN = [
  {
    Icon: Fingerprint,
    label: 'Your Passport identity',
    knows: 'Your visible name and profile.',
    never: 'Never sees your vote.',
  },
  {
    Icon: Lock,
    label: 'Your voter secret',
    knows: 'That an eligible person voted once.',
    never: 'Never knows who you are.',
  },
  {
    Icon: EyeSlash,
    label: 'Your choice',
    knows: 'Added to the total when counting opens.',
    never: 'Never stored with your identity.',
  },
];
const PUBLIC_DATA_EN = [
  'A valid vote was issued.',
  'A unique marker prevents a second vote.',
  'Yes, No, and Abstain totals after closing.',
];
const PRIVATE_DATA_EN = [
  'Your name, identity data, and raw evidence.',
  'Your choice while voting is open.',
  'The relationship between your identity and your vote, always.',
];
const GLOSSARY_EN = [
  {
    term: 'Commitment',
    meaning:
      'A closed box containing your vote. You can prove it did not change without opening it.',
  },
  {
    term: 'Unique marker',
    meaning: 'A fingerprint that reveals a second vote without saying who cast the first.',
  },
  {
    term: 'Zero-knowledge proof',
    meaning: 'A demonstration that something is true without revealing why it is true.',
  },
];

function ExploreView({
  polls,
  publicContractAddress,
  onOpenPolicy,
  locale,
}: {
  polls: readonly Poll[];
  publicContractAddress: string | null;
  onOpenPolicy: (pollId: string) => void;
  locale: CicoLocale;
}) {
  const copy =
    locale === 'es'
      ? {
          welcome: 'Bienvenido/a',
          title: 'Decidir en comunidad, con información clara.',
          lead: 'Antes de votar, entendé qué se hace público, qué queda privado y por qué podés comprobarlo vos.',
          library: 'Biblioteca editorial',
          beforeVote: 'Antes de votar, leé',
          dossiers:
            'dossiers con marco vigente, puntos de vista contrapuestos, incertidumbres y fuentes oficiales fechadas.',
          how: 'Cómo funciona',
          howTitle: 'Tres pasos, una sola vez',
          central: 'La idea central',
          separationTitle: 'Tres piezas que nunca se cruzan',
          separationLead:
            'La privacidad no depende de que confíes en nosotros. Depende de que estas tres cosas se mantengan separadas por diseño.',
          transparency: 'Transparencia',
          visibilityTitle: 'Qué se ve y qué no',
          public: 'Queda público',
          private: 'Nunca sale de tu teléfono',
          stages: 'Etapas',
          timelineTitle: 'De tu voto al resultado',
          glossary: 'En criollo',
          independent:
            'Prototipo independiente para hackathon. No es un referéndum oficial ni tiene validez legal.',
          read: 'Consulta, fuentes y consecuencias posibles',
          resultsEyebrow: 'Resultados públicos',
          resultsTitle: 'Lo que cualquiera puede leer, sin iniciar sesión',
          resultsLead:
            'Estos totales se leen en vivo desde el estado público del contrato. No hace falta credencial ni wallet para verlos.',
        }
      : {
          welcome: 'Welcome',
          title: 'Decide together, with clear information.',
          lead: 'Before voting, understand what is public, what stays private, and how you can check it yourself.',
          library: 'Editorial library',
          beforeVote: 'Read before voting',
          dossiers:
            'dossiers with the current framework, opposing perspectives, uncertainties, and dated official sources.',
          how: 'How it works',
          howTitle: 'Three steps, once',
          central: 'The central idea',
          separationTitle: 'Three pieces that never meet',
          separationLead:
            'Privacy does not depend on trusting us. It depends on keeping these three things separate by design.',
          transparency: 'Transparency',
          visibilityTitle: 'What is visible and what is not',
          public: 'Public',
          private: 'Never leaves your device',
          stages: 'Stages',
          timelineTitle: 'From your vote to the result',
          glossary: 'In plain terms',
          independent:
            'Independent hackathon prototype. It is not an official referendum and has no legal validity.',
          read: 'Consultation, sources, and possible consequences',
          resultsEyebrow: 'Public results',
          resultsTitle: 'What anyone can read, without signing in',
          resultsLead:
            'These totals are read live from the contract public state. No credential or wallet is needed to view them.',
        };
  const howItems = locale === 'es' ? HOW_IT_WORKS : HOW_IT_WORKS_EN;
  const separationItems = locale === 'es' ? SEPARATION : SEPARATION_EN;
  const publicData = locale === 'es' ? PUBLIC_DATA : PUBLIC_DATA_EN;
  const privateData = locale === 'es' ? PRIVATE_DATA : PRIVATE_DATA_EN;
  const glossaryItems = locale === 'es' ? GLOSSARY : GLOSSARY_EN;
  return (
    <main className="page-content">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <p className="eyebrow">{copy.welcome}</p>
          <h1>{copy.title}</h1>
          <p>{copy.lead}</p>
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
            <p className="eyebrow">{copy.library}</p>
            <h2 id="library-title">{copy.beforeVote}</h2>
          </div>
          <BookOpen size={22} />
        </div>
        <p className="section-lead">
          {locale === 'es' ? 'Cinco ' : 'Five '}
          {copy.dossiers}
        </p>
        <div className="library-list">
          {polls.map((poll) => (
            <button type="button" key={poll.id} onClick={() => onOpenPolicy(poll.id)}>
              <span>
                <strong>{poll.title}</strong>
                <small>{copy.read}</small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{copy.how}</p>
            <h2 id="how-title">{copy.howTitle}</h2>
          </div>
          <BookOpen size={22} />
        </div>
        <ol className="how-list">
          {howItems.map(({ Icon, title, body }, index) => (
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
            <p className="eyebrow">{copy.central}</p>
            <h2 id="separation-title">{copy.separationTitle}</h2>
          </div>
          <ShieldCheck size={22} />
        </div>
        <p className="section-lead">{copy.separationLead}</p>
        <div className="separation-grid">
          {separationItems.map(({ Icon, label, knows, never }) => (
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
            <p className="eyebrow">{copy.transparency}</p>
            <h2 id="visibility-title">{copy.visibilityTitle}</h2>
          </div>
          <Eye size={22} />
        </div>
        <div className="visibility-columns">
          <div className="visibility-column public">
            <h3>
              <Eye size={17} /> {copy.public}
            </h3>
            <ul>
              {publicData.map((item) => (
                <li key={item}>
                  <Check size={15} /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="visibility-column private">
            <h3>
              <EyeSlash size={17} /> {copy.private}
            </h3>
            <ul>
              {privateData.map((item) => (
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
            <p className="eyebrow">{copy.stages}</p>
            <h2 id="timeline-title">{copy.timelineTitle}</h2>
          </div>
          <Clock size={22} />
        </div>
        <ol className="timeline-list">
          <li>
            <span />
            <div>
              <strong>{locale === 'es' ? 'Votación abierta' : 'Voting open'}</strong>
              <p>
                {locale === 'es'
                  ? 'Se reciben compromisos cifrados. Los totales no existen todavía: no hay nada que filtrar.'
                  : 'Encrypted commitments are accepted. Totals do not exist yet, so there is nothing to filter.'}
              </p>
            </div>
          </li>
          <li>
            <span />
            <div>
              <strong>{locale === 'es' ? 'Recuento' : 'Counting'}</strong>
              <p>
                {locale === 'es'
                  ? 'Cerrada la votación, cada voto se suma a su total sin revelar de quién vino.'
                  : 'After voting closes, each vote is added to its total without revealing who cast it.'}
              </p>
            </div>
          </li>
          <li>
            <span />
            <div>
              <strong>{locale === 'es' ? 'Resultado final' : 'Final result'}</strong>
              <p>
                {locale === 'es'
                  ? 'Los totales quedan publicados y cualquiera puede verificarlos contra la red.'
                  : 'Totals are published and anyone can verify them against the network.'}
              </p>
            </div>
          </li>
        </ol>
      </section>

      <HowItWorks locale={locale} />

      <section className="glossary-section" aria-labelledby="glossary-title">
        <h2 id="glossary-title">{copy.glossary}</h2>
        <dl className="glossary-list">
          {glossaryItems.map(({ term, meaning }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="results-section" aria-labelledby="public-results-title">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{copy.resultsEyebrow}</p>
            <h2 id="public-results-title">{copy.resultsTitle}</h2>
          </div>
          <ChartBar size={22} />
        </div>
        <p className="section-lead">{copy.resultsLead}</p>
        {polls.some((poll) => poll.runtimeContractAddress) ? (
          polls
            .filter((poll) => poll.runtimeContractAddress)
            .map((poll) => (
              <ResultsPanel
                key={`explore-results-${poll.id}`}
                contractAddress={poll.runtimeContractAddress ?? null}
                title={localizePoll(poll, locale).title}
                locale={locale}
              />
            ))
        ) : (
          <ResultsPanel contractAddress={publicContractAddress} locale={locale} />
        )}
      </section>

      {/*
       * TODO(product): "Suggest a consultation" entry point.
       * Explore will later let anyone propose a new consultation for review.
       * Intentionally not built yet — placeholder only, per the wave-2 nav
       * consolidation scope. When implemented, keep it public (no credential
       * required to submit a suggestion) and separate from the private
       * voting/eligibility path.
       */}

      <p className="independent-note">
        <Info size={16} /> {copy.independent}
      </p>
    </main>
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
