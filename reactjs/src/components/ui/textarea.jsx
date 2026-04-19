import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Textarea — multiline text input matching Input styling.
 * @param {string} [props.label]
 * @param {string} [props.helper]
 * @param {string} [props.error]
 * @param {number} [props.rows=4]
 * @param {string} [props.className] — wrapper div
 * @param {string} [props.textareaClassName] — textarea element
 */
const Textarea = forwardRef(function Textarea(
  { label, helper, error, rows = 4, className, textareaClassName, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-describedby={error ? errorId : helper ? helperId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full resize-y rounded-lg border bg-cream-50 px-4 py-3 text-sm text-ink-900 outline-none transition-all duration-300 placeholder:text-ink-400",
          "focus:border-matcha-500 focus:shadow-[0_0_0_3px_oklch(46%_0.11_140_/_0.15)]",
          error
            ? "border-danger shadow-[0_0_0_1px_var(--color-danger)]"
            : "border-ink-900/10",
          textareaClassName
        )}
        {...rest}
      />
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

export { Textarea };
export default Textarea;
