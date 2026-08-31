import {
  ArrowSquareOut,
  Check,
  Copy,
  Info,
  LockKey,
  QrCode,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { EnrollmentQr } from './EnrollmentQr';

interface EnrollmentHandoffProps {
  readonly uri: string;
  readonly expiresAt: string;
  readonly locale?: 'es' | 'en';
  readonly provider?: string;
}

/** Explicit cross-device handoff with copy and ordinary-link fallbacks. */
export function EnrollmentHandoff({
  uri,
  expiresAt,
  locale = 'es',
  provider = 'Rarimo',
}: EnrollmentHandoffProps) {
  const [copied, setCopied] = useState(false);
  const en = locale === 'en';

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
      <div className="passport-handoff-heading">
        <div className="passport-provider-icon" aria-hidden="true">
          <QrCode size={19} />
        </div>
        <div>
          <p className="passport-handoff-kicker">
            {en ? 'Provider handoff' : 'Enlace al proveedor'}
          </p>
          <h3 id="passport-handoff-title">
            {en ? 'Continue on your phone' : 'Continuá en tu teléfono'}
          </h3>
        </div>
      </div>
      <p>
        {en
          ? 'Scan this QR on your phone. On mobile, open the link directly. The provider handles the verification outside this browser.'
          : 'En desktop, escaneá este QR con tu teléfono. En mobile, abrí el enlace directamente. El proveedor gestiona la verificación fuera de este navegador.'}
      </p>
      <dl className="passport-handoff-boundary">
        <div>
          <dt>{en ? 'Requested' : 'Se solicita'}</dt>
          <dd>
            <ShieldCheck size={15} />
            {en
              ? 'Country match, adult class when required, and document-NFC assurance'
              : 'País habilitado, mayoría de edad si aplica y garantía NFC del documento'}
          </dd>
        </div>
        <div>
          <dt>{en ? 'Not requested' : 'No se solicita'}</dt>
          <dd>
            <LockKey size={15} />
            {en
              ? 'Name, document number, birth date, face image, ballot or wallet access'
              : 'Nombre, número de documento, fecha de nacimiento, rostro, voto o acceso a wallet'}
          </dd>
        </div>
        <div>
          <dt>{en ? 'Requestor' : 'Solicita'}</dt>
          <dd>
            <Info size={15} />
            {en
              ? `CICO civic credential service · ${provider}`
              : `Servicio de credencial cívica CICO · ${provider}`}
          </dd>
        </div>
        <div>
          <dt>{en ? 'Retention' : 'Retención'}</dt>
          <dd>
            <LockKey size={15} />
            {en
              ? 'Restricted CICO checks provider evidence transiently; raw data is never stored or returned here.'
              : 'CICO restringido valida la evidencia del proveedor de forma transitoria; los datos crudos no se guardan ni vuelven acá.'}
          </dd>
        </div>
      </dl>
      <div className="passport-enrollment-qr-wrap">
        <EnrollmentQr
          value={uri}
          label={en ? 'Verification QR code' : 'Código QR de verificación'}
        />
      </div>
      <p className="passport-enrollment-expiry">
        {en ? 'Link expires: ' : 'El enlace vence: '}
        {new Date(expiresAt).toLocaleString()}
      </p>
      <div className="passport-enrollment-handoff-actions">
        <a className="passport-action-button secondary" href={uri} rel="noreferrer" target="_blank">
          <ArrowSquareOut size={18} /> {en ? 'Open link' : 'Abrir enlace'}
        </a>
        <button
          className="passport-action-button secondary"
          aria-live="polite"
          onClick={copy}
          type="button"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? (en ? 'Link copied' : 'Enlace copiado') : en ? 'Copy link' : 'Copiar enlace'}
        </button>
      </div>
      <details>
        <summary>{en ? 'Show backup link' : 'Mostrar enlace de respaldo'}</summary>
        <code className="passport-enrollment-uri">{uri}</code>
      </details>
    </section>
  );
}
