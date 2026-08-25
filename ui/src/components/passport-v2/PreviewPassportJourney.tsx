import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Globe,
  Info,
  Lock,
  QrCode,
  ShieldCheck,
  Stamp,
} from '@phosphor-icons/react';
import type {
  CanonicalReceipt,
  CivicActionPort,
  CivicCredentialPort,
  CivicPassportSession,
  CredentialEnrollment,
  CredentialSummary,
  EnrollmentStatusSnapshot,
  PassportSessionPort,
  VoteChoice,
} from 'midnight-referendum-api';
import { useState } from 'react';
import {
  catalogEligibility,
  eligibilityCopy,
  LEGACY_PREVIEW_CATALOG,
  type PassportV2CatalogItem,
  scopeLabel,
  toPassportV2Catalog,
} from '@/integration/passport-v2-catalog';
import type { PassportV2RuntimeReferendum } from '@/integration/passport-v2-runtime-config';
import { EnrollmentHandoff } from './EnrollmentHandoff';

export interface PreviewPassportJourneyPorts {
  readonly passport: PassportSessionPort;
  readonly credential?: CivicCredentialPort;
  readonly actions?: CivicActionPort;
  readonly configurationError?: string;
  readonly referenda?: readonly PassportV2RuntimeReferendum[];
  /** App wiring sets this when v2 is configured, even while providers load. */
  readonly runtimeCatalogConfigured?: boolean;
}

interface PreviewPassportJourneyProps {
  readonly ports: PreviewPassportJourneyPorts;
  readonly onClose: () => void;
}

type PreviewStage =
  | 'consent'
  | 'provider'
  | 'enrollment'
  | 'credential'
  | 'catalog'
  | 'scope'
  | 'choice'
  | 'review'
  | 'processing'
  | 'confirmation-pending'
  | 'confirmation-rejected'
  | 'submission-failed'
  | 'receipt';

const choices = [
  ['YES', 'Sí'],
  ['NO', 'No'],
  ['ABSTAIN', 'Abstención'],
] as const;

