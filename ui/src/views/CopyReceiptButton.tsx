import { Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';

async function copyReceiptId(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  if (typeof document === 'undefined') throw new Error('Clipboard unavailable');
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}

export interface CopyReceiptButtonProps {
  readonly receiptId: string;
  readonly locale?: CicoLocale;
}

/**
 * Copy a receipt identifier, with the confirmation on the button itself.
 *
 * The confirmation replaces the label for 1.8s rather than firing a toast: a
 * toast for a copy is a notification for something the user is already looking
 * at, and this app already has one toast competing for that corner.
 */
export function CopyReceiptButton({ receiptId, locale = 'es' }: CopyReceiptButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await copyReceiptId(receiptId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button
      variant="link"
      size="sm"
      onClick={() => void handleCopy()}
      aria-label={`${locale === 'es' ? 'Copiar comprobante' : 'Copy receipt'} ${receiptId}`}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? (locale === 'es' ? 'Copiado' : 'Copied') : locale === 'es' ? 'Copiar' : 'Copy'}
    </Button>
  );
}
