import { useCallback, useEffect, useId, useRef, useState } from 'react';

const activeJourneys: string[] = [];

/** Each visit is reversible, including optional and nested document screens. */
export function useJourneyHistory<T extends string>(initial: T, onEntryBack?: () => void) {
  const [visits, setVisits] = useState<T[]>([initial]);
  const id = useId();
  const current = useRef(initial);
  const entryBack = useRef(onEntryBack);
  entryBack.current = onEntryBack;
  const visitsRef = useRef(visits);
  const stage = visits[visits.length - 1] ?? initial;
  current.current = stage;
  visitsRef.current = visits;
  useEffect(() => {
    if (entryBack.current && window.history.state?.midnightJourney?.id !== id)
      window.history.pushState(
        { ...window.history.state, midnightJourney: { id, depth: 0 } },
        '',
        window.location.href,
      );
    activeJourneys.push(id);
    const pop = (event: PopStateEvent) => {
      if (activeJourneys[activeJourneys.length - 1] !== id) return;
      const destination = event.state?.midnightJourney;
      if (destination?.id !== id && entryBack.current) {
        entryBack.current();
        return;
      }
      setVisits((previous) => {
        const length =
          destination?.id === id
            ? Math.min(previous.length, destination.depth + 1)
            : Math.max(1, previous.length - 1);
        const next = previous.slice(0, length);
        current.current = next[next.length - 1] ?? initial;
        return next;
      });
    };
    window.addEventListener('popstate', pop);
    return () => {
      const index = activeJourneys.lastIndexOf(id);
      if (index >= 0) activeJourneys.splice(index, 1);
      window.removeEventListener('popstate', pop);
    };
  }, [id, initial]);
  const go = useCallback(
    (next: T) => {
      if (current.current === next) return;
      current.current = next;
      const updated = [...visitsRef.current, next];
      visitsRef.current = updated;
      // Same URL: app routing remains owned by the existing hash router.
      window.history.pushState(
        { ...window.history.state, midnightJourney: { id, depth: updated.length - 1 } },
        '',
        window.location.href,
      );
      setVisits(updated);
    },
    [id],
  );
  const backLocal = useCallback(() => {
    const previous = visitsRef.current;
    if (previous.length < 2) return;
    const next = previous.slice(0, -1);
    current.current = next[next.length - 1] ?? initial;
    visitsRef.current = next;
    setVisits(next);
  }, [initial]);
  const back = useCallback(() => {
    if (visitsRef.current.length > 1) backLocal();
    if (window.history.state?.midnightJourney?.id === id) window.history.back();
    else if (visitsRef.current.length === 1) entryBack.current?.();
  }, [id, backLocal]);
  return { stage, go, back, backLocal, canBack: visits.length > 1, current };
}
