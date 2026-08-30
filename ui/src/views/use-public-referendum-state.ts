import { watchReferendumV2State } from 'midnight-referendum-api';
import { useEffect, useState } from 'react';
import { useMidnightProviders } from '@/providers/midnight-providers';

export interface PublicReferendumState {
  state: import('midnight-referendum-api').ReferendumV2State | null;
  error: string | null;
  loading: boolean;
}

/** Live aggregates read from the contract. Never a hardcoded number. */
export function usePublicReferendumState(contractAddress: string | null): PublicReferendumState {
  const { publicDataProvider, publicReadError } = useMidnightProviders();
  const [state, setState] = useState<import('midnight-referendum-api').ReferendumV2State | null>(
    null,
  );
  const [error, setError] = useState<string | null>(publicReadError);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicDataProvider || !contractAddress) {
      setState(null);
      setLoading(false);
      setError(publicReadError);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(publicReadError);
    const subscription = watchReferendumV2State(publicDataProvider, contractAddress).subscribe({
      next: (next) => {
        if (cancelled) return;
        setState(next);
        setError(null);
        setLoading(false);
      },
      error: (reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'No se pudo leer el estado público');
        setLoading(false);
      },
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [contractAddress, publicDataProvider, publicReadError]);

  return { state, error, loading };
}
