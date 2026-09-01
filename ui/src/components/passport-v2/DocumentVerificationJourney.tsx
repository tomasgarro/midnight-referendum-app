import {
  ArrowRight,
  Camera,
  Info,
  Keyboard,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  type CameraFailure,
  cameraUnavailableReason,
  closeCamera,
  openCamera,
} from '@/integration/camera';
import type { CicoLocale } from '@/integration/locale';
import {
  type ManualMrzFields,
  type MrzFailure,
  type MrzRecord,
  toEligibility,
  validateManualFields,
} from '@/integration/mrz';
import {
  captureFrame,
  createMrzRecognizer,
  isMrzRecognitionAvailable,
} from '@/integration/mrz-recognition';
import { VERIFICATION_JOURNEY_COPY } from './verification-journey-copy';
import './verification-journey.css';

/**
 * The document journey, following the Référendum Citoyen shape: teach, show,
 * ask for the camera, read the page, then read the chip.
 *
 * Where it deliberately parts company with the reference is the chip. That app
 * is a native Android build and reads the passport's NFC chip itself. This is a
 * browser, and no browser can: the chip speaks ISO 14443 APDUs, which the web
 * platform does not expose at all. So the chip screen here keeps the reference's
 * shape and instruction but its action is the RariMe handoff the product
 * already uses, and its progress bar reflects a real poll of enrolment status
 * rather than an animation. An animated fake would have been easier and would
 * have been a lie told to a jury.
 *
 * What this component does do for real: open the device camera, look for the
 * machine-readable zone, verify its check digits, and reduce the result to
 * country plus adult status before anything leaves it.
 */

export type VerificationStep =
  | 'explain-1'
  | 'explain-2'
  | 'explain-3'
  | 'video'
  | 'start'
  | 'permission'
  | 'capture'
  | 'manual'
  | 'chip';

const EXPLAIN_STEPS: readonly VerificationStep[] = ['explain-1', 'explain-2', 'explain-3'];

export interface DocumentReadResult {
  /** ISO 3166-1 alpha-3 as printed on the document. */
  readonly country: string;
  readonly isAdult: boolean;
  /** A camera read verifies check digits; a typed one cannot. */
  readonly source: 'camera' | 'manual';
}

export interface DocumentVerificationJourneyProps {
  readonly locale: CicoLocale;
  /**
   * Rendered as the chip step's action. Preview supplies the real RariMe
   * handoff; demo passes nothing and gets the clearly-labelled stand-in.
   */
  readonly chipHandoff?: ReactNode;
  readonly onDocumentRead: (result: DocumentReadResult) => void;
  readonly onCancel?: () => void;
  readonly initialStep?: VerificationStep;
}

function messageForMrzFailure(reason: MrzFailure, copy: (typeof VERIFICATION_JOURNEY_COPY)['en']) {
  switch (reason) {
    case 'unsupported-format':
      return copy.errorUnsupportedFormat;
    case 'expired':
      return copy.errorExpired;
    case 'invalid-date':
      return copy.errorInvalidDate;
    case 'check-document-number':
    case 'check-birth-date':
    case 'check-expiry-date':
    case 'check-composite':
      return copy.errorCheckDigit;
    default:
      return copy.errorMalformed;
  }
}

function messageForCameraFailure(
  reason: CameraFailure,
  copy: (typeof VERIFICATION_JOURNEY_COPY)['en'],
): { title: string; body: string } {
  switch (reason) {
    case 'denied':
      return { title: copy.permissionDenied, body: copy.permissionDeniedBody };
    case 'insecure-context':
      return { title: copy.permissionInsecure, body: copy.permissionInsecureBody };
    case 'no-device':
      return { title: copy.permissionNoDevice, body: copy.permissionNoDeviceBody };
    case 'in-use':
      return { title: copy.permissionInUse, body: copy.permissionInUseBody };
    default:
      return { title: copy.permissionUnsupported, body: copy.permissionUnsupportedBody };
  }
}

