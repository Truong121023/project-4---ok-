import { cn } from "../../lib/cn";

/**
 * EditorialLayout — full-bleed hero with matcha-mist gradient, serif display headline,
 * scroll-reveal subcopy, children below with hairline section dividers.
 *
 * Props:
 *   hero        — ReactNode for hero section (optional custom content)
 *   eyebrow     — string or ReactNode above headline
 *   kanji       — decorative Japanese character (default: "抹茶")
 *   headline    — main h1 text
 *   subcopy     — supporting text paragraph
 *   cta         — ReactNode for call-to-action row below subcopy
 *   filters     — ReactNode for filter/search controls row
 *   children    — main body content below hero
 *   className   — extra classes on the root wrapper
 */
export default function EditorialLayout({
  hero,
  eyebrow,
  kanji = "抹茶",
  headline,
  subcopy,
  cta,
  filters,
  children,
  className,
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Full-bleed hero */}
      <section
        aria-label="Hero"
        className="relative overflow-hidden gradient-matcha-mist px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        {/* Decorative vignette blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-matcha-200/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-8 h-48 w-48 rounded-full bg-cream-200/50 blur-2xl"
        />

        {hero ? (
          hero
        ) : (
          <div className="relative mx-auto max-w-7xl">
            {/* Kanji eyebrow */}
            {kanji ? (
              <p
                aria-hidden="true"
                className="mb-2 font-display text-3xl font-medium tracking-wider text-matcha-600/60"
              >
                {kanji}
              </p>
            ) : null}

            {eyebrow ? (
              <p className="mb-4 inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-matcha-600">
                {eyebrow}
              </p>
            ) : null}

            {headline ? (
              <h1 className="max-w-[16ch] font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-ink-900 sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
            ) : null}

            {subcopy ? (
              <p className="reveal-on-scroll mt-5 max-w-2xl text-base leading-8 text-ink-600">
                {subcopy}
              </p>
            ) : null}

            {cta ? <div className="mt-8 flex flex-wrap gap-4">{cta}</div> : null}
          </div>
        )}
      </section>

      {/* Hairline divider */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent"
      />

      {/* Filters strip */}
      {filters ? (
        <>
          <div className="bg-cream-50 px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{filters}</div>
          </div>
          <div
            aria-hidden="true"
            className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent"
          />
        </>
      ) : null}

      {/* Body content */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
