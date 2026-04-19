import { AdminStatCard } from "../admin/admin-stat-card";
import { ui } from "../../ui";

/**
 * EmployeeHeaderSection — top banner with identity card + 4 KPI stat tiles.
 * Uses AdminStatCard for consistent admin/employee visual language.
 *
 * @param {object}   props.user
 * @param {string}   props.employeeRole
 * @param {object}   props.stats           — { availableCount, myActiveCount, totalRevenue }
 * @param {number}   props.unreadCount
 * @param {Function} props.formatPrice
 */
export function EmployeeHeaderSection({ user, employeeRole, stats, unreadCount, formatPrice }) {
  const boardTitle =
    employeeRole === "SHIPPER" ? "Shipper task board" : "Store support board";

  const boardDescription =
    employeeRole === "SHIPPER"
      ? "Track delivery jobs, pickup confirmations, and delivery-proof uploads from a single screen."
      : "Store-side processing is handled by the manager. Staff accounts track related order details and notifications here.";

  return (
    <section className={ui.panel}>
      {/* Identity + role card */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ui.eyebrow}>Employee workspace</p>
          <h1 className={ui.bannerTitle}>{boardTitle}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600">
            {boardDescription}
          </p>
        </div>

        <div className="rounded-xl border border-ink-900/10 bg-cream-50 px-5 py-4 shadow-soft">
          <strong className="block font-display text-base font-semibold text-ink-900">
            {user?.fullName || "Employee"}
          </strong>
          <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.22em] text-matcha-600">
            {employeeRole || "EMPLOYEE"}
          </span>
          <span className="mt-1 block text-sm text-ink-500">
            {user?.workingStoreName || "No store assigned"}
          </span>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Available tasks" value={stats.availableCount} />
        <AdminStatCard label="Assigned tasks" value={stats.myActiveCount} />
        <AdminStatCard label="Unread notifications" value={unreadCount} />
        <AdminStatCard
          label="Tasks total value"
          value={formatPrice(stats.totalRevenue)}
          featured
        />
      </div>
    </section>
  );
}

export default EmployeeHeaderSection;
