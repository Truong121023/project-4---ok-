import { cn } from "../../lib/cn";

/**
 * Tag — small removable label, e.g. filter chips.
 * @param {string} [props.className]
 * @param {() => void} [props.onRemove] — renders × button when provided
 */
export function Tag({ className, children, onRemove, ...rest }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-beige-100 px-3 py-1 text-xs font-medium text-ink-700 border border-beige-300",
        className
      )}
      {...rest}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-ink-400 hover:bg-beige-300 hover:text-ink-700 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}

export default Tag;
