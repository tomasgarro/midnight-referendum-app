import { MagnifyingGlass } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button, Callout, Eyebrow } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { CopyReceiptButton } from '@/views/CopyReceiptButton';
import type { VoteReceipt } from '@/views/poll-model';
import './profile-view.css';

/**
 * Receipt lookup, folded into the profile from the former standalone Verify
 * tab. It checks only receipts already loaded for this profile -- it never
 * queries a third party.
 *
 * The screen used to end with "¿Qué podés comprobar?" and three bullets: that
 * the receipt exists, that it is confirmed or simulated, that you need not
 * share your data again. All three are things the result itself says, so the
 * list explained a search box to someone who had just used it. One line about
 * the only non-obvious property -- the lookup is local -- replaces it.
 *
 * The three result states were a green success panel, a red missing panel and
 * a separate explanation block. They are Callouts, whose tone carries state
 * and never emphasis.
 */

const COPY = {
  es: {
    eyebrow: 'Transparencia',
    title: 'Verificá un comprobante',
    local:
      'La búsqueda es local: se consultan solo los comprobantes guardados en este dispositivo.',
    label: 'Identificador del comprobante',
    search: 'Buscar',
    confirmed: 'Comprobante confirmado',
    simulated: 'Comprobante simulado',
    stillPrivate: 'Tu elección sigue siendo privada.',
    confirmedOn: (network: string) => `El registro está confirmado en ${network}.`,
    simulatedNote: 'Este registro local no representa una transacción ni una prueba de voto real.',
    missing: 'No encontramos ese comprobante',
    missingBody: 'Revisá el identificador o esperá la confirmación.',
    explorer: 'Abrir en explorer',
  },
  en: {
    eyebrow: 'Transparency',
    title: 'Verify a receipt',
    local: 'The lookup is local: it searches only the receipts stored on this device.',
    label: 'Receipt identifier',
    search: 'Search',
    confirmed: 'Receipt confirmed',
    simulated: 'Simulated receipt',
    stillPrivate: 'Your choice remains private.',
    confirmedOn: (network: string) => `The record is confirmed on ${network}.`,
    simulatedNote: 'This local record is not a transaction or a real vote proof.',
    missing: 'We could not find that receipt',
    missingBody: 'Check the identifier or wait for confirmation.',
    explorer: 'Open in explorer',
  },
} as const;

export interface ReceiptVerifierProps {
  readonly receipts: readonly VoteReceipt[];
  readonly locale: CicoLocale;
}

export function ReceiptVerifier({ receipts, locale }: ReceiptVerifierProps) {
  const copy = COPY[locale];
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'found' | 'missing' | null>(null);
  const matched = receipts.find((receipt) => receipt.id === query.trim());

  return (
    <section className="profile__section" aria-labelledby="verify-receipt-title">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <h2 className="profile__section-title" id="verify-receipt-title">
        {copy.title}
      </h2>
      <p className="profile__hint">{copy.local}</p>
      <form
        className="verify"
        onSubmit={(event) => {
          event.preventDefault();
          setResult(matched ? 'found' : 'missing');
        }}
      >
        <label className="profile__field-label" htmlFor="receipt-id">
          {copy.label}
        </label>
        <div className="verify__control">
          <MagnifyingGlass className="verify__icon" size={18} aria-hidden="true" />
          <input
            id="receipt-id"
            className="verify__input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResult(null);
            }}
            placeholder="tx-..."
          />
        </div>
        <Button type="submit" size="sm" disabled={!query.trim()}>
          {copy.search}
        </Button>
      </form>

      {result === 'found' && matched ? (
        <Callout
          tone={matched.status === 'confirmed' ? 'positive' : 'neutral'}
          role="status"
          title={matched.status === 'confirmed' ? copy.confirmed : copy.simulated}
        >
          {copy.stillPrivate}{' '}
          {matched.status === 'confirmed' ? copy.confirmedOn(matched.network) : copy.simulatedNote}
          <span className="verify__actions">
            <code className="profile__code">{matched.id}</code>
            <CopyReceiptButton receiptId={matched.id} locale={locale} />
            {matched.explorerUrl ? (
              <a
                className="profile__link"
                href={matched.explorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                {copy.explorer}
              </a>
            ) : null}
          </span>
        </Callout>
      ) : null}

      {result === 'missing' ? (
        <Callout tone="warning" role="status" title={copy.missing}>
          {copy.missingBody}
        </Callout>
      ) : null}
    </section>
  );
}
