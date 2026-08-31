import { ArrowLeft, CaretLeft } from '@phosphor-icons/react';
import type { CicoLocale } from '@/integration/locale';
import { JourneyProgress } from './JourneyProgress';
import { LanguageToggle } from './LanguageToggle';
import './system.css';

export interface JourneyTopBarProps {
  readonly locale: CicoLocale;
  readonly onLocaleChange: (locale: CicoLocale) => void;
  readonly languageLabel: string;
  /** Leaves the journey entirely. Omitted while the journey is mandatory. */
  readonly onExit?: () => void;
  readonly exitLabel?: string;
  /** Steps back one screen inside the journey. */
  readonly onBack?: () => void;
  readonly backLabel: string;
  /** Short environment truth, e.g. "Demo". Rendered beside the language pill. */
  readonly badge?: string;
  readonly current: number;
  readonly total: number;
  readonly stageLabel: string;
  readonly progressLabel: string;
}

/**
 * Two rows above the content, where there were six.
 *
 * The journey header used to stack: an exit link, a labelled language select,
 * an environment chip, an eyebrow, a display-size page title, a row of truth
 * chips, a four-pill stepper, and a "Previous step" link -- roughly 340px of a
 * 812px screen before the card that holds the actual question. Every screen
 * paid it, and the page title said the same thing as the card title underneath.
 *
 * What is left is what the user cannot get from the content itself: a way out,
 * the language, the environment, a way back, and how far along they are. The
 * page title is gone because the screen's own heading is the title.
 */
export function JourneyTopBar({
  locale,
  onLocaleChange,
  languageLabel,
  onExit,
  exitLabel,
  onBack,
  backLabel,
  badge,
  current,
  total,
  stageLabel,
  progressLabel,
}: JourneyTopBarProps) {
  return (
    <div className="sys-journey-top">
      <div className="sys-journey-top__utility">
        {onExit ? (
          <button type="button" className="sys-journey-top__exit" onClick={onExit}>
            <ArrowLeft size={16} weight="bold" />
            {exitLabel}
          </button>
        ) : (
          <span />
        )}
        <div className="sys-journey-top__right">
          {badge ? <span className="sys-journey-top__badge">{badge}</span> : null}
          <LanguageToggle locale={locale} onChange={onLocaleChange} label={languageLabel} />
        </div>
      </div>
      <div className="sys-journey-top__track">
        {onBack ? (
          <button
            type="button"
            className="sys-journey-top__back"
            onClick={onBack}
            aria-label={backLabel}
          >
            <CaretLeft size={17} weight="bold" />
          </button>
        ) : null}
        <JourneyProgress
          current={current}
          total={total}
          stageLabel={stageLabel}
          label={progressLabel}
        />
      </div>
    </div>
  );
}
