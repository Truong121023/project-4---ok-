import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ui } from "../../ui";
import {
  formatDeliveryTypeLabel,
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "../../lib/orderStatus";
import {
  canViewOrderInvoice,
  getOrderInvoicePreviewHref,
} from "../../lib/orderWorkflow";
import { formatCurrencyVnd, formatDateTimeVn } from "../../lib/locale";

/**
 * EmployeeOrderCard — touch-optimised order card for the employee task board.
 * Buttons are ≥44 px tall (ui.primaryButton/secondaryButton use py-3).
 *
 * @param {object}   props.order
 * @param {string}   [props.storeName]
 * @param {object}   [props.taskAction]         — { label, run }
 * @param {boolean}  [props.loading]
 * @param {Function} props.onOpen
 * @param {Function} props.onAction
 * @param {Function} [props.onInvoice]
 */
export function EmployeeOrderCard({
  order,
  storeName,
  taskAction,
  loading = false,
  onOpen,
  onAction,
  onInvoice,
}) {
  const { t } = useTranslation("employee");
  const orderStatus = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
  const invoicePreviewUrl = getOrderInvoicePreviewHref(order);
  const canViewInvoice = canViewOrderInvoice(order);

  return (
    <article className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft transition-shadow duration-200 hover:shadow-lift">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-tight text-ink-900">
            {t("orderCard.orderLabel", { id: order.id })}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-matcha-100 px-3 py-1 text-xs font-semibold tracking-wide text-matcha-700">
              {orderStatus.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-ink-900/10 bg-cream-50 px-3 py-1 text-xs font-semibold text-ink-600">
              {paymentMeta.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-ink-900/10 bg-cream-50 px-3 py-1 text-xs font-semibold text-ink-600">
              {formatDeliveryTypeLabel(order.deliveryType)}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <strong className="block text-lg font-bold text-matcha-700">
            {formatCurrencyVnd(order.totalAmount)}
          </strong>
          <p className="mt-1 text-xs text-ink-400">
            {formatDateTimeVn(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Detail rows */}
      <dl className="mt-4 grid gap-1 text-sm leading-6 text-ink-600">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink-500">{t("orderCard.storeLabel")}</dt>
          <dd>{order.storeName || storeName || "N/A"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink-500">{t("orderCard.customerLabel")}</dt>
          <dd>{order.deliveryFullName || "N/A"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium text-ink-500">{t("orderCard.deliverToLabel")}</dt>
          <dd className="break-words">{order.deliveryAddress || "N/A"}</dd>
        </div>
        {order.invoiceNumber ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-ink-500">{t("orderCard.invoiceLabel")}</dt>
            <dd>{order.invoiceNumber}</dd>
          </div>
        ) : null}
        {order.deliveringShipperName ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-ink-500">{t("orderCard.shipperLabel")}</dt>
            <dd>{order.deliveringShipperName}</dd>
          </div>
        ) : null}
        {order.deliveryProofUploadedAt ? (
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-ink-500">{t("orderCard.proofLabel")}</dt>
            <dd>{formatDateTimeVn(order.deliveryProofUploadedAt)}</dd>
          </div>
        ) : null}
      </dl>

      {/* Action row — min 44px buttons via ui.primaryButton/secondaryButton (py-3) */}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className={ui.secondaryButton}
          type="button"
          onClick={() => onOpen(order.id)}
        >
          {t("orderCard.viewDetails")}
        </button>

        {taskAction ? (
          <button
            className={ui.primaryButton}
            type="button"
            disabled={loading}
            onClick={() => onAction(order)}
          >
            {loading ? t("orders.processing") : taskAction.label}
          </button>
        ) : null}

        {canViewInvoice && invoicePreviewUrl && onInvoice ? (
          <button
            className={ui.secondaryButton}
            type="button"
            onClick={() => onInvoice(order)}
          >
            {t("orderCard.openInvoice")}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default EmployeeOrderCard;
