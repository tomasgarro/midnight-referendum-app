import { useRef, useState } from 'react';
import type { CicoLocale } from '@/integration/locale';
import './feedback.css';

const COPY = {
  en: {
    message: 'Your message',
    email: 'Your email (optional)',
    send: 'Send feedback',
    sending: 'Sending…',
    note: 'Your message goes to contact@midnight.vote. Only the text and optional email you enter are sent. Please leave out passport details, credentials and voting choices.',
    success: 'Thank you for helping us improve.',
    again: 'Write another message',
    error:
      'We could not send your feedback. Your message is still here. Please retry or email us directly.',
    limited: 'Please wait a few minutes before sending again, or email us directly.',
    direct: 'Email us directly',
    placeholder: 'What worked, and what could be clearer?',
  },
  es: {
    message: 'Tu mensaje',
    email: 'Tu email (opcional)',
    send: 'Enviar feedback',
    sending: 'Enviando…',
    note: 'Tu mensaje llega a contact@midnight.vote. Solo enviamos el texto y el email opcional que ingresás. No incluyas datos del pasaporte, credenciales ni respuestas de voto.',
    success: 'Gracias por ayudarnos a mejorar.',
    again: 'Escribir otro mensaje',
    error: 'No pudimos enviar tu mensaje. Sigue acá. Reintentá o escribinos por email.',
    limited: 'Esperá unos minutos antes de volver a enviar, o escribinos por email.',
    direct: 'Escribinos por email',
    placeholder: '¿Qué funcionó y qué podría ser más claro?',
  },
  fr: {
    message: 'Votre message',
    email: 'Votre email (facultatif)',
    send: 'Envoyer le retour',
    sending: 'Envoi…',
    note: 'Votre message est envoyé à contact@midnight.vote. Seuls le texte et l’email facultatif saisis sont transmis. N’incluez ni données de passeport, ni justificatifs, ni choix de vote.',
    success: 'Merci de nous aider à améliorer cette expérience.',
    again: 'Écrire un autre message',
    error: 'L’envoi a échoué. Votre message est toujours ici. Réessayez ou écrivez-nous par email.',
    limited: 'Patientez quelques minutes avant de réessayer, ou écrivez-nous par email.',
    direct: 'Nous écrire par email',
    placeholder: 'Qu’est-ce qui a fonctionné ? Que pourrait-on clarifier ?',
  },
};

export function FeedbackForm({ locale }: { locale: CicoLocale }) {
  const t = COPY[locale];
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'limited'>('idle');
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const edit = () => {
    requestId.current = null;
    setState('idle');
  };
  const submit = async () => {
    if (busy.current || message.trim().length < 10) return;
    busy.current = true;
    setState('sending');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      requestId.current ??= crypto.randomUUID();
      const response = await fetch('/api/feedback.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: controller.signal,
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim(),
          website,
          locale,
          requestId: requestId.current,
        }),
      });
      if (response.status === 429) {
        setState('limited');
        return;
      }
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('Feedback not accepted');
      setMessage('');
      setEmail('');
      setState('sent');
    } catch {
      setState('error');
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  };
  return (
    <form
      className="feedback-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {state === 'sent' ? (
        <div className="feedback-form__success" role="status">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" />
            <path d="m14 24 7 7 14-15" fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <p>{t.success}</p>
          <button type="button" onClick={edit}>
            {t.again}
          </button>
        </div>
      ) : (
        <>
          <label htmlFor="feedback-message">{t.message}</label>
          <textarea
            id="feedback-message"
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            value={message}
            disabled={state === 'sending'}
            placeholder={t.placeholder}
            onChange={(event) => {
              setMessage(event.target.value);
              edit();
            }}
            aria-describedby="feedback-privacy"
          />
          <label htmlFor="feedback-email">{t.email}</label>
          <input
            id="feedback-email"
            type="email"
            maxLength={254}
            autoComplete="email"
            value={email}
            disabled={state === 'sending'}
            onChange={(event) => {
              setEmail(event.target.value);
              edit();
            }}
          />
          <div className="feedback-form__trap" aria-hidden="true">
            <label htmlFor="feedback-website">Website</label>
            <input
              id="feedback-website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <p id="feedback-privacy" className="feedback-form__note">
            {t.note}
          </p>
          {(state === 'error' || state === 'limited') && (
            <p role="alert">{state === 'limited' ? t.limited : t.error}</p>
          )}
          <button type="submit" disabled={state === 'sending' || message.trim().length < 10}>
            {state === 'sending' ? t.sending : t.send}
          </button>
        </>
      )}
      <a href="mailto:contact@midnight.vote">{t.direct} ↗</a>
    </form>
  );
}
