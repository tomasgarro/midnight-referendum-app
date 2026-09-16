import { lazy, Suspense, useEffect, useState } from 'react';
import { LandingPage } from './components/landing/LandingPage';

const FeedbackPage = lazy(() => import('./views/FeedbackPage'));
const DocsPage = lazy(() => import('./views/DocsPage'));

const CivicRuntime = lazy(async () => {
  const module = await import('./CivicRuntime');
  return { default: module.CivicRuntime };
});

export function App() {
  const [inApp, setInApp] = useState(
    () => window.location.hash === '#app' || window.parent !== window,
  );
  useEffect(() => {
    const syncRoute = () => {
      const next = window.location.hash === '#app' || window.parent !== window;
      setInApp(next);
      if (next !== inApp) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [inApp]);
  if (window.location.pathname.replace(/\/$/, '') === '/docs') {
    return (
      <Suspense fallback={<main className="runtime-loading">Loading documentation…</main>}>
        <DocsPage />
      </Suspense>
    );
  }
  if (window.location.pathname.replace(/\/$/, '') === '/feedback') {
    return (
      <Suspense fallback={<main className="runtime-loading">Loading…</main>}>
        <FeedbackPage />
      </Suspense>
    );
  }
  if (!inApp) return <LandingPage />;
  return (
    <Suspense
      fallback={
        <main className="runtime-loading" aria-live="polite">
          <div className="runtime-loading__symbol" aria-hidden="true">
            <img src="/brand/midnight-symbol-white.svg" alt="" />
          </div>
          <p>A little privacy. A new possibility.</p>
          <small>Preparing your experience…</small>
        </main>
      }
    >
      <CivicRuntime />
    </Suspense>
  );
}
