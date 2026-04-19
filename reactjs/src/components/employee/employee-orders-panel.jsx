import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "../admin/admin-page-header";
import { EmployeeOrderCard } from "./employee-order-card";
import { ui } from "../../ui";

/**
 * EmployeeOrdersPanel — filterable order task board for employee workspace.
 * Search form inputs are min h-11 (44px) for touch comfort.
 *
 * @param {string}   props.employeeRole
 * @param {object}   props.feed              — { items, hasNext }
 * @param {boolean}  props.loading
 * @param {string}   props.error
 * @param {string}   props.notice
 * @param {string}   props.taskMode
 * @param {string}   props.searchInput
 * @param {string}   props.actionLoadingId
 * @param {string}   [props.storeName]
 * @param {Function} props.onTaskModeChange
 * @param {Function} props.onSearchChange
 * @param {Function} props.onSearch
 * @param {Function} props.onOpen
 * @param {Function} props.onAction
 * @param {Function} props.onInvoice
 * @param {Function} props.getTaskAction     — (order) => action | null
 */
export function EmployeeOrdersPanel({
  employeeRole,
  feed,
  loading,
  error,
  notice,
  taskMode,
  searchInput,
  actionLoadingId,
  storeName,
  onTaskModeChange,
  onSearchChange,
  onSearch,
  onOpen,
  onAction,
  onInvoice,
  getTaskAction,
}) {
  const { t } = useTranslation("employee");

  const subtitle =
    employeeRole === "SHIPPER"
      ? t("orders.shipperSubtitle")
      : t("orders.staffSubtitle");

  return (
    <article className={ui.panel}>
      <AdminPageHeader
        eyebrow={t("orders.eyebrow")}
        title={t("orders.title")}
        subtitle={subtitle}
      />

      {/* Filter form — inputs h-11 = 44px touch target */}
      <form
        className="mt-6 grid gap-3 sm:grid-cols-[180px_1fr_auto]"
        onSubmit={onSearch}
      >
        <label className="grid gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
            {t("orders.viewLabel")}
          </span>
          <select
            className={`${ui.input} h-11`}
            value={taskMode}
            onChange={(e) => onTaskModeChange(e.target.value)}
          >
            <option value="available">{t("orders.modeAvailable")}</option>
            <option value="mine">{t("orders.modeMine")}</option>
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
            {t("orders.searchLabel")}
          </span>
          <input
            className={`${ui.input} h-11`}
            placeholder={t("orders.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <div className="flex items-end">
          <button className={ui.primaryButton} type="submit">
            {t("orders.filterButton")}
          </button>
        </div>
      </form>

      {notice ? (
        <div className="mt-4 rounded-lg border border-matcha-200 bg-matcha-50 px-4 py-3 text-sm text-matcha-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* QR hint banner */}
      <div className="mt-4 rounded-xl border border-ink-900/10 bg-beige-100 px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">{t("orders.qrHintTitle")}</p>
        <p className="mt-1 text-sm leading-6 text-ink-600">
          {t("orders.qrHintBody")}
        </p>
      </div>

      {loading ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-5 text-sm text-ink-400">
          {t("orders.loading")}
        </div>
      ) : feed.items.length ? (
        <div className="mt-4 grid gap-4">
          {feed.items.map((order) => {
            const taskAction = getTaskAction(order);
            return (
              <EmployeeOrderCard
                key={order.id}
                order={order}
                storeName={storeName}
                taskAction={taskAction}
                loading={actionLoadingId === String(order.id)}
                onOpen={onOpen}
                onAction={onAction}
                onInvoice={onInvoice}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-5 text-sm text-ink-400">
          {t("orders.empty")}
        </div>
      )}
    </article>
  );
}

export default EmployeeOrdersPanel;
