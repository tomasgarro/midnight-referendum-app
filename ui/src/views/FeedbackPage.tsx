import { useEffect, useState } from 'react';
import { type CicoLocale, detectLocale } from '@/integration/locale';
import { applyTheme, detectThemePreference } from '@/integration/theme';
import { FeedbackForm } from './FeedbackForm';

export default function FeedbackPage() {
  const [locale, setLocale] = useState<CicoLocale>(() => detectLocale());
  useEffect(() => {
    applyTheme(detectThemePreference());
  }, []);
  const t = {
    en: [
      'Help and feedback',
      'Tell us where you got stuck or what would make this experience clearer.',
      'Back to midnight.vote',
    ],
    es: [
      'Ayuda y feedback',
      'Contanos dónde te trabaste o qué haría más clara esta experiencia.',
      'Volver a midnight.vote',
    ],
    fr: [
      'Aide et retours',
      'Dites-nous ce qui rendrait cette expérience plus claire.',
      'Retour à midnight.vote',
    ],
  }[locale];
  return (
    <main className="feedback-page">
      <header>
        <a href="/">← {t[2]}</a>
        <select
          aria-label="Language"
          value={locale}
          onChange={(event) => setLocale(event.target.value as CicoLocale)}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
        </select>
      </header>
      <h1>{t[0]}</h1>
      <p>{t[1]}</p>
      <FeedbackForm locale={locale} />
    </main>
  );
}
