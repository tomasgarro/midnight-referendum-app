import { ArrowLeft, Fingerprint, Info } from '@phosphor-icons/react';
import type { CivicPassportSession, PassportSessionPort } from 'midnight-referendum-api';
import type { DemoCredentialSummary } from '@/integration/cico-passport-journey';
import type { CicoLocale } from '@/integration/locale';
import { PreviewPassportJourney, type PreviewPassportJourneyPorts } from './PreviewPassportJourney';
import { UnifiedPassportOnboarding } from './UnifiedPassportOnboarding';

type JourneyMode = 'demo' | 'showcase' | 'preview' | 'undeployed';

interface PassportJourneyProps {
  mode: JourneyMode;
  onClose: () => void;
  dismissible?: boolean;
  passportPort?: PassportSessionPort;
  previewPorts?: PreviewPassportJourneyPorts;
  onCredentialReady?: (credential: DemoCredentialSummary) => void;
  onPassportConnected?: (session: CivicPassportSession | null) => void;
  initialLocale?: CicoLocale;
  onLocaleChange?: (locale: CicoLocale) => void;
}

function PreviewUnavailable({ onClose }: { onClose: () => void }) {
  return (
    <main className="page-content passport-journey-page unified-onboarding">
      <button className="back-button" onClick={onClose} type="button">
        <ArrowLeft size={18} /> Volver a la app
      </button>
      <section
        className="passport-journey-card unified-card"
        aria-labelledby="passport-preview-title"
      >
        <div className="unified-hero-icon">
          <Fingerprint size={38} />
        </div>
        <p className="eyebrow">Entorno Preview</p>
        <h1 id="passport-preview-title">La credencial Passport todavía no está conectada</h1>
        <p>
          La sesión Passport puede existir como superficie de identidad, pero este entorno no tiene
          una emisión de credenciales cívicas configurada.
        </p>
        <div className="passport-notice warning" role="status">
          <Info size={18} />
          <p>
            No presentamos una fixture como una credencial real. La evidencia real necesita un
            proveedor configurado y verificado server-side.
          </p>
        </div>
        <button className="passport-action-button secondary" onClick={onClose} type="button">
          Volver a la app
        </button>
      </section>
    </main>
  );
}

export function PassportJourney({
  mode,
  onClose,
  dismissible = true,
  passportPort,
  previewPorts,
  onCredentialReady,
  onPassportConnected,
  initialLocale,
  onLocaleChange,
}: PassportJourneyProps) {
  // Undeployed owns a local chain, but its account/identity surface is still
  // the official Preview Passport. Never fall back to the synthetic Unified
  // journey here: that would make a local fixture look like a real account.
  if (mode === 'preview' || mode === 'undeployed') {
    if (previewPorts) {
      return (
        <PreviewPassportJourney
          onClose={onClose}
          onCredentialReady={onCredentialReady}
          onPassportConnected={onPassportConnected}
          mode={mode}
          ports={previewPorts}
          initialLocale={initialLocale}
          onLocaleChange={onLocaleChange}
        />
      );
    }
    return <PreviewUnavailable onClose={onClose} />;
  }

  return (
    <UnifiedPassportOnboarding
      mode={mode}
      onClose={onClose}
      dismissible={dismissible}
      onCredentialReady={onCredentialReady}
      onPassportConnected={onPassportConnected}
      passportPort={passportPort}
      initialLocale={initialLocale}
      onLocaleChange={onLocaleChange}
    />
  );
}
