import { ArrowSquareOut, Check, Copy } from '@phosphor-icons/react';
import { useState } from 'react';
import { EnrollmentQr } from './EnrollmentQr';

interface EnrollmentHandoffProps {
  readonly uri: string;
  readonly expiresAt: string;
}

/** Explicit cross-device handoff with copy and ordinary-link fallbacks. */
export function EnrollmentHandoff({ uri, expiresAt }: EnrollmentHandoffProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(uri);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="passport-enrollment-handoff" aria-labelledby="passport-handoff-title">
      <h3 id="passport-handoff-title">Continuá en tu teléfono</h3>
      <p>
        En desktop, escaneá este QR con tu teléfono. En mobile, abrí el enlace directamente. Si
        ninguna opción funciona, copiá el enlace y pegalo en el teléfono.
      </p>
      <div className="passport-enrollment-qr-wrap">
        <EnrollmentQr value={uri} />
      </div>
      <p className="passport-enrollment-expiry">
        El enlace vence: {new Date(expiresAt).toLocaleString()}
      </p>
      <div className="passport-enrollment-handoff-actions">
        <a className="passport-action-button secondary" href={uri} rel="noreferrer" target="_blank">
          <ArrowSquareOut size={18} /> Abrir enlace
        </a>
        <button className="passport-action-button secondary" onClick={copy} type="button">
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Enlace copiado' : 'Copiar enlace'}
        </button>
      </div>
      <details>
        <summary>Mostrar enlace de respaldo</summary>
        <code className="passport-enrollment-uri">{uri}</code>
      </details>
    </section>
  );
}
