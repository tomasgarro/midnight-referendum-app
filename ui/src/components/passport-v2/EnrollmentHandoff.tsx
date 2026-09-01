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
import { formatDateTime } from '@/integration/format';
import type { CicoLocale } from '@/integration/locale';
import { EnrollmentQr } from './EnrollmentQr';

interface EnrollmentHandoffProps {
  readonly uri: string;
  readonly expiresAt: string;
  readonly locale?: CicoLocale;
  readonly provider?: string;
}

const COPY = {
  es: {
    kicker: 'Enlace al proveedor',
    title: 'Continuá en tu teléfono',
    lead: 'En desktop, escaneá este QR con tu teléfono. En mobile, abrí el enlace directamente. El proveedor gestiona la verificación fuera de este navegador.',
    requested: 'Se solicita',
    requestedValue: 'País habilitado, mayoría de edad si aplica y garantía NFC del documento',
    notRequested: 'No se solicita',
    notRequestedValue:
      'Nombre, número de documento, fecha de nacimiento, rostro, voto o acceso a wallet',
    requestor: 'Solicita',
    requestorValue: (provider: string) => `Servicio de credencial cívica CICO · ${provider}`,
    retention: 'Retención',
    retentionValue:
      'CICO restringido valida la evidencia del proveedor de forma transitoria; los datos crudos no se guardan ni vuelven acá.',
    qrLabel: 'Código QR de verificación',
    expires: 'El enlace vence: ',
    openLink: 'Abrir enlace',
    copyLink: 'Copiar enlace',
    copied: 'Enlace copiado',
    backup: 'Mostrar enlace de respaldo',
  },
  en: {
    kicker: 'Provider handoff',
    title: 'Continue on your phone',
    lead: 'Scan this QR on your phone. On mobile, open the link directly. The provider handles the verification outside this browser.',
    requested: 'Requested',
    requestedValue: 'Country match, adult class when required, and document-NFC assurance',
    notRequested: 'Not requested',
    notRequestedValue: 'Name, document number, birth date, face image, ballot or wallet access',
    requestor: 'Requestor',
    requestorValue: (provider: string) => `CICO civic credential service · ${provider}`,
    retention: 'Retention',
    retentionValue:
      'Restricted CICO checks provider evidence transiently; raw data is never stored or returned here.',
    qrLabel: 'Verification QR code',
    expires: 'Link expires: ',
    openLink: 'Open link',
    copyLink: 'Copy link',
    copied: 'Link copied',
    backup: 'Show backup link',
  },
  fr: {
    kicker: 'Renvoi vers le fournisseur',
    title: 'Continuez sur votre téléphone',
    lead: 'Sur ordinateur, scannez ce QR avec votre téléphone. Sur mobile, ouvrez directement le lien. Le fournisseur gère la vérification en dehors de ce navigateur.',
    requested: 'Demandé',
    requestedValue: 'Pays éligible, majorité si requise, et garantie NFC du document',
    notRequested: 'Non demandé',
    notRequestedValue:
      'Nom, numéro de document, date de naissance, visage, vote ou accès au portefeuille',
    requestor: 'Demandeur',
    requestorValue: (provider: string) => `Service de justificatif civique CICO · ${provider}`,
    retention: 'Conservation',
    retentionValue:
      'Le CICO restreint vérifie les preuves du fournisseur de façon transitoire ; les données brutes ne sont ni conservées ni renvoyées ici.',
    qrLabel: 'Code QR de vérification',
    expires: 'Le lien expire : ',
    openLink: 'Ouvrir le lien',
    copyLink: 'Copier le lien',
    copied: 'Lien copié',
    backup: 'Afficher le lien de secours',
  },
} as const;

/** Explicit cross-device handoff with copy and ordinary-link fallbacks. */
export function EnrollmentHandoff({
  uri,
  expiresAt,
  locale = 'es',
  provider = 'Rarimo',
}: EnrollmentHandoffProps) {
  const [copied, setCopied] = useState(false);
  const t = COPY[locale];

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
          <p className="passport-handoff-kicker">{t.kicker}</p>
          <h3 id="passport-handoff-title">{t.title}</h3>
        </div>
      </div>
      <p>{t.lead}</p>
      <dl className="passport-handoff-boundary">
        <div>
          <dt>{t.requested}</dt>
          <dd>
            <ShieldCheck size={15} />
            {t.requestedValue}
          </dd>
        </div>
        <div>
          <dt>{t.notRequested}</dt>
          <dd>
            <LockKey size={15} />
            {t.notRequestedValue}
          </dd>
        </div>
        <div>
          <dt>{t.requestor}</dt>
          <dd>
            <Info size={15} />
            {t.requestorValue(provider)}
          </dd>
        </div>
        <div>
          <dt>{t.retention}</dt>
          <dd>
            <LockKey size={15} />
            {t.retentionValue}
          </dd>
        </div>
      </dl>
      <div className="passport-enrollment-qr-wrap">
        <EnrollmentQr value={uri} label={t.qrLabel} />
      </div>
      <p className="passport-enrollment-expiry">
        {t.expires}
        {formatDateTime(expiresAt, locale) ?? expiresAt}
      </p>
      <div className="passport-enrollment-handoff-actions">
        <a className="passport-action-button secondary" href={uri} rel="noreferrer" target="_blank">
          <ArrowSquareOut size={18} /> {t.openLink}
        </a>
        <button
          className="passport-action-button secondary"
          aria-live="polite"
          onClick={copy}
          type="button"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? t.copied : t.copyLink}
        </button>
      </div>
      <details>
        <summary>{t.backup}</summary>
        <code className="passport-enrollment-uri">{uri}</code>
      </details>
    </section>
  );
}
