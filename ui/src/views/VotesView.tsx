import {
  ArrowRight,
  CaretDown,
  GlobeHemisphereWest,
  MapPin,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CountryPicker,
  Display,
  EmptyState,
  Eyebrow,
  Sheet,
} from '@/components/system';
import { CountryFlag } from '@/components/system/CountryFlag';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import { countryName, findAssignedCountry } from '@/integration/country-catalog';
import type { CicoLocale } from '@/integration/locale';
import { getPollAvailability } from '@/integration/poll-lifecycle';
import type { DiscoveryScope } from '@/integration/product-boundaries';
import {
  isCountryPoll,
  isCountryPollForCountry,
  localizePoll,
  type Poll,
  pollCountryCode,
} from '@/views/poll-model';
import { ResultsPanel } from '@/views/ResultsPanel';
import './votes-view.css';

const COPY = {
  es: {
    eyebrow: 'Descubrir',
    title: 'Decisiones que podés explorar',
    lead: 'Explorar un país no declara tu nacionalidad. La elegibilidad se verifica solo cuando querés participar.',
    world: 'Global',
    scopeButton: 'Explorar por lugar',
    scopeDialogTitle: 'Elegí un lugar',
    scopeLabel: 'Alcance de las consultas',
    globalScope: 'Consultas globales',
    countryScope: 'Consultas en',
    globalDescription: 'Abiertas a personas con una credencial elegible, sin país específico.',
    availableCountries: 'Consultas disponibles',
    countrySearch: 'Buscar cualquier país',
    countryList: 'Países disponibles',
    countrySuggested: 'Países con consultas publicadas',
    countryEmpty: 'No encontramos ese país. Probá con otro nombre o su código.',
    closeScope: 'Cerrar selector de lugar',
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
    passOnFile: 'Pase registrado para',
  },
  en: {
    eyebrow: 'Discover',
    title: 'Decisions you can explore',
    lead: 'Browsing a country does not declare your nationality. Eligibility is checked only when you choose to participate.',
    world: 'Global',
    scopeButton: 'Browse by place',
    scopeDialogTitle: 'Choose a place',
    scopeLabel: 'Consultation scope',
    globalScope: 'Global consultations',
    countryScope: 'Consultations in',
    globalDescription: 'Open to people with an eligible credential, without a specific country.',
    availableCountries: 'Consultations available',
    countrySearch: 'Search any country',
    countryList: 'Available countries',
    countrySuggested: 'Countries with published consultations',
    countryEmpty: 'No country matches that search. Try another name or code.',
    closeScope: 'Close place selector',
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
    passOnFile: 'Pass on file for',
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
  const [scope, setScope] = useState<DiscoveryScope>({ kind: 'world' });
  const [scopeSheetOpen, setScopeSheetOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const availableCountryCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const poll of polls) {
      if (!isCountryPoll(poll)) continue;
      const code = pollCountryCode(poll);
      if (code && findAssignedCountry(code)) codes.add(code);
    }
    return [...codes].sort((left, right) =>
      countryName(left, locale).localeCompare(countryName(right, locale), locale),
    );
  }, [locale, polls]);

  const visiblePolls =
    scope.kind === 'world'
      ? polls.filter((poll) => !isCountryPoll(poll))
      : polls.filter((poll) => isCountryPollForCountry(poll, scope.code));
  const countryLabel = scope.kind === 'country' ? countryName(scope.code, locale) : copy.world;
  const passMatchesCountry = Boolean(
    credential &&
      scope.kind === 'country' &&
      credential.country.trim().toUpperCase() === scope.code.trim().toUpperCase(),
  );
  const eligibleForScope = Boolean(credential && (scope.kind === 'world' || passMatchesCountry));

  const chooseGlobal = () => {
    setScope({ kind: 'world' });
    setScopeSheetOpen(false);
  };
  const chooseCountry = (code: string) => {
    setScope({ kind: 'country', code: code.trim().toUpperCase() });
    setScopeSheetOpen(false);
  };

  return (
    <main className="votes">
      <header className="votes__head">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Display>{copy.title}</Display>
        <p className="votes__lead">{copy.lead}</p>
      </header>

      <button
        type="button"
        className="votes__scope-trigger"
        aria-haspopup="dialog"
        aria-expanded={scopeSheetOpen}
        onClick={() => setScopeSheetOpen(true)}
      >
        <span className="votes__scope-trigger-icon" aria-hidden="true">
          {scope.kind === 'world' ? (
            <GlobeHemisphereWest size={19} />
          ) : (
            <CountryFlag alpha2={scope.code} size="sm" />
          )}
        </span>
        <span className="votes__scope-trigger-copy">
          <small>{copy.scopeButton}</small>
          <strong>{countryLabel}</strong>
        </span>
        <CaretDown size={18} aria-hidden="true" />
      </button>

      {/* Browsing scope is a filter, not a page tab. The full catalogue stays
          searchable in the sheet while published countries lead the list. */}
      <p className="votes__scope-note">
        <MapPin size={15} aria-hidden="true" />
        <span>
          {copy.browsing} <strong>{countryLabel}</strong>. {copy.notEligibility}
        </span>
      </p>

      <section className="votes__results" aria-labelledby="discover-results-title">
        <div className="votes__results-head">
          <div>
            <p className="sys-eyebrow">
              {scope.kind === 'world' ? copy.globalScope : copy.countryScope}
            </p>
            <h2 id="discover-results-title">{countryLabel}</h2>
          </div>
          {passMatchesCountry ? (
            <span className="votes__eligible">
              <ShieldCheck size={15} weight="fill" /> {copy.passOnFile} {countryLabel}
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

      <Sheet
        open={scopeSheetOpen}
        title={copy.scopeDialogTitle}
        closeLabel={copy.closeScope}
        onClose={() => setScopeSheetOpen(false)}
      >
        <div className="votes__scope-sheet">
          <button
            type="button"
            className={`votes__global-option ${scope.kind === 'world' ? 'active' : ''}`.trim()}
            aria-pressed={scope.kind === 'world'}
            onClick={chooseGlobal}
          >
            <GlobeHemisphereWest size={20} aria-hidden="true" />
            <span>
              <strong>{copy.world}</strong>
              <small>{copy.globalDescription}</small>
            </span>
          </button>
          {availableCountryCodes.length ? (
            <p className="votes__scope-sheet-label">{copy.availableCountries}</p>
          ) : null}
          <CountryPicker
            value={scope.kind === 'country' ? scope.code : ''}
            onChange={chooseCountry}
            locale={locale}
            searchLabel={copy.scopeLabel}
            searchPlaceholder={copy.countrySearch}
            listLabel={copy.countryList}
            suggested={availableCountryCodes}
            suggestedLabel={copy.countrySuggested}
            emptyLabel={copy.countryEmpty}
          />
        </div>
      </Sheet>
    </main>
  );
}
