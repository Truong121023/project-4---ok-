import { useEffect, useRef, useCallback } from "react";
import { cn } from "../../lib/cn";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const slideIn = {
  left:   "translate-x-0",
  right:  "translate-x-0",
  bottom: "translate-y-0",
};
const slideOut = {
  left:   "-translate-x-full",
  right:  "translate-x-full",
  bottom: "translate-y-full",
};
const positionMap = {
  left:   "inset-y-0 left-0 h-full w-full max-w-sm",
  right:  "inset-y-0 right-0 h-full w-full max-w-sm",
  bottom: "inset-x-0 bottom-0 w-full max-h-[80vh] rounded-t-2xl",
};

/**
 * Sheet — mobile drawer using Dialog internals.
 * Slide animation respects prefers-reduced-motion.
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {'left'|'right'|'bottom'} [props.side='right']
 * @param {string} [props.title]
 */
export function Sheet({ open, onClose, side = "right", title, className, children, ...rest }) {
  const panelRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  // Focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const prev = document.activeElement;
    el.querySelectorAll(FOCUSABLE)[0]?.focus();

    function onKey(e) {
      if (e.key !== "Tab") return;
      const focusable = [...el.querySelectorAll(FOCUSABLE)];
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    }
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [open]);

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

  return (
    <div className="fixed inset-0 z-50" aria-modal="true">
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
        aria-label={title ?? "Sheet"}
        className={cn(
          "absolute flex flex-col bg-cream-50 shadow-lift overflow-y-auto",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          open ? slideIn[side] : slideOut[side],
          positionMap[side] ?? positionMap.right,
          className
        )}
        {...rest}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-beige-200 px-5 py-4 flex-shrink-0">
          {title && <p className="font-semibold text-ink-900">{title}</p>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-lg p-1 text-ink-400 hover:bg-beige-100 hover:text-ink-700 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export default Sheet;
