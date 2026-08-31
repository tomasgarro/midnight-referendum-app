import { CaretDown, Globe } from '@phosphor-icons/react';
import type { CicoLocale } from '@/integration/locale';
import './system.css';

export interface LanguageToggleProps {
  readonly locale: CicoLocale;
  readonly onChange: (locale: CicoLocale) => void;
  /** Localized accessible name for the control. */
  readonly label: string;
}

/**
 * Globe, two letters, caret.
 *
 * The control it replaces was a full-height bordered <select> with a visible
 * "Idioma" label beside it, which is the widest possible way to offer a binary
 * choice and put a form field in the first tab stop of a welcome screen. This
 * is a pill the width of "ES", and it sits on the same row as the environment
 * chip so the utility strip is one line rather than two stacked ones.
 *
 * It is still a real <select>: the native control gives keyboard support, the
 * iOS/Android picker, and the accessible name for free. The visible pill is a
 * label the select is laid over at zero opacity.
 */
export function LanguageToggle({ locale, onChange, label }: LanguageToggleProps) {
  return (
    <span className="sys-lang">
      <Globe size={15} weight="bold" aria-hidden="true" />
      <span className="sys-lang__value" aria-hidden="true">
        {locale === 'es' ? 'ES' : 'EN'}
      </span>
      <CaretDown size={11} weight="bold" aria-hidden="true" />
      <select
        className="sys-lang__select"
        aria-label={label}
        value={locale}
        onChange={(event) => onChange(event.target.value as CicoLocale)}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </span>
  );
}
