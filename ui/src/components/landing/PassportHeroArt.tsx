import { type RefObject, useEffect, useRef, useState } from 'react';
import './passport-hero-art.css';

const POINTER_MEDIA =
  '(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

/** Decorative only: this never changes the visitor's identity or Passport session. */
export function PassportHeroArt({ heroRef }: { heroRef: RefObject<HTMLElement | null> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pointerEnabled, setPointerEnabled] = useState(false);
  const [humanReady, setHumanReady] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const [humanFailed, setHumanFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(POINTER_MEDIA);
    const sync = () =>
      setPointerEnabled(
        media.matches && CSS.supports('mask-image', 'radial-gradient(#000, transparent)'),
      );
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const hero = heroRef.current;
    if (!stage || !hero || !pointerEnabled || !humanReady || humanFailed) return;

    let bounds = stage.getBoundingClientRect();
    let heroBounds = hero.getBoundingClientRect();
    let frame = 0;
    let lastTime = 0;
    let visible = true;
    let tracking = false;
    const current = { x: 0, y: 0, radius: 0, rx: 0, ry: 0 };
    const target = { ...current };
    const paint = () => {
      stage.style.setProperty('--reveal-x', `${current.x}px`);
      stage.style.setProperty('--reveal-y', `${current.y}px`);
      stage.style.setProperty('--reveal-radius', `${current.radius}px`);
      stage.style.setProperty('--hand-rx', `${current.rx}deg`);
      stage.style.setProperty('--hand-ry', `${current.ry}deg`);
    };
    const tick = (time: number) => {
      const blend = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 64) / 150);
      lastTime = time;
      let unsettled = false;
      for (const key of ['x', 'y', 'radius', 'rx', 'ry'] as const) {
        current[key] += (target[key] - current[key]) * blend;
        if (Math.abs(target[key] - current[key]) > 0.01) unsettled = true;
        else current[key] = target[key];
      }
      paint();
      frame = unsettled ? requestAnimationFrame(tick) : 0;
      if (!unsettled) lastTime = 0;
    };
    const schedule = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      tracking = false;
      Object.assign(current, { radius: 0, rx: 0, ry: 0 });
      Object.assign(target, current);
      paint();
    };
    const measure = () => {
      reset();
      bounds = stage.getBoundingClientRect();
      heroBounds = hero.getBoundingClientRect();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !visible || document.hidden) return;
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      target.rx = -clamp(((event.clientY - heroBounds.top) / heroBounds.height) * 2 - 1) * 4;
      target.ry = clamp(((event.clientX - heroBounds.left) / heroBounds.width) * 2 - 1) * 4;
      // The passport center is registered in the cropped 742 × 891 artwork frame.
      const distance = Math.hypot(x - bounds.width * 0.359, y - bounds.height * 0.331);
      const reach = Math.min(bounds.width, bounds.height) * 0.65;
      const proximity = Math.max(0, 1 - distance / reach);
      const passportInfluence = proximity * proximity * (3 - 2 * proximity);
      const palmDistance = Math.hypot(x - bounds.width * 0.5, y - bounds.height * 0.7);
      const palmProximity = Math.max(0, 1 - palmDistance / (bounds.width * 0.42));
      const palmInfluence = palmProximity * palmProximity * (3 - 2 * palmProximity) * 0.75;
      const eased = Math.max(passportInfluence, palmInfluence);
      const inside = x >= 0 && y >= 0 && x <= bounds.width && y <= bounds.height;
      target.radius =
        agentReady && inside ? 12 + (Math.min(bounds.width, bounds.height) * 0.35 - 12) * eased : 0;
      target.x = x;
      target.y = y;
      if (!tracking) {
        current.x = x;
        current.y = y;
        tracking = true;
      }
      schedule();
    };
    const leave = () => {
      tracking = false;
      Object.assign(target, { radius: 0, rx: 0, ry: 0 });
      schedule();
    };
    const visibility = () => {
      if (document.hidden) reset();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (!visible) reset();
      else measure();
    });
    const scroll = () => {
      if (visible) measure();
    };
    const resize = new ResizeObserver(measure);
    observer.observe(hero);
    resize.observe(stage);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', leave);
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      resize.disconnect();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', visibility);
      reset();
    };
  }, [heroRef, pointerEnabled, humanReady, agentReady, humanFailed]);

  return (
    <figure className="passport-art">
      <div
        ref={stageRef}
        className="passport-art__stage"
        data-interactive={pointerEnabled && humanReady && agentReady && !humanFailed}
        data-failed={humanFailed}
        role="img"
        aria-label="Illustration of a hand holding a Midnight passport"
      >
        <div className="passport-art__window passport-art__window--human" aria-hidden="true">
          <div className="passport-art__pose">
            <img
              className="passport-art__hand"
              src="/art/passport/human-hand.webp"
              alt=""
              width="1672"
              height="941"
              fetchPriority="high"
              draggable="false"
              onLoad={() => setHumanReady(true)}
              onError={() => setHumanFailed(true)}
            />
            <img
              className="passport-art__logo"
              src="/brand/midnight-symbol-white.svg"
              alt=""
              width="126"
              height="126"
              draggable="false"
              hidden={!humanReady}
            />
          </div>
        </div>
        {pointerEnabled && !humanFailed && (
          <div className="passport-art__window passport-art__window--agent" aria-hidden="true">
            <div className="passport-art__pose">
              <img
                className="passport-art__hand"
                src="/art/passport/agent-hand.webp"
                alt=""
                width="1672"
                height="941"
                draggable="false"
                onLoad={() => setAgentReady(true)}
                onError={() => setAgentReady(false)}
              />
              <img
                className="passport-art__logo"
                src="/brand/midnight-symbol-black.svg"
                alt=""
                width="126"
                height="126"
                draggable="false"
              />
            </div>
          </div>
        )}
        {humanFailed && <p className="passport-art__fallback">Your identity. Your privacy.</p>}
      </div>
    </figure>
  );
}
