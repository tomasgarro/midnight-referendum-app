import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CredentialsView } from '@/views/CredentialsView';

const credential = {
  kind: 'verified-credential' as const,
  issuer: 'Rarimo',
  country: 'FR',
  ageClass: '18+',
  assurance: 'document-nfc',
  epoch: 'preview-2026-08',
  validUntil: '2026-09-30',
};

describe('CredentialsView', () => {
  it('makes expiry and assurance visible with one contextual action', () => {
    render(<CredentialsView credentials={[credential]} onVerify={vi.fn()} locale="en" />);

    expect(screen.getByText('Valid until')).toBeTruthy();
    expect(screen.getByText('Sep 30, 2026')).toBeTruthy();
    expect(screen.getByText('Verification level')).toBeTruthy();
    expect(screen.getByText('Document + NFC')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Add another pass/i })).toHaveLength(1);
  });
});
