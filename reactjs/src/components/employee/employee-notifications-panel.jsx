import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "../admin/admin-page-header";
import { ui } from "../../ui";
import { formatDateTimeVn } from "../../lib/locale";

/**
 * EmployeeNotificationsPanel — notification inbox for the employee workspace.
 * Each notification row has ≥44px touch targets (ui.primaryButton py-3).
 *
 * @param {Array}    props.notifications
 * @param {boolean}  props.loading
 * @param {string}   props.error
 * @param {string}   props.notice
 * @param {Function} props.onOpen              — (notification) => void
 * @param {Function} props.onReadToggle        — (notification) => void
 * @param {Function} props.onReadAll           — () => void
 */
export function EmployeeNotificationsPanel({
  notifications,
  loading,
  error,
  notice,
  onOpen,
  onReadToggle,
  onReadAll,
}) {
  const { t } = useTranslation("employee");

  return (
    <article className={ui.panel}>
      <AdminPageHeader
        eyebrow={t("notifications.eyebrow")}
        title={t("notifications.title")}
        subtitle={t("notifications.subtitle")}
        actions={
          <button className={ui.secondaryButton} type="button" onClick={onReadAll}>
            {t("notifications.markAllRead")}
          </button>
        }
      />

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

      {loading ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-5 text-sm text-ink-400">
          {t("notifications.loading")}
        </div>
      ) : notifications.length ? (
        <div className="mt-4 grid gap-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onOpen={onOpen}
              onReadToggle={onReadToggle}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-5 text-sm text-ink-400">
          {t("notifications.empty")}
        </div>
      )}
    </article>
  );
}

function NotificationRow({ notification, onOpen, onReadToggle }) {
  const { t } = useTranslation("employee");
  const isUnread = !notification.read;

  return (
    <article
      className={`rounded-xl border p-4 transition-colors duration-200 ${
        isUnread
          ? "border-matcha-200 bg-matcha-50"
          : "border-ink-900/10 bg-cream-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={ui.pill}>{notification.type || t("notifications.taskType")}</span>
        {isUnread ? (
          <span className="inline-flex items-center rounded-full bg-matcha-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cream-50">
            {t("notifications.newBadge")}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-semibold text-ink-900">
        {notification.title || t("notifications.defaultTitle")}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-ink-600">
        {notification.message || t("notifications.defaultMessage")}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">
        {formatDateTimeVn(notification.createdAt)}
      </p>

      {/* Touch targets: py-3 = 48px computed height */}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={ui.primaryButton}
          type="button"
          onClick={() => onOpen(notification)}
        >
          {t("notifications.openTask")}
        </button>
        <button
          className={ui.secondaryButton}
          type="button"
          onClick={() => onReadToggle(notification)}
        >
          {notification.read ? t("notifications.markAsUnread") : t("notifications.markAsRead")}
        </button>
      </div>
    </article>
  );
}

export default EmployeeNotificationsPanel;
