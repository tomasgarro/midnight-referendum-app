import {
  ArrowRight,
  CaretDown,
  GlobeHemisphereWest,
  MapPin,
  Robot,
  ShieldCheck,
  UsersThree,
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
import { formatDate } from '@/integration/format';
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
import { ConsultationRail } from './ConsultationRail';
import './votes-view.css';
import { ConsultationMedia, canUseDemoPass, pollSubject, SUBJECTS } from './discovery-presentation';
import './discovery-cards.css';

const COPY = {
  es: {
    eyebrow: 'Descubrir',
    title: 'Tu lugar en la conversación',
    lead: 'Explorá preguntas abiertas, entendé las propuestas y participá cuando estés listo.',
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
    pulseEyebrow: 'Un momento para reflexionar',
    pulseTitle: '¿Qué importa en tu día a día?',
    pulseBody: 'Unas preguntas sobre los cambios que querés ver. En privado y a tu ritmo.',
    pulseAction: 'Probar el pulso cívico',
  },
  en: {
    eyebrow: 'Discover',
    title: 'Your place in the conversation',
    lead: 'Explore open questions, understand the proposals, and take part when you are ready.',
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
    pulseEyebrow: 'A moment to reflect',
    pulseTitle: 'What matters in your everyday life?',
    pulseBody:
      'A few thoughtful questions about the changes you want to see. Private, and at your pace.',
    pulseAction: 'Try the civic pulse',
  },
  fr: {
    eyebrow: 'Découvrir',
    title: 'Votre place dans la conversation',
    lead: 'Explorez les questions ouvertes, comprenez les propositions et participez à votre rythme.',
    world: 'Monde',
    scopeButton: 'Parcourir par lieu',
    scopeDialogTitle: 'Choisir un lieu',
    scopeLabel: 'Périmètre de la consultation',
    globalScope: 'Consultations mondiales',
    countryScope: 'Consultations en',
    globalDescription:
      "Ouvertes aux personnes disposant d'un justificatif éligible, sans pays particulier.",
    availableCountries: 'Consultations disponibles',
    countrySearch: "Rechercher n'importe quel pays",
    countryList: 'Pays disponibles',
    countrySuggested: 'Pays avec des consultations publiées',
    countryEmpty: 'Aucun pays ne correspond. Essayez un autre nom ou code.',
    closeScope: 'Fermer le sélecteur de lieu',
    browsing: 'Vous explorez',
    notEligibility: 'Cela ne prouve pas votre éligibilité.',
    open: 'Ouvert',
    closed: 'Clos',
    closes: 'Clôture',
    read: 'Voir la consultation',
    vote: 'Participer',
    addEligibility: 'Ajouter une éligibilité',
    simulated: 'Expérience publique simulée',
    fromContract: 'État public lu depuis Midnight',
    empty: "Aucune consultation n'est encore publiée dans ce périmètre.",
    passOnFile: 'Laissez-passer enregistré pour',
    pulseEyebrow: 'Un moment pour réfléchir',
    pulseTitle: 'Qu’est-ce qui compte au quotidien ?',
    pulseBody:
      'Quelques questions sur les changements que vous souhaitez. En privé, à votre rythme.',
    pulseAction: 'Essayer le pouls civique',
  },
} as const;

export interface VotesViewProps {
  readonly polls: readonly Poll[];
  readonly credential: DemoCredentialSummary | null;
  readonly publicContractAddress: string | null;
  readonly onStartVote: (pollId: string) => void;
  readonly onOpenPolicy: (pollId: string) => void;
  readonly onOpenPassportJourney: () => void;
  readonly onOpenPulse: () => void;
  readonly onOpenGuide?: () => void;
  readonly locale: CicoLocale;
}

export function VotesView({
  polls,
  credential,
  publicContractAddress,
  onStartVote,
  onOpenPolicy,
  onOpenPassportJourney,
  onOpenPulse,
  onOpenGuide,
  locale,
}: VotesViewProps) {
  const copy = COPY[locale];
  const [scope, setScope] = useState<DiscoveryScope>(() =>
    credential?.country ? { kind: 'country', code: credential.country } : { kind: 'world' },
  );
  const [subject, setSubject] = useState<keyof typeof SUBJECTS.en>('all');
  useEffect(() => {
    if (credential?.country) setScope({ kind: 'country', code: credential.country });
  }, [credential?.country]);
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

  const scopedPolls =
    scope.kind === 'world'
      ? polls.filter((poll) => !isCountryPoll(poll))
      : polls.filter((poll) => isCountryPollForCountry(poll, scope.code));
  const countryLabel = scope.kind === 'country' ? countryName(scope.code, locale) : copy.world;
  const passMatchesCountry = Boolean(
    credential &&
      scope.kind === 'country' &&
      credential.country.trim().toUpperCase() === scope.code.trim().toUpperCase(),
  );

  const chooseGlobal = () => {
    setSubject('all');
    setScope({ kind: 'world' });
    setScopeSheetOpen(false);
  };
  const chooseCountry = (code: string) => {
    setSubject('all');
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

      <section className="votes__pulse" aria-labelledby="civic-pulse-title">
        <span className="votes__pulse-icon" aria-hidden="true">
          <UsersThree size={23} />
        </span>
        <div className="votes__pulse-copy">
          <p className="sys-eyebrow">{copy.pulseEyebrow}</p>
          <h2 id="civic-pulse-title">{copy.pulseTitle}</h2>
          <p>{copy.pulseBody}</p>
          <Button size="sm" onClick={onOpenPulse}>
            {copy.pulseAction} <ArrowRight size={16} />
          </Button>
        </div>
      </section>

      {onOpenGuide ? (
        <button className="dashboard-guide-entry" type="button" onClick={onOpenGuide}>
          <Robot size={26} />
          <span>
            <strong>
              {locale === 'en'
                ? 'Ask about a consultation'
                : locale === 'es'
                  ? 'Preguntá sobre una consulta'
                  : 'Une question sur une consultation ?'}
            </strong>
            <small>
              {locale === 'en'
                ? 'Find a project. Get the essentials.'
                : locale === 'es'
                  ? 'Encontrá un proyecto. Conocé lo esencial.'
                  : 'Trouvez un projet. Comprenez l’essentiel.'}
            </small>
          </span>
          <ArrowRight size={18} />
        </button>
      ) : null}

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

      <fieldset className="discovery-subjects" aria-label={SUBJECTS[locale].all}>
        {(Object.keys(SUBJECTS[locale]) as (keyof typeof SUBJECTS.en)[])
          .filter(
            (key) =>
              key === 'all' ||
              polls
                .filter(
                  (poll) =>
                    !isCountryPoll(poll) ||
                    (scope.kind === 'country' && isCountryPollForCountry(poll, scope.code)),
                )
                .some((poll) => pollSubject(poll) === key),
          )
          .map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={subject === key}
              onClick={() => {
                setSubject(key);
              }}
            >
              {SUBJECTS[locale][key]}
            </button>
          ))}
      </fieldset>
      {[
        { key: 'global', label: copy.world, items: polls.filter((poll) => !isCountryPoll(poll)) },
        ...(scope.kind === 'country'
          ? [{ key: scope.code, label: countryLabel, items: scopedPolls }]
          : []),
      ].map(({ key: sectionKey, label: countryLabel, items: sectionPolls }) => {
        const visiblePolls = sectionPolls.filter(
          (poll) => subject === 'all' || pollSubject(poll) === subject,
        );
        return (
          <section
            className="votes__results"
            aria-labelledby={`discover-${sectionKey}`}
            key={sectionKey}
          >
            <div className="votes__results-head">
              <div>
                <p className="sys-eyebrow">
                  {sectionKey === 'global' ? copy.globalScope : copy.countryScope}
                </p>
                <h2 id={`discover-${sectionKey}`}>{countryLabel}</h2>
              </div>
              {sectionKey !== 'global' && passMatchesCountry ? (
                <span className="votes__eligible">
                  <ShieldCheck size={15} weight="fill" />{' '}
                  {credential?.kind === 'synthetic-demo-credential' ? 'DEMO ·' : copy.passOnFile}{' '}
                  {countryLabel}
                </span>
              ) : null}
            </div>
            {visiblePolls.length ? (
              <ConsultationRail
                key={countryLabel + subject}
                label={countryLabel}
                count={visiblePolls.length}
                locale={locale}
              >
                {visiblePolls.map((poll) => {
                  const displayPoll = localizePoll(poll, locale);
                  const eligibleForScope = Boolean(
                    credential &&
                      (!isCountryPoll(poll) || isCountryPollForCountry(poll, credential.country)),
                  );
                  const isOpen = getPollAvailability(poll, now).isOpen;
                  return (
                    <li key={poll.id}>
                      <Card className="poll">
                        <ConsultationMedia poll={displayPoll} locale={locale} />
                        <div className="poll__meta">
                          <span
                            className={`poll__status ${isOpen ? 'poll__status--open' : ''}`.trim()}
                          >
                            {isOpen ? copy.open : copy.closed}
                          </span>
                          <span>
                            {/* Formatted from `closesAt`, not the pre-rendered
                            `deadline` string: that one is authored per fixture
                            (French on the French one, whatever the reader
                            chose) and it disagreed with the date Activity
                            computed for the same consultation. */}
                            {copy.closes} {formatDate(poll.closesAt, locale) ?? poll.deadline}
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
                              disabled={
                                credential?.kind === 'synthetic-demo-credential' &&
                                !canUseDemoPass(poll, credential, now) &&
                                eligibleForScope
                              }
                              onClick={() =>
                                eligibleForScope ? onStartVote(poll.id) : onOpenPassportJourney()
                              }
                            >
                              {credential?.kind === 'synthetic-demo-credential' &&
                              credential.ageClass !== '18+'
                                ? '18+'
                                : eligibleForScope
                                  ? copy.vote
                                  : copy.addEligibility}{' '}
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
              </ConsultationRail>
            ) : (
              <EmptyState message={copy.empty} />
            )}
          </section>
        );
      })}

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
