import { CaretDown } from '@phosphor-icons/react';
import { PassportScanTutorial } from './PassportScanTutorial';

interface CredentialJourneyTutorialProps {
  readonly locale?: 'es' | 'en';
}

/**
 * The phone walkthrough, as a disclosure.
 *
 * This used to render a play-button poster, a heading promising a visual
 * tutorial, and a status line explaining that the tutorial was unavailable --
 * an advertisement for a feature the component then declined to deliver. The
 * clip exists now (see PassportScanTutorial), so the disclosure carries the
 * walkthrough and the written steps together.
 *
 * The six steps stay either way: they are what a reader with the sound off,
 * a slow connection, or a screen reader needs, and they say things the footage
 * cannot -- that a manual entry is not a credential on its own, and that this
 * page is only waiting for a result.
 */
export function CredentialJourneyTutorial({ locale = 'es' }: CredentialJourneyTutorialProps) {
  const en = locale === 'en';
  // Three of the original six steps are now the walkthrough's own captions --
  // the camera framing, the case, the chip. What survives here is what the
  // footage cannot say.
  const steps = en
    ? [
        'Scan the one-time QR with a compatible NFC phone, or open the link on that phone.',
        'If camera access is denied, use only the provider fallback — never a third-party reader.',
        'A manual entry is not a credential by itself; the provider check must still complete successfully.',
        'Return here while this page checks the one-time attempt and receives only the minimal credential result.',
      ]
    : [
        'Escaneá el QR de un solo uso con un teléfono NFC compatible o abrí el enlace en ese teléfono.',
        'Si la cámara está bloqueada, usá solo la alternativa del proveedor — nunca un lector de terceros.',
        'Una carga manual no es una credencial por sí sola; el chequeo del proveedor debe finalizar correctamente.',
        'Volvé acá mientras esta página consulta el intento único y recibe solo el resultado mínimo de la credencial.',
      ];

  return (
    <details className="journey-why">
      <summary>
        {en ? 'What happens on the phone' : 'Qué pasa en el teléfono'}
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
