import { cn } from "../../lib/cn";

/**
 * Table — hairline rows, sticky header option, responsive horizontal scroll.
 * @param {Array<{key: string, header: React.ReactNode, render?: (row) => React.ReactNode}>} props.columns
 * @param {Array<object>} props.rows — data rows; each must have a unique `id` field
 * @param {boolean} [props.stickyHeader=false]
 * @param {React.ReactNode} [props.emptyState] — shown when rows is empty
 * @param {string} [props.className]
 */
export function Table({
  columns = [],
  rows = [],
  stickyHeader = false,
  emptyState,
  className,
  ...rest
}) {
  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-beige-200", className)} {...rest}>
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
          <tr className="bg-beige-100">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="border-b border-beige-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-400">
                {emptyState ?? "No data"}
              </td>
            </tr>
          ) : (
            rows.map((row, rIdx) => (
              <tr
                key={row.id ?? rIdx}
                className="border-b border-beige-200/60 last:border-0 hover:bg-cream-100/60 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink-800 align-middle">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
