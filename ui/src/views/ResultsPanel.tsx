import { Callout, Card, Eyebrow } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { usePublicReferendumState } from '@/views/use-public-referendum-state';
import './results-panel.css';

/**
 * The public tally, read live from the contract.
 *
 * Two things changed from the panel this replaces.
 *
 * The three bars were three hues -- green Yes, red No, grey Abstain. That is
 * one accent per option in an app whose stated rule is one accent, and it also
 * editorialised: a green Yes and a red No tell the reader which answer is the
 * good one, on a consultation where the project has no position. Every bar is
 * now the accent, and the label and the number carry the difference.
 *
 * The COMMIT phase used to render a full results heading with an empty body,
 * which reads as results that failed to load. It is now stated as what it is:
 * a count of eligible people and a sentence saying totals do not exist yet.
 */

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

const CHOICE_LABEL = {
  es: { YES: 'Sí', NO: 'No', ABSTAIN: 'Abstención' },
  en: { YES: 'Yes', NO: 'No', ABSTAIN: 'Abstain' },
} as const;

export interface ResultsPanelProps {
  readonly contractAddress: string | null;
  readonly title?: string;
  readonly locale: CicoLocale;
}

function titleId(contractAddress: string | null, title?: string): string {
  return title
    ? `results-title-${contractAddress?.replace(/[^a-z0-9_-]/giu, '-') ?? 'runtime'}`
    : 'results-title';
}

export function ResultsPanel({ contractAddress, title, locale }: ResultsPanelProps) {
  const { state, error } = usePublicReferendumState(contractAddress);
  const headingId = titleId(contractAddress, title);
  const copy = PHASE_COPY[locale];

  /* An unreadable contract is a warning, not a result. It never renders as a
     zero, for the same reason WaitState renders a dash: a 0% bar claims we
     observed no votes when in fact we observed nothing. */
  if (error) {
    return (
      <Callout
        tone="warning"
        role="status"
        title={locale === 'es' ? 'Sin lectura del contrato' : 'Contract unreadable'}
      >
        {error}
      </Callout>
    );
  }

  /* Before the state arrives, and while voting is open, the honest screen is
     the same one: there is nothing to count. */
  if (!state || state.phase === 'COMMIT') {
    const eligible = state?.issuedVotes ?? null;
    return (
      <Card className="results" aria-labelledby={headingId}>
        <Eyebrow>{copy.COMMIT.label}</Eyebrow>
        <h2 className="results__title" id={headingId}>
          {title ?? (locale === 'es' ? 'Resultados públicos' : 'Public results')}
        </h2>
        <p className="results__note">{copy.COMMIT.note}</p>
        {eligible === null ? null : (
          <p className="results__eligible">
            <strong>{eligible.toString()}</strong>{' '}
            {locale === 'es'
              ? eligible === 1n
                ? 'persona habilitada'
                : 'personas habilitadas'
              : eligible === 1n
                ? 'eligible person'
                : 'eligible people'}
          </p>
        )}
      </Card>
    );
  }

  const phase = copy[state.phase];
  const votes = (['YES', 'NO', 'ABSTAIN'] as const).map((key) => ({
    key,
    label: CHOICE_LABEL[locale][key],
    count: state.tally.get(key) ?? 0n,
  }));
  const total = votes.reduce((sum, vote) => sum + vote.count, 0n);

  return (
    <Card className="results" aria-labelledby={headingId}>
      <Eyebrow>{phase.label}</Eyebrow>
      <h2 className="results__title" id={headingId}>
        {title ?? (locale === 'es' ? 'Resultados públicos' : 'Public results')}
      </h2>
      <p className="results__note">{phase.note}</p>
      <div className="results__tally">
        {votes.map(({ key, label, count }) => {
          const pct = total === 0n ? 0 : Number((count * 1000n) / total) / 10;
          return (
            <div className="results__row" key={key} data-choice={key}>
              <div className="results__head">
                <span className="results__label">{label}</span>
                <span className="results__figure">
                  {count.toString()} · {pct.toFixed(1)}%
                </span>
              </div>
              <div
                className="results__track"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(pct.toFixed(1))}
              >
                <div className="results__fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="results__total">
        {locale === 'es'
          ? `${total.toString()} de ${state.issuedVotes.toString()} habilitadas · leído del contrato`
          : `${total.toString()} of ${state.issuedVotes.toString()} eligible · read from contract`}
      </p>
    </Card>
  );
}
