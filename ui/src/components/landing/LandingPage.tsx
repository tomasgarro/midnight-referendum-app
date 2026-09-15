import { Check, Fingerprint, LockKey } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { persistLocale } from '@/integration/locale';
import { HowItWorks } from './HowItWorks';
import { LandingFinale, LandingFooter } from './LandingFinale';
import './landing.css';
import { LandingHero } from './LandingHero';
import './landing-actions.css';

export function LandingPage() {
  useEffect(() => {
    document.documentElement.lang = 'en';
    document.title = 'midnight.vote — Your voice. Your choice. Your secret.';
  }, []);
  const start = () => {
    persistLocale('en');
    window.location.hash = 'app';
  };
  return (
    <div className="civic-landing">
      <a className="landing-skip" href="#landing-main">
        Skip to content
      </a>
      <main id="landing-main">
        <LandingHero onStart={start} />
        <div className="landing-bridge">
          <div>
            <LockKey size={25} weight="thin" />
            <span>
              <strong>Keep your details.</strong>
              <small>Share only what a step needs.</small>
            </span>
          </div>
          <div>
            <Fingerprint size={25} weight="thin" />
            <span>
              <strong>Prove you belong.</strong>
              <small>Explore privacy with Midnight.</small>
            </span>
          </div>
          <div>
            <Check size={25} weight="thin" />
            <span>
              <strong>Have your say.</strong>
              <small>Start with a demo consultation.</small>
            </span>
          </div>
        </div>
        <HowItWorks onStart={start} />
        <LandingFinale onStart={start} />
      </main>
      <LandingFooter />
    </div>
  );
}
