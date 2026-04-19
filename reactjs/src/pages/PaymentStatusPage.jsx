import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderStatusTracker from "../components/OrderStatusTracker";
import PaymentQrCard from "../components/PaymentQrCard";
import CheckoutLayout from "../components/templates/checkout-layout";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import {
  canRetryPayment,
  formatDeliveryTypeLabel,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  hasUsablePaymentSession,
  preferFreshPaymentOrder,
  shouldPersistPendingPaymentOrder,
} from "../lib/orderStatus";
import {
  canRefreshOrderPayment,
  canViewOrderInvoice,
  getOrderInvoicePreviewHref,
} from "../lib/orderWorkflow";
import {
  clearPendingPaymentOrder,
  getPendingPaymentOrder,
  savePendingPaymentOrder,
} from "../lib/paymentSession";
import { navigateToExternalUrl } from "../lib/externalNavigation";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import { fetchUserOrderDetail, refreshUserOrderPayment } from "../lib/siteApi";
import { formatShippingBreakdown, formatShippingDistance } from "../lib/shippingFee";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatDateTime(value) {
  return formatDateTimeVn(value);
}

/** Stepper with "Payment" active */
function PaymentStepper({ t }) {
  const steps = [
    t("paymentStatus.steps.cart"),
    t("paymentStatus.steps.delivery"),
    t("paymentStatus.steps.payment"),
    t("paymentStatus.steps.confirm"),
  ];
  return (
    <nav aria-label="Checkout steps">
      <ol className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = idx === 2;
          const isPast = idx < 2;
          return (
            <li key={step} className="flex items-center gap-2">
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  className={`h-px w-6 shrink-0 sm:w-10 ${isPast ? "bg-matcha-300" : "bg-beige-300"}`}
                />
              )}
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${
                  isActive
                    ? "bg-matcha-500 text-cream-50"
                    : isPast
                      ? "bg-matcha-100 text-matcha-700"
                      : "bg-cream-100 text-ink-400"
                }`}
              >
                <span className="hidden sm:inline">{step}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function PaymentStatusPage({ mode = "success" }) {
  const { t } = useTranslation("checkout");
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [order, setOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const paidProfileRefreshRef = useRef("");

  const pendingPayment = useMemo(() => getPendingPaymentOrder(), []);
  const orderId = searchParams.get("orderId") || pendingPayment?.orderId || "";
  const isCancelMode = mode === "cancel";
  const invoicePreviewUrl = getOrderInvoicePreviewHref(order);
  const canRefreshPayment = canRefreshOrderPayment(order);
  const canViewInvoice = canViewOrderInvoice(order);
  const hasPaymentSession = hasUsablePaymentSession(order);

  useToastMessage(error, { type: "error", title: t("paymentStatus.eyebrow") });
  useToastMessage(notice, { type: "info", title: t("paymentStatus.eyebrow") });

  useEffect(() => {
    const normalizedPaymentStatus = String(order?.paymentStatus ?? "").toUpperCase();
    const refreshKey = order?.id
      ? `${order.id}:${order.paidAt ?? order.updatedAt ?? normalizedPaymentStatus}`
      : "";

    if (!auth.hasRole("USER") || normalizedPaymentStatus !== "PAID" || !refreshKey) {
      return;
    }

    if (paidProfileRefreshRef.current === refreshKey) {
      return;
    }

    paidProfileRefreshRef.current = refreshKey;
    void auth.refreshMe().catch(() => {});
  }, [auth, order?.id, order?.paidAt, order?.paymentStatus, order?.updatedAt]);

  const syncPendingPayment = (nextOrder) => {
    if (!shouldPersistPendingPaymentOrder(nextOrder)) {
      clearPendingPaymentOrder();
      return;
    }
    savePendingPaymentOrder(nextOrder);
  };

  const continueWithPaymentSession = (nextOrder) => {
    if (!hasUsablePaymentSession(nextOrder)) {
      return false;
    }

    if (nextOrder.paymentCheckoutUrl) {
      setNotice(t("paymentStatus.newLinkReady"));
      navigateToExternalUrl(nextOrder.paymentCheckoutUrl);
      return true;
    }

    setNotice(t("paymentStatus.newQrReady"));
    return true;
  };

  const loadPaymentState = async () => {
    if (!orderId) {
      setError(t("paymentStatus.orderNotFound"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, orderId);
      let latestOrder = refreshedOrder;

      try {
        const detailOrder = await fetchUserOrderDetail(auth, orderId);
        latestOrder = preferFreshPaymentOrder(refreshedOrder, detailOrder);
      } catch {
        latestOrder = refreshedOrder;
      }

      setOrder(latestOrder);
      syncPendingPayment(latestOrder);
    } catch (requestError) {
      try {
        const detailOrder = await fetchUserOrderDetail(auth, orderId);
        setOrder(detailOrder);
        syncPendingPayment(detailOrder);
      } catch {
        setError(requestError.message || t("paymentStatus.unableToSync"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPaymentState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, auth.tokenType, orderId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice("");
    await loadPaymentState();
    setRefreshing(false);
  };

  const handleCreateNewPayment = async () => {
    if (!orderId) {
      setError(t("paymentStatus.orderNotFound"));
      return;
    }

    setCreatingPayment(true);
    setError("");
    setNotice("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, orderId);
      let latestOrder = refreshedOrder;

      try {
        const detailOrder = await fetchUserOrderDetail(auth, orderId);
        latestOrder = preferFreshPaymentOrder(refreshedOrder, detailOrder);
      } catch {
        latestOrder = refreshedOrder;
      }

      setOrder(latestOrder);
      syncPendingPayment(latestOrder);

      if (!canRetryPayment(latestOrder)) {
        setNotice(t("paymentStatus.notEligible"));
        return;
      }

      if (continueWithPaymentSession(latestOrder)) {
        return;
      }

      setNotice(t("paymentStatus.couldNotCreate"));
    } catch (requestError) {
      setError(requestError.message || t("paymentStatus.unableToCreate"));
    } finally {
      setCreatingPayment(false);
    }
  };

  const heading = isCancelMode
    ? t("paymentStatus.cancelTitle")
    : t("paymentStatus.successTitle");
  const description = isCancelMode
    ? t("paymentStatus.cancelSubtitle")
    : t("paymentStatus.successSubtitle");

  /* ---------- Status rail (right column) ---------- */
  const statusRail = order ? (
    <>
      <h2 className="font-display text-xl font-semibold text-ink-900">{t("paymentStatus.statusTitle")}</h2>

      <div className="mt-5 grid gap-3">
        {[
          { label: t("paymentStatus.payment"), value: getPaymentStatusMeta(order.paymentStatus).label },
          { label: t("paymentStatus.orderStage"), value: getOrderStatusMeta(order.status).label },
          { label: t("paymentStatus.deliveryType"), value: formatDeliveryTypeLabel(order.deliveryType) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3"
          >
            <span className="text-sm text-ink-600">{stat.label}</span>
            <strong className="text-sm font-semibold text-ink-900">{stat.value}</strong>
          </div>
        ))}
      </div>

      {order.paymentCheckoutUrl && hasPaymentSession && (
        <div className="mt-5">
          <a
            className={ui.primaryButton}
            href={order.paymentCheckoutUrl}
            rel="noreferrer"
            target="_blank"
          >
            {t("paymentStatus.payNow")}
          </a>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <button className={ui.secondaryButton} type="button" onClick={handleRefresh}>
          {refreshing ? t("paymentStatus.refreshing") : t("paymentStatus.refresh")}
        </button>
        {canRefreshPayment && !hasPaymentSession && (
          <button className={ui.primaryButton} type="button" onClick={handleCreateNewPayment}>
            {creatingPayment ? t("paymentStatus.creatingPayment") : t("paymentStatus.createNewPayment")}
          </button>
        )}
        {canViewInvoice && invoicePreviewUrl && (
          <button
            className={ui.secondaryButton}
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
          >
            {t("paymentStatus.openInvoice")}
          </button>
        )}
        <Link className={ui.secondaryButton} to={`/orders/${order.id}`}>
          {t("paymentStatus.viewOrder")}
        </Link>
        <Link className={ui.secondaryButton} to="/orders">
          {t("paymentStatus.orderHistory")}
        </Link>
      </div>
    </>
  ) : null;

  return (
    <main className={ui.page}>
      <CheckoutLayout stepper={<PaymentStepper t={t} />} summary={order ? statusRail : null}>
        {/* Page header */}
        <div className="mb-6">
          <p className={ui.eyebrow}>{t("paymentStatus.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-600">{description}</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-6 text-sm text-ink-600">
            {t("paymentStatus.syncing")}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-sm leading-7 text-rose-700"
          >
            {error}
          </div>
        )}

        {/* Notice */}
        {!loading && notice && (
          <div className="rounded-xl border border-matcha-200 bg-matcha-50/60 p-6 text-sm leading-7 text-matcha-700">
            {notice}
          </div>
        )}

        {/* Order detail */}
        {!loading && order && (
          <div className="grid gap-5">
            {/* Order card */}
            <article className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-ink-900">
                    Order #{order.id}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-matcha-700">
                    {getOrderStatusMeta(order.status).label}
                  </p>
                </div>
                <strong className={ui.price}>{formatPrice(order.totalAmount)}</strong>
              </div>

              <div className="mt-5">
                <OrderStatusTracker order={order} />
              </div>

              <div className="mt-5 grid gap-2 text-sm leading-7 text-ink-600">
                {order.storeName && <span>{t("paymentStatus.orderFields.store", { value: order.storeName })}</span>}
                <span>{t("paymentStatus.orderFields.subtotal", { value: formatPrice(order.subtotalAmount) })}</span>
                {Number(order.discountAmount ?? 0) > 0 && (
                  <span>{t("paymentStatus.orderFields.discount", { value: formatPrice(order.discountAmount) })}</span>
                )}
                {order.shippingFeeAmount !== undefined && order.shippingFeeAmount !== null && (
                  <span>{t("paymentStatus.orderFields.shippingFee", { value: formatPrice(order.shippingFeeAmount) })}</span>
                )}
                {Number(order.creditPointsAwarded ?? 0) > 0 && (
                  <span>{t("paymentStatus.orderFields.creditEarned", { count: Number(order.creditPointsAwarded).toLocaleString("vi-VN") })}</span>
                )}
                {order.shippingDistanceKm !== undefined && order.shippingDistanceKm !== null && (
                  <span>{t("paymentStatus.orderFields.shippingDistance", { value: formatShippingDistance(order.shippingDistanceKm) })}</span>
                )}
                {order.shippingFeeBreakdown?.length > 0 && (
                  <span>{formatShippingBreakdown(order.shippingFeeBreakdown)}</span>
                )}
                {order.promotionCode && <span>{t("paymentStatus.orderFields.promotionCode", { value: order.promotionCode })}</span>}
                <span>{t("paymentStatus.orderFields.deliveryType", { value: formatDeliveryTypeLabel(order.deliveryType) })}</span>
                {order.scheduledDeliveryAt && (
                  <span>{t("paymentStatus.orderFields.scheduledFor", { value: formatDateTime(order.scheduledDeliveryAt) })}</span>
                )}
                {order.preparingStaffName && (
                  <span>{t("paymentStatus.orderFields.preparingStaff", { value: order.preparingStaffName })}</span>
                )}
                {order.deliveringShipperName && (
                  <span>{t("paymentStatus.orderFields.deliveryRider", { value: order.deliveringShipperName })}</span>
                )}
                <span>{t("paymentStatus.orderFields.recipient", { value: order.deliveryFullName || "N/A" })}</span>
                <span>{t("paymentStatus.orderFields.phone", { value: order.deliveryPhoneNumber || "N/A" })}</span>
                <span>{t("paymentStatus.orderFields.address", { value: order.deliveryAddress || "N/A" })}</span>
                {order.paymentProvider && (
                  <span>{t("paymentStatus.orderFields.paymentProvider", { value: order.paymentProvider })}</span>
                )}
                {order.paymentReference && (
                  <span>{t("paymentStatus.orderFields.paymentReference", { value: order.paymentReference })}</span>
                )}
                {order.invoiceAvailable && <span>{t("paymentStatus.orderFields.invoiceReady")}</span>}
                {order.invoiceNumber && <span>{t("paymentStatus.orderFields.invoiceNumber", { value: order.invoiceNumber })}</span>}
                {order.invoiceIssuedAt && (
                  <span>{t("paymentStatus.orderFields.invoiceIssuedAt", { value: formatDateTime(order.invoiceIssuedAt) })}</span>
                )}
                {order.paymentExpiresAt && (
                  <span>{t("paymentStatus.orderFields.paymentExpiresAt", { value: formatDateTime(order.paymentExpiresAt) })}</span>
                )}
                {order.paidAt && <span>{t("paymentStatus.orderFields.paidAt", { value: formatDateTime(order.paidAt) })}</span>}
                <span>{t("paymentStatus.orderFields.createdAt", { value: formatDateTime(order.createdAt) })}</span>
                <span>{t("paymentStatus.orderFields.updatedAt", { value: formatDateTime(order.updatedAt) })}</span>
              </div>
            </article>

            {/* Expired session warning */}
            {canRefreshPayment && !hasPaymentSession && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm leading-7 text-amber-900">
                {t("paymentStatus.expiredSession")}
              </div>
            )}

            {/* QR card — internals untouched */}
            <PaymentQrCard
              order={order}
              title="PayOS QR"
              subtitle="The latest QR is rendered from paymentQrCode so you can resume payment even after leaving the checkout page."
            />
          </div>
        )}
      </CheckoutLayout>

      <InvoicePreviewModal
        open={invoiceModalOpen}
        order={order}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </main>
  );
}
