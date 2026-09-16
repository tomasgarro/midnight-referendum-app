import { useEffect, useId, useRef, useState } from 'react';
export type OnboardingPose =
  | 'welcome'
  | 'explain'
  | 'passport'
  | 'waiting'
  | 'success'
  | 'reassure';
const gestureRegions: Partial<Record<OnboardingPose, { points: string; origin: string }>> = {
  welcome: { points: '0,350 220,350 245,490 220,560 130,590 30,560 0,500', origin: '145px 565px' },
  explain: { points: '0,515 175,515 205,595 185,665 110,690 0,650', origin: '165px 670px' },
  passport: {
    points: '180,0 950,0 950,470 790,545 665,585 650,550 450,528 445,577 310,540 180,440',
    origin: '550px 570px',
  },
  success: { points: '50,390 220,390 240,505 220,555 125,580 50,540', origin: '170px 560px' },
};

/** New assets are opt-in: the legacy mascot remains unchanged elsewhere. */
export function OnboardingMascot({
  pose,
  motion = false,
  priority = false,
}: {
  pose: OnboardingPose;
  motion?: boolean;
  priority?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const id = useId().replace(/:/g, '');
  const src = `/art/capybara-onboarding/${pose}.webp`;
  const region = gestureRegions[pose];
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || typeof IntersectionObserver === 'undefined')
      return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      query.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);
  const animated = motion && !reduced;
  return (
    <span
      ref={ref}
      className="onboarding-mascot"
      data-pose={pose}
      data-playing={visible}
      aria-hidden="true"
    >
      {animated && region ? (
        <svg viewBox="0 0 1024 1536" focusable="false" aria-hidden="true">
          <defs>
            <clipPath id={`${id}-limb`}>
              <polygon points={region.points} />
            </clipPath>
            <mask id={`${id}-body`}>
              <rect width="1024" height="1536" fill="white" />
              <polygon points={region.points} fill="black" />
            </mask>
          </defs>
          <image href={src} width="1024" height="1536" mask={`url(#${id}-body)`} />
          <g className="onboarding-mascot__gesture" style={{ transformOrigin: region.origin }}>
            <image href={src} width="1024" height="1536" clipPath={`url(#${id}-limb)`} />
          </g>
        </svg>
      ) : animated && pose === 'waiting' ? (
        <svg viewBox="0 0 1024 1536" aria-hidden="true" focusable="false">
          <image href={src} width="1024" height="1536" />
          <g className="onboarding-mascot__blink">
            <ellipse cx="341" cy="286" rx="48" ry="56" fill="#edb16d" />
            <path
              d="M301 287 Q340 309 380 283"
              fill="none"
              stroke="#442417"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
          <g className="onboarding-mascot__blink">
            <ellipse cx="679" cy="286" rx="49" ry="56" fill="#edb16d" />
            <path
              d="M638 283 Q678 309 719 287"
              fill="none"
              stroke="#442417"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        </svg>
      ) : (
        <img
          src={src}
          alt=""
          width="1024"
          height="1536"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      )}
    </span>
  );
}
