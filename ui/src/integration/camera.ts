/**
 * Opening the camera, and the four ways it can fail before it ever opens.
 *
 * The app had a working `getUserMedia` loop in a component nothing rendered,
 * and no guard anywhere for the cases that actually stop people: a page served
 * over plain HTTP from a LAN address, a permission already denied in a previous
 * visit, a laptop with no camera, and a browser that hands back a device it
 * then refuses to start. Each of those needs a different sentence, so each gets
 * a distinct reason rather than one "camera failed".
 */

export type CameraFailure =
  | 'insecure-context'
  | 'unsupported'
  | 'denied'
  | 'no-device'
  | 'in-use'
  | 'unknown';

export type CameraResult =
  | { readonly ok: true; readonly stream: MediaStream }
  | { readonly ok: false; readonly reason: CameraFailure };

/**
 * `getUserMedia` exists only in a secure context. `localhost` counts; a phone
 * pointed at `http://192.168.x.x` does not, which is exactly the setup someone
 * reaches for when testing a camera on a real device.
 */
export function isCameraAvailable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!window.isSecureContext) return false;
  return typeof navigator.mediaDevices?.getUserMedia === 'function';
}

export function cameraUnavailableReason(): CameraFailure | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure-context';
  if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return 'unsupported';
  return null;
}

/**
 * Whether permission was already settled, so the journey can say "you blocked
 * this earlier, here is how to undo it" instead of showing a prompt that will
 * never appear. The Permissions API is absent in Safari, hence the `unknown`.
 */
export async function cameraPermissionState(): Promise<PermissionState | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return status.state;
  } catch {
    // Firefox throws on an unsupported descriptor rather than rejecting the API.
    return 'unknown';
  }
}

function classify(error: unknown): CameraFailure {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device';
  if (name === 'NotReadableError' || name === 'AbortError') return 'in-use';
  return 'unknown';
}

/**
 * Requests the rear camera at a resolution high enough for MRZ text, falling
 * back to any camera when the device has no rear one -- a laptop, typically,
 * where `facingMode: environment` is over-constrained rather than absent.
 */
export async function openCamera(
  facingMode: 'environment' | 'user' = 'environment',
): Promise<CameraResult> {
  const blocked = cameraUnavailableReason();
  if (blocked) return { ok: false, reason: blocked };

  const ideal: MediaStreamConstraints = {
    video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  };
  try {
    return { ok: true, stream: await navigator.mediaDevices.getUserMedia(ideal) };
  } catch (error) {
    const reason = classify(error);
    if (reason !== 'no-device') return { ok: false, reason };
    try {
      return { ok: true, stream: await navigator.mediaDevices.getUserMedia({ video: true }) };
    } catch (fallbackError) {
      return { ok: false, reason: classify(fallbackError) };
    }
  }
}

/** Releases every track. Forgetting this leaves the recording light on. */
export function closeCamera(stream: MediaStream | null | undefined): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}
