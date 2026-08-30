import { useEffect, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  CounterRow,
  Display,
  EmptyState,
  Eyebrow,
  StatGroup,
  StatRow,
} from '@/components/system';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { ConsultationArea } from '@/integration/civic-state';
import { countryName as getCountryName } from '@/integration/country-catalog';
import type { CicoLocale } from '@/integration/locale';
import { countOpenPolls, getPollAvailability } from '@/integration/poll-lifecycle';
import {
  DASHBOARD_COUNTRIES,
  isCountryPoll,
  isCountryPollForCountry,
  localizePoll,
  type Poll,
} from '@/views/poll-model';
import { ResultsPanel } from '@/views/ResultsPanel';
import './votes-view.css';

/**
 * The civic dashboard: what you can vote on, and whether you can yet.
 *
 * Four things this screen used to do that it no longer does.
 *
 * The credential was a card with an icon, a bold line, a run-on subtitle and a
 * SINTÉTICA / VERIFICADA badge -- four visual devices for four facts. It is now
 * a labelled StatGroup, which is the same four facts read in a glance. The
 * badge is gone: whether the credential is synthetic is a *value*, not a
 * flag to shout, and it now sits in the row that says so.
 *
 * The World tab carried a whole "dashboard-intro-card" of prose explaining
 * that a wallet appears only for a real action. That is true, and it is
 * already said in the three-line explainer on Explore. Saying it twice made
 * neither instance load-bearing.
 *
 * The open count was a status pill sized like a metric. It is a CounterRow:
 * context for the list, not the point of the screen.
 *
 * The locked-country state was a card built like a poll card, so a scope you
 * cannot enter looked like something you could act on. It is a warning
 * Callout, which is what it is.
 */

