import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Fingerprint,
  Globe,
  Info,
  Stamp,
  UserCircle,
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
import { useWallet } from '@/hooks/use-wallet';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import { ASSIGNED_COUNTRIES } from '@/integration/country-catalog';
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
  ONBOARDING_SESSION_KEY,
  PASSPORT_ORIGIN,
  shouldShowFirstRunOnboarding,
  type Tab,
} from '@/views/app-runtime';
import { ExploreView } from '@/views/ExploreView';
import { PolicyDetailView } from '@/views/PolicyDetailView';
import { ProfileView } from '@/views/ProfileView';
import {
  type Choice,
  DEFAULT_POLL,
  POLLS,
  toRuntimePolls,
  type VoteReceipt,
} from '@/views/poll-model';
import { VoteFlow } from '@/views/VoteFlow';
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
}: {
  passportSession: CivicPassportSession | null;
  passportError: string | null;
  onConnectPassport: () => void;
  onDismissPassportError: () => void;
  locale: CicoLocale;
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
        onLocaleChange={changeLocale}
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
