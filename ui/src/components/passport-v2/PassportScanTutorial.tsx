import { useEffect, useRef, useState } from 'react';
import scanMp4 from '@/assets/tutorial/passport-scan.mp4';
import scanWebm from '@/assets/tutorial/passport-scan.webm';
import posterSrc from '@/assets/tutorial/passport-scan-poster.webp';
import './journey.css';

interface PassportScanTutorialProps {
  readonly locale?: 'es' | 'en';
}

/**
 * What the phone step looks like, in nine and a half seconds.
 *
 * The clip is trimmed from the RariMe scan walkthrough to the three moments
 * that matter and nothing else: take the case off, photograph the passport
 * page, hold the phone against the chip. It is cropped to the illustration, so
 * the provider's own chrome -- its step counter, its close button, its "Let's
 * scan" CTA -- is not in frame promising controls this page does not have.
 * The captions below are ours, in the reader's language; the footage carries
 * the gesture, the words carry the meaning.
 *
 * It is deliberately not on the welcome screen. A reader who has not yet
 * decided to connect anything does not need a scanning tutorial; a reader
 * waiting for their phone does.
 *
 * Muted, looping and inert: no audio track exists, nothing autoplays until the
 * disclosure holding it is opened, and `prefers-reduced-motion` gets the
 * poster frame with a control rather than a loop that cannot be stopped.
 */
export function PassportScanTutorial({ locale = 'es' }: PassportScanTutorialProps) {
  const en = locale === 'en';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // jsdom and older embedded webviews have no matchMedia. Treating that as
    // "no preference" is the right default: the clip is silent and looping,
    // and a reader who has asked for less motion is served by the branch
    // below, not by the absence of the API.
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const steps = en
    ? [
        ['Take the case off', 'A thick case blocks the chip. The phone has to touch the passport.'],
        [
          'Photograph the page',
          'The page with your photo, flat, inside the frame the provider draws.',
        ],
        [
          'Hold it against the chip',
          'Rest the phone on the closed passport until the read finishes.',
        ],
      ]
    : [
        [
          'Sacá la funda',
          'Una funda gruesa bloquea el chip. El teléfono tiene que tocar el pasaporte.',
        ],
        [
          'Fotografiá la página',
          'La página con tu foto, plana, dentro del marco que dibuja el proveedor.',
        ],
        [
          'Apoyalo sobre el chip',
          'Dejá el teléfono sobre el pasaporte cerrado hasta que termine la lectura.',
        ],
      ];

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="scan-tutorial">
      {/* biome-ignore lint/a11y/useMediaCaption: silent instructional loop; the
          captions are the ordered list beside it, in the reader's language. */}
      <video
        ref={videoRef}
        className="scan-tutorial__video"
        poster={posterSrc}
        muted
        playsInline
        loop
        preload="metadata"
        autoPlay={!reducedMotion}
        aria-label={en ? 'Passport scan walkthrough' : 'Recorrido del escaneo del pasaporte'}
      >
        <source src={scanWebm} type="video/webm" />
        <source src={scanMp4} type="video/mp4" />
      </video>
      {reducedMotion ? (
        <button type="button" className="scan-tutorial__toggle" onClick={toggle}>
          {playing ? (en ? 'Pause' : 'Pausar') : en ? 'Play the walkthrough' : 'Reproducir'}
        </button>
      ) : null}
      <ol className="scan-tutorial__steps">
        {steps.map(([title, body]) => (
          <li key={title}>
            <strong>{title}</strong>
            <small>{body}</small>
          </li>
        ))}
      </ol>
      <p className="scan-tutorial__note">
        {en
          ? 'Recorded in the provider app. Your document is read on your own phone and is never sent here.'
          : 'Grabado en la app del proveedor. Tu documento se lee en tu propio teléfono y nunca se envía acá.'}
      </p>
    </div>
  );
}
