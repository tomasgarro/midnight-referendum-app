import { ArrowRight, BookOpen, ChartBar, Eye } from '@phosphor-icons/react';
import { useState } from 'react';
import { CapybaraMascot } from '@/components/mascot';
import { Card, Display, EmptyState, Eyebrow } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { getPollAvailability } from '@/integration/poll-lifecycle';
import { HowItWorks } from '@/views/HowItWorks';
import { localizePoll, type Poll } from '@/views/poll-model';
import { ResultsPanel } from '@/views/ResultsPanel';
import './explore-view.css';

/**
 * The public surface: read the dossiers, read the totals, no sign-in.
 *
 * Explore used to explain the product six times. "Tres pasos, una sola vez",
 * "Tres piezas que nunca se cruzan", "Qué se ve y qué no", "De tu voto al
 * resultado", the three-line HowItWorks explainer, and a glossary all said
 * some version of: you prove eligibility, your vote is sealed, totals are
 * published. Three of them were the same three facts in three layouts.
 *
 * HowItWorks is the approved statement of those facts, so the numbered
 * how-list, the separation grid and the timeline are deleted rather than
 * restyled. What survives beside it is the material HowItWorks does not
 * carry: the specific public/private inventory, and the glossary.
 *
 * The order changed too. The library sat under the fold behind two explainer
 * sections; on a screen whose job is "read before you vote", the thing to read
 * now comes first, and the explanation sits under it.
 */

const COPY = {
  es: {
    welcome: 'Bienvenido/a',
    title: 'Decidir en comunidad, con información clara.',
    lead: 'Leé la propuesta, mirá los totales públicos. No hace falta iniciar sesión.',
    library: 'Biblioteca',
    libraryTitle: 'Las consultas, en detalle',
    open: 'Abierta',
    closed: 'Cerrada',
    closes: 'cierra el',
    closed_on: 'cerró el',
    filterAll: 'Todas',
    filterOpen: 'Abiertas',
    filterClosed: 'Cerradas',
    filterLabel: 'Filtrar consultas',
    emptyFilter: 'No hay consultas en este filtro.',
    countOne: 'consulta',
    countMany: 'consultas',
    resultsEyebrow: 'Resultados públicos',
    resultsTitle: 'Lo que cualquiera puede leer, sin iniciar sesión',
    transparency: 'Transparencia',
    visibilityTitle: 'Qué se ve y qué no',
    public: 'Queda público',
    private: 'Nunca sale de tu teléfono',
    glossary: 'En criollo',
    mascotAlt: 'Carpincho leyendo un documento',
  },
  en: {
    welcome: 'Welcome',
    title: 'Decide together, with clear information.',
    lead: 'Read the proposal, read the public totals. No sign-in needed.',
    library: 'Library',
    libraryTitle: 'The consultations, in full',
    open: 'Open',
    closed: 'Closed',
    closes: 'closes',
    closed_on: 'closed',
    filterAll: 'All',
    filterOpen: 'Open',
    filterClosed: 'Closed',
    filterLabel: 'Filter consultations',
    emptyFilter: 'No consultations match this filter.',
    countOne: 'consultation',
    countMany: 'consultations',
    resultsEyebrow: 'Public results',
    resultsTitle: 'What anyone can read, without signing in',
    transparency: 'Transparency',
    visibilityTitle: 'What is visible and what is not',
    public: 'Public',
    private: 'Never leaves your device',
    glossary: 'In plain terms',
    mascotAlt: 'Capybara reading a document',
  },
} as const;

const PUBLIC_DATA = {
  es: [
    'Que se emitió un voto válido.',
    'Una marca única que impide votar dos veces.',
    'Los totales de Sí, No y Abstención al cerrar.',
  ],
  en: [
    'A valid vote was issued.',
    'A unique marker prevents a second vote.',
    'Yes, No, and Abstain totals after closing.',
  ],
} as const;

const PRIVATE_DATA = {
  es: [
    'Tu nombre, tus datos de identidad y la evidencia cruda.',
    'Qué votaste, mientras la votación sigue abierta.',
    'La relación entre tu identidad y tu voto, siempre.',
  ],
  en: [
    'Your name, identity data, and raw evidence.',
    'Your choice while voting is open.',
    'The relationship between your identity and your vote, always.',
  ],
} as const;

const GLOSSARY = {
  es: [
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
  ],
  en: [
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
  ],
} as const;

/**
 * A section header: a small accent icon, the section's eyebrow, and its title.
 *
 * Every section here used to open with a bare Eyebrow and, sometimes, an
 * unstyled h2 -- so three sections that do quite different jobs (a list you
 * act on, live numbers, a static explanation) all announced themselves the
 * same way. The icon is the cheapest way to make them distinguishable while
 * scrolling, and it borrows the leading-badge idiom the reference apps use for
 * exactly this.
 */
function SectionHead({
  icon,
  eyebrow,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="explore__head">
      <span className="explore__head-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="sys-eyebrow">{eyebrow}</p>
        <h2 className="explore__section-title">{children}</h2>
      </div>
    </div>
  );
}

