import { cn } from "../../lib/cn";

/**
 * Stepper — horizontal steps with current/completed/upcoming states.
 * Mobile collapses to "Step X of Y" text.
 * @param {Array<{id: string|number, label: string}>} props.steps
 * @param {string|number} props.current — id of the active step
 */
export function Stepper({ steps = [], current, className, ...rest }) {
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className={cn("w-full", className)} {...rest}>
      {/* Mobile: compact text */}
      <p className="sm:hidden text-sm font-medium text-ink-600 mb-2">
        Step {currentIdx + 1} of {steps.length}
        {steps[currentIdx] && (
          <span className="text-ink-900 font-semibold"> — {steps[currentIdx].label}</span>
        )}
      </p>

      {/* Desktop: full step row */}
      <ol className="hidden sm:flex items-center">
        {steps.map((step, idx) => {
          const isDone    = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isLast    = idx === steps.length - 1;

          return (
            <li key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isDone    && "bg-matcha-500 text-cream-50",
                    isCurrent && "bg-matcha-500 text-cream-50 ring-4 ring-matcha-500/20",
                    !isDone && !isCurrent && "border-2 border-beige-300 bg-cream-50 text-ink-400"
                  )}
                >
                  {isDone ? "✓" : idx + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    isCurrent ? "text-matcha-700" : isDone ? "text-ink-600" : "text-ink-400"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 transition-colors",
                    idx < currentIdx ? "bg-matcha-400" : "bg-beige-300"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default Stepper;
