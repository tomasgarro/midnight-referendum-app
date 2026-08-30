import { Check } from '@phosphor-icons/react';
import type { CivicPassportSession } from 'midnight-referendum-api';
import {
  Button,
  Callout,
  Card,
  Display,
  Screen,
  Sheet,
  StatGroup,
  StatRow,
  StepHeader,
} from '@/components/system';
import { WalletWidget } from '@/components/wallet-widget';
import { countryName as getCountryName } from '@/integration/country-catalog';
import type { CicoLocale } from '@/integration/locale';
import { RELAYER_MODE } from '@/providers/midnight-providers';
import { CHAIN_RUNTIME_ENABLED, type FlowStage, networkLabel } from '@/views/app-runtime';
import { CopyReceiptButton } from '@/views/CopyReceiptButton';
import { type Choice, localizePoll, type Poll, type VoteReceipt } from '@/views/poll-model';
import './vote-flow.css';

/**
 * Casting a vote: three steps and a confirmation.
 *
 * The labelled FlowStepper is gone. It spent roughly a third of a 375px
 * screen drawing three pills that said "Entendé / Verificá / Votá" -- three
 * words the user could not act on, above the content they came for.
 * StepHeader states the same progress in one line and announces it in full
 * to a screen reader.
 *
 * Review is now a Sheet over the choice screen rather than a fourth screen.
 * Confirming a vote is a short interruption the user answers and dismisses:
 * they can see the answer they picked behind it, and backing out returns them
 * to the choice instead of needing its own back button. Its body is the
 * RariMe proof-request pattern -- labelled StatGroups of StatRows -- because
 * "Tu respuesta: Sí" is read in a glance where the paragraph that said the
 * same thing was not read at all.
 *
 * The choice buttons were three cards tinted yes-green, no-red and
 * abstain-grey. On a consultation with no house position, that is the
 * interface telling you which answer is the agreeable one. They are three
 * identical rows; the accent marks the one you picked, and nothing else.
 */

