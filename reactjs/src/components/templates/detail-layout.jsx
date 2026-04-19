import { cn } from "../../lib/cn";

/**
 * DetailLayout — 2-col: left image gallery region, right content region
 * with sticky rail on desktop / bottom-docked bar on mobile.
 *
 * Props:
 *   gallery      — ReactNode for the image/media region (left col)
 *   stickyBar    — ReactNode rendered sticky-right on desktop, bottom-docked on mobile (price+CTA)
 *   related      — ReactNode for related items carousel below the 2-col
 *   breadcrumb   — ReactNode for breadcrumb above layout
 *   children     — main content (title, description, metadata, reviews…)
 *   className    — extra classes on root wrapper
 */
export default function DetailLayout({
  gallery,
  stickyBar,
  related,
  breadcrumb,
  children,
  className,
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      {/* Breadcrumb */}
      {breadcrumb ? <div className="mb-6">{breadcrumb}</div> : null}

      {/* 2-col layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Gallery — left */}
        {gallery ? (
          <div className="w-full shrink-0 lg:w-[45%] xl:w-[40%]">
            {gallery}
          </div>
        ) : null}

        {/* Content + sticky rail — right */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Main content */}
          <div className="flex-1">{children}</div>

          {/* Sticky rail — desktop only (inline below content) */}
          {stickyBar ? (
            <div className="hidden lg:block lg:sticky lg:top-24">
              <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
                {stickyBar}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom-docked bar — mobile only */}
      {stickyBar ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-cream-50 px-4 py-3 shadow-lift lg:hidden">
          {stickyBar}
        </div>
      ) : null}

      {/* Related items */}
      {related ? (
        <>
          <div
            aria-hidden="true"
            className="my-10 h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent"
          />
          <section aria-label="Related items">{related}</section>
        </>
      ) : null}
    </div>
  );
}
