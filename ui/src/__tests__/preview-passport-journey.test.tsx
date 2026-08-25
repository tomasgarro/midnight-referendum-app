import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  CanonicalReceipt,
  CastVoteRequest,
  CivicActionPort,
  CivicCredentialPort,
  PassportSessionPort,
} from 'midnight-referendum-api';
import { isoNumericCountry } from 'midnight-referendum-api';
import { describe, expect, it, vi } from 'vitest';
import { PassportJourney } from '../components/passport-v2/PassportJourney';

const session = {
  sessionId: 'passport-session',
  origin: 'http://localhost:3000',
  network: 'preview' as const,
  status: 'connected' as const,
  profile: { displayName: 'Ana Passport' },
  capabilities: ['session', 'profile'] as const,
};

const receipt: CanonicalReceipt = {
  status: 'confirmed',
  action: 'vote',
  network: 'preview',
  transactionId: 'preview-tx-id',
  transactionHash: 'preview-tx-hash',
  contractAddress: 'ab'.repeat(32),
  circuit: 'castVote',
  blockHeight: 99,
  blockHash: 'preview-block-hash',
  blockTimestamp: '2026-08-24T12:00:00.000Z',
};

function passportPort(): PassportSessionPort {
  return {
    adapterName: 'test-passport',
    supportedCapabilities: ['session', 'profile'],
    connect: vi.fn().mockResolvedValue(session),
    getSession: vi.fn().mockResolvedValue(session),
    requestCapability: vi.fn(),
    disconnect: vi.fn(),
  };
}

function credentialPort(): CivicCredentialPort {
  return {
    adapterName: 'test-credential',
    beginEnrollment: vi.fn().mockResolvedValue({
      enrollmentId: 'enrollment-id',
      status: 'issued',
      holderBinding: new Uint8Array(32).fill(1),
      createdAt: '2026-08-24T12:00:00.000Z',
      expiresAt: '2026-08-24T12:10:00.000Z',
    }),
    getEnrollmentStatus: vi.fn(),
    getCredentialSummary: vi.fn().mockResolvedValue({
      provider: 'rarimo',
      status: 'issued',
      issuerId: 'cico-preview-issuer',
      country: isoNumericCountry('032'),
      ageClass: '18-plus',
      assurance: 'document-nfc',
      credentialEpoch: 7,
      validFrom: '2026-08-24T12:00:00.000Z',
      validUntil: '2026-08-25T12:00:00.000Z',
    }),
    getActionAuthorization: vi.fn().mockResolvedValue({
      kind: 'civic-credential',
      handle: 'opaque-issuance-handle',
    }),
    clearCredential: vi.fn(),
  };
}

function actionPort(requests: CastVoteRequest[]): CivicActionPort {
  return {
    adapterName: 'test-actions',
    async castVote(request) {
      requests.push(request);
      return receipt;
    },
    recordPublicCohort: vi.fn(),
    getCanonicalReceipt: vi.fn().mockResolvedValue(receipt),
  };
}

