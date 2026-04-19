import { useRef, useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Tabs — controlled, fully keyboard-navigable (arrow keys, Home, End).
 * ARIA: role=tablist / role=tab / aria-selected / role=tabpanel.
 *
 * @param {Array<{id: string, label: React.ReactNode, content: React.ReactNode}>} props.tabs
 * @param {string} props.active — id of active tab
 * @param {(id: string) => void} props.onChange
 */
export function Tabs({ tabs = [], active, onChange, className, ...rest }) {
  const uid = useId();
  const tabRefs = useRef([]);

  function handleKeyDown(e, idx) {
    const count = tabs.length;
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % count;
    else if (e.key === "ArrowLeft") next = (idx - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;

    e.preventDefault();
    onChange(tabs[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={cn("flex flex-col", className)} {...rest}>
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex gap-0 border-b border-beige-300 overflow-x-auto"
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[idx] = el)}
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                "relative flex-shrink-0 px-5 py-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-[-2px]",
                isActive
                  ? "text-matcha-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-matcha-500"
                  : "text-ink-500 hover:text-ink-800 hover:bg-beige-100/60"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="focus-visible:outline-none pt-4"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </div>
  );
}

export default Tabs;