export function PreviewPassportJourney({ ports, onClose }: PreviewPassportJourneyProps) {
  const [stage, setStage] = useState<PreviewStage>('consent');
  const [session, setSession] = useState<CivicPassportSession | null>(null);
  const [enrollment, setEnrollment] = useState<CredentialEnrollment | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusSnapshot | null>(null);
  const [credential, setCredential] = useState<CredentialSummary | null>(null);
  const [selectedReferendum, setSelectedReferendum] = useState<PassportV2CatalogItem | null>(null);
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [receipt, setReceipt] = useState<CanonicalReceipt | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<CanonicalReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completePorts = Boolean(ports.credential && ports.actions);
  const runtimeCatalogConfigured = Boolean(ports.runtimeCatalogConfigured);
  const configuredCatalog = ports.referenda?.length
    ? toPassportV2Catalog(ports.referenda)
    : runtimeCatalogConfigured
      ? []
      : LEGACY_PREVIEW_CATALOG;
  const hasRuntimeCatalog = Boolean(ports.referenda?.length);
  const shouldUseCatalog = hasRuntimeCatalog || runtimeCatalogConfigured;

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
      setStage('provider');
    });

  const beginEnrollment = () =>
    run(async () => {
      if (!session || !ports.credential) throw new Error('La sesión Passport no está lista.');
      const created = await ports.credential.beginEnrollment({
        session,
        policy: { minimumAssurance: 'document-nfc', requireAdult: true },
      });
      setEnrollment(created);
      setEnrollmentStatus({
        enrollmentId: created.enrollmentId,
        status: created.status,
        updatedAt: created.createdAt,
      });
      if (created.status === 'issued') {
        const summary = await ports.credential.getCredentialSummary();
        if (summary?.status !== 'issued') {
          throw new Error('El emisor no devolvió una credencial vigente.');
        }
        setCredential(summary);
        setStage('credential');
      } else {
        setStage('enrollment');
      }
    });

  const checkEnrollment = () =>
    run(async () => {
      if (!enrollment || !ports.credential) throw new Error('No hay enrolamiento activo.');
      const status = await ports.credential.getEnrollmentStatus(enrollment.enrollmentId);
      setEnrollmentStatus(status);
      if (status.status === 'pending') return;
      if (status.status !== 'issued') {
        setError(`La verificación terminó con estado ${status.status}.`);
        return;
      }
      const summary = await ports.credential.getCredentialSummary();
      if (summary?.status !== 'issued') {
        throw new Error('La credencial todavía no está disponible.');
      }
      setCredential(summary);
      setStage('credential');
    });

  const restartEnrollment = () =>
    run(async () => {
      await ports.credential?.clearCredential();
      setEnrollment(null);
      setEnrollmentStatus(null);
      setCredential(null);
      setSelectedReferendum(null);
      setStage('provider');
    });

  const confirmSubmittedReceipt = async (submitted: CanonicalReceipt) => {
    if (!ports.actions) throw new Error('La acción Midnight no está configurada.');
    const canonical = await ports.actions.getCanonicalReceipt(submitted.transactionId);
    if (!canonical) {
      setStage('confirmation-pending');
      throw new Error('El indexer todavía no publicó la confirmación canónica.');
    }
    if (!sameCanonicalTransaction(submitted, canonical)) {
      setStage('confirmation-rejected');
      throw new Error('La respuesta del indexer no coincide con la transacción enviada.');
    }
    setReceipt(canonical);
    setStage('receipt');
  };

  const submitVote = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!ports.credential || !ports.actions || !choice || !selectedReferendum) {
        throw new Error('El voto todavía no está listo para enviar.');
      }
      const authorization = await ports.credential.getActionAuthorization();
      if (!authorization) throw new Error('La credencial no tiene una autorización cívica activa.');

      setStage('processing');
      const submitted = await ports.actions.castVote({
        referendumId: selectedReferendum.referendumId,
        choice,
        authorization,
      });
      assertVoteReceipt(submitted);
      setSubmittedReceipt(submitted);
      await confirmSubmittedReceipt(submitted);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos confirmar la transacción.');
      setStage((current) => {
        if (current === 'confirmation-rejected' || current === 'confirmation-pending') {
          return current;
        }
        return 'submission-failed';
      });
    } finally {
      setBusy(false);
    }
  };

  const refreshConfirmation = () =>
    run(async () => {
      if (!submittedReceipt) {
        throw new Error(
          'No hay un identificador de transacción seguro. No reenviaremos el voto automáticamente.',
        );
      }
      await confirmSubmittedReceipt(submittedReceipt);
    });

  return (
    <main className="page-content passport-journey-page">
      <button className="back-button" onClick={onClose} type="button">
        <ArrowLeft size={18} /> Volver a la app
      </button>
      <div className="passport-journey-heading">
        <div>
          <p className="eyebrow">Recorrido Passport v2</p>
          <h1>Passport al centro, evidencia desacoplada</h1>
        </div>
        <span className="passport-demo-label">PREVIEW</span>
      </div>

      {error ? (
        <div className="passport-notice warning" role="alert">
          <Info size={18} />
          <p>{error}</p>
        </div>
      ) : null}

      {stage === 'consent' ? (
        <JourneyCard icon={<Fingerprint size={36} />} eyebrow="Paso 1 · sesión Passport">
          <h2>Conectá Midnight Passport</h2>
          <p>
            Passport establece la sesión y el consentimiento. No comparte tu respuesta ni se usa
            como sustituto de una credencial de nacionalidad.
          </p>
          <PrivacyNotice>
            Solicitamos únicamente sesión y perfil visible. No pedimos witnesses, NFC ni
            autorización de transacción a Passport.
          </PrivacyNotice>
          <JourneyButton busy={busy} onClick={connect}>
            Conectar Passport <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'provider' ? (
        <JourneyCard icon={<ShieldCheck size={36} />} eyebrow="Paso 2 · límites de confianza">
          <h2>Sesión Passport conectada</h2>
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
          {completePorts ? (
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
                  'Passport funciona, pero el gateway Rarimo server-side y el emisor Midnight aún no están configurados en este despliegue. No se sustituirán por datos sintéticos.'}
              </p>
            </div>
          )}
        </JourneyCard>
      ) : null}

      {stage === 'enrollment' ? (
        <JourneyCard icon={<QrCode size={36} />} eyebrow="Paso 3 · evidencia NFC/QR">
          <h2>Completá la verificación en tu teléfono</h2>
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
          {enrollment?.interaction ? (
            <EnrollmentHandoff
              uri={enrollment.interaction.uri}
              expiresAt={enrollment.interaction.expiresAt}
            />
          ) : null}
          <PrivacyNotice>
            CICO no muestra ni conserva MRZ, fecha de nacimiento, imagen, NFC o prueba cruda en el
            navegador.
          </PrivacyNotice>
          <JourneyButton busy={busy} onClick={checkEnrollment}>
            Comprobar verificación <ArrowRight size={19} />
          </JourneyButton>
          {enrollmentStatus &&
          enrollmentStatus.status !== 'pending' &&
          enrollmentStatus.status !== 'issued' ? (
            <JourneyButton busy={busy} onClick={restartEnrollment}>
              Empezar de nuevo <ArrowRight size={19} />
            </JourneyButton>
          ) : null}
        </JourneyCard>
      ) : null}

      {stage === 'credential' && credential ? (
        <JourneyCard icon={<ShieldCheck size={36} />} eyebrow="Paso 4 · credencial Midnight">
          <h2>Credencial cívica confirmada</h2>
          <dl className="credential-summary">
            <div>
              <dt>Proveedor</dt>
              <dd>{credential.provider}</dd>
            </div>
            <div>
              <dt>País ISO</dt>
              <dd>{credential.country}</dd>
            </div>
            <div>
              <dt>Edad</dt>
              <dd>{credential.ageClass}</dd>
            </div>
            <div>
              <dt>Assurance</dt>
              <dd>{credential.assurance}</dd>
            </div>
            <div>
              <dt>Epoch</dt>
              <dd>{credential.credentialEpoch}</dd>
            </div>
          </dl>
          <PrivacyNotice>
            Solo se habilitan consultas vinculadas a este mismo epoch congelado. Si llegaste después
            del cierre, la app te dirige a una consulta del próximo epoch en lugar de usar una raíz
            anterior.
          </PrivacyNotice>
          <JourneyButton
            busy={false}
            onClick={() => setStage(shouldUseCatalog ? 'catalog' : 'scope')}
          >
            Elegir alcance o consulta <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'catalog' ? (
        <JourneyCard icon={<Globe size={36} />} eyebrow="Paso 5 · catálogo de consultas">
          <h2>Elegí una consulta configurada</h2>
          <p>
            Estas consultas vienen de la configuración de este entorno Preview. La app envía el
            identificador seleccionado tal como fue configurado; no usa una consulta fija de demo.
          </p>
          {configuredCatalog.length ? (
            <fieldset className="scope-options">
              <legend>Consultas disponibles</legend>
              {configuredCatalog.map((item) =>
                (() => {
                  const eligibility = catalogEligibility(item, credential);
                  return (
                    <button
                      aria-disabled={!eligibility.available}
                      disabled={!eligibility.available}
                      key={item.referendumId}
                      type="button"
                      onClick={() => {
                        if (!eligibility.available) return;
                        setSelectedReferendum(item);
                        setStage('choice');
                      }}
                    >
                      <span className="scope-flag" aria-hidden="true">
                        {item.scope === 'global' ? '◎' : '⌖'}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{scopeLabel(item.scope)}</small>
                        <small>
                          {eligibility.available ? eligibilityCopy(item.scope) : eligibility.reason}
                        </small>
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  );
                })(),
              )}
            </fieldset>
          ) : (
            <div className="passport-notice warning" role="alert">
              <Info size={18} />
              <p>
                No hay consultas v2 disponibles en la configuración de este entorno. No se usará una
                consulta de demostración como sustituto.
              </p>
            </div>
          )}
          <PrivacyNotice>
            La política territorial, cuando existe, se prueba como un predicado privado. No
            publicamos porcentajes ni inferimos la distribución geográfica de quienes participan.
          </PrivacyNotice>
        </JourneyCard>
      ) : null}

      {stage === 'scope' ? (
        <JourneyCard icon={<Globe size={36} />} eyebrow="Paso 5 · política de acceso">
          <h2>Elegí el espacio de participación</h2>
          <p>
            Esta compatibilidad solo aparece cuando se usan puertos de prueba antiguos sin catálogo
            de runtime. En Preview configurado, cada consulta define su propia política.
          </p>
          <div className="scope-options">
            <button
              type="button"
              onClick={() => {
                setSelectedReferendum(LEGACY_PREVIEW_CATALOG[0] ?? null);
                setStage('choice');
              }}
            >
              <Globe size={28} />
              <span>
                <strong>World</strong>
                <small>Cualquier credencial admitida.</small>
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedReferendum(LEGACY_PREVIEW_CATALOG[1] ?? null);
                setStage('choice');
              }}
            >
              <span className="scope-flag">{credential?.country}</span>
              <span>
                <strong>Mi país</strong>
                <small>El país se prueba como predicado privado.</small>
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </JourneyCard>
      ) : null}

      {stage === 'choice' ? (
        <JourneyCard icon={<Lock size={36} />} eyebrow="Paso 6 · respuesta privada">
          <h2>{selectedReferendum?.question ?? 'Elegí tu respuesta'}</h2>
          {selectedReferendum ? <p>{eligibilityCopy(selectedReferendum.scope)}</p> : null}
          <div className="passport-choice-list">
            {choices.map(([value, label]) => (
              <button
                className={choice === value ? 'selected' : ''}
                key={value}
                type="button"
                onClick={() => setChoice(value)}
              >
                <span>
                  <strong>{label}</strong>
                </span>
                <span className="choice-check">
                  {choice === value ? <Check size={17} /> : null}
                </span>
              </button>
            ))}
          </div>
          <JourneyButton busy={false} disabled={!choice} onClick={() => setStage('review')}>
            Revisar compromiso <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'review' ? (
        <JourneyCard icon={<Stamp size={36} />} eyebrow="Paso 7 · autorización local">
          <h2>Revisá antes de probar</h2>
          <p>
            Consulta: <strong>{selectedReferendum?.title ?? 'Consulta configurada'}</strong>. Tu
            respuesta se usa localmente para crear el ballot commitment y no aparecerá en el
            comprobante.
          </p>
          {selectedReferendum ? (
            <p>
              Política de elegibilidad: <strong>{scopeLabel(selectedReferendum.scope)}</strong>.
            </p>
          ) : null}
          <PrivacyNotice>
            La acción recibe un handle opaco de credencial, nunca el proof Rarimo ni el private
            state de Compact.
          </PrivacyNotice>
          <JourneyButton busy={busy} onClick={submitVote}>
            Probar y enviar en Preview <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'processing' ? (
        <JourneyCard icon={<Stamp size={36} />} eyebrow="Paso 8 · Midnight">
          <h2>Esperando confirmación canónica</h2>
          <p>Se está probando, enviando y comparando el resultado con el indexer de Preview.</p>
          <div className="passport-processing-track" role="progressbar" aria-label="Envío" />
        </JourneyCard>
      ) : null}

      {stage === 'confirmation-pending' ? (
        <JourneyCard icon={<Stamp size={36} />} eyebrow="Paso 8 · confirmación pendiente">
          <h2>El resultado de envío todavía es incierto</h2>
          <p>
            No generamos un comprobante ni reenviamos el voto automáticamente. Primero hay que
            recuperar la misma transacción desde el indexer.
          </p>
          {submittedReceipt ? (
            <div className="choice-free-receipt">
              <span>Transacción enviada</span>
              <strong>{submittedReceipt.transactionId}</strong>
            </div>
          ) : null}
          <JourneyButton busy={busy} disabled={!submittedReceipt} onClick={refreshConfirmation}>
            Actualizar confirmación <ArrowRight size={19} />
          </JourneyButton>
          <JourneyButton busy={false} onClick={onClose}>
            Salir sin reenviar <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'confirmation-rejected' ? (
        <JourneyCard icon={<Info size={36} />} eyebrow="Paso 8 · confirmación rechazada">
          <h2>La confirmación no coincide</h2>
          <p>
            CICO no mostrará un comprobante para datos canónicos distintos de la transacción
            enviada. Cerrá el recorrido y revisá el servicio/indexer.
          </p>
          <JourneyButton busy={false} onClick={onClose}>
            Salir de forma segura <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'submission-failed' ? (
        <JourneyCard icon={<Info size={36} />} eyebrow="Paso 8 · falló el envío">
          <h2>La transacción falló</h2>
          <p>
            No se confirmó ninguna participación. Revisá la configuración o la credencial y
            reintentá de forma explícita; la app no reenvía votos automáticamente.
          </p>
          <JourneyButton busy={false} onClick={() => setStage('review')}>
            Volver a revisar <ArrowRight size={19} />
          </JourneyButton>
          <JourneyButton busy={false} onClick={onClose}>
            Salir de forma segura <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}

      {stage === 'receipt' && receipt ? (
        <JourneyCard icon={<Check size={36} />} eyebrow="Paso 9 · confirmado">
          <h2>Tu comprobante no revela tu elección</h2>
          <div className="choice-free-receipt">
            <span>Transacción Midnight</span>
            <strong>{receipt.transactionId}</strong>
            <small>
              Bloque {receipt.blockHeight} · circuito {receipt.circuit}
            </small>
          </div>
          <PrivacyNotice>
            El comprobante confirma una participación. No contiene Passport, país, credencial ni
            respuesta.
          </PrivacyNotice>
          {receipt.explorerUrl ? (
            <a className="text-link" href={receipt.explorerUrl} rel="noreferrer" target="_blank">
              Abrir en explorer <ArrowRight size={16} />
            </a>
          ) : null}
          <JourneyButton busy={false} onClick={onClose}>
            Volver a votaciones <ArrowRight size={19} />
          </JourneyButton>
        </JourneyCard>
      ) : null}
    </main>
  );
}

function JourneyCard({
  children,
  icon,
  eyebrow,
}: {
  readonly children: React.ReactNode;
  readonly icon: React.ReactNode;
  readonly eyebrow: string;
}) {
  return (
    <section className="passport-journey-card">
      <div className="passport-journey-icon">{icon}</div>
      <p className="eyebrow">{eyebrow}</p>
      {children}
    </section>
  );
}

function JourneyButton({
  busy,
  children,
  disabled = false,
  onClick,
}: {
  readonly busy: boolean;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      className="passport-action-button primary"
      disabled={busy || disabled}
      onClick={onClick}
      type="button"
    >
      {busy ? 'Procesando…' : children}
    </button>
  );
}

function PrivacyNotice({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="passport-notice info">
      <Info size={18} />
      <p>{children}</p>
    </div>
  );
}

function assertVoteReceipt(receipt: CanonicalReceipt): void {
  if (
    receipt.status !== 'confirmed' ||
    receipt.action !== 'vote' ||
    receipt.network !== 'preview' ||
    receipt.circuit !== 'castVote'
  ) {
    throw new Error('La acción no devolvió un comprobante canónico de voto Preview.');
  }
}

function sameCanonicalTransaction(left: CanonicalReceipt, right: CanonicalReceipt): boolean {
  return (
    left.status === right.status &&
    left.action === right.action &&
    left.network === right.network &&
    left.transactionId === right.transactionId &&
    left.transactionHash === right.transactionHash &&
    left.contractAddress === right.contractAddress &&
    left.circuit === right.circuit &&
    left.blockHeight === right.blockHeight &&
    left.blockHash === right.blockHash
  );
}
