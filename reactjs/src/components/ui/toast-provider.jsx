import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ToastItem } from "./toast";
import { cn } from "../../lib/cn";

const ToastContext = createContext(null);

let _nextId = 1;

/**
 * ToastProvider — wrap app root; exposes imperative `toast()` via context.
 * Position: top-right on desktop, bottom on mobile.
 * Auto-dismiss after `duration` ms (default 4000). Pauseable on hover.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast("Saved!", { variant: "success" });
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleAutoDismiss = useCallback((id, duration) => {
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = useCallback(
    (message, { variant = "default", duration = 4000 } = {}) => {
      const id = _nextId++;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
      scheduleAutoDismiss(id, duration);
      return id;
    },
    [scheduleAutoDismiss]
  );

  const pause = useCallback((id) => {
    clearTimeout(timers.current[id]);
  }, []);

  const resume = useCallback((id, duration) => {
    scheduleAutoDismiss(id, duration);
  }, [scheduleAutoDismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className={cn(
          "fixed z-[100] flex flex-col gap-2 pointer-events-none",
          // Top-right desktop, bottom mobile
          "bottom-4 left-1/2 -translate-x-1/2 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:translate-x-0",
          "w-full px-4 sm:w-auto sm:px-0 items-center sm:items-end"
        )}
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
            <ToastItem
              message={t.message}
              variant={t.variant}
              onDismiss={() => dismiss(t.id)}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id, t.duration)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hook to access imperative toast API. Must be used inside ToastProvider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export default ToastProvider;
