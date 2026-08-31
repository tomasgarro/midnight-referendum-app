import { ArrowClockwise, IdentificationCard, Plus, ShieldCheck } from '@phosphor-icons/react';
import { Button, Card, Display, EmptyState, Eyebrow } from '@/components/system';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import { countryName } from '@/integration/country-catalog';
import type { CicoLocale } from '@/integration/locale';
import './credentials-view.css';

const COPY = {
  es: {
    eyebrow: 'Tus credenciales',
    title: 'Elegibilidad, lista para usar',
    lead: 'Un pase guarda el resultado mínimo de una verificación. No es tu pasaporte físico.',
    active: 'Pase activo',
    eligibility: 'Elegibilidad ciudadana',
    issuer: 'Emitido por',
    age: 'Requisito de edad',
    use: 'Uso',
    useValue: 'Desbloquear consultas elegibles',
    simulated: 'Simulado para esta demo',
    verified: 'Verificado',
    add: 'Añadir elegibilidad',
    renew: 'Renovar o reemplazar',
    emptyTitle: 'Todavía no tenés un pase',
    empty: 'Verificá un pasaporte físico compatible para crear tu primer pase de elegibilidad.',
  },
  en: {
    eyebrow: 'Your credentials',
    title: 'Eligibility, ready to use',
    lead: 'A pass keeps the minimum result of a check. It is not your physical passport.',
    active: 'Active pass',
    eligibility: 'Citizen eligibility',
    issuer: 'Issued by',
    age: 'Age requirement',
    use: 'Use',
    useValue: 'Unlock eligible consultations',
    simulated: 'Simulated for this demo',
    verified: 'Verified',
    add: 'Add eligibility',
    renew: 'Renew or replace',
    emptyTitle: 'No pass yet',
    empty: 'Verify a compatible physical passport to create your first eligibility pass.',
  },
} as const;

export interface CredentialsViewProps {
  readonly credentials: readonly DemoCredentialSummary[];
  readonly onVerify: () => void;
  readonly locale: CicoLocale;
}

export function CredentialsView({ credentials, onVerify, locale }: CredentialsViewProps) {
  const copy = COPY[locale];
  const active = credentials[0] ?? null;

  return (
    <main className="credentials">
      <header className="credentials__head">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Display>{copy.title}</Display>
        <p>{copy.lead}</p>
      </header>

      {active ? (
        <Card className="credential-pass">
          <div className="credential-pass__top">
            <span className="credential-pass__mark" aria-hidden="true">
              <ShieldCheck size={24} weight="fill" />
            </span>
            <span className="credential-pass__status">
              <span aria-hidden="true" /> {copy.active}
            </span>
          </div>
          <div>
            <p className="credential-pass__kicker">{copy.eligibility}</p>
            <h2>{countryName(active.country, locale)}</h2>
          </div>
          <dl className="credential-pass__facts">
            <div>
              <dt>{copy.issuer}</dt>
              <dd>{active.issuer}</dd>
            </div>
            <div>
              <dt>{copy.age}</dt>
              <dd>{active.ageClass}</dd>
            </div>
            <div>
              <dt>{copy.use}</dt>
              <dd>{copy.useValue}</dd>
            </div>
          </dl>
          <p className="credential-pass__origin">
            {active.kind === 'synthetic-demo-credential' ? copy.simulated : copy.verified}
          </p>
          <Button variant="secondary" block onClick={onVerify}>
            <ArrowClockwise size={17} /> {copy.renew}
          </Button>
        </Card>
      ) : (
        <EmptyState
          icon={<IdentificationCard size={30} />}
          title={copy.emptyTitle}
          message={copy.empty}
          action={
            <Button onClick={onVerify}>
              <Plus size={17} /> {copy.add}
            </Button>
          }
        />
      )}

      {active ? (
        <Button block onClick={onVerify}>
          <Plus size={17} /> {copy.add}
        </Button>
      ) : null}
    </main>
  );
}
