import { cn } from "../../lib/cn";

const btnBase =
  "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-matcha-500 focus-visible:outline-offset-2";

/**
 * Pagination — first/prev/numbers/next/last; responsive.
 * @param {number} props.page — 1-based current page
 * @param {number} props.total — total page count
 * @param {(page: number) => void} props.onChange
 */
export function Pagination({ page, total, onChange, className, ...rest }) {
  if (total <= 1) return null;

  const pages = buildPageList(page, total);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)} {...rest}>
      <button
        className={cn(btnBase, "text-ink-500 hover:bg-beige-100")}
        aria-label="First page"
        disabled={page <= 1}
        onClick={() => onChange(1)}
      >«</button>
      <button
        className={cn(btnBase, "text-ink-500 hover:bg-beige-100")}
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >‹</button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-ink-400 select-none">…</span>
        ) : (
          <button
            key={p}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              btnBase,
              p === page
                ? "bg-matcha-500 text-cream-50"
                : "text-ink-700 hover:bg-beige-100"
            )}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className={cn(btnBase, "text-ink-500 hover:bg-beige-100")}
        aria-label="Next page"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >›</button>
      <button
        className={cn(btnBase, "text-ink-500 hover:bg-beige-100")}
        aria-label="Last page"
        disabled={page >= total}
        onClick={() => onChange(total)}
      >»</button>
    </nav>
  );
}

/** Build page number list with ellipsis for large ranges */
function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export default Pagination;