describe('Preview Passport journey', () => {
  it('runs the injected Passport, credential, vote, and canonical receipt ports', async () => {
    const user = userEvent.setup();
    const requests: CastVoteRequest[] = [];
    render(
      <PassportJourney
        mode="preview"
        onClose={vi.fn()}
        previewPorts={{
          passport: passportPort(),
          credential: credentialPort(),
          actions: actionPort(requests),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Conectar Passport/i }));
    expect(await screen.findByRole('heading', { name: 'Sesión Passport conectada' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Iniciar verificación documental/i }));
    expect(
      await screen.findByRole('heading', { name: 'Credencial cívica confirmada' }),
    ).toBeTruthy();
    expect(screen.getByText('document-nfc')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Elegir alcance/i }));
    await user.click(screen.getByRole('button', { name: /Mi país/i }));
    await user.click(screen.getByRole('button', { name: /^Sí/i }));
    await user.click(screen.getByRole('button', { name: /Revisar compromiso/i }));
    await user.click(screen.getByRole('button', { name: /Probar y enviar en Preview/i }));

    expect(
      await screen.findByRole('heading', { name: 'Tu comprobante no revela tu elección' }),
    ).toBeTruthy();
    expect(screen.getByText('preview-tx-id')).toBeTruthy();
    expect(requests).toEqual([
      {
        referendumId: 'tierras-rurales:032',
        choice: 'YES',
        authorization: { kind: 'civic-credential', handle: 'opaque-issuance-handle' },
      },
    ]);
    expect(screen.queryByText(/^Sí$/)).toBeNull();
  });

  it('connects Passport but does not fabricate a credential when backend ports are absent', async () => {
    const user = userEvent.setup();
    render(
      <PassportJourney
        mode="preview"
        onClose={vi.fn()}
        previewPorts={{ passport: passportPort() }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Conectar Passport/i }));
    expect(await screen.findByText(/gateway Rarimo server-side/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Iniciar verificación documental/i })).toBeNull();
  });

  it('shows pending enrollment expiry and supports explicit restart after expiration', async () => {
    const user = userEvent.setup();
    const clearCredential = vi.fn();
    const credential: CivicCredentialPort = {
      ...credentialPort(),
      beginEnrollment: vi.fn().mockResolvedValue({
        enrollmentId: 'pending-enrollment',
        status: 'pending',
        holderBinding: new Uint8Array(32).fill(1),
        createdAt: '2026-08-24T12:00:00.000Z',
        expiresAt: '2026-08-24T12:10:00.000Z',
        interaction: {
          kind: 'cross-device-qr',
          uri: 'https://app.rarime.com/external?id=pending-enrollment',
          expiresAt: '2026-08-24T12:10:00.000Z',
        },
      }),
      getEnrollmentStatus: vi.fn().mockResolvedValue({
        enrollmentId: 'pending-enrollment',
        status: 'expired',
        updatedAt: '2026-08-24T12:11:00.000Z',
        errorCode: 'ENROLLMENT_EXPIRED',
      }),
      clearCredential,
    };
    render(
      <PassportJourney
        mode="preview"
        onClose={vi.fn()}
        previewPorts={{ passport: passportPort(), credential, actions: actionPort([]) }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Conectar Passport/i }));
    await user.click(screen.getByRole('button', { name: /Iniciar verificación documental/i }));
    expect(await screen.findByText('pending')).toBeTruthy();
    expect(screen.getAllByText(/24\/8\/2026|8\/24\/2026/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Comprobar verificación/i }));
    expect(await screen.findByText('expired')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Empezar de nuevo/i }));
    expect(await screen.findByRole('heading', { name: 'Sesión Passport conectada' })).toBeTruthy();
    expect(clearCredential).toHaveBeenCalledOnce();
  });

  it('never creates a receipt or resubmits while canonical confirmation is pending', async () => {
    const user = userEvent.setup();
    const castVote = vi.fn().mockResolvedValue(receipt);
    const getCanonicalReceipt = vi.fn().mockResolvedValue(null);
    const actions: CivicActionPort = {
      adapterName: 'pending-actions',
      castVote,
      recordPublicCohort: vi.fn(),
      getCanonicalReceipt,
    };
    render(
      <PassportJourney
        mode="preview"
        onClose={vi.fn()}
        previewPorts={{
          passport: passportPort(),
          credential: credentialPort(),
          actions,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Conectar Passport/i }));
    await user.click(screen.getByRole('button', { name: /Iniciar verificación documental/i }));
    await user.click(screen.getByRole('button', { name: /Elegir alcance/i }));
    await user.click(screen.getByRole('button', { name: /World/i }));
    await user.click(screen.getByRole('button', { name: /^No/i }));
    await user.click(screen.getByRole('button', { name: /Revisar compromiso/i }));
    await user.click(screen.getByRole('button', { name: /Probar y enviar en Preview/i }));

    expect(
      await screen.findByRole('heading', { name: 'El resultado de envío todavía es incierto' }),
    ).toBeTruthy();
    expect(screen.queryByText(/Tu comprobante no revela/i)).toBeNull();
    expect(castVote).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /Actualizar confirmación/i }));
    expect(castVote).toHaveBeenCalledOnce();
    expect(getCanonicalReceipt).toHaveBeenCalledTimes(2);
  });
});
