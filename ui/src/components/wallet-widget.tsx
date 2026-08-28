import { ArrowRight, CircleNotch, SignOut, Wallet, WarningCircle, X } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { type WalletCandidate, walletBrandRank } from '@/integration/wallet-discovery';

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export function WalletWidget({ compact = false }: { compact?: boolean }) {
  const {
    status,
    walletName,
    shieldedAddress,
    error,
    connect,
    disconnect,
    enableWalletDiscovery,
    availableWallets,
  } = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const walletGroups = groupWallets(availableWallets);

  const handleConnect = () => {
    const discoveredWallets = enableWalletDiscovery();
    if (discoveredWallets.length > 1) {
      setPickerOpen(true);
      return;
    }
    void connect(discoveredWallets[0]?.wallet);
  };

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setExpandedGroupId(null);
    pickerTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;

    const focusables = () =>
      Array.from(
        pickerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const closeOnEscapeOrTrapFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePicker();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusables();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        !pickerRef.current?.contains(target) &&
        !pickerTriggerRef.current?.contains(target)
      ) {
        closePicker();
      }
    };

    document.addEventListener('keydown', closeOnEscapeOrTrapFocus);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    requestAnimationFrame(() => {
      const first = focusables()[0];
      first?.focus();
    });
    return () => {
      document.removeEventListener('keydown', closeOnEscapeOrTrapFocus);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [closePicker, pickerOpen]);

  const buttonClass = compact ? 'wallet-chip' : undefined;

  if (status === 'connecting') {
    return compact ? (
      <button type="button" className="wallet-chip" disabled aria-label="Conectando wallet">
        <CircleNotch className="animate-spin" />
        <span>Conectando…</span>
      </button>
    ) : (
      <Button variant="outline" disabled>
        <CircleNotch className="animate-spin" />
        Conectando…
      </Button>
    );
  }

  if (status === 'connected' && shieldedAddress) {
    if (compact) {
      return (
        <button
          type="button"
          className="wallet-chip connected"
          onClick={disconnect}
          title="Desconectar wallet"
          aria-label="Desconectar wallet"
        >
          <span className="network-dot" />
          <span>{walletName ?? 'Wallet'}</span>
        </button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{walletName ?? 'Midnight wallet'}</span>
        <span className="text-sm font-mono text-muted-foreground">
          {truncateAddress(shieldedAddress)}
        </span>
        <Button variant="ghost" size="icon" onClick={disconnect} aria-label="Desconectar wallet">
          <SignOut />
        </Button>
      </div>
    );
  }

  return compact ? (
    <div className="wallet-picker-anchor">
      <button
        type="button"
        className={buttonClass}
        onClick={handleConnect}
        aria-expanded={pickerOpen}
        aria-controls={pickerOpen ? 'midnight-wallet-picker' : undefined}
        ref={pickerTriggerRef}
      >
        <Wallet size={14} weight="bold" />
        <span>Wallet</span>
      </button>
      {pickerOpen ? (
        <div
          className="wallet-picker"
          id="midnight-wallet-picker"
          ref={pickerRef}
          role="dialog"
          aria-label="Elegir wallet Midnight"
          aria-labelledby="midnight-wallet-picker-title"
          aria-modal="true"
        >
          <div className="wallet-picker-heading">
            <div>
              <strong id="midnight-wallet-picker-title">Elegí tu wallet</strong>
              <p>La aprobación se mantiene en tu wallet.</p>
            </div>
            <button
              type="button"
              className="popover-close"
              onClick={closePicker}
              aria-label="Cerrar selector de wallet"
            >
              <X size={15} />
            </button>
          </div>
          {walletGroups.some((group) => group.candidates.length > 1) ? (
            <p className="wallet-picker-warning" role="alert">
              <WarningCircle size={14} />
              Algunas conexiones comparten un identificador. Elegí una instancia explícitamente.
            </p>
          ) : null}
          <div className="wallet-picker-list">
            {walletGroups.map((group) => {
              const candidate = group.candidates[0];
              if (!candidate) return null;
              const isExpanded = expandedGroupId === group.id;
              return (
                <div className="wallet-picker-group" key={group.id}>
                  <button
                    type="button"
                    className="wallet-picker-option"
                    aria-expanded={group.candidates.length > 1 ? isExpanded : undefined}
                    onClick={() => {
                      if (group.candidates.length > 1) {
                        setExpandedGroupId(isExpanded ? null : group.id);
                        return;
                      }
                      setPickerOpen(false);
                      pickerTriggerRef.current?.focus();
                      void connect(candidate.wallet);
                    }}
                  >
                    {candidate.icon ? <img src={candidate.icon} alt="" /> : <Wallet size={18} />}
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>
                        {group.candidates.length > 1
                          ? `${group.candidates.length} conexiones · elegí una`
                          : `Connector ${candidate.apiVersion}`}
                      </small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                  {isExpanded ? (
                    <div className="wallet-picker-instances">
                      {group.candidates.map((instance, index) => (
                        <button
                          type="button"
                          className="wallet-picker-option wallet-picker-instance"
                          key={instance.id}
                          onClick={() => {
                            setPickerOpen(false);
                            setExpandedGroupId(null);
                            pickerTriggerRef.current?.focus();
                            void connect(instance.wallet);
                          }}
                        >
                          {instance.icon ? (
                            <img src={instance.icon} alt="" />
                          ) : (
                            <Wallet size={16} />
                          )}
                          <span>
                            <strong>
                              {instance.name} · conexión {index + 1}
                            </strong>
                            <small>Connector {instance.apiVersion}</small>
                          </span>
                          <ArrowRight size={15} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {status === 'error' && error ? (
        <p className="wallet-status-inline" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  ) : (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleConnect}>
        <Wallet />
        Conectar wallet Midnight
        <ArrowRight />
      </Button>
      {status === 'error' && error && (
        <p className="max-w-64 text-right text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

interface WalletGroup {
  id: string;
  candidates: WalletCandidate[];
}

function groupWallets(candidates: WalletCandidate[]): WalletGroup[] {
  const groups = new Map<string, WalletCandidate[]>();
  candidates.forEach((candidate) => {
    const normalizedRdns = candidate.rdns.trim().toLowerCase();
    const key = normalizedRdns || candidate.id;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  });
  return [...groups.entries()]
    .map(([id, groupedCandidates]) => ({ id, candidates: groupedCandidates }))
    .sort((left, right) => {
      const leftCandidate = left.candidates[0];
      const rightCandidate = right.candidates[0];
      if (!leftCandidate || !rightCandidate) return 0;
      return (
        walletBrandRank(leftCandidate) - walletBrandRank(rightCandidate) ||
        leftCandidate.name.localeCompare(rightCandidate.name, undefined, { sensitivity: 'base' })
      );
    });
}
