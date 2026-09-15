import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  GlobeHemisphereWest,
  LockKey,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';
import {
  CIVIC_PULSE_VERSION,
  type ExplanationAreaId,
  LocalDemoPriorityPulseAdapter,
  type PriorityId,
  type PulseDraft,
  type TradeoffId,
} from 'midnight-referendum-api/pulse';
import { useMemo, useState } from 'react';
import { MidnightMark } from '@/components/brand/MidnightMark';
import './pulse-experience.css';

type PulseStage =
  | 'home'
  | 'intro'
  | 'priorities'
  | 'values'
  | 'explanations'
  | 'review'
  | 'complete';

const PRIORITIES: readonly { id: PriorityId; label: string; detail: string }[] = [
  {
    id: 'cost-of-living',
    label: 'Cost of living',
    detail: 'Everyday prices, income and household security',
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    detail: 'Timely, affordable physical and mental healthcare',
  },
  {
    id: 'education',
    label: 'Education',
    detail: 'Learning, skills and opportunity throughout life',
  },
  { id: 'housing', label: 'Housing', detail: 'Safe, stable and affordable places to live' },
  {
    id: 'climate',
    label: 'Climate resilience',
    detail: 'Preparing communities while reducing emissions',
  },
  {
    id: 'public-safety',
    label: 'Public safety',
    detail: 'Prevention, emergency services and trusted justice',
  },
];

const TRADEOFFS: readonly { id: TradeoffId; label: string; detail: string }[] = [
  {
    id: 'act-sooner',
    label: 'Act sooner',
    detail: 'Move quickly, then improve the policy with evidence.',
  },
  {
    id: 'build-consensus',
    label: 'Build consensus',
    detail: 'Take more time to seek durable agreement.',
  },
  {
    id: 'target-support',
    label: 'Target support',
    detail: 'Focus limited resources on people with the greatest need.',
  },
  {
    id: 'universal-services',
    label: 'Universal services',
    detail: 'Make core support broadly available and simple to access.',
  },
  {
    id: 'prefer-not-to-answer',
    label: 'Prefer not to answer',
    detail: 'Leave this optional question unanswered.',
  },
];

const EXPLANATIONS: readonly { id: ExplanationAreaId; label: string }[] = [
  { id: 'costs', label: 'Costs and funding' },
  { id: 'delivery', label: 'How delivery would work' },
  { id: 'evidence', label: 'Evidence for likely outcomes' },
  { id: 'tradeoffs', label: 'Who benefits and what is traded off' },
];

const STEP_NUMBER: Partial<Record<PulseStage, number>> = {
  priorities: 1,
  values: 2,
  explanations: 3,
  review: 4,
};

