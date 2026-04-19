import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("employee");

  const boardTitle =
    employeeRole === "SHIPPER" ? t("header.shipperTitle") : t("header.staffTitle");

  const boardDescription =
    employeeRole === "SHIPPER"
      ? t("header.shipperDescription")
      : t("header.staffDescription");

  return (
    <section className={ui.panel}>
      {/* Identity + role card */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ui.eyebrow}>{t("header.eyebrow")}</p>
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
            {user?.workingStoreName || t("header.noStore")}
          </span>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label={t("stats.availableTasks")} value={stats.availableCount} />
        <AdminStatCard label={t("stats.assignedTasks")} value={stats.myActiveCount} />
        <AdminStatCard label={t("stats.unreadNotifications")} value={unreadCount} />
        <AdminStatCard
          label={t("stats.totalValue")}
          value={formatPrice(stats.totalRevenue)}
          featured
        />
      </div>
    </section>
  );
}

export default EmployeeHeaderSection;
