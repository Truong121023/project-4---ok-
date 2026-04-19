import { cn } from "../../lib/cn";

/**
 * AuthLayout — centered 420px Card over cream bg with matcha-mist gradient vignette.
 * For login, register, forgot-password, google-complete, unauthorized.
 *
 * Props:
 *   wide       — boolean: use wider card (560px) for forms that need more space
 *   children   — card content (heading + form + footer links)
 *   className  — extra classes on the root wrapper
 */
export default function AuthLayout({ wide = false, children, className }) {
  return (
    <div
      className={cn(
        "relative flex min-h-[calc(100vh-4rem)] items-center justify-center gradient-matcha-mist px-4 py-12 sm:px-6",
        className,
      )}
    >
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-1/4 h-64 w-64 rounded-full bg-matcha-100/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-cream-200/60 blur-2xl"
      />

      {/* Centered card */}
      <div
        className={cn(
          "relative z-10 w-full rounded-xl border border-ink-900/10 bg-cream-50 p-6 shadow-lift sm:p-8",
          wide ? "max-w-[560px]" : "max-w-[420px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
