import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

const TOAST_STYLE_MAP = {
  success: {
    panel:
      "border-matcha-500/25 bg-[#f2f7eb] text-matcha-900 shadow-[0_20px_45px_rgba(89,108,61,0.18)]",
    badge: "bg-matcha-500/12 text-matcha-700",
    close: "text-matcha-700 hover:bg-matcha-500/10",
    label: "Success",
  },
  error: {
    panel:
      "border-red-200 bg-[#fff2f1] text-red-900 shadow-[0_20px_45px_rgba(185,77,77,0.16)]",
    badge: "bg-red-100 text-red-700",
    close: "text-red-700 hover:bg-red-100",
    label: "Error",
  },
  warning: {
    panel:
      "border-amber-200 bg-[#fff7e9] text-amber-950 shadow-[0_20px_45px_rgba(194,142,55,0.16)]",
    badge: "bg-amber-100 text-amber-700",
    close: "text-amber-700 hover:bg-amber-100",
    label: "Notice",
  },
  info: {
    panel:
      "border-tea-300/30 bg-[#f8f4ee] text-tea-900 shadow-[0_20px_45px_rgba(111,78,55,0.14)]",
    badge: "bg-tea-300/15 text-tea-700",
    close: "text-tea-700 hover:bg-tea-300/10",
    label: "Info",
  },
};

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ToastCard({ toast, onDismiss }) {
  const appearance = TOAST_STYLE_MAP[toast.type] ?? TOAST_STYLE_MAP.info;

  return (
    <article
      className={`toast-enter pointer-events-auto w-full max-w-xl overflow-hidden rounded-[1.45rem] border px-4 py-4 backdrop-blur-xl sm:px-5 ${appearance.panel}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${appearance.badge}`}>
          {toast.title || appearance.label}
        </div>

        <div className="min-w-0 flex-1">
          {toast.message ? (
            <p className="text-sm leading-6 sm:text-[15px] sm:leading-7">{toast.message}</p>
          ) : null}
        </div>

        <button
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base font-semibold transition ${appearance.close}`}
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
        >
          ×
        </button>
      </div>
    </article>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((input) => {
    const message = String(input?.message ?? "").trim();

    if (!message) {
      return "";
    }

    const nextToast = {
      id: createToastId(),
      type: String(input?.type ?? "info").trim().toLowerCase(),
      title: String(input?.title ?? "").trim(),
      message,
      duration: Number(input?.duration ?? 3600),
      dedupeKey: String(input?.dedupeKey ?? "").trim(),
    };

    setToasts((current) => {
      if (
        nextToast.dedupeKey &&
        current.some((toast) => toast.dedupeKey && toast.dedupeKey === nextToast.dedupeKey)
      ) {
        return current;
      }

      return [...current, nextToast];
    });

    window.setTimeout(() => {
      dismissToast(nextToast.id);
    }, nextToast.duration);

    return nextToast.id;
  }, [dismissToast]);

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
      success(message, options = {}) {
        return pushToast({ ...options, type: "success", message });
      },
      error(message, options = {}) {
        return pushToast({ ...options, type: "error", message });
      },
      warning(message, options = {}) {
        return pushToast({ ...options, type: "warning", message });
      },
      info(message, options = {}) {
        return pushToast({ ...options, type: "info", message });
      },
    }),
    [dismissToast, pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-center gap-3 px-4">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
