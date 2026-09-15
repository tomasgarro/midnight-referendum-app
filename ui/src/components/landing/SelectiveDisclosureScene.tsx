import {
  ArrowDown,
  ChatCircle,
  Check,
  GlobeHemisphereWest,
  LockKey,
  Sparkle,
} from '@phosphor-icons/react';
import './selective-disclosure-scene.css';

/** A visual explanation of a future flow, not a live credential or verification result. */
export function SelectiveDisclosureScene() {
  return (
    <div className="disclosure-scene" aria-hidden="true">
      <div className="disclosure-scene__heading">
        <span>A little proof.</span>
        <strong>A world of possibility.</strong>
      </div>
      <div className="disclosure-vault">
        <div className="disclosure-card-label">
          <LockKey size={18} /> Your personal details
        </div>
        <div className="disclosure-private-row">
          <span>Name</span>
          <i />
        </div>
        <div className="disclosure-private-row">
          <span>Document</span>
          <i />
        </div>
        <div className="disclosure-private-row">
          <span>Address</span>
          <i />
        </div>
        <small>
          <LockKey size={12} /> These stay with you.
        </small>
      </div>
      <div className="disclosure-transfer">
        <span />
        <ArrowDown size={20} />
        <span />
      </div>
      <div className="disclosure-proof">
        <div className="disclosure-proof__icon">
          <GlobeHemisphereWest size={28} weight="thin" />
        </div>
        <div>
          <small>Only the requested attribute</small>
          <strong>Citizenship · Argentina</strong>
        </div>
        <Check className="disclosure-proof__check" size={22} />
      </div>
      <div className="disclosure-outcomes">
        <div>
          <ChatCircle size={24} weight="thin" />
          <strong>Real citizens.</strong>
          <span>Shared conversations.</span>
        </div>
        <div>
          <Sparkle size={24} weight="thin" />
          <strong>Clearer context.</strong>
          <span>Briefings with sources.</span>
        </div>
      </div>
      <p className="disclosure-caption">Future concept · illustrative proof</p>
    </div>
  );
}
