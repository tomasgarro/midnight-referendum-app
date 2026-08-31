import {
  ArrowRight,
  GlobeHemisphereWest,
  List,
  MapPin,
  MapTrifold,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Button, Card, Display, EmptyState, Eyebrow } from '@/components/system';
import { CountryFlag } from '@/components/system/CountryFlag';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { CicoLocale } from '@/integration/locale';
import { getPollAvailability } from '@/integration/poll-lifecycle';
import type { DiscoveryScope } from '@/integration/product-boundaries';
import {
  isCountryPoll,
  isCountryPollForCountry,
  localizePoll,
  type Poll,
} from '@/views/poll-model';
import { ResultsPanel } from '@/views/ResultsPanel';
import './votes-view.css';

const COPY = {
  es: {
    eyebrow: 'Descubrir',
    title: 'Decisiones que podés explorar',
    lead: 'Explorar un país no declara tu nacionalidad. La elegibilidad se verifica solo cuando querés participar.',
    world: 'Global',
    france: 'Francia',
    argentina: 'Argentina',
    map: 'Mapa',
    list: 'Lista',
    scopeLabel: 'Alcance de las consultas',
    viewLabel: 'Vista de descubrimiento',
    globalScope: 'Consultas globales',
    countryScope: 'Consultas en',
    browsing: 'Estás explorando',
    notEligibility: 'Esto no acredita elegibilidad.',
    open: 'Abierta',
    closed: 'Cerrada',
    closes: 'Cierra',
    read: 'Ver consulta',
    vote: 'Participar',
    addEligibility: 'Añadir elegibilidad',
    simulated: 'Experiencia pública simulada',
    fromContract: 'Estado público leído desde Midnight',
    empty: 'No hay consultas publicadas en este alcance todavía.',
    verifiedFor: 'Elegibilidad lista para',
  },
  en: {
    eyebrow: 'Discover',
    title: 'Decisions you can explore',
    lead: 'Browsing a country does not declare your nationality. Eligibility is checked only when you choose to participate.',
    world: 'Global',
    france: 'France',
    argentina: 'Argentina',
    map: 'Map',
    list: 'List',
    scopeLabel: 'Consultation scope',
    viewLabel: 'Discovery view',
    globalScope: 'Global consultations',
    countryScope: 'Consultations in',
    browsing: 'You are exploring',
    notEligibility: 'This does not prove eligibility.',
    open: 'Open',
    closed: 'Closed',
    closes: 'Closes',
    read: 'View consultation',
    vote: 'Participate',
    addEligibility: 'Add eligibility',
    simulated: 'Simulated public experience',
    fromContract: 'Public state read from Midnight',
    empty: 'No consultations are published in this scope yet.',
    verifiedFor: 'Eligibility ready for',
  },
} as const;

export interface VotesViewProps {
  readonly polls: readonly Poll[];
  readonly credential: DemoCredentialSummary | null;
  readonly publicContractAddress: string | null;
  readonly onStartVote: (pollId: string) => void;
  readonly onOpenPolicy: (pollId: string) => void;
  readonly onOpenPassportJourney: () => void;
  readonly locale: CicoLocale;
}

const SCOPES: ReadonlyArray<{ scope: DiscoveryScope; label: 'world' | 'france' | 'argentina' }> = [
  { scope: { kind: 'world' }, label: 'world' },
  { scope: { kind: 'country', code: 'FR' }, label: 'france' },
  { scope: { kind: 'country', code: 'AR' }, label: 'argentina' },
];

function sameScope(left: DiscoveryScope, right: DiscoveryScope): boolean {
  return (
    left.kind === right.kind &&
    (left.kind === 'world' || (right.kind === 'country' && left.code === right.code))
  );
}

