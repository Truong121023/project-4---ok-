import { cn } from "../../lib/cn";

/**
 * AdminStatCard — compact KPI tile for admin dashboards.
 * Numbers use JetBrains Mono for clear at-a-glance reading.
 *
 * @param {string}  props.label    - metric label
 * @param {string}  props.value    - primary numeric / text value
 * @param {string}  [props.note]   - secondary muted text below value
 * @param {boolean} [props.featured=false] - dark matcha-900 hero style
 * @param {string}  [props.className]
 */
export function AdminStatCard({ label, value, note, featured = false, className }) {
  if (featured) {
    return (
      <article
        className={cn(
          "rounded-lg border border-matcha-700/20 bg-gradient-to-br from-matcha-900 to-matcha-800 p-4 text-cream-50 shadow-soft",
          className,
        )}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cream-50/60">{label}</p>
        <strong className="mt-2 block font-mono text-2xl font-semibold leading-tight tracking-tight text-cream-50">
          {value}
        </strong>
        {note && <p className="mt-1.5 text-xs leading-5 text-cream-50/60">{note}</p>}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-ink-900/8 bg-cream-50 p-4 shadow-soft",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">{label}</p>
      <strong className="mt-2 block font-mono text-xl font-semibold leading-tight text-ink-900">
        {value}
      </strong>
      {note && <p className="mt-1 text-xs leading-5 text-ink-400">{note}</p>}
    </article>
  );
}

export default AdminStatCard;
