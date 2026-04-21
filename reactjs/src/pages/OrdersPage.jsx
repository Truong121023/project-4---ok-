import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderStatusTracker from "../components/OrderStatusTracker";
import PaymentQrCard from "../components/PaymentQrCard";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
import { useAuth } from "../context/AuthContext";
import { useAppRealtime } from "../context/AppRealtimeContext";
import { useSiteData } from "../context/SiteDataContext";
import { useToastMessage } from "../hooks/useToastMessage";
import {
  canRetryPayment,
  formatDeliveryTypeLabel,
  getOrderStatusMeta,
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
  cancelUserOrder,
  fetchUserOrderDetail,
  fetchUserOrders,
  refreshUserOrderPayment,
  reorderUserOrder,
} from "../lib/siteApi";
import {
  clearPendingPaymentOrder,
  savePendingPaymentOrder,
} from "../lib/paymentSession";
import { navigateToExternalUrl } from "../lib/externalNavigation";
import { formatCurrencyVnd, formatDateTimeVn, formatNumberVi } from "../lib/locale";
import { formatShippingBreakdown, formatShippingDistance } from "../lib/shippingFee";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatCompactNumber(value) {
  return formatNumberVi(value);
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

function isCancelledOrder(order) {
  const status = String(order?.status ?? "").toUpperCase();
  const paymentStatus = String(order?.paymentStatus ?? "").toUpperCase();

  return status === "CANCELLED" || paymentStatus === "CANCELLED";
}

function canLeaveOrderFeedback(order) {
  return (
    String(order?.status ?? "").toUpperCase() === "COMPLETED" &&
    String(order?.paymentStatus ?? "").toUpperCase() === "PAID" &&
    !order?.feedbackSubmitted
  );
}

function canUserCancelOrder(order) {
  return Array.isArray(order?.allowedActions) && order.allowedActions.includes("CANCEL_ORDER");
}

function canReorderOrder(order) {
  return Array.isArray(order?.allowedActions) && order.allowedActions.includes("REORDER_ORDER");
}

export default function OrdersPage() {
  const auth = useAuth();
  const realtime = useAppRealtime();
  const siteData = useSiteData();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [refreshingPaymentId, setRefreshingPaymentId] = useState("");
  const [recreatingPaymentId, setRecreatingPaymentId] = useState("");
  const [actingOrderId, setActingOrderId] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const paidProfileRefreshRef = useRef("");
  const lastHandledOrderRealtimeVersionRef = useRef(0);
  const orderDetailInvoicePreviewUrl = getOrderInvoicePreviewHref(orderDetail);
  const canRefreshDetailPayment = canRefreshOrderPayment(orderDetail);
  const canViewDetailInvoice = canViewOrderInvoice(orderDetail);
  const orderDetailHasUsablePaymentSession = hasUsablePaymentSession(orderDetail);

  useToastMessage(error, { type: "error", title: "Orders" });
  useToastMessage(paymentMessage, { type: "info", title: "Payment" });

  useEffect(() => {
    const normalizedPaymentStatus = String(orderDetail?.paymentStatus ?? "").toUpperCase();
    const refreshKey = orderDetail?.id
      ? `${orderDetail.id}:${orderDetail.paidAt ?? orderDetail.updatedAt ?? normalizedPaymentStatus}`
      : "";

    if (!auth.hasRole("USER") || normalizedPaymentStatus !== "PAID" || !refreshKey) {
      return;
    }

    if (paidProfileRefreshRef.current === refreshKey) {
      return;
    }

    paidProfileRefreshRef.current = refreshKey;
    void auth.refreshMe().catch(() => {});
  }, [
    auth,
    orderDetail?.id,
    orderDetail?.paidAt,
    orderDetail?.paymentStatus,
    orderDetail?.updatedAt,
  ]);

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      setError("");

      try {
        const response = await fetchUserOrders(auth, {
          page: 0,
          size: 20,
        });
        setOrders(response.items);
        return response.items;
      } catch (requestError) {
        const message = requestError.message || "Unable to load order history.";
        setError(message);
        if (!silent) {
          throw requestError;
        }
        return [];
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [auth],
  );

  const loadOrderDetail = useCallback(
    async ({ silent = false } = {}) => {
      if (!orderId) {
        setOrderDetail(null);
        return null;
      }

      if (!silent) {
        setDetailLoading(true);
      }
      setError("");

      try {
        const response = await fetchUserOrderDetail(auth, orderId);
        setOrderDetail(response);
        return response;
      } catch (requestError) {
        const message = requestError.message || "Unable to load order details.";
        setError(message);
        if (!silent) {
          throw requestError;
        }
        return null;
      } finally {
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    [auth, orderId],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadOrderDetail();
  }, [loadOrderDetail]);

  useEffect(() => {
    if (!realtime.orderEventVersion || !auth.hasRole("USER")) {
      return;
    }

    if (lastHandledOrderRealtimeVersionRef.current === realtime.orderEventVersion) {
      return;
    }

    lastHandledOrderRealtimeVersionRef.current = realtime.orderEventVersion;

    void loadOrders({ silent: true });

    const eventOrderId = String(realtime.lastOrderEvent?.orderId ?? "").trim();
    if (!orderId || !eventOrderId || eventOrderId === String(orderId)) {
      void loadOrderDetail({ silent: true });
    }
  }, [
    auth,
    loadOrderDetail,
    loadOrders,
    orderId,
    realtime.lastOrderEvent?.orderId,
    realtime.orderEventVersion,
  ]);

  const orderStats = useMemo(() => {
    const totalAmount = orders.reduce(
      (sum, order) => sum + (isCancelledOrder(order) ? 0 : Number(order.totalAmount ?? 0)),
      0,
    );
    const activeCount = orders.filter((order) =>
      !["COMPLETED", "CANCELLED"].includes(String(order.status ?? "").toUpperCase()),
    ).length;
    const completedCount = orders.filter(
      (order) => String(order.status ?? "").toUpperCase() === "COMPLETED",
    ).length;

    return {
      totalAmount,
      activeCount,
      completedCount,
    };
  }, [orders]);

  const syncPendingPaymentStorage = (order) => {
    if (!shouldPersistPendingPaymentOrder(order)) {
      clearPendingPaymentOrder();
      return;
    }

    savePendingPaymentOrder(order);
  };

  useEffect(() => {
    if (!orderDetail?.id) {
      return;
    }

    syncPendingPaymentStorage(orderDetail);
  }, [orderDetail]);

  const continueWithPaymentSession = (nextOrder) => {
    if (!hasUsablePaymentSession(nextOrder)) {
      return false;
    }

    if (nextOrder.paymentCheckoutUrl) {
      setPaymentMessage("A new PayOS payment link has been created. Redirecting now...");
      navigateToExternalUrl(nextOrder.paymentCheckoutUrl);
      return true;
    }

    setPaymentMessage("A new PayOS payment session is ready. Scan the QR code below to continue.");
    return true;
  };

  const syncOrderPaymentState = async (targetOrderId, refreshedOrder) => {
    const [nextOrdersResponse, nextDetailResponse] = await Promise.allSettled([
      fetchUserOrders(auth, {
        page: 0,
        size: 20,
      }),
      fetchUserOrderDetail(auth, targetOrderId),
    ]);

    if (nextOrdersResponse.status === "fulfilled") {
      setOrders(
        nextOrdersResponse.value.items.map((order) =>
          String(order.id) === String(refreshedOrder.id)
            ? preferFreshPaymentOrder(refreshedOrder, order)
            : order,
        ),
      );
    } else {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          String(order.id) === String(refreshedOrder.id) ? refreshedOrder : order,
        ),
      );
    }

    if (nextDetailResponse.status === "fulfilled") {
      const nextOrderDetail = preferFreshPaymentOrder(refreshedOrder, nextDetailResponse.value);
      setOrderDetail(nextOrderDetail);
      syncPendingPaymentStorage(nextOrderDetail);
      return nextOrderDetail;
    }

    setOrderDetail((currentOrder) =>
      String(currentOrder?.id) === String(refreshedOrder.id) ? refreshedOrder : currentOrder,
    );
    syncPendingPaymentStorage(refreshedOrder);
    return refreshedOrder;
  };

  const handleRefreshPayment = async (targetOrderId = orderDetail?.id) => {
    if (!targetOrderId) {
      setPaymentMessage("Unable to find the order to check your transfer.");
      return;
    }

    setRefreshingPaymentId(String(targetOrderId));
    setPaymentMessage("");
    setError("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, targetOrderId);
      const latestOrder = await syncOrderPaymentState(targetOrderId, refreshedOrder);
      setPaymentMessage(buildTransferCheckMessage(latestOrder));
    } catch (requestError) {
      setError(requestError.message || "Unable to check the transfer status.");
    } finally {
      setRefreshingPaymentId("");
    }
  };

  const handleRecreatePayment = async (targetOrderId = orderDetail?.id) => {
    if (!targetOrderId) {
      setPaymentMessage("Unable to find the order to create a new PayOS payment.");
      return;
    }

    setRecreatingPaymentId(String(targetOrderId));
    setPaymentMessage("");
    setError("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, targetOrderId);
      const latestOrder = await syncOrderPaymentState(targetOrderId, refreshedOrder);

      if (!canRetryPayment(latestOrder)) {
        setPaymentMessage("This order is no longer eligible for a new payment session.");
        return;
      }

      if (continueWithPaymentSession(latestOrder)) {
        return;
      }

      setPaymentMessage(
        "The system could not create a new PayOS payment session for this order yet. Please try again shortly.",
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to create a new PayOS payment.");
    } finally {
      setRecreatingPaymentId("");
    }
  };

  const handleCancelOrder = async (targetOrderId) => {
    if (!targetOrderId) {
      setError("Unable to find the order to cancel.");
      return;
    }

    const confirmed = window.confirm(
      "Cancel this unpaid order and stop the current payment session?",
    );
    if (!confirmed) {
      return;
    }

    setActingOrderId(String(targetOrderId));
    setError("");
    setPaymentMessage("");

    try {
      const cancelledOrder = await cancelUserOrder(auth, targetOrderId);
      setOrderDetail(cancelledOrder);
      syncPendingPaymentStorage(cancelledOrder);
      await loadOrders({ silent: true });
      setPaymentMessage("The unpaid order has been cancelled.");
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel the order.");
    } finally {
      setActingOrderId("");
    }
  };

  const handleReorder = async (targetOrderId) => {
    if (!targetOrderId) {
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

    setActingOrderId(String(targetOrderId));
    setError("");
    setPaymentMessage("");

    try {
      await reorderUserOrder(auth, targetOrderId);
      await siteData.refreshCart();
      setPaymentMessage(`The cart now matches Order #${targetOrderId}.`);
      navigate("/cart");
    } catch (requestError) {
      setError(requestError.message || "Unable to reorder this order.");
    } finally {
      setActingOrderId("");
    }
  };

  const renderOrderDetailContent = (detailOrder) => {
    const canRefreshSelectedPayment = canRefreshOrderPayment(detailOrder);
    const canViewSelectedInvoice = canViewOrderInvoice(detailOrder);
    const selectedInvoicePreviewUrl = getOrderInvoicePreviewHref(detailOrder);
    const selectedOrderHasUsablePaymentSession = hasUsablePaymentSession(detailOrder);
    const isCancelled =
      String(detailOrder?.status ?? "").toUpperCase() === "CANCELLED" ||
      String(detailOrder?.paymentStatus ?? "").toUpperCase() === "CANCELLED";

    return (
      <div className="grid gap-4">
        <OrderStatusTracker order={detailOrder} />

        <div className="grid gap-2 text-sm leading-7 text-stone-600">
          <span>Status: {getOrderStatusMeta(detailOrder.status).label}</span>
          <span>Payment: {detailOrder.paymentStatus || "N/A"}</span>
          {detailOrder.storeName ? <span>Store: {detailOrder.storeName}</span> : null}
          {detailOrder.storePhoneNumber ? (
            <span>Store phone: {detailOrder.storePhoneNumber}</span>
          ) : null}
          {detailOrder.storeAddress ? <span>Store address: {detailOrder.storeAddress}</span> : null}
          {detailOrder.invoiceNumber ? <span>Invoice number: {detailOrder.invoiceNumber}</span> : null}
          {detailOrder.invoiceIssuedAt ? (
            <span>Invoice issued at: {formatDateTime(detailOrder.invoiceIssuedAt)}</span>
          ) : null}
          <span>Subtotal: {formatPrice(detailOrder.subtotalAmount)}</span>
          {Number(detailOrder.discountAmount ?? 0) > 0 ? (
            <span>Discount: {formatPrice(detailOrder.discountAmount)}</span>
          ) : null}
          {detailOrder.shippingFeeAmount !== undefined &&
          detailOrder.shippingFeeAmount !== null ? (
            <span>Shipping fee: {formatPrice(detailOrder.shippingFeeAmount)}</span>
          ) : null}
          {Number(detailOrder.creditPointsAwarded ?? 0) > 0 ? (
            <span>Credit earned: {formatCompactNumber(detailOrder.creditPointsAwarded)} pts</span>
          ) : null}
          {detailOrder.shippingDistanceKm !== undefined &&
          detailOrder.shippingDistanceKm !== null ? (
            <span>Shipping distance: {formatShippingDistance(detailOrder.shippingDistanceKm)}</span>
          ) : null}
          {detailOrder.shippingFeeBreakdown?.length ? (
            <span>
              Shipping breakdown: {formatShippingBreakdown(detailOrder.shippingFeeBreakdown)}
            </span>
          ) : null}
          <span>Total: {formatPrice(detailOrder.totalAmount)}</span>
          {detailOrder.promotionCode ? <span>Promotion code: {detailOrder.promotionCode}</span> : null}
          {detailOrder.promotionScope ? <span>Promotion scope: {detailOrder.promotionScope}</span> : null}
          {Number(detailOrder.promotionEligibleAmount ?? 0) > 0 ? (
            <span>Eligible amount: {formatPrice(detailOrder.promotionEligibleAmount)}</span>
          ) : null}
          <span>Delivery type: {formatDeliveryTypeLabel(detailOrder.deliveryType)}</span>
          {detailOrder.scheduledDeliveryAt ? (
            <span>Scheduled for: {formatDateTime(detailOrder.scheduledDeliveryAt)}</span>
          ) : null}
          {detailOrder.deliveryFullName ? (
            <span>
              Deliver to: {detailOrder.deliveryFullName} - {detailOrder.deliveryPhoneNumber}
            </span>
          ) : null}
          {detailOrder.deliveryAddress ? <span>Delivery address: {detailOrder.deliveryAddress}</span> : null}
          {detailOrder.paymentExpiresAt ? (
            <span>Payment expires at: {formatDateTime(detailOrder.paymentExpiresAt)}</span>
          ) : null}
          {detailOrder.paidAt ? <span>Paid at: {formatDateTime(detailOrder.paidAt)}</span> : null}
          {String(detailOrder.status ?? "").toUpperCase() === "COMPLETED" &&
          String(detailOrder.paymentStatus ?? "").toUpperCase() === "PAID" ? (
            <span>
              Feedback status: {detailOrder.feedbackSubmitted ? "Submitted" : "Ready to send"}
            </span>
          ) : null}
          <span>Created at: {formatDateTime(detailOrder.createdAt)}</span>
          <span>Updated at: {formatDateTime(detailOrder.updatedAt)}</span>
        </div>

        {detailOrder.cancellationNote ? (
          <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/90 p-4 text-sm leading-7 text-rose-800">
            <strong className="font-semibold text-rose-900">Cancellation note:</strong>{" "}
            {detailOrder.cancellationNote}
            {detailOrder.cancelledByUserName ? (
              <span className="text-rose-700">
                {" "}by {detailOrder.cancelledByUserName}
                {detailOrder.cancelledAt ? ` • ${formatDateTime(detailOrder.cancelledAt)}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}

        {detailOrder.feedbackSubmitted ? (
          <div className="rounded-[1.35rem] border border-matcha-900/10 bg-matcha-500/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={ui.pill}>Order feedback</span>
              {detailOrder.feedbackUpdatedAt ? (
                <span className={ui.pill}>{formatDateTime(detailOrder.feedbackUpdatedAt)}</span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              {detailOrder.feedbackMessage || "Feedback content is not available."}
            </p>
            {detailOrder.feedbackReplyMessage ? (
              <div className="mt-3 rounded-[1.1rem] border border-matcha-900/10 bg-white/70 p-3 text-sm leading-7 text-stone-700">
                {detailOrder.feedbackReplyMessage}
              </div>
            ) : null}
          </div>
        ) : canLeaveOrderFeedback(detailOrder) ? (
          <div className="rounded-[1.35rem] border border-dashed border-matcha-900/15 bg-white/50 p-4 text-sm leading-7 text-stone-600">
            This completed order can receive feedback now.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {canRefreshSelectedPayment ? (
            <button
              className={ui.secondaryButton}
              type="button"
              disabled={refreshingPaymentId === String(detailOrder.id)}
              onClick={() => handleRefreshPayment(detailOrder.id)}
            >
              {refreshingPaymentId === String(detailOrder.id)
                ? "Checking transfer..."
                : "I have transferred"}
            </button>
          ) : null}

          {canUserCancelOrder(detailOrder) ? (
            <button
              className={ui.secondaryButton}
              type="button"
              disabled={actingOrderId === String(detailOrder.id)}
              onClick={() => handleCancelOrder(detailOrder.id)}
            >
              {actingOrderId === String(detailOrder.id) ? "Cancelling..." : "Cancel order"}
            </button>
          ) : null}

          {canRefreshSelectedPayment && !selectedOrderHasUsablePaymentSession ? (
            <button
              className={ui.primaryButton}
              type="button"
              disabled={recreatingPaymentId === String(detailOrder.id)}
              onClick={() => handleRecreatePayment(detailOrder.id)}
            >
              {recreatingPaymentId === String(detailOrder.id)
                ? "Creating new PayOS..."
                : "Create new PayOS payment"}
            </button>
          ) : null}

          {detailOrder.paymentCheckoutUrl && selectedOrderHasUsablePaymentSession ? (
            <a
              className={ui.primaryButton}
              href={detailOrder.paymentCheckoutUrl}
              rel="noreferrer"
              target="_blank"
            >
              Pay now
            </a>
          ) : null}

          {canViewSelectedInvoice && selectedInvoicePreviewUrl ? (
            <button
              className={ui.secondaryButton}
              type="button"
              onClick={() => setInvoiceModalOpen(true)}
            >
              Open invoice
            </button>
          ) : null}

          {canReorderOrder(detailOrder) ? (
            <button
              className={ui.primaryButton}
              type="button"
              disabled={actingOrderId === String(detailOrder.id)}
              onClick={() => handleReorder(detailOrder.id)}
            >
              {actingOrderId === String(detailOrder.id) ? "Reordering..." : "Reorder"}
            </button>
          ) : null}

          {canLeaveOrderFeedback(detailOrder) || detailOrder.feedbackSubmitted ? (
            <Link className={ui.secondaryButton} to="/account/feedbacks">
              {detailOrder.feedbackSubmitted ? "Open feedback history" : "Leave feedback"}
            </Link>
          ) : null}
        </div>

        {canRefreshSelectedPayment && !selectedOrderHasUsablePaymentSession ? (
          <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
            The current PayOS session is no longer usable. Use{" "}
            <strong>Create new PayOS payment</strong> to generate a fresh payment session.
          </div>
        ) : null}

        {!isCancelled ? (
          <PaymentQrCard
            order={detailOrder}
            title="PayOS QR"
            subtitle="Scan the latest PayOS QR directly from paymentQrCode, or continue checkout with the payment button."
          />
        ) : null}

        <div className="grid gap-3">
          {detailOrder.items.map((item) => (
            <article
              key={item.id}
              className="grid gap-3 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4 sm:grid-cols-[88px_1fr]"
            >
              <div className="overflow-hidden rounded-[1rem] border border-matcha-900/10 bg-stone-100">
                <SmartImage
                  className="h-20 w-full object-cover"
                  src={item.imagePaths?.[0]}
                  alt={item.dishName}
                  loading="lazy"
                  fallbackClassName="grid h-20 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-tea-900">{item.dishName}</p>
                    <p className="mt-1 text-sm text-stone-600">{item.storeName}</p>
                  </div>
                  <strong className="text-matcha-700">{formatPrice(item.totalPrice)}</strong>
                </div>

                <div className="mt-2 grid gap-1 text-sm text-stone-600">
                  <span>Quantity: {item.quantity}</span>
                  <span>Unit price: {formatPrice(item.unitPrice)}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <QuickAddToCartButton
                    className={ui.primaryButton}
                    dishId={item.dishId}
                    storeId={item.storeId}
                    quantity={1}
                    blocked={!item.dishId || !item.storeId}
                    blockedMessage="This item is not ready to be added to the cart again yet."
                    onResult={(message) => setCartMessage(message)}
                  />
                  <QuickFavoriteButton
                    targetType="dish"
                    targetId={item.dishId}
                    activeLabel="Saved"
                    inactiveLabel="Save item"
                    onResult={(message) => setFavoriteMessage(message)}
                  />
                  <Link className={ui.secondaryButton} to={`/menu/${item.dishId}?store=${item.storeId}`}>
                    View item
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Orders</p>
            <h1 className={ui.bannerTitle}>Order history</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
              Track orders created from checkout, their processing status, and item-by-item details.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total orders", value: formatCompactNumber(orders.length) },
            { label: "Active", value: formatCompactNumber(orderStats.activeCount) },
            { label: "Completed", value: formatCompactNumber(orderStats.completedCount) },
            { label: "Total spend", value: formatPrice(orderStats.totalAmount) },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-[1.3rem] border border-matcha-900/10 bg-white/72 p-4"
            >
              <strong className="block text-2xl font-bold text-tea-900">{stat.value}</strong>
              <span className="mt-1 block text-sm text-stone-600">{stat.label}</span>
            </article>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm leading-7 text-stone-600">{error}</p> : null}
        {cartMessage ? <p className="mt-2 text-sm leading-7 text-stone-600">{cartMessage}</p> : null}
        {favoriteMessage ? (
          <p className="mt-2 text-sm leading-7 text-stone-600">{favoriteMessage}</p>
        ) : null}
        {paymentMessage ? (
          <p className="mt-2 text-sm leading-7 text-stone-600">{paymentMessage}</p>
        ) : null}
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading order history...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="grid gap-5">
          <div className="grid gap-5">
            {orders.map((order) => (
              <article key={order.id} className={ui.card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-tea-900">Order #{order.id}</h2>
                  <button
                    className={String(orderId ?? "") === String(order.id) ? ui.secondaryButton : ui.primaryButton}
                    type="button"
                    onClick={() =>
                      navigate(
                        String(orderId ?? "") === String(order.id) ? "/orders" : `/orders/${order.id}`,
                      )
                    }
                  >
                    {String(orderId ?? "") === String(order.id) ? "Hide details" : "Open details"}
                  </button>
                </div>

                {String(orderId ?? "") === String(order.id) ? (
                  <div className="mt-5 border-t border-matcha-900/10 pt-5">
                    {detailLoading && String(orderDetail?.id ?? "") !== String(order.id) ? (
                      <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                        Loading details...
                      </div>
                    ) : String(orderDetail?.id ?? "") === String(order.id) ? (
                      renderOrderDetailContent(orderDetail)
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}

            {!orders.length ? (
              <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-8 text-sm leading-7 text-stone-600">
                You do not have any orders yet.
              </article>
            ) : null}
          </div>

          <aside className="hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                  Order detail
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                  {orderDetail ? `Order #${orderDetail.id}` : "Choose an order"}
                </h2>
              </div>
            </div>

            {detailLoading ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                Loading details...
              </div>
            ) : null}

            {!detailLoading && orderDetail ? (
              <div className="mt-6 grid gap-4">
                <OrderStatusTracker order={orderDetail} />

                <div className="grid gap-2 text-sm leading-7 text-stone-600">
                  <span>Status: {getOrderStatusMeta(orderDetail.status).label}</span>
                  <span>Payment: {orderDetail.paymentStatus || "N/A"}</span>
                  {orderDetail.storeName ? (
                    <span>Store: {orderDetail.storeName}</span>
                  ) : null}
                  {orderDetail.storePhoneNumber ? (
                    <span>Store phone: {orderDetail.storePhoneNumber}</span>
                  ) : null}
                  {orderDetail.storeAddress ? (
                    <span>Store address: {orderDetail.storeAddress}</span>
                  ) : null}
                  {orderDetail.invoiceNumber ? (
                    <span>Invoice number: {orderDetail.invoiceNumber}</span>
                  ) : null}
                  {orderDetail.invoiceIssuedAt ? (
                    <span>Invoice issued at: {formatDateTime(orderDetail.invoiceIssuedAt)}</span>
                  ) : null}
                  <span>Subtotal: {formatPrice(orderDetail.subtotalAmount)}</span>
                  {Number(orderDetail.discountAmount ?? 0) > 0 ? (
                    <span>Discount: {formatPrice(orderDetail.discountAmount)}</span>
                  ) : null}
                  {orderDetail.shippingFeeAmount !== undefined &&
                  orderDetail.shippingFeeAmount !== null ? (
                    <span>Shipping fee: {formatPrice(orderDetail.shippingFeeAmount)}</span>
                  ) : null}
                  {Number(orderDetail.creditPointsAwarded ?? 0) > 0 ? (
                    <span>Credit earned: {formatCompactNumber(orderDetail.creditPointsAwarded)} pts</span>
                  ) : null}
                  {orderDetail.shippingDistanceKm !== undefined &&
                  orderDetail.shippingDistanceKm !== null ? (
                    <span>
                      Shipping distance: {formatShippingDistance(orderDetail.shippingDistanceKm)}
                    </span>
                  ) : null}
                  {orderDetail.shippingFeeBreakdown?.length ? (
                    <span>
                      Shipping breakdown: {formatShippingBreakdown(orderDetail.shippingFeeBreakdown)}
                    </span>
                  ) : null}
                  <span>Total: {formatPrice(orderDetail.totalAmount)}</span>
                  {orderDetail.promotionCode ? (
                    <span>Promotion code: {orderDetail.promotionCode}</span>
                  ) : null}
                  {orderDetail.promotionScope ? (
                    <span>Promotion scope: {orderDetail.promotionScope}</span>
                  ) : null}
                  {Number(orderDetail.promotionEligibleAmount ?? 0) > 0 ? (
                    <span>Eligible amount: {formatPrice(orderDetail.promotionEligibleAmount)}</span>
                  ) : null}
                  <span>Delivery type: {formatDeliveryTypeLabel(orderDetail.deliveryType)}</span>
                  {orderDetail.scheduledDeliveryAt ? (
                    <span>Scheduled for: {formatDateTime(orderDetail.scheduledDeliveryAt)}</span>
                  ) : null}
                  {orderDetail.deliveryFullName ? (
                    <span>
                      Deliver to: {orderDetail.deliveryFullName} - {orderDetail.deliveryPhoneNumber}
                    </span>
                  ) : null}
                  {orderDetail.deliveryAddress ? (
                    <span>Delivery address: {orderDetail.deliveryAddress}</span>
                  ) : null}
                  {orderDetail.paymentExpiresAt ? (
                    <span>Payment expires at: {formatDateTime(orderDetail.paymentExpiresAt)}</span>
                  ) : null}
                  {orderDetail.paidAt ? (
                    <span>Paid at: {formatDateTime(orderDetail.paidAt)}</span>
                  ) : null}
                  {String(orderDetail.status ?? "").toUpperCase() === "COMPLETED" &&
                  String(orderDetail.paymentStatus ?? "").toUpperCase() === "PAID" ? (
                    <span>
                      Feedback status: {orderDetail.feedbackSubmitted ? "Submitted" : "Ready to send"}
                    </span>
                  ) : null}
                  <span>Created at: {formatDateTime(orderDetail.createdAt)}</span>
                  <span>Updated at: {formatDateTime(orderDetail.updatedAt)}</span>
                </div>

                {orderDetail.cancellationNote ? (
                  <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/90 p-4 text-sm leading-7 text-rose-800">
                    <strong className="font-semibold text-rose-900">Cancellation note:</strong>{" "}
                    {orderDetail.cancellationNote}
                    {orderDetail.cancelledByUserName ? (
                      <span className="text-rose-700">
                        {" "}
                        by {orderDetail.cancelledByUserName}
                        {orderDetail.cancelledAt ? ` • ${formatDateTime(orderDetail.cancelledAt)}` : ""}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {orderDetail.feedbackSubmitted ? (
                  <div className="rounded-[1.35rem] border border-matcha-900/10 bg-matcha-500/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={ui.pill}>Order feedback</span>
                      {orderDetail.feedbackUpdatedAt ? (
                        <span className={ui.pill}>{formatDateTime(orderDetail.feedbackUpdatedAt)}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-stone-700">
                      {orderDetail.feedbackMessage || "Feedback content is not available."}
                    </p>
                    {orderDetail.feedbackReplyMessage ? (
                      <div className="mt-3 rounded-[1.1rem] border border-matcha-900/10 bg-white/70 p-3 text-sm leading-7 text-stone-700">
                        {orderDetail.feedbackReplyMessage}
                      </div>
                    ) : null}
                  </div>
                ) : canLeaveOrderFeedback(orderDetail) ? (
                  <div className="rounded-[1.35rem] border border-dashed border-matcha-900/15 bg-white/50 p-4 text-sm leading-7 text-stone-600">
                    This completed order can receive feedback now.
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  {canRefreshDetailPayment ? (
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      disabled={refreshingPaymentId === String(orderDetail.id)}
                      onClick={() => handleRefreshPayment(orderDetail.id)}
                    >
                      {refreshingPaymentId === String(orderDetail.id)
                        ? "Checking transfer..."
                        : "I have transferred"}
                    </button>
                  ) : null}

                  {canRefreshDetailPayment &&
                  !orderDetailHasUsablePaymentSession ? (
                    <button
                      className={ui.primaryButton}
                      type="button"
                      disabled={recreatingPaymentId === String(orderDetail.id)}
                      onClick={() => handleRecreatePayment(orderDetail.id)}
                    >
                      {recreatingPaymentId === String(orderDetail.id)
                        ? "Creating new PayOS..."
                        : "Create new PayOS payment"}
                    </button>
                  ) : null}

                  {orderDetail.paymentCheckoutUrl && orderDetailHasUsablePaymentSession ? (
                    <a
                      className={ui.primaryButton}
                      href={orderDetail.paymentCheckoutUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pay now
                    </a>
                  ) : null}

                  {canViewDetailInvoice && orderDetailInvoicePreviewUrl ? (
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => setInvoiceModalOpen(true)}
                    >
                      Open invoice
                    </button>
                  ) : null}
                  {canLeaveOrderFeedback(orderDetail) || orderDetail.feedbackSubmitted ? (
                    <Link className={ui.secondaryButton} to="/account/feedbacks">
                      {orderDetail.feedbackSubmitted ? "Open feedback history" : "Leave feedback"}
                    </Link>
                  ) : null}
                </div>

                {canRefreshDetailPayment && !orderDetailHasUsablePaymentSession ? (
                  <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
                    The current PayOS session is no longer usable. Use{" "}
                    <strong>Create new PayOS payment</strong> to generate a fresh payment session.
                  </div>
                ) : null}

                <PaymentQrCard
                  order={orderDetail}
                  title="PayOS QR"
                  subtitle="Scan the latest PayOS QR directly from paymentQrCode, or continue checkout with the payment button."
                />

                <div className="grid gap-3">
                  {orderDetail.items.map((item) => (
                    <article
                      key={item.id}
                      className="grid gap-3 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4 sm:grid-cols-[88px_1fr]"
                    >
                      <div className="overflow-hidden rounded-[1rem] border border-matcha-900/10 bg-stone-100">
                        <SmartImage
                          className="h-20 w-full object-cover"
                          src={item.imagePaths?.[0]}
                          alt={item.dishName}
                          loading="lazy"
                          fallbackClassName="grid h-20 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-tea-900">{item.dishName}</p>
                            <p className="mt-1 text-sm text-stone-600">{item.storeName}</p>
                          </div>
                          <strong className="text-matcha-700">{formatPrice(item.totalPrice)}</strong>
                        </div>

                        <div className="mt-2 grid gap-1 text-sm text-stone-600">
                          <span>Quantity: {item.quantity}</span>
                          <span>Unit price: {formatPrice(item.unitPrice)}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <QuickAddToCartButton
                            className={ui.primaryButton}
                            dishId={item.dishId}
                            storeId={item.storeId}
                            quantity={1}
                            blocked={!item.dishId || !item.storeId}
                            blockedMessage="This item is not ready to be added to the cart again yet."
                            onResult={(message) => setCartMessage(message)}
                          />
                          <QuickFavoriteButton
                            targetType="dish"
                            targetId={item.dishId}
                            activeLabel="Saved"
                            inactiveLabel="Save item"
                            onResult={(message) => setFavoriteMessage(message)}
                          />
                          <Link className={ui.secondaryButton} to={`/menu/${item.dishId}?store=${item.storeId}`}>
                            View item
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {!detailLoading && !orderDetail ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm leading-7 text-stone-600">
                Click an order on the left to view its details.
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}

      <InvoicePreviewModal
        open={invoiceModalOpen}
        order={orderDetail}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </main>
  );
}
