import type { MrzRecord } from '@/integration/mrz';
import { parseTd3, splitMrzLines, TD3_LINE_LENGTH } from '@/integration/mrz';

/**
 * Reading the MRZ off a camera frame, where the platform offers it.
 *
 * `TextDetector` is the only text OCR the web platform exposes, and it ships in
 * very few browsers. The alternative -- a WASM OCR engine -- is ruled out here
 * rather than attempted: `vercel.json` sets `script-src 'self'` with no
 * `wasm-unsafe-eval`, so it would be blocked on the very origin the jury will
 * open, and a two-megabyte download to read forty-four characters is the wrong
 * trade on a phone anyway.
 *
 * So recognition is strictly a shortcut. Every screen that uses it must reach
 * the same outcome by hand, and the manual form is the guaranteed path rather
 * than a consolation prize. `isMrzRecognitionAvailable` exists so the UI can
 * say which one it is offering instead of silently failing to detect.
 */

interface DetectedText {
  readonly rawValue?: string;
}

interface TextDetectorLike {
  detect(source: CanvasImageSource): Promise<readonly DetectedText[]>;
}

type TextDetectorConstructor = new () => TextDetectorLike;

function nativeTextDetector(): TextDetectorConstructor | null {
  const candidate = (globalThis as { TextDetector?: TextDetectorConstructor }).TextDetector;
  return typeof candidate === 'function' ? candidate : null;
}

export function isMrzRecognitionAvailable(): boolean {
  return nativeTextDetector() !== null;
}

export interface MrzRecognizer {
  /** Null means "not in this frame", which is the normal case while aiming. */
  recognize(frame: HTMLCanvasElement): Promise<MrzRecord | null>;
}

/**
 * The MRZ is two 44-character lines, so candidates are filtered on that shape
 * before parsing. OCR reliably returns the surrounding page text too -- names,
 * the country, the word PASSPORT -- and none of it is worth a parse attempt.
 */
function findTd3Pair(blocks: readonly string[]): string | null {
  const lines = blocks.flatMap((block) => splitMrzLines(block));
  const candidates = lines.filter((line) => line.length === TD3_LINE_LENGTH);
  for (let index = 0; index + 1 < candidates.length; index += 1) {
    const first = candidates[index] as string;
    const second = candidates[index + 1] as string;
    if (first.startsWith('P')) return `${first}\n${second}`;
  }
  return null;
}

export function createMrzRecognizer(): MrzRecognizer | null {
  const Detector = nativeTextDetector();
  if (!Detector) return null;
  const detector = new Detector();

  return {
    async recognize(frame) {
      let blocks: readonly DetectedText[];
      try {
        blocks = await detector.detect(frame);
      } catch {
        // A detector that throws on one frame is not fatal for the session.
        return null;
      }
      const pair = findTd3Pair(blocks.map((block) => block.rawValue ?? ''));
      if (!pair) return null;
      const parsed = parseTd3(pair);
      // A failed check digit means this frame was misread, not that the
      // passport is invalid. Keep scanning rather than reporting a failure.
      return parsed.ok ? parsed.record : null;
    },
  };
}

/** Draws the current video frame into a canvas the detectors can read. */
export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): HTMLCanvasElement | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);
  return canvas;
}
