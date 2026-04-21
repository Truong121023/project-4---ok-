import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderStatusTracker from "../components/OrderStatusTracker";
import PaymentQrCard from "../components/PaymentQrCard";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
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
import {
  cancelUserOrder,
  fetchUserOrderDetail,
  refreshUserOrderPayment,
  reorderUserOrder,
} from "../lib/siteApi";
import { formatShippingBreakdown, formatShippingDistance } from "../lib/shippingFee";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatDateTime(value) {
  return formatDateTimeVn(value);
}

function buildTransferCheckMessage(order) {
  const paymentStatus = String(order?.paymentStatus ?? "").toUpperCase();
  if (paymentStatus === "PAID") {
    return "The server confirmed your transfer successfully.";
  }
  if (paymentStatus === "CANCELLED" || paymentStatus === "FAILED") {
    return "The transfer has not been confirmed for this payment session.";
  }
  return "The server is still checking your transfer.";
}

export default function PaymentStatusPage({ mode = "success" }) {
  const auth = useAuth();
  const siteData = useSiteData();
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
  const canCancelOrder =
    Array.isArray(order?.allowedActions) && order.allowedActions.includes("CANCEL_ORDER");
  const canReorderOrder =
    Array.isArray(order?.allowedActions) && order.allowedActions.includes("REORDER_ORDER");

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
      setError("Unable to find the order that needs transfer verification.");
      setLoading(false);
      return null;
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
      return latestOrder;
    } catch (requestError) {
      try {
        const detailOrder = await fetchUserOrderDetail(auth, orderId);
        setOrder(detailOrder);
        syncPendingPayment(detailOrder);
        return detailOrder;
      } catch {
        setError(requestError.message || "Unable to check the transfer status.");
      }
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    void loadPaymentState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, auth.tokenType, orderId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setNotice("");
    const latestOrder = await loadPaymentState();
    if (latestOrder) {
      setNotice(buildTransferCheckMessage(latestOrder));
    }
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

      setNotice("The system could not create a new PayOS payment session for this order yet. Please try again shortly.");
    } catch (requestError) {
      setError(requestError.message || "Unable to create a new PayOS payment.");
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order?.id) {
      setError("Unable to find the unpaid order to cancel.");
      return;
    }

    const confirmed = window.confirm(
      "Cancel this unpaid order and stop the current payment session?",
    );
    if (!confirmed) {
      return;
    }

    try {
      const cancelledOrder = await cancelUserOrder(auth, order.id);
      setOrder(cancelledOrder);
      syncPendingPayment(cancelledOrder);
      setNotice("The unpaid order has been cancelled.");
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel the order.");
    }
  };

  const handleReorder = async () => {
    if (!order?.id) {
      setError("Unable to find the order to reorder.");
      return;
    }

    if (Array.isArray(siteData?.cart?.items) && siteData.cart.items.length > 0) {
      const confirmed = window.confirm(
        "Reorder will replace the current cart so it matches this order. Continue?",
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      await reorderUserOrder(auth, order.id);
      await siteData.refreshCart();
      setNotice(`The cart now matches Order #${order.id}.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to reorder this order.");
    }
  };

  const heading = isCancelMode
    ? "Checking transfer after cancellation"
    : "Checking transfer result";
  const description = isCancelMode
    ? "If you just cancelled on PayOS, this page checks the order again so the latest transfer result is shown."
    : "If you just completed the transfer, this page asks the server to verify the latest payment result.";

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Payment</p>
        <h1 className={ui.bannerTitle}>{heading}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">{description}</p>
      </section>

      <section className={ui.panel}>
        {loading ? (
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Checking transfer with the server...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 text-sm leading-7 text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && notice ? (
          <div className="rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/12 p-6 text-sm leading-7 text-matcha-700">
            {notice}
          </div>
        ) : null}

        {!loading && order ? (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-tea-900">Order #{order.id}</h2>
                    <p className="mt-2 text-sm font-semibold text-matcha-700">
                      {getOrderStatusMeta(order.status).label}
                    </p>
                  </div>

                  <strong className="text-xl font-bold text-matcha-700">
                    {formatPrice(order.totalAmount)}
                  </strong>
                </div>

                <div className="mt-5">
                  <OrderStatusTracker order={order} />
                </div>

                <div className="mt-5 grid gap-2 text-sm leading-7 text-stone-600">
                  {order.storeName ? <span>Store: {order.storeName}</span> : null}
                  {order.storePhoneNumber ? <span>Store phone: {order.storePhoneNumber}</span> : null}
                  {order.storeAddress ? <span>Store address: {order.storeAddress}</span> : null}
                  <span>Subtotal: {formatPrice(order.subtotalAmount)}</span>
                  {Number(order.discountAmount ?? 0) > 0 ? (
                    <span>Discount: {formatPrice(order.discountAmount)}</span>
                  ) : null}
                  {order.shippingFeeAmount !== undefined && order.shippingFeeAmount !== null ? (
                    <span>Shipping fee: {formatPrice(order.shippingFeeAmount)}</span>
                  ) : null}
                  {Number(order.creditPointsAwarded ?? 0) > 0 ? (
                    <span>Credit earned: {Number(order.creditPointsAwarded).toLocaleString("vi-VN")} pts</span>
                  ) : null}
                  {order.shippingDistanceKm !== undefined && order.shippingDistanceKm !== null ? (
                    <span>
                      Shipping distance: {formatShippingDistance(order.shippingDistanceKm)}
                    </span>
                  ) : null}
                  {order.shippingFeeBreakdown?.length ? (
                    <span>
                      Shipping breakdown: {formatShippingBreakdown(order.shippingFeeBreakdown)}
                    </span>
                  ) : null}
                  {order.promotionCode ? <span>Promotion code: {order.promotionCode}</span> : null}
                  {order.promotionScope ? <span>Promotion scope: {order.promotionScope}</span> : null}
                  {Number(order.promotionEligibleAmount ?? 0) > 0 ? (
                    <span>Eligible amount: {formatPrice(order.promotionEligibleAmount)}</span>
                  ) : null}
                  <span>Delivery type: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                  {order.scheduledDeliveryAt ? (
                    <span>Scheduled for: {formatDateTime(order.scheduledDeliveryAt)}</span>
                  ) : null}
                  <span>Recipient: {order.deliveryFullName || "N/A"}</span>
                  <span>Phone: {order.deliveryPhoneNumber || "N/A"}</span>
                  <span>Delivery address: {order.deliveryAddress || "N/A"}</span>
                  {order.invoiceNumber ? <span>Invoice number: {order.invoiceNumber}</span> : null}
                  {order.invoiceIssuedAt ? (
                    <span>Invoice issued at: {formatDateTime(order.invoiceIssuedAt)}</span>
                  ) : null}
                  {order.paymentExpiresAt ? (
                    <span>Payment expires at: {formatDateTime(order.paymentExpiresAt)}</span>
                  ) : null}
                  {order.paidAt ? <span>Paid at: {formatDateTime(order.paidAt)}</span> : null}
                  <span>Created at: {formatDateTime(order.createdAt)}</span>
                  <span>Updated at: {formatDateTime(order.updatedAt)}</span>
                </div>

                {order.cancellationNote ? (
                  <div className="mt-5 rounded-[1.25rem] border border-rose-200 bg-rose-50/90 p-4 text-sm leading-7 text-rose-800">
                    <strong className="font-semibold text-rose-900">Cancellation note:</strong>{" "}
                    {order.cancellationNote}
                    {order.cancelledByUserName ? (
                      <span className="text-rose-700">
                        {" "}
                        by {order.cancelledByUserName}
                        {order.cancelledAt ? ` • ${formatDateTime(order.cancelledAt)}` : ""}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </article>

              <div className="flex flex-wrap gap-3">
                {canRefreshPayment ? (
                  <button className={ui.secondaryButton} type="button" onClick={handleRefresh}>
                    {refreshing ? "Checking transfer..." : "I have transferred"}
                  </button>
                ) : null}
                {canCancelOrder ? (
                  <button className={ui.secondaryButton} type="button" onClick={handleCancelOrder}>
                    Cancel order
                  </button>
                ) : null}
                {canRefreshPayment && !hasPaymentSession ? (
                  <button className={ui.primaryButton} type="button" onClick={handleCreateNewPayment}>
                    {creatingPayment ? "Creating new PayOS..." : "Create new PayOS payment"}
                  </button>
                ) : null}
                {canViewInvoice && invoicePreviewUrl ? (
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    onClick={() => setInvoiceModalOpen(true)}
                    >
                      Open invoice
                    </button>
                  ) : null}
                <Link className={ui.primaryButton} to={`/orders/${order.id}`}>
                  View order
                </Link>
                {canReorderOrder ? (
                  <button className={ui.primaryButton} type="button" onClick={handleReorder}>
                    Reorder
                  </button>
                ) : null}
                <Link className={ui.secondaryButton} to="/orders">
                  Back to order history
                </Link>
              </div>

              {canRefreshPayment && !hasPaymentSession ? (
                <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
                  The current PayOS session is no longer usable. Create a new payment to continue checkout.
                </div>
              ) : null}

              {String(order.status ?? "").toUpperCase() !== "CANCELLED" &&
              String(order.paymentStatus ?? "").toUpperCase() !== "CANCELLED" ? (
                <PaymentQrCard
                  order={order}
                  title="PayOS QR"
                  subtitle="The latest QR is rendered from paymentQrCode so you can resume payment even after leaving the checkout page."
                />
              ) : null}
            </div>

            <aside className={`${ui.card} h-fit`}>
              <h2 className="text-2xl font-semibold text-tea-900">Current status</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <strong className="block text-lg font-bold text-tea-900">
                    {getPaymentStatusMeta(order.paymentStatus).label}
                  </strong>
                  <span className="mt-1 block text-sm text-stone-600">Payment</span>
                </div>

                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <strong className="block text-lg font-bold text-tea-900">
                    {getOrderStatusMeta(order.status).label}
                  </strong>
                  <span className="mt-1 block text-sm text-stone-600">Order</span>
                </div>

                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <strong className="block text-lg font-bold text-tea-900">
                    {formatDeliveryTypeLabel(order.deliveryType)}
                  </strong>
                  <span className="mt-1 block text-sm text-stone-600">Delivery type</span>
                </div>
              </div>

              {order.paymentCheckoutUrl && hasPaymentSession ? (
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
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>

      <InvoicePreviewModal
        open={invoiceModalOpen}
        order={order}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </main>
  );
}
