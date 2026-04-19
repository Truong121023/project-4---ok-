import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const variants = {
  variant: {
    primary:
      "bg-matcha-500 text-cream-50 shadow-soft hover:bg-matcha-700 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]",
    secondary:
      "border border-ink-900/10 bg-cream-50 text-ink-900 hover:bg-cream-100 hover:-translate-y-0.5 active:scale-[0.98]",
    ghost:
      "text-matcha-700 hover:bg-matcha-500/10 active:scale-[0.98]",
    link:
      "text-matcha-700 underline-offset-4 hover:underline p-0 h-auto",
    danger:
      "bg-danger text-cream-50 shadow-soft hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98]",
  },
  size: {
    sm: "px-4 py-2 text-xs rounded-full",
    md: "px-6 py-3 text-sm rounded-full",
    lg: "px-8 py-4 text-base rounded-full",
  },
};

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-2";

/**
 * Button — primary UI action primitive.
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'link'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        base,
        variants.variant[variant] ?? variants.variant.primary,
        variants.size[size] ?? variants.size.md,
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});

export { Button };
export default Button;
