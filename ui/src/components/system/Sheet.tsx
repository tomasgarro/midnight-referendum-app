import { X } from '@phosphor-icons/react';
import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import './system.css';

export interface SheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly closeLabel?: string;
  /** Stacked under the body. The primary action goes first. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not(:disabled),textarea:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet for a decision the user has to make now.
 *
 * Presentation is meaning: a sheet is a short interruption the user answers and
 * dismisses. Anything with its own steps is a route, not a sheet.
 *
 * Focus is trapped while open and returned to the element that opened it on
 * close, because a sheet that drops focus back to the document body strands
 * keyboard and screen-reader users at the top of the page.
 */
export function Sheet({
  open,
  title,
  onClose,
  closeLabel = 'Close',
  actions,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      // `focusable.length === 0` returned above, so both are present -- but a
      // narrowing the compiler can check beats two assertions telling it to
      // stop checking.
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    document.addEventListener('keydown', handleKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    /* The scrim is a pointer convenience, not the accessible path out. Escape
       and the labelled close button both dismiss, and they are what keyboard
       and screen-reader users get. Giving the backdrop a role would put a
       control in the tree that the focus trap deliberately keeps unreachable,
       which is worse than leaving it presentational. */
    // biome-ignore lint/a11y/noStaticElementInteractions: dismissal is covered by Escape and the close button.
    <div
      className="sys-sheet__scrim"
      data-sheet-scrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="sys-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="sys-sheet__head">
          <h2 className="sys-sheet__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="sys-sheet__close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={20} />
          </button>
        </div>
        {children}
        {actions ? <div className="sys-sheet__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
