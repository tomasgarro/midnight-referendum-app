import { ArrowRight, Check, Fingerprint, LockKey, SealCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import type { CicoLocale } from '@/integration/locale';
import './proof-playground.css';

const labels = {
  en: {
    private: 'Personal details',
    stays: 'Stay private',
    proof: 'Only the answer',
    eligible: 'Meets the rule',
    show: 'Try a zero-knowledge proof',
    reset: 'Play again',
    hint: 'An illustration, not a real proof.',
    result: 'The rule is checked. The personal details stay hidden.',
  },
  es: {
    private: 'Datos personales',
    stays: 'Quedan privados',
    proof: 'Solo la respuesta',
    eligible: 'Cumple la regla',
    show: 'Probá una prueba de conocimiento cero',
    reset: 'Repetir',
    hint: 'Una ilustración, no una prueba real.',
    result: 'Se comprueba la regla. Los datos personales quedan ocultos.',
  },
  fr: {
    private: 'Données personnelles',
    stays: 'Restent privées',
    proof: 'Seulement la réponse',
    eligible: 'Règle satisfaite',
    show: 'Essayer une preuve à divulgation nulle',
    reset: 'Rejouer',
    hint: 'Une illustration, pas une preuve réelle.',
    result: 'La règle est vérifiée. Les données personnelles restent cachées.',
  },
};

export function ProofPlayground({ locale = 'en' }: { locale?: CicoLocale }) {
  const [proved, setProved] = useState(false);
  const t = labels[locale];
  return (
    <div className="proof-playground" data-proved={proved}>
      <div className="proof-playground__lanes" aria-hidden="true">
        <div className="proof-playground__identity">
          <Fingerprint size={32} weight="thin" />
          <span>{t.private}</span>
          <div className="proof-playground__redactions">
            <i />
            <i />
            <i />
          </div>
          <small>
            <LockKey size={12} /> {t.stays}
          </small>
        </div>
        <ArrowRight className="proof-playground__arrow" size={22} />
        <div className="proof-playground__token">
          <SealCheck size={38} weight="thin" />
          <span>{t.proof}</span>
          <strong>
            <Check size={14} /> {t.eligible}
          </strong>
        </div>
      </div>
      <button type="button" aria-pressed={proved} onClick={() => setProved(!proved)}>
        {proved ? t.reset : t.show} <ArrowRight size={16} />
      </button>
      <p className="proof-playground__caption" aria-live="polite">
        {proved ? `${t.result} ${t.hint}` : t.hint}
      </p>
    </div>
  );
}
