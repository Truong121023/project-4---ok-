import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Checkbox — custom matcha-styled checkbox with label.
 * @param {string} [props.label]
 * @param {string} [props.helper]
 * @param {string} [props.error]
 * @param {string} [props.className] — wrapper div
 */
const Checkbox = forwardRef(function Checkbox(
  { label, helper, error, className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="inline-flex cursor-pointer items-start gap-2.5">
        <span className="relative mt-0.5 flex h-4 w-4 flex-shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={cn(
              "peer h-4 w-4 cursor-pointer appearance-none rounded border border-ink-900/20 bg-cream-50 transition-all duration-200",
              "checked:border-matcha-500 checked:bg-matcha-500",
              "focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-2",
              error && "border-danger"
            )}
            {...rest}
          />
          {/* Checkmark — hidden until peer:checked */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-cream-50 opacity-0 peer-checked:opacity-100 text-[10px] font-bold"
          >
            ✓
          </span>
        </span>
        {label && (
          <span className="text-sm text-ink-700 leading-tight">{label}</span>
        )}
      </label>
      {error && <p role="alert" className="text-xs text-danger pl-6">{error}</p>}
      {!error && helper && <p className="text-xs text-ink-400 pl-6">{helper}</p>}
    </div>
  );
});

export { Checkbox };
export default Checkbox;
