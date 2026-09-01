import { CaretDown } from '@phosphor-icons/react';
import type { CicoLocale } from '@/integration/locale';
import { PassportScanTutorial } from './PassportScanTutorial';

interface CredentialJourneyTutorialProps {
  readonly locale?: CicoLocale;
}

const COPY = {
  es: {
    summary: 'Qué pasa en el teléfono',
    steps: [
      'Escaneá el QR de un solo uso con un teléfono NFC compatible o abrí el enlace en ese teléfono.',
      'Si el QR o el enlace no abre, copiá el enlace de respaldo al teléfono NFC y dejá esta página abierta.',
      'Si la cámara está bloqueada, habilitala en la app del proveedor o usá solo su alternativa documentada — nunca un lector de terceros.',
      'Si la lectura NFC se detiene, sacá una funda gruesa o metálica, cerrá el pasaporte, apoyá el teléfono sobre el chip y mantenelo quieto hasta que termine.',
      'Si Rarimo informa que el intento venció, fue rechazado o falló, generá un enlace nuevo. Una carga manual no es una credencial por sí sola.',
      'Volvé acá mientras esta página consulta el intento único y recibe solo el resultado mínimo de la credencial.',
    ],
  },
  en: {
    summary: 'What happens on the phone',
    steps: [
      'Scan the one-time QR with a compatible NFC phone, or open the link on that phone.',
      'If the QR or link will not open, copy the backup link to the NFC phone and keep this page open.',
      'If camera access is denied, allow it in the provider app or use only its documented fallback — never a third-party reader.',
      'If the NFC read stalls, remove a thick or metal case, close the passport, place the phone on the chip, and hold it still until the provider finishes.',
      'If Rarimo reports an expired, denied, or failed attempt, create a new link. Manual entry is not a credential by itself.',
      'Return here while this page checks the one-time attempt and receives only the minimal credential result.',
    ],
  },
  fr: {
    summary: 'Ce qui se passe sur le téléphone',
    steps: [
      'Scannez le QR à usage unique avec un téléphone NFC compatible, ou ouvrez le lien sur ce téléphone.',
      "Si le QR ou le lien ne s'ouvre pas, copiez le lien de secours sur le téléphone NFC et gardez cette page ouverte.",
      "Si la caméra est refusée, autorisez-la dans l'application du fournisseur ou utilisez uniquement son alternative documentée — jamais un lecteur tiers.",
      "Si la lecture NFC se bloque, retirez une housse épaisse ou métallique, fermez le passeport, posez le téléphone sur la puce et gardez-le immobile jusqu'à la fin.",
      'Si Rarimo signale une tentative expirée, refusée ou échouée, créez un nouveau lien. Une saisie manuelle ne constitue pas un justificatif à elle seule.',
      'Revenez ici pendant que cette page vérifie la tentative unique et ne reçoit que le résultat minimal du justificatif.',
    ],
  },
} as const;

/**
 * The phone walkthrough, as a disclosure.
 *
 * This used to render a play-button poster, a heading promising a visual
 * tutorial, and a status line explaining that the tutorial was unavailable --
 * an advertisement for a feature the component then declined to deliver. The
 * clip exists now (see PassportScanTutorial), so the disclosure carries the
 * walkthrough and the written steps together.
 *
 * The written steps stay either way: they are what a reader with the sound off,
 * a slow connection, or a screen reader needs. They also name the recoverable
 * failure modes the footage cannot: a blocked camera, a stalled NFC read, and
 * an expired or rejected provider attempt.
 */
export function CredentialJourneyTutorial({ locale = 'es' }: CredentialJourneyTutorialProps) {
  // The walkthrough shows the physical gestures. This transcript names what to
  // do when the provider cannot complete one of them, so a failure is never a
  // dead end or an invitation to enter identity data manually.
  const copy = COPY[locale];
  const steps = copy.steps;

  return (
    <details className="journey-why">
      <summary>
        {copy.summary}
        <CaretDown size={15} aria-hidden="true" />
      </summary>
      <div>
        <PassportScanTutorial locale={locale} />
        <ol className="passport-tutorial-transcript">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
