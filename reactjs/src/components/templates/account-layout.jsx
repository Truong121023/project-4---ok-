import { cn } from "../../lib/cn";

/**
 * AccountLayout — left profile rail (avatar, tier badge) + Tabs; stacks on mobile.
 *
 * Props:
 *   profile    — ReactNode for the profile rail (avatar, name, tier badge, quick links)
 *   tabs       — ReactNode for the tab navigation strip
 *   children   — tab panel content (right side)
 *   className  — extra classes on root
 */
export default function AccountLayout({ profile, tabs, children, className }) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Profile rail — sticky on desktop */}
        {profile ? (
          <aside
            aria-label="Account profile"
            className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64 xl:w-72"
          >
            <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
              {profile}
            </div>
          </aside>
        ) : null}

        {/* Main panel */}
        <div className="min-w-0 flex-1 flex flex-col gap-6">
          {/* Tab navigation */}
          {tabs ? (
            <div className="border-b border-ink-900/10">{tabs}</div>
          ) : null}

          {/* Tab panel content */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