const COPY = {
  es: {
    step: (n: number, total: number) => `Paso ${n} de ${total}`,
    close: 'Salir sin votar',
    back: 'Volver',
    // verify
    verifyTitle: 'Antes de votar',
    verifyBody:
      'Passport aporta tu perfil visible. No firma el voto: el secreto anónimo queda separado.',
    connect: 'Conectar Passport',
    connected: 'Passport conectado',
    rules: 'Reglas de esta demo',
    identity: 'Identidad',
    eligibility: 'Elegibilidad',
    pending: 'pendiente',
    checkEligibility: 'Validar elegibilidad',
    localMode: 'Modo local: podés recorrer la interfaz, pero no se crea ningún comprobante.',
    // eligible
    eligibleTitle: 'Listo, podés votar',
    eligibleBody: 'Tu elegibilidad es ahora un compromiso anónimo.',
    checked: 'Elegibilidad',
    verified: 'verificada',
    evidence: 'Evidencia cruda',
    neverLeft: 'no salió de tu dispositivo',
    continue: 'Continuar al voto',
    // choose
    chooseLabel: 'Tu respuesta',
    yes: 'Sí',
    no: 'No',
    abstain: 'Abstención',
    yesBody: 'Estoy de acuerdo con priorizar esta propuesta',
    noBody: 'No estoy de acuerdo con priorizarla así',
    abstainBody: 'Prefiero no tomar una posición binaria',
    review: 'Revisar mi voto',
    // review sheet
    reviewTitle: 'Revisá antes de confirmar',
    yourVote: 'Tu voto',
    consultation: 'Consulta',
    answer: 'Tu respuesta',
    visibility: 'Visibilidad',
    privateUntil: 'privada hasta el recuento',
    howSent: 'Cómo se envía',
    signer: 'Firma',
    relayer: 'relay atómico, sin ver tu elección',
    wallet: 'Wallet',
    walletConnected: 'conectada',
    walletPending: 'pendiente',
    dust: 'DUST',
    dustUnavailable: 'saldo no disponible',
    available: 'disponible',
    change: 'Cambiar mi respuesta',
    confirmReal: 'Confirmar acción real',
    confirmSimulated: 'Crear comprobante simulado',
    simulatedNote:
      'Este comprobante será simulado y se guardará localmente. Una prueba real requiere red compatible, contrato desplegado y wallet.',
    cannotSubmit: 'todavía no puede enviar',
    // processing
    processingTitle: 'Preparando tu comprobante',
    processingRelayer:
      'La prueba se crea localmente; el relay reserva DUST, envía una vez y espera confirmación.',
    processingWallet:
      'El flujo reúne prueba, balanceo DUST/NIGHT, aprobación del wallet y confirmación canónica.',
    // receipt
    receiptTitle: 'Gracias por participar',
    receiptBody: 'Guardá este identificador para verificar el resultado.',
    receiptGroup: 'Tu comprobante',
    identifier: 'Identificador',
    inProfile: 'Disponible en tu perfil',
    network: 'Red',
    state: 'Estado',
    confirmed: 'confirmado',
    simulated: 'simulado',
    notATransaction: 'No representa una transacción ni una prueba de voto real.',
    openExplorer: 'Abrir en explorer',
    viewReceipt: 'Ver mi comprobante',
  },
  en: {
    step: (n: number, total: number) => `Step ${n} of ${total}`,
    close: 'Leave without voting',
    back: 'Back',
    verifyTitle: 'Before you vote',
    verifyBody:
      'Passport provides your visible profile. It does not sign the vote: the anonymous secret stays separate.',
    connect: 'Connect Passport',
    connected: 'Passport connected',
    rules: 'Demo rules',
    identity: 'Identity',
    eligibility: 'Eligibility',
    pending: 'pending',
    checkEligibility: 'Check eligibility',
    localMode: 'Local mode: you can explore the interface, but no receipt is created.',
    eligibleTitle: 'You are ready to vote',
    eligibleBody: 'Your eligibility is now an anonymous commitment.',
    checked: 'Eligibility',
    verified: 'verified',
    evidence: 'Raw evidence',
    neverLeft: 'never left your device',
    continue: 'Continue to vote',
    chooseLabel: 'Your response',
    yes: 'Yes',
    no: 'No',
    abstain: 'Abstain',
    yesBody: 'I support prioritising this proposal',
    noBody: 'I do not support prioritising it this way',
    abstainBody: 'I prefer not to take a binary position',
    review: 'Review my vote',
    reviewTitle: 'Review before confirming',
    yourVote: 'Your vote',
    consultation: 'Consultation',
    answer: 'Your response',
    visibility: 'Visibility',
    privateUntil: 'private until counting',
    howSent: 'How it is sent',
    signer: 'Signed by',
    relayer: 'atomic relay, never sees your choice',
    wallet: 'Wallet',
    walletConnected: 'connected',
    walletPending: 'pending',
    dust: 'DUST',
    dustUnavailable: 'balance unavailable',
    available: 'available',
    change: 'Change my response',
    confirmReal: 'Confirm real action',
    confirmSimulated: 'Create simulated receipt',
    simulatedNote:
      'This receipt will be simulated and saved locally. A real proof requires a compatible network, a deployed contract, and a wallet.',
    cannotSubmit: 'cannot submit yet',
    processingTitle: 'Preparing your receipt',
    processingRelayer:
      'The proof is created locally; the relay reserves DUST, submits once, and waits for confirmation.',
    processingWallet:
      'The flow combines proof, DUST/NIGHT balancing, wallet approval, and canonical confirmation.',
    receiptTitle: 'Thank you for participating',
    receiptBody: 'Save this identifier to verify the result.',
    receiptGroup: 'Your receipt',
    identifier: 'Identifier',
    inProfile: 'Available in your profile',
    network: 'Network',
    state: 'Status',
    confirmed: 'confirmed',
    simulated: 'simulated',
    notATransaction: 'This is not a transaction or a real vote proof.',
    openExplorer: 'Open in explorer',
    viewReceipt: 'View my receipt',
  },
} as const;

const TOTAL_STEPS = 3;

