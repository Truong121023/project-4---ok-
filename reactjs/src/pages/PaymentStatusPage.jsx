import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
function PaymentStepper() {
  const steps = ["Cart", "Delivery", "Payment", "Confirm"];
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

  useToastMessage(error, { type: "error", title: "Payment" });
  useToastMessage(notice, { type: "info", title: "Payment" });

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
      setNotice("A new PayOS payment link has been created. Redirecting now...");
      navigateToExternalUrl(nextOrder.paymentCheckoutUrl);
      return true;
    }

    setNotice("A new PayOS payment session is ready. Scan the QR code below to continue.");
    return true;
  };

  const loadPaymentState = async () => {
    if (!orderId) {
      setError("Unable to find the order that needs a payment refresh.");
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
        setError(requestError.message || "Unable to sync payment status.");
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
      setError("Unable to find the order that needs a new PayOS payment.");
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
        setNotice("This order is no longer eligible for a new payment session.");
        return;
      }

      if (continueWithPaymentSession(latestOrder)) {
        return;
      }

      setNotice(
        "The system could not create a new PayOS payment session for this order yet. Please try again shortly.",
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to create a new PayOS payment.");
    } finally {
      setCreatingPayment(false);
    }
  };

  const heading = isCancelMode
    ? "Checking payment after cancellation"
    : "Checking payment result";
  const description = isCancelMode
    ? "If you just cancelled on PayOS, this page refreshes the order so the latest status is shown."
    : "If you just completed payment on PayOS, this page syncs the order and payment details again.";

  /* ---------- Status rail (right column) ---------- */
  const statusRail = order ? (
    <>
      <h2 className="font-display text-xl font-semibold text-ink-900">Current status</h2>

      <div className="mt-5 grid gap-3">
        {[
          { label: "Payment", value: getPaymentStatusMeta(order.paymentStatus).label },
          { label: "Order stage", value: getOrderStatusMeta(order.status).label },
          { label: "Delivery type", value: formatDeliveryTypeLabel(order.deliveryType) },
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
            Pay now
          </a>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <button className={ui.secondaryButton} type="button" onClick={handleRefresh}>
          {refreshing ? "Refreshing..." : "Refresh payment"}
        </button>
        {canRefreshPayment && !hasPaymentSession && (
          <button className={ui.primaryButton} type="button" onClick={handleCreateNewPayment}>
            {creatingPayment ? "Creating new PayOS..." : "Create new PayOS payment"}
          </button>
        )}
        {canViewInvoice && invoicePreviewUrl && (
          <button
            className={ui.secondaryButton}
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
          >
            Open invoice
          </button>
        )}
        <Link className={ui.secondaryButton} to={`/orders/${order.id}`}>
          View order
        </Link>
        <Link className={ui.secondaryButton} to="/orders">
          Order history
        </Link>
      </div>
    </>
  ) : null;

  return (
    <main className={ui.page}>
      <CheckoutLayout stepper={<PaymentStepper />} summary={order ? statusRail : null}>
        {/* Page header */}
        <div className="mb-6">
          <p className={ui.eyebrow}>Payment</p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-600">{description}</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-6 text-sm text-ink-600">
            Syncing payment status...
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
                {order.storeName && <span>Store: {order.storeName}</span>}
                <span>Subtotal: {formatPrice(order.subtotalAmount)}</span>
                {Number(order.discountAmount ?? 0) > 0 && (
                  <span>Discount: {formatPrice(order.discountAmount)}</span>
                )}
                {order.shippingFeeAmount !== undefined && order.shippingFeeAmount !== null && (
                  <span>Shipping fee: {formatPrice(order.shippingFeeAmount)}</span>
                )}
                {Number(order.creditPointsAwarded ?? 0) > 0 && (
                  <span>
                    Credit earned: {Number(order.creditPointsAwarded).toLocaleString("vi-VN")} pts
                  </span>
                )}
                {order.shippingDistanceKm !== undefined && order.shippingDistanceKm !== null && (
                  <span>Shipping distance: {formatShippingDistance(order.shippingDistanceKm)}</span>
                )}
                {order.shippingFeeBreakdown?.length > 0 && (
                  <span>Breakdown: {formatShippingBreakdown(order.shippingFeeBreakdown)}</span>
                )}
                {order.promotionCode && <span>Promotion code: {order.promotionCode}</span>}
                <span>Delivery type: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                {order.scheduledDeliveryAt && (
                  <span>Scheduled for: {formatDateTime(order.scheduledDeliveryAt)}</span>
                )}
                {order.preparingStaffName && (
                  <span>Preparing staff: {order.preparingStaffName}</span>
                )}
                {order.deliveringShipperName && (
                  <span>Delivery rider: {order.deliveringShipperName}</span>
                )}
                <span>Recipient: {order.deliveryFullName || "N/A"}</span>
                <span>Phone: {order.deliveryPhoneNumber || "N/A"}</span>
                <span>Address: {order.deliveryAddress || "N/A"}</span>
                {order.paymentProvider && (
                  <span>Payment provider: {order.paymentProvider}</span>
                )}
                {order.paymentReference && (
                  <span>Payment reference: {order.paymentReference}</span>
                )}
                {order.invoiceAvailable && <span>Invoice ready: Yes</span>}
                {order.invoiceNumber && <span>Invoice number: {order.invoiceNumber}</span>}
                {order.invoiceIssuedAt && (
                  <span>Invoice issued at: {formatDateTime(order.invoiceIssuedAt)}</span>
                )}
                {order.paymentExpiresAt && (
                  <span>Payment expires at: {formatDateTime(order.paymentExpiresAt)}</span>
                )}
                {order.paidAt && <span>Paid at: {formatDateTime(order.paidAt)}</span>}
                <span>Created at: {formatDateTime(order.createdAt)}</span>
                <span>Updated at: {formatDateTime(order.updatedAt)}</span>
              </div>
            </article>

            {/* Expired session warning */}
            {canRefreshPayment && !hasPaymentSession && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm leading-7 text-amber-900">
                The current PayOS session is no longer usable. Create a new payment to continue
                checkout.
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
