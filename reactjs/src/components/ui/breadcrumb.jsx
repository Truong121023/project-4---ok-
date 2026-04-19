import { cn } from "../../lib/cn";

/**
 * Breadcrumb — semantic nav with aria-label and separators.
 * @param {Array<{label: string, href?: string}>} props.items
 * @param {string} [props.separator='›']
 */
export function Breadcrumb({ items = [], separator = "›", className, ...rest }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("", className)} {...rest}>
      <ol className="inline-flex flex-wrap items-center gap-1 text-sm text-ink-400">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="inline-flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="text-beige-400 select-none">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-medium text-ink-800 truncate max-w-[180px]"
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href ?? "#"}
                  className="hover:text-matcha-600 transition-colors truncate max-w-[140px]"
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
