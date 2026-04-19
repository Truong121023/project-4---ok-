import { cn } from "../../lib/cn";

const variantMap = {
  default: "bg-ink-800 text-cream-50",
  success: "bg-success text-cream-50",
  danger:  "bg-danger text-cream-50",
  warn:    "bg-warn text-cream-50",
};

/**
 * ToastItem — single toast notification.
 * Auto-dismiss and pause-on-hover are managed by ToastProvider.
 * @param {'default'|'success'|'danger'|'warn'} [props.variant='default']
 * @param {string} props.message
 * @param {() => void} props.onDismiss
 * @param {() => void} [props.onMouseEnter] — pause timer
 * @param {() => void} [props.onMouseLeave] — resume timer
 */
export function ToastItem({
  message,
  variant = "default",
  onDismiss,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "toast-enter flex items-start gap-3 rounded-xl px-4 py-3 shadow-lift text-sm font-medium max-w-xs w-full",
        variantMap[variant] ?? variantMap.default
      )}
    >
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity leading-none text-base"
      >
        ✕
      </button>
    </div>
  );
}

export default ToastItem;
