import type { PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import { map, type Observable } from 'rxjs';
import { parseReferendumV2, type ReferendumV2State } from './midnight-v2.js';

/**
 * Indexer-only v2 reader. It needs neither a Passport session nor wallet
 * authority and never falls back to the legacy referendum contract shape.
 */
export function watchReferendumV2State(
  publicDataProvider: PublicDataProvider,
  contractAddress: string,
): Observable<ReferendumV2State> {
  if (!contractAddress.trim()) throw new TypeError('Referendum v2 contract address is required');
  return publicDataProvider
    .contractStateObservable(contractAddress, { type: 'latest' })
    .pipe(map((state) => parseReferendumV2(state.data)));
}
