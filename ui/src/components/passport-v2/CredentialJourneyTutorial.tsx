import { BookOpenText, ClosedCaptioning, Info, PlayCircle } from '@phosphor-icons/react';
import { useState } from 'react';

interface CredentialJourneyTutorialProps {
  readonly locale?: 'es' | 'en';
}

/**
 * Tutorial media is intentionally gated until locally supplied media has a
 * documented privacy/rights approval. The files in the external Rarimo
 * reference folder are not copied or linked here because their provenance and
 * any captured personal data are unknown. Keeping the hook media-free also
 * guarantees that this flow never autoplays an unreviewed clip.
 */
export function CredentialJourneyTutorial({ locale = 'es' }: CredentialJourneyTutorialProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const en = locale === 'en';

  return (
    <aside
      className="passport-journey-tutorial"
      data-tutorial-media-gate="rights-review-required"
      aria-labelledby="passport-tutorial-title"
    >
      <div
        className="passport-tutorial-poster"
        role="img"
        aria-label={en ? 'Tutorial preview' : 'Vista previa del tutorial'}
      >
        <PlayCircle size={26} aria-hidden="true" />
        <span>
          {en ? 'Phone verification walkthrough' : 'Recorrido de verificación en el teléfono'}
        </span>
      </div>
      <div className="passport-tutorial-copy">
        <p className="passport-handoff-kicker">{en ? 'Optional tutorial' : 'Tutorial opcional'}</p>
        <h3 id="passport-tutorial-title">
          <BookOpenText size={17} aria-hidden="true" />
          {en ? 'See how the handoff works' : 'Mirá cómo funciona el enlace'}
        </h3>
        <p>
          {en
            ? 'A local visual tutorial will appear after its media is reviewed. You can read the accessible steps now.'
            : 'El tutorial visual local aparecerá cuando revisemos su media. Mientras tanto, podés leer los pasos accesibles.'}
        </p>
        <p className="passport-tutorial-gate" role="status">
          <Info size={15} aria-hidden="true" />
          {en
            ? 'Tutorial media unavailable pending privacy and rights review.'
            : 'Media del tutorial deshabilitada hasta revisar privacidad y derechos.'}
        </p>
        <button
          className="passport-tutorial-transcript-toggle"
          aria-expanded={transcriptOpen}
          onClick={() => setTranscriptOpen((open) => !open)}
          type="button"
        >
          <ClosedCaptioning size={16} aria-hidden="true" />
          {en ? 'Read transcript' : 'Leer transcripción'}
        </button>
        {transcriptOpen ? (
          <ol className="passport-tutorial-transcript">
            <li>
              {en
                ? 'Review the requested criteria, requestor, and data that will not be shared.'
                : 'Revisá los criterios solicitados, quién los pide y qué datos no se comparten.'}
            </li>
            <li>
              {en
                ? 'Scan the one-time QR with a compatible NFC phone, or open the link on that phone.'
                : 'Escaneá el QR de un solo uso con un teléfono NFC compatible o abrí el enlace en ese teléfono.'}
            </li>
            <li>
              {en
                ? 'Place the passport photo page inside the provider frame. If camera access is denied, use only the provider fallback.'
                : 'Ubicá la página con foto dentro del marco del proveedor. Si la cámara está bloqueada, usá solo la alternativa del proveedor.'}
            </li>
            <li>
              {en
                ? 'Remove a thick phone case and hold the phone against the passport chip until the NFC read finishes.'
                : 'Quitá una funda gruesa y apoyá el teléfono sobre el chip del pasaporte hasta que termine la lectura NFC.'}
            </li>
            <li>
              {en
                ? 'A manual entry is not a credential by itself; the provider check must still complete successfully.'
                : 'Una carga manual no es una credencial por sí sola; el chequeo del proveedor debe finalizar correctamente.'}
            </li>
            <li>
              {en
                ? 'Return here while this page checks the one-time attempt and receives only the minimal credential result.'
                : 'Volvé acá mientras esta página consulta el intento único y recibe solo el resultado mínimo de la credencial.'}
            </li>
          </ol>
        ) : null}
      </div>
    </aside>
  );
}
