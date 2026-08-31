import { ArrowUpRight, CheckCircle, Clock, Copy, Receipt } from '@phosphor-icons/react';
import { Card, Display, EmptyState, Eyebrow } from '@/components/system';
import type { CicoLocale } from '@/integration/locale';
import { CopyReceiptButton } from '@/views/CopyReceiptButton';
import { localizePoll, type Poll, type VoteReceipt } from '@/views/poll-model';
import { ReceiptVerifier } from '@/views/ReceiptVerifier';
import './activity-view.css';

const COPY = {
  es: {
    eyebrow: 'Tu actividad',
    title: 'Comprobantes de participación',
    lead: 'Guardados cifrados en este dispositivo. Un comprobante demuestra estado, no muestra tu elección.',
    emptyTitle: 'Todavía no hay actividad',
    empty: 'Cuando completes una votación, el comprobante aparecerá acá.',
    consultation: 'Consulta ciudadana',
    confirmed: 'Confirmado',
    simulated: 'Simulado',
    pending: 'Pendiente',
    copy: 'Copiar comprobante',
  },
  en: {
    eyebrow: 'Your activity',
    title: 'Participation receipts',
    lead: 'Stored encrypted on this device. A receipt shows status, not your choice.',
    emptyTitle: 'No activity yet',
    empty: 'When you complete a vote, its receipt will appear here.',
    consultation: 'Civic consultation',
    confirmed: 'Confirmed',
    simulated: 'Simulated',
    pending: 'Pending',
    copy: 'Copy receipt',
  },
} as const;

export interface ActivityViewProps {
  readonly polls: readonly Poll[];
  readonly receipts: readonly VoteReceipt[];
  readonly locale: CicoLocale;
}

export function ActivityView({ polls, receipts, locale }: ActivityViewProps) {
  const copy = COPY[locale];
  const receiptTitle = (receipt: VoteReceipt) => {
    const poll = polls.find((item) => item.id === receipt.pollId);
    return poll ? localizePoll(poll, locale).title : copy.consultation;
  };

  return (
    <main className="activity">
      <header className="activity__head">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Display>{copy.title}</Display>
        <p>{copy.lead}</p>
      </header>

      {receipts.length ? (
        <ol className="activity__list">
          {receipts.map((receipt) => {
            const confirmed = receipt.status === 'confirmed';
            return (
              <li key={receipt.id}>
                <Card className="activity-card">
                  <span className="activity-card__icon" data-confirmed={confirmed}>
                    {confirmed ? <CheckCircle size={22} weight="fill" /> : <Clock size={22} />}
                  </span>
                  <div className="activity-card__body">
                    <div className="activity-card__top">
                      <strong>{receiptTitle(receipt)}</strong>
                      <span data-confirmed={confirmed}>
                        {confirmed ? copy.confirmed : copy.simulated}
                      </span>
                    </div>
                    <time dateTime={receipt.createdAt}>
                      {new Date(receipt.createdAt).toLocaleString(locale === 'es' ? 'es-AR' : 'en-GB')}
                    </time>
                    <code>{receipt.id}</code>
                    <div className="activity-card__actions">
                      <CopyReceiptButton receiptId={receipt.id} locale={locale} />
                      {receipt.explorerUrl ? (
                        <a href={receipt.explorerUrl} target="_blank" rel="noreferrer">
                          <ArrowUpRight size={16} /> Explorer
                        </a>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon={<Receipt size={30} />} title={copy.emptyTitle} message={copy.empty} />
      )}

      <ReceiptVerifier receipts={receipts} locale={locale} />
      <span className="sr-only"><Copy /> {copy.copy} · {copy.pending}</span>
    </main>
  );
}
