import { CaretDown } from '@phosphor-icons/react';

interface CredentialJourneyTutorialProps {
  readonly locale?: 'es' | 'en';
}

/**
 * The phone walkthrough, as a disclosure.
 *
 * This used to render a play-button poster, a heading promising a visual
 * tutorial, and a status line explaining that the tutorial was unavailable
 * pending a privacy and rights review -- an advertisement for a feature the
 * component then declined to deliver, permanently occupying the screen where
 * the reader is trying to finish a verification. Offering nothing is better
 * than offering a disabled something.
 *
 * The six steps were always the real content and they are still all here, one
 * tap away. Wiring a clip back in means restoring a poster and a <video> here
 * once the footage has a documented redistribution approval; the steps stay
 * either way, because they are what a reader with the sound off needs.
 */
export function CredentialJourneyTutorial({ locale = 'es' }: CredentialJourneyTutorialProps) {
  const en = locale === 'en';
  const steps = en
    ? [
        'Review the requested criteria, requestor, and data that will not be shared.',
        'Scan the one-time QR with a compatible NFC phone, or open the link on that phone.',
        'Place the passport photo page inside the provider frame. If camera access is denied, use only the provider fallback.',
        'Remove a thick phone case and hold the phone against the passport chip until the NFC read finishes.',
        'A manual entry is not a credential by itself; the provider check must still complete successfully.',
        'Return here while this page checks the one-time attempt and receives only the minimal credential result.',
      ]
    : [
        'Revisá los criterios solicitados, quién los pide y qué datos no se comparten.',
        'Escaneá el QR de un solo uso con un teléfono NFC compatible o abrí el enlace en ese teléfono.',
        'Ubicá la página con foto dentro del marco del proveedor. Si la cámara está bloqueada, usá solo la alternativa del proveedor.',
        'Quitá una funda gruesa y apoyá el teléfono sobre el chip del pasaporte hasta que termine la lectura NFC.',
        'Una carga manual no es una credencial por sí sola; el chequeo del proveedor debe finalizar correctamente.',
        'Volvé acá mientras esta página consulta el intento único y recibe solo el resultado mínimo de la credencial.',
      ];

  return (
    <details className="journey-why" data-tutorial-media-gate="rights-review-required">
      <summary>
        {en ? 'What happens on the phone' : 'Qué pasa en el teléfono'}
        <CaretDown size={15} aria-hidden="true" />
      </summary>
      <div>
        <ol className="passport-tutorial-transcript">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