const COPY = {
  es: {
    eyebrow: 'Tu panel cívico',
    title: 'Consultas para vos',
    available: 'disponibles',
    credential: 'Tu credencial',
    status: 'Estado',
    ready: 'Credencial lista',
    country: 'País',
    age: 'Edad',
    use: 'Uso',
    useValue: 'solo para elegibilidad',
    kindSynthetic: 'sintética',
    kindVerified: 'verificada',
    kind: 'Origen',
    prepareTitle: 'Primero, tu credencial',
    prepareBody: 'Probás que podés votar sin decir quién sos. No hace falta wallet.',
    prepare: 'Preparar mi credencial',
    scope: 'Espacio de participación',
    world: 'Mundo',
    countries: 'Países',
    chooseCountry: 'Elegí un país',
    searchCountry: 'Buscar por nombre o código',
    searchCountryLabel: 'Buscar un país',
    lockedBody:
      'Tu credencial no prueba elegibilidad para este espacio. Elegirlo en el selector no lo habilita.',
    lockedHelp: 'Completá el recorrido Passport para desbloquear tu espacio.',
    empty: 'No hay consultas disponibles en este espacio',
    open: 'Votación abierta',
    closed: 'Votación cerrada',
    closes: 'Cierra el',
    read: 'Leer propuesta',
    vote: 'Votá ahora',
    simulated: 'Cifra simulada para este prototipo.',
    fromContract: 'Estado público leído del contrato.',
  },
  en: {
    eyebrow: 'Your civic dashboard',
    title: 'Consultations for you',
    available: 'available',
    credential: 'Your credential',
    status: 'Status',
    ready: 'Credential ready',
    country: 'Country',
    age: 'Age',
    use: 'Use',
    useValue: 'eligibility only',
    kindSynthetic: 'synthetic',
    kindVerified: 'verified',
    kind: 'Origin',
    prepareTitle: 'Your credential first',
    prepareBody: 'You prove you can vote without saying who you are. No wallet needed.',
    prepare: 'Prepare my credential',
    scope: 'Participation scope',
    world: 'World',
    countries: 'Countries',
    chooseCountry: 'Choose a country',
    searchCountry: 'Search by name or code',
    searchCountryLabel: 'Search for a country',
    lockedBody:
      'Your credential does not prove eligibility for this scope. Selecting it does not unlock it.',
    lockedHelp: 'Complete the Passport journey to unlock your scope.',
    empty: 'No consultations are available in this scope',
    open: 'Voting open',
    closed: 'Voting closed',
    closes: 'Closes',
    read: 'Read proposal',
    vote: 'Vote now',
    simulated: 'Simulated figure for this prototype.',
    fromContract: 'Public state read from the contract.',
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
  const [area, setArea] = useState<ConsultationArea>('world');
  const [selectedCountry, setSelectedCountry] = useState(credential?.country ?? 'AR');
  const [countrySearch, setCountrySearch] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (credential?.country) setSelectedCountry(credential.country);
  }, [credential?.country]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedCountryName = getCountryName(selectedCountry, locale);
  const filteredCountries = countrySearch.trim()
    ? DASHBOARD_COUNTRIES.filter((country) =>
        `${getCountryName(country.code, locale)} ${country.code} ${country.numeric}`
          .toLocaleLowerCase()
          .includes(countrySearch.trim().toLocaleLowerCase()),
      )
    : DASHBOARD_COUNTRIES;

  const locked = area === 'countries' && selectedCountry !== credential?.country;
  const visiblePolls =
    area === 'world'
      ? polls.filter((poll) => !isCountryPoll(poll))
      : locked
        ? []
        : polls.filter((poll) => isCountryPollForCountry(poll, selectedCountry));
  const openPollCount = countOpenPolls(visiblePolls, now);

  return (
    <main className="votes">
      <header className="votes__head">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Display>{copy.title}</Display>
        <CounterRow
          counters={[
            { id: 'open', label: copy.available, count: openPollCount, live: openPollCount > 0 },
          ]}
        />
      </header>

      {credential ? (
        <Card>
          <StatGroup label={copy.credential}>
            <StatRow label={copy.status} value={copy.ready} />
            <StatRow
              label={copy.country}
              value={`${getCountryName(credential.country, locale)} (${credential.country})`}
            />
            <StatRow label={copy.age} value={credential.ageClass} />
            <StatRow
              label={copy.kind}
              value={
                credential.kind === 'synthetic-demo-credential'
                  ? copy.kindSynthetic
                  : copy.kindVerified
              }
            />
            <StatRow label={copy.use} value={copy.useValue} />
          </StatGroup>
        </Card>
      ) : (
        <Card className="votes__prepare">
          <h2 className="votes__prepare-title">{copy.prepareTitle}</h2>
          <p className="votes__prepare-body">{copy.prepareBody}</p>
          <Button block onClick={onOpenPassportJourney}>
            {copy.prepare}
          </Button>
        </Card>
      )}

      <div className="votes__tabs" role="tablist" aria-label={copy.scope}>
        <button
          type="button"
          role="tab"
          aria-selected={area === 'world'}
          className={`votes__tab ${area === 'world' ? 'votes__tab--active' : ''}`.trim()}
          onClick={() => setArea('world')}
        >
          {copy.world}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={area === 'countries'}
          className={`votes__tab ${area === 'countries' ? 'votes__tab--active' : ''}`.trim()}
          onClick={() => setArea('countries')}
        >
          {copy.countries}
        </button>
      </div>

      {area === 'countries' ? (
        <Card className="votes__country">
          <label className="votes__field-label" htmlFor="country-search">
            {copy.chooseCountry}
          </label>
          <input
            id="country-search"
            className="votes__input"
            type="search"
            value={countrySearch}
            onChange={(event) => setCountrySearch(event.target.value)}
            placeholder={copy.searchCountry}
            aria-label={copy.searchCountryLabel}
          />
          <label className="sr-only" htmlFor="country-selector">
            {copy.country}
          </label>
          <select
            id="country-selector"
            className="votes__input"
            value={selectedCountry}
            onChange={(event) => setSelectedCountry(event.target.value)}
          >
            {filteredCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {getCountryName(country.code, locale)}
              </option>
            ))}
          </select>
        </Card>
      ) : null}

      {locked ? (
        <Callout
          tone="warning"
          role="status"
          title={
            locale === 'es'
              ? `${selectedCountryName} todavía está bloqueado`
              : `${selectedCountryName} is still locked`
          }
        >
          {credential ? copy.lockedBody : copy.lockedHelp}
        </Callout>
      ) : visiblePolls.length ? (
        <ul className="votes__list">
          {visiblePolls.map((poll) => {
            const displayPoll = localizePoll(poll, locale);
            const isOpen = getPollAvailability(poll, now).isOpen;
            return (
              <li key={poll.id}>
                <Card className="poll">
                  <div className="poll__meta">
                    <span
                      className={`poll__status ${isOpen ? 'poll__status--open' : ''}`.trim()}
                      data-open={isOpen}
                    >
                      {isOpen ? copy.open : copy.closed}
                    </span>
                    <span className="poll__closes">
                      {copy.closes} {poll.deadline}
                    </span>
                  </div>
                  <h2 className="poll__title">{displayPoll.title}</h2>
                  <p className="poll__body">{displayPoll.description}</p>
                  <div className="poll__actions">
                    <Button
                      size="sm"
                      disabled={!isOpen}
                      onClick={() => (credential ? onStartVote(poll.id) : onOpenPassportJourney())}
                    >
                      {isOpen ? (credential ? copy.vote : copy.prepare) : copy.closed}
                    </Button>
                    <Button variant="link" size="sm" onClick={() => onOpenPolicy(poll.id)}>
                      {copy.read}
                    </Button>
                  </div>
                  <p className="poll__note">
                    {poll.runtimeContractAddress
                      ? copy.fromContract
                      : `${poll.participation}. ${copy.simulated}`}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState message={copy.empty} />
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
