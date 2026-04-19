import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Switch — toggle pill with smooth transition.
 * Respects prefers-reduced-motion via motion-reduce Tailwind variant.
 * @param {string} [props.label]
 * @param {string} [props.className] — wrapper div
 */
const Switch = forwardRef(function Switch(
  { label, className, id: idProp, checked, onChange, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-2",
          checked ? "bg-matcha-500" : "bg-beige-300"
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-soft ring-0 transition-transform duration-200 ease-in-out motion-reduce:transition-none",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      {label && (
        <label htmlFor={id} className="cursor-pointer select-none text-sm text-ink-700">
          {label}
        </label>
      )}
    </div>
  );
});

export { Switch };
export default Switch;
