import { Link } from "react-router-dom";
import { AdminPageHeader } from "../admin/admin-page-header";
import OrderStatusTracker from "../OrderStatusTracker";
import OrderQrCard from "../OrderQrCard";
import { EmployeeDeliveryProofSection } from "./employee-delivery-proof-section";
import { ui } from "../../ui";
import { formatCurrencyVnd, formatDateTimeVn } from "../../lib/locale";
import { formatDeliveryTypeLabel, getOrderStatusMeta, getPaymentStatusMeta } from "../../lib/orderStatus";
import { canViewOrderInvoice, getOrderInvoicePreviewHref } from "../../lib/orderWorkflow";
import { resolveApiUrl } from "../../lib/api";

/**
 * EmployeeOrderDetailPanel — right-column detail view for a selected order.
 * Composes OrderSummaryBlock, status tracker, QR card, proof upload, items list.
 */
export function EmployeeOrderDetailPanel({
  orderDetail,
  loading,
  error,
  detailAction,
  actionLoadingId,
  canUploadDeliveryProof,
  proofForm,
  onAction,
  onInvoice,
  onProofUpload,
  onProofFileChange,
  onProofNoteChange,
  onProofCapturedAtChange,
}) {
  const invoicePreviewUrl = orderDetail ? getOrderInvoicePreviewHref(orderDetail) : null;
  const canViewInvoice = orderDetail ? canViewOrderInvoice(orderDetail) : false;
  const deliveryProofPreviewUrl = resolveApiUrl(orderDetail?.deliveryProofImagePath);
  const isActionLoading = actionLoadingId === String(orderDetail?.id ?? "");

  return (
    <article className={ui.panel}>
      <AdminPageHeader
        eyebrow="Order detail"
        title="Task details"
        subtitle="Open a task from the list or from a notification to review details and act quickly."
        actions={
          <Link className={ui.secondaryButton} to="/employee">
            Back to board
          </Link>
        }
      />

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-5 text-sm text-ink-400">
          Loading task details…
        </div>
      ) : orderDetail ? (
        <div className="mt-4 grid gap-4">
          <OrderSummaryBlock
            order={orderDetail}
            detailAction={detailAction}
            isActionLoading={isActionLoading}
            canViewInvoice={canViewInvoice}
            invoicePreviewUrl={invoicePreviewUrl}
            onAction={onAction}
            onInvoice={onInvoice}
          />

          <OrderQrCard
            order={orderDetail}
            title="Order QR"
            subtitle="The manager confirms the order and assigns the shipper. The shipper scans this code to confirm pickup and submit delivery proof."
          />

          {canUploadDeliveryProof ? (
            <EmployeeDeliveryProofSection
              order={orderDetail}
              deliveryProofPreviewUrl={deliveryProofPreviewUrl}
              proofForm={proofForm}
              onProofUpload={onProofUpload}
              onProofFileChange={onProofFileChange}
              onProofNoteChange={onProofNoteChange}
              onProofCapturedAtChange={onProofCapturedAtChange}
            />
          ) : null}

          <OrderItemsBlock items={orderDetail.items} />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-5 text-sm leading-7 text-ink-400">
          Select a task from the list or open one from a notification to view details here.
        </div>
      )}
    </article>
  );
}

/* ── Private sub-blocks ─────────────────────────────────── */

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-medium text-ink-500">{label}:</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function OrderSummaryBlock({ order, detailAction, isActionLoading, canViewInvoice, invoicePreviewUrl, onAction, onInvoice }) {
  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);

  return (
    <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-ink-900">Order #{order.id}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={ui.pill}>{statusMeta.label}</span>
            <span className={ui.pillGold}>{paymentMeta.label}</span>
          </div>
        </div>
        <strong className="text-xl font-bold text-matcha-700">
          {formatCurrencyVnd(order.totalAmount)}
        </strong>
      </div>

      <dl className="mt-4 grid gap-1 text-sm leading-6 text-ink-600">
        <InfoRow label="Created" value={formatDateTimeVn(order.createdAt)} />
        <InfoRow label="Delivery" value={formatDeliveryTypeLabel(order.deliveryType)} />
        <InfoRow label="Customer" value={order.deliveryFullName || "N/A"} />
        <InfoRow label="Phone" value={order.deliveryPhoneNumber || "N/A"} />
        <InfoRow label="Address" value={order.deliveryAddress || "N/A"} />
        {order.confirmedByUserName ? (
          <InfoRow
            label="Confirmed by"
            value={`${order.confirmedByUserName}${order.confirmedAt ? ` · ${formatDateTimeVn(order.confirmedAt)}` : ""}`}
          />
        ) : null}
        {order.scheduledDeliveryAt ? (
          <InfoRow label="Scheduled" value={formatDateTimeVn(order.scheduledDeliveryAt)} />
        ) : null}
        {order.invoiceNumber ? <InfoRow label="Invoice" value={order.invoiceNumber} /> : null}
        {order.preparingStaffName ? <InfoRow label="Store handler" value={order.preparingStaffName} /> : null}
        {order.deliveringShipperName ? <InfoRow label="Shipper" value={order.deliveringShipperName} /> : null}
        {order.deliveryProofUploadedAt ? (
          <InfoRow label="Proof uploaded" value={formatDateTimeVn(order.deliveryProofUploadedAt)} />
        ) : null}
      </dl>

      <div className="mt-5">
        <OrderStatusTracker order={order} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {detailAction ? (
          <button
            className={ui.primaryButton}
            type="button"
            disabled={isActionLoading}
            onClick={() => onAction(order)}
          >
            {isActionLoading ? "Processing…" : detailAction.label}
          </button>
        ) : null}
        {canViewInvoice && invoicePreviewUrl ? (
          <button className={ui.secondaryButton} type="button" onClick={() => onInvoice(order)}>
            Open invoice
          </button>
        ) : null}
      </div>
    </div>
  );
}

function OrderItemsBlock({ items }) {
  return (
    <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
      <p className={ui.eyebrow}>Items in this order</p>
      {items?.length ? (
        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <article
              key={item.id || `${item.dishId}-${item.dishName}`}
              className="rounded-lg border border-ink-900/10 bg-cream-100 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">{item.dishName || "Dish"}</h4>
                  <p className="mt-1 text-sm text-ink-600">Qty: {item.quantity || 0}</p>
                  {item.note ? <p className="mt-1 text-xs text-ink-400">Note: {item.note}</p> : null}
                </div>
                <div className="text-right text-sm">
                  <div className="text-ink-500">{formatCurrencyVnd(item.unitPrice)}</div>
                  <strong className="text-matcha-700">
                    {formatCurrencyVnd(item.totalPrice || item.lineTotal)}
                  </strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-ink-900/15 bg-cream-100/60 px-4 py-4 text-sm text-ink-400">
          No items to display yet.
        </div>
      )}
    </div>
  );
}

export default EmployeeOrderDetailPanel;
