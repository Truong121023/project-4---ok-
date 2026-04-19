import { forwardRef, useId } from "react";
import { cn } from "../../lib/cn";

const sizeMap = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-3 text-sm",
  lg: "px-5 py-4 text-base",
};

/**
 * Input — text input with label, helper, and error slots.
 * @param {string} [props.label]
 * @param {string} [props.helper]
 * @param {string} [props.error]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className] — applied to the wrapper div
 * @param {string} [props.inputClassName] — applied to the <input>
 */
const Input = forwardRef(function Input(
  {
    label,
    helper,
    error,
    size = "md",
    className,
    inputClassName,
    id: idProp,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-ink-700"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        aria-describedby={
          error ? errorId : helper ? helperId : undefined
        }
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-lg border bg-cream-50 text-ink-900 outline-none transition-all duration-300 placeholder:text-ink-400",
          "focus:border-matcha-500 focus:shadow-[0_0_0_3px_oklch(46%_0.11_140_/_0.15)]",
          error
            ? "border-danger shadow-[0_0_0_1px_var(--color-danger)]"
            : "border-ink-900/10",
          sizeMap[size] ?? sizeMap.md,
          inputClassName
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

export { Input };
export default Input;