export interface VoteFlowProps {
  readonly poll: Poll;
  readonly stage: FlowStage;
  readonly choice: Choice | null;
  readonly onChoice: (choice: Choice) => void;
  readonly onStage: (stage: FlowStage) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly onViewReceipt: () => void;
  readonly walletStatus: string;
  readonly passportSession: CivicPassportSession | null;
  readonly onConnectPassport: () => void;
  readonly credentialCountry: string | null;
  readonly previewError: string | null;
  readonly receipt: VoteReceipt | null;
  readonly previewReady: boolean;
  readonly dustBalance?: bigint | null;
  readonly locale: CicoLocale;
}

export function VoteFlow({
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
}: VoteFlowProps) {
  const copy = COPY[locale];
  const displayPoll = localizePoll(poll, locale);
  const live = CHAIN_RUNTIME_ENABLED;
  const choiceLabel = (value: Choice) =>
    value === 'YES' ? copy.yes : value === 'NO' ? copy.no : copy.abstain;

  if (stage === 'verify') {
    return (
      <Screen
        header={
          <StepHeader
            step={1}
            total={TOTAL_STEPS}
            label={copy.step(1, TOTAL_STEPS)}
            onClose={onClose}
            closeLabel={copy.close}
          />
        }
        footer={
          <Button block disabled={live && !previewReady} onClick={() => onStage('eligible')}>
            {copy.checkEligibility}
          </Button>
        }
      >
        <Display>{copy.verifyTitle}</Display>
        <p className="flow__body">{copy.verifyBody}</p>
        <Card>
          <StatGroup label={copy.rules}>
            <StatRow
              label={copy.identity}
              value={
                passportSession
                  ? (passportSession.profile?.displayName ?? copy.connected)
                  : copy.pending
              }
            />
            <StatRow
              label={copy.eligibility}
              value={
                credentialCountry ? `${getCountryName(credentialCountry, locale)} · 18+` : '18+'
              }
            />
          </StatGroup>
        </Card>
        {passportSession ? null : (
          <Button variant="secondary" block onClick={onConnectPassport}>
            {copy.connect}
          </Button>
        )}
        {live ? null : <Callout>{copy.localMode}</Callout>}
      </Screen>
    );
  }

  if (stage === 'eligible') {
    return (
      <Screen
        header={
          <StepHeader
            step={2}
            total={TOTAL_STEPS}
            label={copy.step(2, TOTAL_STEPS)}
            onBack={() => onStage('verify')}
            backLabel={copy.back}
            onClose={onClose}
            closeLabel={copy.close}
          />
        }
        footer={
          <Button block onClick={() => onStage('choose')}>
            {copy.continue}
          </Button>
        }
      >
        <Display>{copy.eligibleTitle}</Display>
        <p className="flow__body">{copy.eligibleBody}</p>
        <Card>
          <StatGroup>
            <StatRow label={copy.checked} value={copy.verified} />
            <StatRow label={copy.evidence} value={copy.neverLeft} />
          </StatGroup>
        </Card>
      </Screen>
    );
  }

  if (stage === 'processing') {
    return (
      <Screen>
        <Display>{copy.processingTitle}</Display>
        <p className="flow__body">
          {RELAYER_MODE ? copy.processingRelayer : copy.processingWallet}
        </p>
        {/* Indeterminate: the pipeline reports no percentage, so the bar must
            not imply one. */}
        <div className="flow__indeterminate" role="progressbar" aria-label={copy.processingTitle}>
          <span />
        </div>
      </Screen>
    );
  }

  if (stage === 'receipt') {
    const confirmed = receipt?.status === 'confirmed';
    return (
      <Screen
        footer={
          <Button block onClick={onViewReceipt}>
            {copy.viewReceipt}
          </Button>
        }
      >
        <Display>{copy.receiptTitle}</Display>
        <p className="flow__body">{copy.receiptBody}</p>
        <Card>
          <StatGroup label={copy.receiptGroup}>
            <StatRow label={copy.state} value={confirmed ? copy.confirmed : copy.simulated} />
            <StatRow label={copy.network} value={receipt?.network ?? networkLabel(locale)} />
            <StatRow
              label={copy.identifier}
              value={<code className="flow__code">{receipt?.id ?? copy.inProfile}</code>}
            />
          </StatGroup>
          {receipt ? (
            <div className="flow__receipt-actions">
              <CopyReceiptButton receiptId={receipt.id} locale={locale} />
              {receipt.explorerUrl ? (
                <a
                  className="flow__link"
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.openExplorer}
                </a>
              ) : null}
            </div>
          ) : null}
        </Card>
        {confirmed ? null : <Callout>{copy.notATransaction}</Callout>}
      </Screen>
    );
  }

  /* choose, and review as a sheet over it */
  const options = [
    { value: 'YES' as const, label: copy.yes, body: copy.yesBody },
    { value: 'NO' as const, label: copy.no, body: copy.noBody },
    { value: 'ABSTAIN' as const, label: copy.abstain, body: copy.abstainBody },
  ];

  return (
    <>
      <Screen
        header={
          <StepHeader
            step={TOTAL_STEPS}
            total={TOTAL_STEPS}
            label={copy.step(TOTAL_STEPS, TOTAL_STEPS)}
            onClose={onClose}
            closeLabel={copy.close}
          />
        }
        footer={
          <Button block disabled={!choice} onClick={() => onStage('review')}>
            {copy.review}
          </Button>
        }
      >
        <Display>{displayPoll.question}</Display>
        <fieldset className="flow__choices">
          <legend className="sr-only">{copy.chooseLabel}</legend>
          {options.map((option) => {
            const selected = choice === option.value;
            return (
              <button
                type="button"
                key={option.value}
                className={`flow__choice ${selected ? 'flow__choice--selected' : ''}`.trim()}
                aria-pressed={selected}
                onClick={() => onChoice(option.value)}
              >
                <span className="flow__choice-copy">
                  <span className="flow__choice-label">{option.label}</span>
                  <span className="flow__choice-body">{option.body}</span>
                </span>
                <span className="flow__choice-mark" aria-hidden="true">
                  {selected ? <Check size={14} weight="bold" /> : null}
                </span>
              </button>
            );
          })}
        </fieldset>
      </Screen>

      <Sheet
        open={stage === 'review'}
        title={copy.reviewTitle}
        onClose={() => onStage('choose')}
        closeLabel={copy.change}
        actions={
          <>
            <Button block onClick={onConfirm}>
              {live ? copy.confirmReal : copy.confirmSimulated}
            </Button>
            <Button variant="link" onClick={() => onStage('choose')}>
              {copy.change}
            </Button>
          </>
        }
      >
        <StatGroup label={copy.yourVote}>
          <StatRow label={copy.consultation} value={displayPoll.title} />
          <StatRow label={copy.answer} value={choice ? choiceLabel(choice) : '—'} />
          <StatRow label={copy.visibility} value={copy.privateUntil} />
        </StatGroup>
        <div className="flow__sheet-group">
          <StatGroup label={copy.howSent}>
            {RELAYER_MODE ? (
              <StatRow label={copy.signer} value={copy.relayer} />
            ) : (
              <>
                <StatRow
                  label={copy.wallet}
                  value={walletStatus === 'connected' ? copy.walletConnected : copy.walletPending}
                />
                <StatRow
                  label={copy.dust}
                  value={
                    dustBalance === null
                      ? copy.dustUnavailable
                      : `${dustBalance.toString()} ${copy.available}`
                  }
                />
              </>
            )}
          </StatGroup>
        </div>
        {live && !RELAYER_MODE ? <WalletWidget /> : null}
        {previewError ? (
          <div className="flow__sheet-group">
            <Callout
              tone="danger"
              role="alert"
              title={`${networkLabel(locale)} ${copy.cannotSubmit}`}
            >
              {previewError}
            </Callout>
          </div>
        ) : null}
        {live ? null : (
          <div className="flow__sheet-group">
            <Callout>{copy.simulatedNote}</Callout>
          </div>
        )}
      </Sheet>
    </>
  );
}
