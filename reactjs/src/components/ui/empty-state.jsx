import { cn } from "../../lib/cn";

/**
 * EmptyState — icon/emoji + title + description + optional action slot.
 * @param {React.ReactNode} [props.icon] — emoji or SVG
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] — e.g. a Button
 */
export function EmptyState({ icon, title, description, action, className, ...rest }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-beige-300 bg-cream-50 px-6 py-12 text-center",
        className
      )}
      {...rest}
    >
      {icon && (
        <span className="text-4xl leading-none" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-semibold text-ink-800">{title}</p>
        {description && (
          <p className="text-sm text-ink-400 max-w-xs">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
