import type { UnifiedPassportOnboardingProps } from './UnifiedPassportOnboarding';
import { UnifiedPassportOnboarding } from './UnifiedPassportOnboarding';

/** All environments enter the same introduction; verification remains adapter-owned. */
export function PassportJourney(props: UnifiedPassportOnboardingProps) {
  return <UnifiedPassportOnboarding {...props} />;
}
