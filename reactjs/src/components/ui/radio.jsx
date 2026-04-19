import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Radio — single radio option with label. Group multiple under a fieldset.
 * @param {string} [props.label]
 * @param {string} [props.className] — wrapper div
 */
const Radio = forwardRef(function Radio(
  { label, className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex h-4 w-4 flex-shrink-0">
        <input
          ref={ref}
          id={id}
          type="radio"
          className={cn(
            "peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-ink-900/20 bg-cream-50 transition-all duration-200",
            "checked:border-matcha-500 checked:bg-matcha-500",
            "focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-2"
          )}
          {...rest}
        />
        {/* Inner dot */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cream-50" />
        </span>
      </span>
      {label && (
        <label htmlFor={id} className="cursor-pointer text-sm text-ink-700 leading-tight">
          {label}
        </label>
      )}
    </div>
  );
});

export { Radio };
export default Radio;
