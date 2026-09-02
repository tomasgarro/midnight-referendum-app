/**
 * Writes the inputs for a second Preview referendum that runs to a finalized
 * tally in one sitting.
 *
 *     node scripts/prepare-second-referendum.mjs
 *     npm run deploy:preview:second
 *
 * The first deploy (`deploy:preview`) uses the default 24/48/72-hour schedule
 * and stops after castVote, which is the right shape for a first real
 * transaction. This one uses a ~15-minute schedule with V2_WAIT_FOR_SCHEDULE so
 * castVote → closeVote → revealVote → finalizeVote all complete in one run, and
 * the Activity screen has a real tally to read.
 *
 * The schedule is generated fresh on every invocation rather than checked in.
 * Absolute timestamps written hours earlier put the enrollment window in the
 * past, and publishCredentialRoot is rejected once enrollment has closed — so a
 * stale file fails in a way that looks like a contract bug.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const OUT = '.env.v2.preview.second';
const now = Math.floor(Date.now() / 1000);

// Enough room for a cold wallet sync inside the deploy before enrollment shuts.
const MINUTES = 60;
const enrollmentCloses = now + 45 * MINUTES;
const closes = enrollmentCloses + 5 * MINUTES;
const revealCloses = closes + 5 * MINUTES;

const lines = [
  `# Generated ${new Date().toISOString()} by scripts/prepare-second-referendum.mjs`,
  '# Regenerate before every run; the schedule below is time-sensitive.',
  '',
  'V2_REFERENDUM_ID=preview-second-finalized-tally',
  `V2_EVENT_ID_HEX=${randomBytes(32).toString('hex')}`,
  'V2_MANIFEST_PATH=deploy/passport-v2/preview.second.manifest.json',
  'V2_WAIT_FOR_SCHEDULE=true',
  '',
  `# opens now; enrollment closes +45m (covers the cold sync); vote +50m; reveal +55m`,
  `V2_OPENS_AT_UNIX=${now}`,
  `V2_ENROLLMENT_CLOSES_AT_UNIX=${enrollmentCloses}`,
  `V2_CLOSES_AT_UNIX=${closes}`,
  `V2_REVEAL_CLOSES_AT_UNIX=${revealCloses}`,
  '',
  'V2_REFERENDUM_TITLE=Publishing eligibility rules',
  'V2_REFERENDUM_QUESTION=Should eligibility rules be published before each vote opens?',
  'V2_REFERENDUM_DESCRIPTION=A second consultation, run to a finalized tally on Midnight Preview.',
  '',
];

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`wrote ${OUT}`);
console.log(`  enrollment closes ${new Date(enrollmentCloses * 1000).toISOString()}`);
console.log(`  vote closes       ${new Date(closes * 1000).toISOString()}`);
console.log(`  reveal closes     ${new Date(revealCloses * 1000).toISOString()}`);
console.log('\nThis file carries no secrets; the role secrets still come from .env.v2.preview.');