export interface ExploreViewProps {
  readonly polls: readonly Poll[];
  readonly publicContractAddress: string | null;
  readonly onOpenPolicy: (pollId: string) => void;
  readonly locale: CicoLocale;
}

export function ExploreView({
  polls,
  publicContractAddress,
  onOpenPolicy,
  locale,
}: ExploreViewProps) {
  const copy = COPY[locale];
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const runtimePolls = polls.filter((poll) => poll.runtimeContractAddress);
  const openPolls = polls.filter((poll) => getPollAvailability(poll).isOpen);
  const counts = {
    all: polls.length,
    open: openPolls.length,
    closed: polls.length - openPolls.length,
  };
  const visible =
    filter === 'all'
      ? polls
      : polls.filter((poll) => getPollAvailability(poll).isOpen === (filter === 'open'));

  return (
    <main className="explore">
      <header className="explore__hero">
        <Eyebrow>{copy.welcome}</Eyebrow>
        {/* The headline gets the full measure. Sharing the row with the mascot
            broke a six-word headline over five lines at 320px. */}
        <Display>{copy.title}</Display>
        <div className="explore__hero-foot">
          <p className="explore__lead">{copy.lead}</p>
          {/* The gaucho PNG was the only place in the product still using a
              second mascot; every other surface is the capybara. */}
          <CapybaraMascot variant="reading" alt={copy.mascotAlt} size={96} />
        </div>
      </header>

      <section className="explore__section" aria-labelledby="library-title">
        <SectionHead icon={<BookOpen size={16} weight="bold" />} eyebrow={copy.library}>
          {copy.libraryTitle}
        </SectionHead>
        {/* A filter row, because the library is the one part of this screen
            that grows. Four rows need no filter; forty do, and the chips are
            how a reader gets to "what can I still vote on" without reading
            every deadline. */}
        <div className="explore__filters" role="tablist" aria-label={copy.filterLabel}>
          {(
            [
              ['all', copy.filterAll],
              ['open', copy.filterOpen],
              ['closed', copy.filterClosed],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={filter === id}
              className={`explore__chip ${filter === id ? 'explore__chip--on' : ''}`.trim()}
              onClick={() => setFilter(id)}
            >
              {label}
              <span className="explore__chip-count">{counts[id]}</span>
            </button>
          ))}
        </div>
        {visible.length ? (
          <ul className="explore__library">
            {/* Every row used to carry the identical subtitle "Consulta,
                fuentes y consecuencias posibles". Four rows, one sentence,
                repeated: it distinguished nothing and pushed the titles apart.
                The subtitle now says the thing that differs between rows, and
                a status dot makes open-vs-closed readable without reading. */}
            {visible.map((poll) => {
              const isOpen = getPollAvailability(poll).isOpen;
              const display = localizePoll(poll, locale);
              return (
                <li key={poll.id}>
                  <button type="button" onClick={() => onOpenPolicy(poll.id)}>
                    <span className="explore__row-copy">
                      <span className="explore__row-status">
                        <i className="explore__dot" data-open={isOpen} aria-hidden="true" />
                        {isOpen ? copy.open : copy.closed} · {isOpen ? copy.closes : copy.closed_on}{' '}
                        {poll.deadline}
                      </span>
                      <strong>{display.title}</strong>
                      <small>{display.description}</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message={copy.emptyFilter} />
        )}
      </section>

      <section className="explore__section" aria-labelledby="public-results-title">
        <SectionHead icon={<ChartBar size={16} weight="bold" />} eyebrow={copy.resultsEyebrow}>
          <span id="public-results-title">{copy.resultsTitle}</span>
        </SectionHead>
        {runtimePolls.length ? (
          runtimePolls.map((poll) => (
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

      <HowItWorks locale={locale} />

      <section className="explore__section" aria-labelledby="visibility-title">
        <SectionHead icon={<Eye size={16} weight="bold" />} eyebrow={copy.transparency}>
          <span id="visibility-title">{copy.visibilityTitle}</span>
        </SectionHead>
        {/* Two inventories in the same ink. They were a green column and a red
            column, which made "private" read as the bad outcome. */}
        <Card className="explore__visibility">
          <div>
            <p className="explore__visibility-label">{copy.public}</p>
            <ul className="explore__list">
              {PUBLIC_DATA[locale].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="explore__visibility-label">{copy.private}</p>
            <ul className="explore__list">
              {PRIVATE_DATA[locale].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* Third explainer on one screen, behind a tap. HowItWorks is the
          canonical three-line statement and the visibility inventory is the
          specific list; the glossary is reference material for the reader who
          wants the words, not something everyone should scroll past. */}
      <details className="explore__section journey-why">
        <summary>{copy.glossary}</summary>
        <dl className="explore__glossary">
          {GLOSSARY[locale].map(({ term, meaning }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </details>

      {/*
       * TODO(product): "Suggest a consultation" entry point.
       * Explore will later let anyone propose a new consultation for review.
       * Intentionally not built yet -- placeholder only, per the wave-2 nav
       * consolidation scope. When implemented, keep it public (no credential
       * required to submit a suggestion) and separate from the private
       * voting/eligibility path.
       */}
    </main>
  );
}
