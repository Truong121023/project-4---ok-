import { cn } from "../../lib/cn";

/**
 * CheckoutLayout — Stepper header + 2-col (form left, sticky order summary right).
 *
 * Props:
 *   stepper      — ReactNode for the step indicator across top
 *   summary      — ReactNode for the sticky order summary panel (right col)
 *   children     — form content (left col)
 *   centered     — boolean: if true, renders single centered card (for OTP/minimal pages)
 *   className    — extra classes on root
 */
export default function CheckoutLayout({
  stepper,
  summary,
  children,
  centered = false,
  className,
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      {/* Stepper header */}
      {stepper ? (
        <>
          <div className="mb-8">{stepper}</div>
          <div
            aria-hidden="true"
            className="mb-8 h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent"
          />
        </>
      ) : null}

      {centered ? (
        /* Minimal centered card (e.g. OTP verify, confirmation) */
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-6 shadow-soft sm:p-8">
            {children}
          </div>
        </div>
      ) : (
        /* 2-col: form + summary */
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Form — left */}
          <div className="min-w-0 flex-1">{children}</div>

          {/* Order summary — right, sticky on desktop */}
          {summary ? (
            <aside
              aria-label="Order summary"
              className="w-full shrink-0 lg:sticky lg:top-24 lg:w-80 xl:w-96"
            >
              <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
                {summary}
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
