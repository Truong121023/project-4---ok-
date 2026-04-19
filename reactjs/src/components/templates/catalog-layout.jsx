import { cn } from "../../lib/cn";

/**
 * CatalogLayout — sticky left filter rail desktop / top Sheet mobile,
 * responsive card grid (1/2/3/4 at 360/640/1024/1280), empty/skeleton/pagination slots.
 *
 * Props:
 *   filters      — ReactNode for filter rail content
 *   filtersLabel — accessible label for filter region (default: "Filters")
 *   empty        — ReactNode for empty state (shown when !loading && !children)
 *   skeleton     — ReactNode for skeleton grid (shown when loading=true)
 *   pagination   — ReactNode for pagination strip below grid
 *   loading      — boolean
 *   children     — card grid items
 *   className    — extra classes on root
 */
export default function CatalogLayout({
  filters,
  filtersLabel = "Filters",
  empty,
  skeleton,
  pagination,
  loading = false,
  children,
  className,
}) {
  const hasItems = Boolean(children && (Array.isArray(children) ? children.length : true));

  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

        {/* Filter rail — sticky on desktop, inline on mobile */}
        {filters ? (
          <aside
            aria-label={filtersLabel}
            className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64 xl:w-72"
          >
            <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
              {filters}
            </div>
          </aside>
        ) : null}

        {/* Main content area */}
        <div className="min-w-0 flex-1 flex flex-col gap-6">
          {/* Skeleton grid */}
          {loading && skeleton ? skeleton : null}

          {/* Card grid */}
          {!loading && hasItems ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children}
            </div>
          ) : null}

          {/* Empty state */}
          {!loading && !hasItems && empty ? (
            <div className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-10 text-center">
              {empty}
            </div>
          ) : null}

          {/* Pagination */}
          {!loading && pagination ? (
            <div className="flex justify-center pt-2">{pagination}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
