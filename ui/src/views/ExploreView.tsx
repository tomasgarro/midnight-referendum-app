import { ArrowRight } from '@phosphor-icons/react';
import { Card, Display, Eyebrow } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
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
    read: 'Consulta, fuentes y consecuencias posibles',
    resultsEyebrow: 'Resultados públicos',
    resultsTitle: 'Lo que cualquiera puede leer, sin iniciar sesión',
    transparency: 'Transparencia',
    visibilityTitle: 'Qué se ve y qué no',
    public: 'Queda público',
    private: 'Nunca sale de tu teléfono',
    glossary: 'En criollo',
    mascotAlt: 'Ilustración de un gaucho saludando',
  },
  en: {
    welcome: 'Welcome',
    title: 'Decide together, with clear information.',
    lead: 'Read the proposal, read the public totals. No sign-in needed.',
    library: 'Library',
    read: 'Consultation, sources, and possible consequences',
    resultsEyebrow: 'Public results',
    resultsTitle: 'What anyone can read, without signing in',
    transparency: 'Transparency',
    visibilityTitle: 'What is visible and what is not',
    public: 'Public',
    private: 'Never leaves your device',
    glossary: 'In plain terms',
    mascotAlt: 'Illustration of a gaucho waving',
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
  const runtimePolls = polls.filter((poll) => poll.runtimeContractAddress);

  return (
    <main className="explore">
      <header className="explore__hero">
        <Eyebrow>{copy.welcome}</Eyebrow>
        {/* The headline gets the full measure. Sharing the row with the mascot
            broke a six-word headline over five lines at 320px. */}
        <Display>{copy.title}</Display>
        <div className="explore__hero-foot">
          <p className="explore__lead">{copy.lead}</p>
          <img className="explore__mascot" src="/assets/gaucho-waving.png" alt={copy.mascotAlt} />
        </div>
      </header>

      <section className="explore__section" aria-labelledby="library-title">
        <Eyebrow>{copy.library}</Eyebrow>
        <h2 className="sr-only" id="library-title">
          {copy.library}
        </h2>
        <ul className="explore__library">
          {polls.map((poll) => (
            <li key={poll.id}>
              <button type="button" onClick={() => onOpenPolicy(poll.id)}>
                <span>
                  <strong>{localizePoll(poll, locale).title}</strong>
                  <small>{copy.read}</small>
                </span>
                <ArrowRight size={18} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="explore__section" aria-labelledby="public-results-title">
        <Eyebrow>{copy.resultsEyebrow}</Eyebrow>
        <h2 className="explore__section-title" id="public-results-title">
          {copy.resultsTitle}
        </h2>
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
        <Eyebrow>{copy.transparency}</Eyebrow>
        <h2 className="explore__section-title" id="visibility-title">
          {copy.visibilityTitle}
        </h2>
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

      <section className="explore__section" aria-labelledby="glossary-title">
        <Eyebrow>{copy.glossary}</Eyebrow>
        <h2 className="sr-only" id="glossary-title">
          {copy.glossary}
        </h2>
        <dl className="explore__glossary">
          {GLOSSARY[locale].map(({ term, meaning }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

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
