import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentVerificationJourney } from '../components/passport-v2/DocumentVerificationJourney';

/**
 * The journey's job is to reach a real camera or a validated manual entry, and
 * to say something specific when it cannot. These tests hold it to the second
 * half of that: every refusal path has to name its own cause, because "camera
 * failed" is the message that leaves someone stuck.
 */

function stubMediaDevices(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
}

function removeMediaDevices() {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
}

function domException(name: string): DOMException {
  const error = new Error(name);
  error.name = name;
  return error as DOMException;
}

/** Walks the three teaching screens, the video, and the start screen. */
async function reachPermissionStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /skip/i }));
  await user.click(screen.getByRole('button', { name: /start the analysis/i }));
}

describe('DocumentVerificationJourney', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('teaches before it asks for anything, in three numbered steps', async () => {
    const user = userEvent.setup();
    render(<DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} />);

    expect(screen.getByText('Voting process')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /not a robot/i })).toBeTruthy();
    // The strongest privacy claim is on the first screen, not buried.
    expect(screen.getByText(/identity is not kept/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /on your own device/i })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByRole('heading', { name: /anonymous vote/i })).toBeTruthy();
  });

  it('offers the existing provider walkthrough as skippable', async () => {
    const user = userEvent.setup();
    render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="video" />,
    );
    expect(screen.getByLabelText(/passport scan walkthrough/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(screen.getByRole('heading', { name: /passport analysis/i })).toBeTruthy();
  });

  it('names a denied camera as denied, and still offers the manual path', async () => {
    stubMediaDevices(() => Promise.reject(domException('NotAllowedError')));
    const user = userEvent.setup();
    render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="start" />,
    );

    await user.click(screen.getByRole('button', { name: /start the analysis/i }));
    await user.click(screen.getByRole('button', { name: /allow the camera/i }));

    expect(await screen.findByRole('heading', { name: /camera is blocked/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /by hand/i })).toBeTruthy();
  });

  it('names a missing camera separately from a blocked one', async () => {
    stubMediaDevices(() => Promise.reject(domException('NotFoundError')));
    const user = userEvent.setup();
    render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="start" />,
    );

    await user.click(screen.getByRole('button', { name: /start the analysis/i }));
    await user.click(screen.getByRole('button', { name: /allow the camera/i }));

    expect(await screen.findByRole('heading', { name: /no camera found/i })).toBeTruthy();
  });

  it('does not offer to open a camera the page is not allowed to open', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    removeMediaDevices();
    render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="permission" />,
    );
    // No "allow" button, because pressing it could only ever fail.
    expect(screen.queryByRole('button', { name: /allow the camera/i })).toBeNull();
    expect(screen.getByRole('button', { name: /by hand/i })).toBeTruthy();
  });

  it('states the data boundary before the browser prompt appears', () => {
    render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="permission" />,
    );
    expect(screen.getByText(/never leave this device/i)).toBeTruthy();
  });

  it('accepts a validated manual entry and moves to the chip step', async () => {
    const onDocumentRead = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentVerificationJourney
        locale="en"
        onDocumentRead={onDocumentRead}
        initialStep="manual"
      />,
    );

    await user.type(screen.getByLabelText(/document number/i), 'L898902C3');
    await user.type(screen.getByLabelText(/date of birth/i), '1974-08-12');
    await user.type(screen.getByLabelText(/expiry date/i), '2030-04-15');
    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => expect(onDocumentRead).toHaveBeenCalledTimes(1));
    // A typed number carries no verifiable nationality; the chip settles it.
    expect(onDocumentRead).toHaveBeenCalledWith({ country: '', isAdult: true, source: 'manual' });
    expect(screen.getByRole('heading', { name: /chip/i })).toBeTruthy();
  });

  it('refuses an expired document rather than passing it on', async () => {
    const onDocumentRead = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentVerificationJourney
        locale="en"
        onDocumentRead={onDocumentRead}
        initialStep="manual"
      />,
    );

    await user.type(screen.getByLabelText(/document number/i), 'L898902C3');
    await user.type(screen.getByLabelText(/date of birth/i), '1974-08-12');
    await user.type(screen.getByLabelText(/expiry date/i), '2012-04-15');
    await user.click(screen.getByRole('button', { name: /validate/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/expired/i);
    expect(onDocumentRead).not.toHaveBeenCalled();
  });

  it('tells the truth about the chip on the last screen', () => {
    render(<DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="chip" />);
    expect(screen.getByText(/in the RariMe app on your phone/i)).toBeTruthy();
    // The point the whole design turns on: no simulated chip read ships.
    expect(screen.getByText(/cannot read a passport chip/i)).toBeTruthy();
  });

  it('renders in French, which is the reference journey the flow follows', () => {
    render(<DocumentVerificationJourney locale="fr" onDocumentRead={vi.fn()} />);
    expect(screen.getByText('Processus de vote')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /pas un robot/i })).toBeTruthy();
  });

  it('renders in Spanish', () => {
    render(<DocumentVerificationJourney locale="es" onDocumentRead={vi.fn()} />);
    expect(screen.getByText('Proceso de votación')).toBeTruthy();
  });

  it('keeps the stream alive through the transition into the capture step', async () => {
    const stop = vi.fn();
    const track = { stop } as unknown as MediaStreamTrack;
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    stubMediaDevices(() => Promise.resolve(stream));
    const user = userEvent.setup();

    render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="permission" />,
    );
    await user.click(screen.getByRole('button', { name: /allow the camera/i }));
    await screen.findByRole('heading', { name: /show the data page/i });

    /* React tears down the previous effect run before the new one, so a
       cleanup that stopped the camera closed the stream in the same tick it
       was opened and the preview never appeared. */
    expect(stop).not.toHaveBeenCalled();
  });

  it('releases the camera when it leaves the capture step', async () => {
    const stop = vi.fn();
    const track = { stop } as unknown as MediaStreamTrack;
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    stubMediaDevices(() => Promise.resolve(stream));
    const user = userEvent.setup();

    const { unmount } = render(
      <DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} initialStep="permission" />,
    );
    await user.click(screen.getByRole('button', { name: /allow the camera/i }));
    await screen.findByRole('heading', { name: /show the data page/i });

    // A stream left running keeps the recording indicator lit.
    unmount();
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it('walks the whole sequence from the first teaching screen to the camera prompt', async () => {
    stubMediaDevices(() => Promise.reject(domException('NotAllowedError')));
    const user = userEvent.setup();
    render(<DocumentVerificationJourney locale="en" onDocumentRead={vi.fn()} />);
    await reachPermissionStep(user);
    expect(screen.getByRole('heading', { name: /we need your camera/i })).toBeTruthy();
  });
});
