import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Select — native select restyled with Kamatcha tokens. KISS: no custom popover.
 * @param {string} [props.label]
 * @param {string} [props.helper]
 * @param {string} [props.error]
 * @param {string} [props.className] — wrapper div
 * @param {string} [props.selectClassName] — select element
 */
const Select = forwardRef(function Select(
  { label, helper, error, className, selectClassName, id: idProp, children, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full appearance-none rounded-lg border bg-cream-50 px-4 py-3 pr-10 text-sm text-ink-900 outline-none transition-all duration-300",
            "focus:border-matcha-500 focus:shadow-[0_0_0_3px_oklch(46%_0.11_140_/_0.15)]",
            error ? "border-danger" : "border-ink-900/10",
            selectClassName
          )}
          {...rest}
        >
          {children}
        </select>
        {/* Chevron icon */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
        >
          ▾
        </span>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={helperId} className="text-xs text-ink-400">
          {helper}
        </p>
      )}
    </div>
  );
});

export { Select };
export default Select;
