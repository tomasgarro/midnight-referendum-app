export function ConnectionStatus({ state }: { state: 'waiting' | 'error' | 'success' }) {
  return (
    <span className="connection-status" data-state={state} aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" focusable="false" aria-hidden="true">
        <circle className="connection-status__track" cx="32" cy="32" r="27" />
        {state === 'waiting' ? (
          <path className="connection-status__spinner" d="M32 5a27 27 0 0 1 27 27" />
        ) : state === 'success' ? (
          <path className="connection-status__check" pathLength="1" d="m19 32 9 9 18-19" />
        ) : (
          <g className="connection-status__notice">
            <path d="M32 19v16" />
            <circle cx="32" cy="44" r="1.6" fill="currentColor" stroke="none" />
          </g>
        )}
      </svg>
    </span>
  );
}
