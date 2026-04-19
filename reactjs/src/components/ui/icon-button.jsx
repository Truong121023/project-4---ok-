import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const variants = {
  variant: {
    primary:
      "bg-matcha-500 text-cream-50 shadow-soft hover:bg-matcha-700 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]",
    secondary:
      "border border-ink-900/10 bg-cream-50 text-ink-900 hover:bg-cream-100 active:scale-[0.98]",
    ghost:
      "text-matcha-700 hover:bg-matcha-500/10 active:scale-[0.98]",
    danger:
      "bg-danger text-cream-50 hover:opacity-90 active:scale-[0.98]",
  },
  size: {
    sm: "h-8 w-8 text-sm rounded-lg",
    md: "h-10 w-10 text-base rounded-xl",
    lg: "h-12 w-12 text-lg rounded-xl",
  },
};

const base =
  "inline-flex cursor-pointer items-center justify-center flex-shrink-0 font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-2";

/**
 * IconButton — square icon-only action button.
 * @param {object} props
 * @param {string} props["aria-label"] — required for accessibility
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='ghost']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
const IconButton = forwardRef(function IconButton(
  { variant = "ghost", size = "md", className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        base,
        variants.variant[variant] ?? variants.variant.ghost,
        variants.size[size] ?? variants.size.md,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export { IconButton };
export default IconButton;