function toggle<T extends string>(items: readonly T[], item: T): T[] {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export interface PulseExperienceProps {
  readonly onExploreReferenda?: () => void;
  readonly onExit?: () => void;
  readonly embedded?: boolean;
}

export function PulseExperience({
  onExploreReferenda,
  onExit,
  embedded = false,
}: PulseExperienceProps) {
  const adapter = useMemo(() => new LocalDemoPriorityPulseAdapter(), []);
  const [stage, setStage] = useState<PulseStage>('home');
  const [priorities, setPriorities] = useState<PriorityId[]>([]);
  const [tradeoffs, setTradeoffs] = useState<TradeoffId[]>([]);
  const [explanationAreas, setExplanationAreas] = useState<ExplanationAreaId[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPriorities([]);
    setTradeoffs([]);
    setExplanationAreas([]);
    setError(null);
    setStage('home');
  };

  const choosePriority = (id: PriorityId) => {
    setError(null);
    if (priorities.includes(id)) {
      setPriorities(priorities.filter((priority) => priority !== id));
      return;
    }
    if (priorities.length === 3) {
      setError('Choose up to three priorities. Remove one before adding another.');
      return;
    }
    setPriorities([...priorities, id]);
  };

  const chooseTradeoff = (id: TradeoffId) => {
    setError(null);
    if (id === 'prefer-not-to-answer') {
      setTradeoffs(tradeoffs.includes(id) ? [] : [id]);
      return;
    }
    const withoutSkip = tradeoffs.filter((value) => value !== 'prefer-not-to-answer');
    setTradeoffs(toggle(withoutSkip, id));
  };

  const complete = async () => {
    const draft: PulseDraft = {
      questionnaireVersion: CIVIC_PULSE_VERSION,
      actorLane: 'human',
      priorities,
      tradeoffs,
      explanationAreas,
    };
    try {
      await adapter.completeLocalDemo(draft);
      setStage('complete');
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'The local demo could not be completed.',
      );
    }
  };

  const back = () => {
    setError(null);
    const previous: Record<Exclude<PulseStage, 'home'>, PulseStage> = {
      intro: 'home',
      priorities: 'intro',
      values: 'priorities',
      explanations: 'values',
      review: 'explanations',
      complete: 'review',
    };
    setStage(previous[stage as Exclude<PulseStage, 'home'>]);
  };

  if (stage === 'home') {
    return (
      <div className={`pulse-shell ${embedded ? 'pulse-shell--embedded' : ''}`.trim()}>
        <header className="pulse-header">
          {embedded ? (
            <button className="pulse-back" type="button" onClick={onExit}>
              <ArrowLeft size={18} /> Back to the app
            </button>
          ) : (
            <a className="pulse-brand" href="#top" aria-label="midnight.vote home">
              <MidnightMark size={44} title="midnight.vote" />
              <span>midnight.vote</span>
            </a>
          )}
          <span className="pulse-mode">
            <span aria-hidden="true" />
            Local demo
          </span>
        </header>
        <main id="top">
          <section className="pulse-hero" aria-labelledby="pulse-hero-title">
            <p className="pulse-kicker">Human civic pulse</p>
            <h1 id="pulse-hero-title">What should government focus on?</h1>
            <p className="pulse-hero__lead">
              Explore priorities, values and tradeoffs in a simple, non-binding civic consultation.
              Try the local demo: your answers stay in this session and are not submitted.
            </p>
            <div className="pulse-actions">
              <button
                className="pulse-button pulse-button--primary"
                type="button"
                onClick={() => setStage('intro')}
              >
                Try the civic pulse demo <ArrowRight size={19} />
              </button>
              <button
                className="pulse-button pulse-button--secondary"
                type="button"
                onClick={onExploreReferenda ?? onExit}
              >
                Explore consultations
              </button>
            </div>
            <p className="pulse-disclaimer">Non-binding consultation. Not an official election.</p>
          </section>

          <section className="pulse-trust" aria-labelledby="pulse-trust-title">
            <div className="pulse-section-heading">
              <p className="pulse-kicker">Clear boundaries</p>
              <h2 id="pulse-trust-title">Private by design, honest about the demo</h2>
            </div>
            <div className="pulse-card-grid">
              <article className="pulse-info-card">
                <LockKey size={24} />
                <h3>Your answers stay here</h3>
                <p>
                  No backend submission, browser storage or political profile. Reset or reload to
                  erase the draft.
                </p>
              </article>
              <article className="pulse-info-card">
                <GlobeHemisphereWest size={24} />
                <h3>Browse without signing in</h3>
                <p>
                  Passport is the session and consent foundation. Eligibility is a separate
                  capability, requested only when needed.
                </p>
              </article>
              <article className="pulse-info-card">
                <UsersThree size={24} />
                <h3>Human lane only</h3>
                <p>
                  This experience represents an individual person. Synthetic-agent results can never
                  be mixed into it.
                </p>
              </article>
            </div>
          </section>

          <section className="pulse-roadmap" aria-labelledby="pulse-roadmap-title">
            <div className="pulse-section-heading">
              <p className="pulse-kicker">What comes later</p>
              <h2 id="pulse-roadmap-title">Tools with visible limits</h2>
            </div>
            <div className="pulse-roadmap-grid">
              <article className="pulse-roadmap-card">
                <Sparkle size={22} />
                <div>
                  <p className="pulse-card-label">Planned · advisory only</p>
                  <h3>AI research assistant</h3>
                  <p>
                    Source-linked context, multiple perspectives and uncertainty. It will never
                    submit an answer or use civic credentials.
                  </p>
                </div>
              </article>
              <article className="pulse-roadmap-card">
                <Cpu size={22} />
                <div>
                  <p className="pulse-card-label">Planned · synthetic agents</p>
                  <h3>Midnight City</h3>
                  <p>
                    A separate product space and result lane. Synthetic participation is not human
                    public opinion.
                  </p>
                </div>
              </article>
            </div>
          </section>
        </main>
        <footer className="pulse-footer">
          midnight.vote · Local demonstration · Answers are not collected
        </footer>
      </div>
    );
  }

  const step = STEP_NUMBER[stage];
  return (
    <div className={`pulse-flow-shell ${embedded ? 'pulse-flow-shell--embedded' : ''}`.trim()}>
      <header className="pulse-flow-header">
        <button className="pulse-back" type="button" onClick={stage === 'complete' ? reset : back}>
          <ArrowLeft size={18} /> {stage === 'complete' ? 'Return home' : 'Back'}
        </button>
        <span className="pulse-mode">
          <span aria-hidden="true" />
          Local demo
        </span>
      </header>
      {step ? (
        <div
          className="pulse-progress"
          role="progressbar"
          aria-label={`Step ${step} of 4`}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step}
        >
          <span style={{ width: `${step * 25}%` }} />
        </div>
      ) : null}
      <main className="pulse-flow">
        {stage === 'intro' ? (
          <section className="pulse-flow-card">
            <p className="pulse-kicker">Before you begin</p>
            <h1>Your view is yours</h1>
            <p>
              This four-step demo helps you reflect on public priorities. There is no correct
              answer, score or inferred ideology.
            </p>
            <ul className="pulse-check-list">
              <li>
                <Check size={18} /> Choose up to three priorities
              </li>
              <li>
                <Check size={18} /> Skip every optional question
              </li>
              <li>
                <Check size={18} /> Review before completing the demo
              </li>
              <li>
                <Check size={18} /> Nothing is sent or saved
              </li>
            </ul>
            <button
              className="pulse-button pulse-button--primary"
              type="button"
              onClick={() => setStage('priorities')}
            >
              Begin <ArrowRight size={19} />
            </button>
          </section>
        ) : null}

        {stage === 'priorities' ? (
          <section className="pulse-flow-card" aria-labelledby="priorities-title">
            <p className="pulse-kicker">Step 1 of 4 · Required</p>
            <h1 id="priorities-title">Choose up to three priorities</h1>
            <p>Pick the areas you believe deserve the most attention right now.</p>
            <div className="pulse-selection-count" aria-live="polite">
              {priorities.length} of 3 selected
            </div>
            <div className="pulse-option-list">
              {PRIORITIES.map((priority) => {
                const selected = priorities.includes(priority.id);
                return (
                  <button
                    key={priority.id}
                    className="pulse-option"
                    aria-pressed={selected}
                    type="button"
                    onClick={() => choosePriority(priority.id)}
                  >
                    <span>
                      <strong>{priority.label}</strong>
                      <small>{priority.detail}</small>
                    </span>
                    <span className="pulse-option__check" aria-hidden="true">
                      {selected ? <Check size={16} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {error ? (
              <p className="pulse-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="pulse-button pulse-button--primary"
              type="button"
              disabled={priorities.length === 0}
              onClick={() => setStage('values')}
            >
              Continue <ArrowRight size={19} />
            </button>
          </section>
        ) : null}

        {stage === 'values' ? (
          <section className="pulse-flow-card" aria-labelledby="values-title">
            <p className="pulse-kicker">Step 2 of 4 · Optional</p>
            <h1 id="values-title">Which tradeoffs matter to you?</h1>
            <p>
              Select any statements that fit. Some may pull in different directions; that is part of
              the question.
            </p>
            <div className="pulse-option-list">
              {TRADEOFFS.map((item) => {
                const selected = tradeoffs.includes(item.id);
                return (
                  <button
                    key={item.id}
                    className="pulse-option"
                    aria-pressed={selected}
                    type="button"
                    onClick={() => chooseTradeoff(item.id)}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <span className="pulse-option__check" aria-hidden="true">
                      {selected ? <Check size={16} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pulse-flow-actions">
              <button
                className="pulse-button pulse-button--secondary"
                type="button"
                onClick={() => {
                  setTradeoffs([]);
                  setStage('explanations');
                }}
              >
                Skip
              </button>
              <button
                className="pulse-button pulse-button--primary"
                type="button"
                onClick={() => setStage('explanations')}
              >
                Continue <ArrowRight size={19} />
              </button>
            </div>
          </section>
        ) : null}

        {stage === 'explanations' ? (
          <section className="pulse-flow-card" aria-labelledby="explanations-title">
            <p className="pulse-kicker">Step 3 of 4 · Optional</p>
            <h1 id="explanations-title">What would you like explained better?</h1>
            <p>
              Choose any areas where clearer, source-linked information would help you consider the
              options.
            </p>
            <div className="pulse-chip-list">
              {EXPLANATIONS.map((item) => (
                <button
                  key={item.id}
                  className="pulse-chip"
                  aria-pressed={explanationAreas.includes(item.id)}
                  type="button"
                  onClick={() => setExplanationAreas(toggle(explanationAreas, item.id))}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="pulse-source-note">
              Future explanations will show publication dates, sources, perspectives and
              uncertainty. Interactive AI is not enabled in this demo.
            </p>
            <div className="pulse-flow-actions">
              <button
                className="pulse-button pulse-button--secondary"
                type="button"
                onClick={() => {
                  setExplanationAreas([]);
                  setStage('review');
                }}
              >
                Skip
              </button>
              <button
                className="pulse-button pulse-button--primary"
                type="button"
                onClick={() => setStage('review')}
              >
                Review <ArrowRight size={19} />
              </button>
            </div>
          </section>
        ) : null}

        {stage === 'review' ? (
          <section className="pulse-flow-card" aria-labelledby="review-title">
            <p className="pulse-kicker">Step 4 of 4 · Private review</p>
            <h1 id="review-title">Review your answers</h1>
            <p>Completing the demo does not submit, store or publish these choices.</p>
            <div className="pulse-review-section">
              <div>
                <h2>Priorities</h2>
                <button type="button" onClick={() => setStage('priorities')}>
                  Edit
                </button>
              </div>
              <ul>
                {priorities.map((id) => (
                  <li key={id}>{PRIORITIES.find((item) => item.id === id)?.label}</li>
                ))}
              </ul>
            </div>
            <div className="pulse-review-section">
              <div>
                <h2>Values and tradeoffs</h2>
                <button type="button" onClick={() => setStage('values')}>
                  Edit
                </button>
              </div>
              <p>
                {tradeoffs.length
                  ? tradeoffs
                      .map((id) => TRADEOFFS.find((item) => item.id === id)?.label)
                      .join(' · ')
                  : 'Skipped'}
              </p>
            </div>
            <div className="pulse-review-section">
              <div>
                <h2>Explanation needs</h2>
                <button type="button" onClick={() => setStage('explanations')}>
                  Edit
                </button>
              </div>
              <p>
                {explanationAreas.length
                  ? explanationAreas
                      .map((id) => EXPLANATIONS.find((item) => item.id === id)?.label)
                      .join(' · ')
                  : 'Skipped'}
              </p>
            </div>
            {error ? (
              <p className="pulse-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="pulse-button pulse-button--primary"
              type="button"
              onClick={() => void complete()}
            >
              Complete local demo <ArrowRight size={19} />
            </button>
          </section>
        ) : null}

        {stage === 'complete' ? (
          <section className="pulse-flow-card pulse-complete" aria-labelledby="complete-title">
            <div className="pulse-complete-mark">
              <Check size={30} />
            </div>
            <p className="pulse-kicker">Demo complete</p>
            <h1 id="complete-title">Your answers stayed private</h1>
            <p>
              No response was submitted or saved. The choices above exist only in this open page and
              will be erased when you return home or reload.
            </p>
            <aside className="pulse-fixture" aria-labelledby="fixture-title">
              <p className="pulse-card-label">Fixed synthetic fixture · Not your answers</p>
              <h2 id="fixture-title">Example of a future aggregate</h2>
              <div>
                <span>Cost of living</span>
                <strong>59%</strong>
              </div>
              <div>
                <span>Healthcare</span>
                <strong>49%</strong>
              </div>
              <div>
                <span>Housing</span>
                <strong>38%</strong>
              </div>
              <small>
                Illustrative data from 240 fictional participants. Human and synthetic-agent lanes
                remain separate.
              </small>
            </aside>
            <button className="pulse-button pulse-button--primary" type="button" onClick={reset}>
              Erase answers and return home
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
