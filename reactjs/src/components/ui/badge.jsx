import { cn } from "../../lib/cn";

const variants = {
  matcha:
    "bg-matcha-100 text-matcha-700 border border-matcha-200",
  beige:
    "bg-beige-100 text-ink-700 border border-beige-300",
  ink:
    "bg-ink-700 text-cream-50",
  danger:
    "bg-danger-soft text-danger border border-danger/20",
  success:
    "bg-success-soft text-success border border-success/20",
  warn:
    "bg-warn-soft text-warn border border-warn/20",
};

/**
 * Badge — small inline label for status/category.
 * @param {'matcha'|'beige'|'ink'|'danger'|'success'|'warn'} [variant='matcha']
 */
export function Badge({ variant = "matcha", className, children, ...rest }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variants[variant] ?? variants.matcha,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
