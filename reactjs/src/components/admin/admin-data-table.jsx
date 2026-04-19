import { cn } from "../../lib/cn";

/**
 * AdminDataTable — compact Table wrapper with inline filter toolbar + empty state.
 * Hairline borders, 40px row height, sticky header, horizontal scroll.
 *
 * @param {Array<{key:string, header:React.ReactNode, render?:(row)=>React.ReactNode, className?:string}>} props.columns
 * @param {Array<object>}      props.rows         — each row should have a unique `id`
 * @param {React.ReactNode}    [props.toolbar]     — left-side toolbar content (search/filters)
 * @param {React.ReactNode}    [props.toolbarEnd]  — right-side toolbar content (export/actions)
 * @param {boolean}            [props.loading]
 * @param {string}             [props.loadingText]
 * @param {string}             [props.emptyText]
 * @param {boolean}            [props.stickyHeader=true]
 * @param {string}             [props.className]
 */
export function AdminDataTable({
  columns = [],
  rows = [],
  toolbar,
  toolbarEnd,
  loading = false,
  loadingText = "Loading data…",
  emptyText = "No records found.",
  stickyHeader = true,
  className,
}) {
  const hasToolbar = toolbar || toolbarEnd;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-ink-900/8 bg-cream-50 shadow-soft",
        className,
      )}
    >
      {/* Toolbar */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/8 px-4 py-2.5">
          <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {toolbarEnd && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbarEnd}</div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead className={cn(stickyHeader && "sticky top-0 z-10 bg-beige-100")}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "border-b border-ink-900/8 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500 whitespace-nowrap",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-ink-400"
                >
                  {loadingText}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-ink-400"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr
                  key={row.id ?? rIdx}
                  className="h-10 border-b border-ink-900/6 last:border-0 hover:bg-matcha-50/60 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-2 align-middle text-ink-800",
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDataTable;
