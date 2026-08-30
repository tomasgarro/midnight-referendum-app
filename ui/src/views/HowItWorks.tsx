import { Callout } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import './how-it-works.css';

/**
 * The whole product, in three lines.
 *
 * Replaces a four-question FAQ accordion. The pattern is freedomtool.org's
 * numbered explainer -- a short ordered list where every line is one fact the
 * reader can act on -- rather than questions the reader has to open one at a
 * time to find out whether they contained an answer they needed.
 *
 * The numbering is a real sequence (prove, cast, count), not decoration. If
 * these ever stop being ordered steps, the numbers should go.
 *
 * Each line is a compression of an answer the FAQ used to give, so nothing
 * true was dropped: eligibility without identity, sealed votes with published
 * totals, and one-time marks that prevent double voting without revealing
 * whose they are.
 */
const COPY = {
  es: {
    eyebrow: 'Cómo funciona',
    title: 'Tu identidad y tu voto viajan separados',
    steps: [
      'Probás que podés votar, sin decir quién sos.',
      'Tu voto viaja sellado. Al cerrar se publican solo los totales.',
      'Una marca única impide votar dos veces, sin revelar de quién es.',
    ],
    disclosure:
      'Este es un prototipo independiente. No es un canal oficial de votación ni tiene efecto vinculante.',
  },
  en: {
    eyebrow: 'How it works',
    title: 'Your identity and your vote travel separately',
    steps: [
      'You prove you can vote, without saying who you are.',
      'Your vote travels sealed. Only the totals are published at close.',
      'A one-time mark stops double voting, without revealing whose it is.',
    ],
    disclosure:
      'This is an independent prototype. It is not an official voting channel and carries no binding effect.',
  },
} as const;

export interface HowItWorksProps {
  readonly locale: CicoLocale;
}

export function HowItWorks({ locale }: HowItWorksProps) {
  const copy = COPY[locale];

  return (
    <section className="howto" aria-labelledby="howto-title">
      <p className="sys-eyebrow">{copy.eyebrow}</p>
      <h2 className="howto__title" id="howto-title">
        {copy.title}
      </h2>
      <ol className="howto__steps">
        {copy.steps.map((step, index) => (
          <li className="howto__step" key={step}>
            <span className="howto__num" aria-hidden="true">
              {index + 1}
            </span>
            <span className="howto__text">{step}</span>
          </li>
        ))}
      </ol>
      <Callout>{copy.disclosure}</Callout>
    </section>
  );
}