export function DocumentVerificationJourney({
  locale,
  chipHandoff,
  onDocumentRead,
  onCancel,
  initialStep = 'explain-1',
}: DocumentVerificationJourneyProps) {
  const copy = VERIFICATION_JOURNEY_COPY[locale];
  const [step, setStep] = useState<VerificationStep>(initialStep);
  const [cameraError, setCameraError] = useState<CameraFailure | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState<ManualMrzFields>({
    documentNumber: '',
    birthDate: '',
    expiryDate: '',
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const formId = useId();

  const recognitionAvailable = isMrzRecognitionAvailable();

  /** Every step change moves focus to the new heading, as a dialog should. */
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const stopCamera = useCallback(() => {
    closeCamera(streamRef.current);
    streamRef.current = null;
    setScanning(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* Leaving the capture step by any route -- back, manual entry, a failed read
     -- must release the camera. A stream left running keeps the recording
     indicator lit, which reads as surveillance.

     Deliberately two effects. Returning `stopCamera` as this one's cleanup
     also fired it on the way *into* capture, because React tears down the
     previous run before the new one: the stream opened and was closed in the
     same tick, so the preview never appeared. Unmount is the other effect's
     job, and it has no dependency that changes. */
  useEffect(() => {
    if (step !== 'capture') stopCamera();
  }, [step, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  const acceptRecord = useCallback(
    (record: MrzRecord, source: DocumentReadResult['source']) => {
      const eligibility = toEligibility(record);
      if (!eligibility) {
        setReadError(copy.errorInvalidDate);
        return;
      }
      if (eligibility.isExpired) {
        setReadError(copy.errorExpired);
        return;
      }
      if (!eligibility.isAdult) {
        setReadError(copy.errorUnderage);
        return;
      }
      stopCamera();
      setReadError(null);
      // Only the three reduced fields go on. The record itself stops here.
      onDocumentRead({ country: eligibility.country, isAdult: true, source });
      setStep('chip');
    },
    [copy, onDocumentRead, stopCamera],
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    const result = await openCamera('environment');
    if (!result.ok) {
      setCameraError(result.reason);
      return;
    }
    streamRef.current = result.stream;
    setStep('capture');
    // The element only exists once the capture step has rendered.
    requestAnimationFrame(() => {
      const video = videoRef.current;
      // Null after an unmount between the frame being requested and served.
      if (!video) return;
      video.srcObject = result.stream;
      // `play()` returns a promise in modern browsers, but not in every one --
      // older Safari and jsdom both return undefined, and calling `.catch` on
      // that throws out of the animation frame where nothing can recover it.
      const started = video.play() as Promise<void> | undefined;
      started?.catch(() => setCameraError('in-use'));
    });
  }, []);

  /* The recognition loop. It runs only where the platform has a text detector;
     everywhere else the capture screen says so and points at the manual form,
     rather than looping forever on a device that will never succeed. */
  useEffect(() => {
    if (step !== 'capture' || !recognitionAvailable) return;
    const recognizer = createMrzRecognizer();
    if (!recognizer) return;
    let cancelled = false;
    setScanning(true);

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (cancelled || !video || !canvas) return;
      const frame = captureFrame(video, canvas);
      if (!frame) return;
      const record = await recognizer.recognize(frame);
      if (!cancelled && record) acceptRecord(record, 'camera');
    }, 400);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      setScanning(false);
    };
  }, [acceptRecord, recognitionAvailable, step]);

  const submitManual = (event: React.FormEvent) => {
    event.preventDefault();
    const validated = validateManualFields(manual);
    if (!validated.ok) {
      setReadError(messageForMrzFailure(validated.reason, copy));
      return;
    }
    setReadError(null);
    /* A typed document number carries no verifiable nationality -- that field
       is not in the human-readable block people are copying from. So the
       manual path yields adulthood and defers the country to the chip read,
       which is the authority in either case. */
    onDocumentRead({ country: '', isAdult: true, source: 'manual' });
    setStep('chip');
  };

  const explainIndex = EXPLAIN_STEPS.indexOf(step);
  const isExplain = explainIndex >= 0;

  return (
    <div className="verify-journey">
      {isExplain ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-explain`}>
          <p className="verify-journey__eyebrow">{copy.processTitle}</p>
          <div className="verify-journey__art" aria-hidden="true">
            {step === 'explain-3' ? <ShieldCheck size={44} /> : <Info size={44} />}
          </div>
          <div className="verify-journey__numbered">
            <span className="verify-journey__badge">{explainIndex + 1}</span>
            <h2
              className="verify-journey__title"
              id={`${formId}-explain`}
              ref={headingRef}
              tabIndex={-1}
            >
              {step === 'explain-1'
                ? copy.step1Title
                : step === 'explain-2'
                  ? copy.step2Title
                  : copy.step3Title}
            </h2>
          </div>
          <p className="verify-journey__body">
            {step === 'explain-1'
              ? copy.step1Body
              : step === 'explain-2'
                ? copy.step2Body
                : copy.step3Body}
          </p>
          {step === 'explain-1' ? (
            <p className="verify-journey__warning">{copy.step1Warning}</p>
          ) : null}

          <div className="verify-journey__footer">
            <ol className="verify-journey__progress" aria-label={copy.stepOf(explainIndex + 1, 3)}>
              {EXPLAIN_STEPS.map((item, index) => (
                <li key={item} data-done={index <= explainIndex} />
              ))}
            </ol>
            <button
              type="button"
              className="verify-journey__advance"
              aria-label={copy.next}
              onClick={() =>
                setStep(
                  explainIndex === 2
                    ? 'video'
                    : (EXPLAIN_STEPS[explainIndex + 1] as VerificationStep),
                )
              }
            >
              <ArrowRight size={22} weight="bold" />
            </button>
          </div>
        </section>
      ) : null}

      {step === 'video' ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-video`}>
          <h2
            className="verify-journey__title"
            id={`${formId}-video`}
            ref={headingRef}
            tabIndex={-1}
          >
            {copy.videoTitle}
          </h2>
          <p className="verify-journey__body">{copy.videoBody}</p>
          {/* The reference plays a recorded walkthrough here. Ours is not shot
              yet, and a stock clip would misrepresent our own flow, so the slot
              states what belongs in it. */}
          <div className="verify-journey__video-slot" role="img" aria-label={copy.videoPlaceholder}>
            <Camera size={38} />
            <span>{copy.videoPlaceholder}</span>
          </div>
          <div className="verify-journey__actions">
            <button
              type="button"
              className="verify-journey__primary"
              onClick={() => setStep('start')}
            >
              {copy.skip}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'start' ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-start`}>
          <h2
            className="verify-journey__title"
            id={`${formId}-start`}
            ref={headingRef}
            tabIndex={-1}
          >
            {copy.analysisTitle}
          </h2>
          <div className="verify-journey__art" aria-hidden="true">
            <Camera size={44} />
          </div>
          <p className="verify-journey__body">{copy.analysisBody}</p>
          <div className="verify-journey__actions">
            <button
              type="button"
              className="verify-journey__primary"
              onClick={() => setStep('permission')}
            >
              {copy.analysisStart}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'permission' ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-permission`}>
          <h2
            className="verify-journey__title"
            id={`${formId}-permission`}
            ref={headingRef}
            tabIndex={-1}
          >
            {cameraError ? messageForCameraFailure(cameraError, copy).title : copy.permissionTitle}
          </h2>
          <p className="verify-journey__body">
            {cameraError ? messageForCameraFailure(cameraError, copy).body : copy.permissionBody}
          </p>
          {/* Stated before the prompt appears, not after: a browser permission
              sheet gives no room to explain why the camera is wanted. */}
          <p className="verify-journey__boundary">
            <ShieldCheck size={16} weight="fill" aria-hidden="true" />
            <span>
              <strong>{copy.boundaryTitle}</strong> {copy.boundaryNote}
            </span>
          </p>
          <div className="verify-journey__actions">
            {cameraUnavailableReason() === null ? (
              <button
                type="button"
                className="verify-journey__primary"
                onClick={() => void startCamera()}
              >
                <Camera size={18} /> {cameraError ? copy.permissionRetry : copy.permissionAllow}
              </button>
            ) : null}
            <button
              type="button"
              className="verify-journey__secondary"
              onClick={() => setStep('manual')}
            >
              <Keyboard size={18} /> {copy.captureManual}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'capture' ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-capture`}>
          <h2
            className="verify-journey__title"
            id={`${formId}-capture`}
            ref={headingRef}
            tabIndex={-1}
          >
            {copy.captureTitle}
          </h2>
          <p className="verify-journey__body">{copy.captureBody}</p>

          {/* The frame is the TD3 page ratio, so aiming inside it produces a
              read rather than a crop that loses the bottom two lines. */}
          <div className="verify-journey__viewport">
            <video
              ref={videoRef}
              className="verify-journey__video"
              aria-label={copy.captureFrameLabel}
              playsInline
              muted
            />
            <div className="verify-journey__frame" aria-hidden="true">
              <span className="verify-journey__mrz-guide" />
            </div>
          </div>
          {/* Off-screen scratch surface the detector reads; never presented. */}
          <canvas ref={canvasRef} className="verify-journey__canvas" />

          <ul className="verify-journey__hints">
            <li>{copy.captureHintFlat}</li>
            <li>{copy.captureHintGlare}</li>
            <li>{copy.captureHintFill}</li>
          </ul>

          <p className="verify-journey__status" role="status">
            {recognitionAvailable
              ? scanning
                ? copy.captureScanning
                : ''
              : copy.captureRecognitionOff}
          </p>
          {readError ? (
            <p className="verify-journey__error" role="alert">
              <WarningCircle size={16} weight="fill" /> {readError}
            </p>
          ) : null}

          <div className="verify-journey__actions">
            <button
              type="button"
              className="verify-journey__secondary"
              onClick={() => setStep('manual')}
            >
              <Keyboard size={18} /> {copy.captureManual}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'manual' ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-manual`}>
          <h2
            className="verify-journey__title"
            id={`${formId}-manual`}
            ref={headingRef}
            tabIndex={-1}
          >
            {copy.manualTitle}
          </h2>
          <p className="verify-journey__body">{copy.manualBody}</p>

          <form className="verify-journey__form" onSubmit={submitManual}>
            <label htmlFor={`${formId}-doc`}>
              {copy.manualDocumentNumber}
              <input
                id={`${formId}-doc`}
                name="documentNumber"
                autoComplete="off"
                inputMode="text"
                required
                value={manual.documentNumber}
                onChange={(event) =>
                  setManual((current) => ({ ...current, documentNumber: event.target.value }))
                }
              />
            </label>
            <label htmlFor={`${formId}-birth`}>
              {copy.manualBirthDate}
              <input
                id={`${formId}-birth`}
                name="birthDate"
                type="date"
                required
                value={manual.birthDate}
                onChange={(event) =>
                  setManual((current) => ({ ...current, birthDate: event.target.value }))
                }
              />
            </label>
            <label htmlFor={`${formId}-expiry`}>
              {copy.manualExpiryDate}
              <input
                id={`${formId}-expiry`}
                name="expiryDate"
                type="date"
                required
                value={manual.expiryDate}
                onChange={(event) =>
                  setManual((current) => ({ ...current, expiryDate: event.target.value }))
                }
              />
            </label>

            {readError ? (
              <p className="verify-journey__error" role="alert">
                <WarningCircle size={16} weight="fill" /> {readError}
              </p>
            ) : null}

            {/* Said here rather than buried: a typed number has no check digit
                to verify, so it is the weaker of the two reads. */}
            <p className="verify-journey__note">{copy.manualAssurance}</p>

            <div className="verify-journey__actions">
              <button type="submit" className="verify-journey__primary">
                {copy.manualValidate}
              </button>
              <button
                type="button"
                className="verify-journey__secondary"
                onClick={() => {
                  setReadError(null);
                  setStep('permission');
                }}
              >
                {copy.manualBackToScanner}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 'chip' ? (
        <section className="verify-journey__screen" aria-labelledby={`${formId}-chip`}>
          <h2
            className="verify-journey__title"
            id={`${formId}-chip`}
            ref={headingRef}
            tabIndex={-1}
          >
            {copy.readTitle}
          </h2>
          <div className="verify-journey__art" aria-hidden="true">
            <ShieldCheck size={44} />
          </div>
          <p className="verify-journey__body">{copy.readBody}</p>
          <ul className="verify-journey__hints">
            <li>{copy.readHintClose}</li>
            <li>{copy.readHintStill}</li>
          </ul>

          {/* Preview passes the real handoff and its real status poll. Demo
              passes nothing, and gets a plain statement instead of a progress
              bar that would be measuring nothing. */}
          {chipHandoff ?? <p className="verify-journey__note">{copy.chipInBrowserNote}</p>}

          {onCancel ? (
            <div className="verify-journey__actions">
              <button type="button" className="verify-journey__secondary" onClick={onCancel}>
                {copy.close}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