export function VotesView({
  polls,
  credential,
  publicContractAddress,
  onStartVote,
  onOpenPolicy,
  onOpenPassportJourney,
  locale,
}: VotesViewProps) {
  const copy = COPY[locale];
  const [scope, setScope] = useState<DiscoveryScope>({ kind: 'world' });
  const [view, setView] = useState<'map' | 'list'>('map');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const visiblePolls =
    scope.kind === 'world'
      ? polls.filter((poll) => !isCountryPoll(poll))
      : polls.filter((poll) => isCountryPollForCountry(poll, scope.code));
  const countryLabel =
    scope.kind === 'country' ? (scope.code === 'FR' ? copy.france : copy.argentina) : copy.world;
  const eligibleForScope = Boolean(
    credential && (scope.kind === 'world' || credential.country === scope.code),
  );

  return (
    <main className="votes">
      <header className="votes__head">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Display>{copy.title}</Display>
        <p className="votes__lead">{copy.lead}</p>
      </header>

      <div className="votes__scope" role="tablist" aria-label={copy.scopeLabel}>
        {SCOPES.map((item) => {
          const active = sameScope(scope, item.scope);
          return (
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? 'active' : ''}
              key={item.label}
              onClick={() => setScope(item.scope)}
            >
              {item.scope.kind === 'world' ? (
                <GlobeHemisphereWest size={17} />
              ) : (
                <CountryFlag alpha2={item.scope.code} size="sm" />
              )}
              {copy[item.label]}
            </button>
          );
        })}
      </div>

      <div className="votes__view-switch" role="tablist" aria-label={copy.viewLabel}>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'map'}
          className={view === 'map' ? 'active' : ''}
          onClick={() => setView('map')}
        >
          <MapTrifold size={17} /> {copy.map}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={view === 'list' ? 'active' : ''}
          onClick={() => setView('list')}
        >
          <List size={17} /> {copy.list}
        </button>
      </div>

      {view === 'map' ? (
        <section className="discover-map" aria-label={`${copy.browsing} ${countryLabel}`}>
          <div className="discover-map__grid" aria-hidden="true" />
          <button
            type="button"
            className="discover-map__pin discover-map__pin--fr"
            data-active={scope.kind === 'country' && scope.code === 'FR'}
            onClick={() => setScope({ kind: 'country', code: 'FR' })}
          >
            <span />
            FR
          </button>
          <button
            type="button"
            className="discover-map__pin discover-map__pin--ar"
            data-active={scope.kind === 'country' && scope.code === 'AR'}
            onClick={() => setScope({ kind: 'country', code: 'AR' })}
          >
            <span />
            AR
          </button>
          <div className="discover-map__caption">
            <MapPin size={17} />
            <span>
              <strong>{countryLabel}</strong>
              <small>{copy.notEligibility}</small>
            </span>
          </div>
        </section>
      ) : null}

      <section className="votes__results" aria-labelledby="discover-results-title">
        <div className="votes__results-head">
          <div>
            <p className="sys-eyebrow">
              {scope.kind === 'world' ? copy.globalScope : copy.countryScope}
            </p>
            <h2 id="discover-results-title">{countryLabel}</h2>
          </div>
          {eligibleForScope ? (
            <span className="votes__eligible">
              <ShieldCheck size={15} weight="fill" /> {copy.verifiedFor} {countryLabel}
            </span>
          ) : null}
        </div>

        {visiblePolls.length ? (
          <ul className="votes__list">
            {visiblePolls.map((poll) => {
              const displayPoll = localizePoll(poll, locale);
              const isOpen = getPollAvailability(poll, now).isOpen;
              return (
                <li key={poll.id}>
                  <Card className="poll">
                    <div className="poll__meta">
                      <span className={`poll__status ${isOpen ? 'poll__status--open' : ''}`.trim()}>
                        {isOpen ? copy.open : copy.closed}
                      </span>
                      <span>
                        {copy.closes} {poll.deadline}
                      </span>
                    </div>
                    <h3 className="poll__title">{displayPoll.title}</h3>
                    <p className="poll__body">{displayPoll.description}</p>
                    <p className="poll__note">
                      {poll.runtimeContractAddress ? copy.fromContract : copy.simulated}
                    </p>
                    <div className="poll__actions">
                      {isOpen ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            eligibleForScope ? onStartVote(poll.id) : onOpenPassportJourney()
                          }
                        >
                          {eligibleForScope ? copy.vote : copy.addEligibility}{' '}
                          <ArrowRight size={16} />
                        </Button>
                      ) : null}
                      <Button variant="link" size="sm" onClick={() => onOpenPolicy(poll.id)}>
                        {copy.read}
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState message={copy.empty} />
        )}
      </section>

      {scope.kind === 'world' ? (
        <ResultsPanel contractAddress={publicContractAddress} locale={locale} />
      ) : null}
    </main>
  );
}
