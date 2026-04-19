import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const variants = {
  variant: {
    flat:     "bg-cream-50",
    raised:   "bg-cream-50 shadow-soft hover:shadow-lift",
    outlined: "bg-transparent border border-ink-900/10",
  },
  padding: {
    none: "",
    sm:   "p-4",
    md:   "p-6",
    lg:   "p-8",
  },
};

/**
 * Card — content container with variant and padding options.
 * @param {'flat'|'raised'|'outlined'} [props.variant='raised']
 * @param {'none'|'sm'|'md'|'lg'} [props.padding='md']
 */
const Card = forwardRef(function Card(
  { variant = "raised", padding = "md", className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl transition-shadow duration-300",
        variants.variant[variant] ?? variants.variant.raised,
        variants.padding[padding] ?? variants.padding.md,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export { Card };
export default Card;
