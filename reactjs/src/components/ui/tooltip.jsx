import { useState, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Tooltip — hover/focus triggered, CSS-only positioning (prefers top).
 * Uses role=tooltip + aria-describedby on the trigger.
 *
 * @param {React.ReactNode} props.children — the trigger element (must accept ref/event props)
 * @param {string} props.content — tooltip text
 * @param {'top'|'bottom'|'left'|'right'} [props.side='top']
 */
export function Tooltip({ children, content, side = "top", className }) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const positionMap = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={() => setVisible(true)}
      onBlurCapture={() => setVisible(false)}
    >
      {/* Clone child to inject aria-describedby */}
      <span aria-describedby={visible ? id : undefined} className="inline-flex">
        {children}
      </span>

      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink-800 px-3 py-1.5 text-xs text-cream-50 shadow-lift",
            positionMap[side] ?? positionMap.top
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
