export type OnboardingPose =
  | 'welcome'
  | 'explain'
  | 'passport'
  | 'waiting'
  | 'success'
  | 'reassure';

/** Animate the complete illustration: polygon-cut limbs left visible seams. */
export function OnboardingMascot({
  pose,
  motion = false,
  priority = false,
}: {
  pose: OnboardingPose;
  motion?: boolean;
  priority?: boolean;
}) {
  return (
    <span className="onboarding-mascot" data-pose={pose} data-motion={motion} aria-hidden="true">
      <img
        className="onboarding-mascot__image"
        src={`/art/capybara-onboarding/${pose}.webp`}
        alt=""
        width="640"
        height="960"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </span>
  );
}
