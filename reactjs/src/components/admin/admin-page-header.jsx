import { cn } from "../../lib/cn";

/**
 * AdminPageHeader — compact title block with optional eyebrow, actions slot, and breadcrumb.
 * Used at top of each admin page/section.
 *
 * @param {string}            props.eyebrow    - small uppercase label above title
 * @param {string}            props.title      - main heading text
 * @param {string}            [props.subtitle] - optional muted description below title
 * @param {React.ReactNode}   [props.actions]  - right-side action buttons slot
 * @param {string}            [props.className]
 */
export function AdminPageHeader({ eyebrow, title, subtitle, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-matcha-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export default AdminPageHeader;
