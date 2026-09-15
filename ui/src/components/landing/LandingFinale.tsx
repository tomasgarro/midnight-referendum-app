import {
  ArrowRight,
  ArrowUpRight,
  ChatCircle,
  Check,
  Fingerprint,
  LockKey,
  Moon,
  Robot,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';
import { useState } from 'react';
import './landing-finale.css';

export function LandingFinale({ onStart }: { onStart: () => void }) {
  const [audience, setAudience] = useState<'humans' | 'agents'>('humans');
  const human = audience === 'humans';
  return (
    <>
      <section className="future-section" id="discover" aria-labelledby="future-title">
        <div className="future-heading">
          <p className="how-kicker">ROOM FOR DIFFERENT FUTURES</p>
          <h2 id="future-title">
            Better conversations.
            <br />
            <span>New possibilities.</span>
          </h2>
          <p>Privacy gives participation room to grow.</p>
        </div>
        <fieldset className="future-switch" aria-label="Explore participation for humans or agents">
          <button type="button" aria-pressed={human} onClick={() => setAudience('humans')}>
            <UsersThree size={19} /> Humans
          </button>
          <button type="button" aria-pressed={!human} onClick={() => setAudience('agents')}>
            <Robot size={19} /> Agents <small>Looking ahead</small>
          </button>
        </fieldset>
        <div className="future-panel" key={audience}>
          <div className={`future-art future-art--${audience}`}>
            {human ? (
              <div className="future-human-scene" aria-hidden="true">
                <div className="future-orbit future-orbit--outer" />
                <div className="future-orbit" />
                <div className="future-person future-person--one">
                  <UsersThree size={35} weight="thin" />
                </div>
                <div className="future-person future-person--two">
                  <ChatCircle size={32} weight="thin" />
                </div>
                <div className="future-person future-person--three">
                  <Fingerprint size={36} weight="thin" />
                </div>
                <div className="future-person future-person--four">
                  <Sparkle size={31} weight="thin" />
                </div>
                <div className="future-core">
                  <LockKey size={46} weight="thin" />
                  <span>
                    Your voice.
                    <br />
                    Your boundaries.
                  </span>
                </div>
                <div className="future-art-note">
                  <Check size={16} /> People at the centre.
                </div>
              </div>
            ) : (
              <>
                <img
                  className="future-city-image"
                  src="/brand/midnight-city.png"
                  alt="Pixel-art streets and residents of Midnight City"
                  loading="lazy"
                  width="1920"
                  height="1080"
                />
                <div className="future-city-note">
                  <Robot size={28} weight="thin" />
                  <span>
                    A city of possibilities.<small>Agent participation · concept exploration</small>
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="future-copy" aria-live="polite">
            <p className="future-label">
              {human ? 'HUMANS / START HERE' : 'AGENTS / A FUTURE CONCEPT'}
            </p>
            <h3>
              {human ? (
                <>
                  More informed.
                  <br />
                  Still your decision.
                </>
              ) : (
                <>
                  What could a city
                  <br />
                  decide together?
                </>
              )}
            </h3>
            <p>
              {human
                ? 'Make sense of the questions that shape your community. Participate with more context and greater control over what you share.'
                : 'We’re exploring how agents could take part in the shared affairs of Midnight City — with clear rules for identity, participation, and accountability.'}
            </p>
            <ul>
              {human ? (
                <>
                  <li>
                    <Check size={18} />
                    <span>
                      <strong>Try it today</strong>Learn about privacy, explore a demo consultation,
                      and discover Civic Pulse.
                    </span>
                  </li>
                  <li>
                    <Sparkle size={18} />
                    <span>
                      <strong>On the horizon</strong>AI summaries, richer discussion, and proofs
                      that reveal only the attributes a consultation needs.
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <ChatCircle size={18} />
                    <span>
                      <strong>Explore shared decisions</strong>A future space for agents to
                      deliberate on city priorities.
                    </span>
                  </li>
                  <li>
                    <LockKey size={18} />
                    <span>
                      <strong>Keep the lanes clear</strong>Agent participation would be separate
                      from human-only consultations. It is not available in this demo.
                    </span>
                  </li>
                </>
              )}
            </ul>
            {human ? (
              <button type="button" className="how-action" onClick={onStart}>
                Start with the human journey <ArrowUpRight size={19} />
              </button>
            ) : (
              <a
                className="how-action"
                href="https://www.midnight.city/"
                target="_blank"
                rel="noreferrer"
              >
                Explore Midnight City <ArrowUpRight size={19} />
              </a>
            )}
          </div>
        </div>
      </section>
      <section className="finale-quote" id="our-purpose" aria-label="Our purpose">
        <span className="finale-quote-mark" aria-hidden="true">
          “
        </span>
        <blockquote>
          Never doubt that a small group of thoughtful, committed citizens can change the world.
          Indeed, it’s the only thing that ever has.
        </blockquote>
        <p>Attributed to Margaret Mead</p>
      </section>
      <section className="finale-invitation" aria-labelledby="invitation-title">
        <div>
          <p className="how-kicker">A SMALL BEGINNING</p>
          <h2 id="invitation-title">
            Be part of a<br />
            <span>bigger conversation.</span>
          </h2>
          <p>
            A little curiosity is all you need. Start with a privacy lesson, then explore a demo
            consultation.
          </p>
          <button type="button" className="midnight-cta" onClick={onStart}>
            Get started{' '}
            <span>
              <ArrowRight size={22} />
            </span>
          </button>
          <small>Non-binding demo · simulated eligibility</small>
        </div>
        <div className="finale-guide-space" data-art-slot="future-mascot" aria-hidden="true">
          <div className="finale-guide-halo" />
          <div className="finale-guide-orbit" />
          <div className="finale-guide-symbol">
            <Moon size={80} weight="thin" />
          </div>
          <span className="finale-guide-spark">✦</span>
        </div>
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="finale-footer">
      <div className="finale-footer__top">
        <div>
          <a className="midnight-brand" href="#landing-main">
            <Moon size={24} weight="fill" />
            <span>
              midnight<span className="midnight-brand__suffix">.vote</span>
            </span>
          </a>
          <p>
            A little privacy.
            <br />A world of possibility.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <div>
            <strong>Take part</strong>
            <a href="#how-it-works">How it works</a>
            <a href="#discover">Humans & agents</a>
            <a href="#our-purpose">Our purpose</a>
          </div>
          <div>
            <strong>Explore</strong>
            <a href="https://midnight.network" target="_blank" rel="noreferrer">
              Midnight <ArrowUpRight size={14} />
            </a>
            <a href="https://www.midnight.city/" target="_blank" rel="noreferrer">
              Midnight City <ArrowUpRight size={14} />
            </a>
          </div>
        </nav>
      </div>
      <div className="finale-footer__bottom">
        <p>
          An independent project built on Midnight.
          <br />A participation prototype, not an official Midnight product or a binding election.
        </p>
        <a href="#landing-main">
          Back to top <ArrowUpRight size={16} />
        </a>
      </div>
    </footer>
  );
}
