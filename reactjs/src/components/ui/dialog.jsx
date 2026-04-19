import { useEffect, useRef, useCallback, useId } from "react";
import { cn } from "../../lib/cn";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Trap focus inside `containerRef` while dialog is open. */
function useFocusTrap(containerRef, open) {
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const el = containerRef.current;
    const prev = document.activeElement;

    // Focus first focusable element
    const first = el.querySelectorAll(FOCUSABLE)[0];
    first?.focus();

    function onKeyDown(e) {
      if (e.key !== "Tab") return;
      const focusable = [...el.querySelectorAll(FOCUSABLE)];
      if (!focusable.length) { e.preventDefault(); return; }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      prev?.focus();
    };
  }, [open, containerRef]);
}

/**
 * Dialog — modal with overlay, focus trap, Esc closes, restores focus.
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='md']
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  className,
  children,
  ...rest
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useFocusTrap(panelRef, open);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const sizeMap = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "relative z-10 w-full rounded-2xl bg-cream-50 shadow-lift flex flex-col max-h-[90vh]",
          sizeMap[size] ?? sizeMap.md,
          className
        )}
        {...rest}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-beige-200 px-6 py-5">
            {title && (
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-ink-900">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-ink-500">{description}</p>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="ml-auto flex-shrink-0 rounded-lg p-1 text-ink-400 hover:bg-beige-100 hover:text-ink-700 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default Dialog;
