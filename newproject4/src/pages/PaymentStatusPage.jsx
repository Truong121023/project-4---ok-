import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderQrCard from "../components/OrderQrCard";
import OrderStatusTracker from "../components/OrderStatusTracker";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import {
  canRetryPayment,
  formatDeliveryTypeLabel,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  isPaymentExpired,
  preferFreshPaymentOrder,
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
import { fetchUserOrderDetail, refreshUserOrderPayment } from "../lib/siteApi";
import { ui } from "../ui";

function formatPrice(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function formatDateTime(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shouldClearPendingPayment(order) {
  const paymentStatus = String(order?.paymentStatus ?? "").toUpperCase();
  const orderStatus = String(order?.status ?? "").toUpperCase();

  return ["PAID", "CANCELLED"].includes(paymentStatus) ||
    ["CONFIRMED", "CANCELLED"].includes(orderStatus);
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

  const pendingPayment = useMemo(() => getPendingPaymentOrder(), []);
  const orderId = searchParams.get("orderId") || pendingPayment?.orderId || "";
  const isCancelMode = mode === "cancel";
  const invoicePreviewUrl = getOrderInvoicePreviewHref(order);
  const canRefreshPayment = canRefreshOrderPayment(order);
  const canViewInvoice = canViewOrderInvoice(order);

  useToastMessage(error, { type: "error", title: "Thanh toan" });
  useToastMessage(notice, { type: "info", title: "Thanh toan" });

  const syncPendingPayment = (nextOrder) => {
    if (!nextOrder?.id) {
      return;
    }

    if (shouldClearPendingPayment(nextOrder)) {
      clearPendingPaymentOrder();
      return;
    }

    savePendingPaymentOrder(nextOrder);
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
      setOrder(refreshedOrder);
      syncPendingPayment(refreshedOrder);

      try {
        const detailOrder = await fetchUserOrderDetail(auth, orderId);
        const nextOrder = preferFreshPaymentOrder(refreshedOrder, detailOrder);
        setOrder(nextOrder);
        syncPendingPayment(nextOrder);
      } catch {
        setOrder(refreshedOrder);
        syncPendingPayment(refreshedOrder);
      }
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
      setOrder(refreshedOrder);
      syncPendingPayment(refreshedOrder);

      if (!canRetryPayment(refreshedOrder)) {
        setNotice("This order is no longer eligible for a new payment session.");
        return;
      }

      if (refreshedOrder.paymentCheckoutUrl) {
        setNotice("A new PayOS payment link has been created. Redirecting now...");

        navigateToExternalUrl(refreshedOrder.paymentCheckoutUrl);

        return;
      }

      let latestOrder = refreshedOrder;

      try {
        const detailOrder = await fetchUserOrderDetail(auth, orderId);
        latestOrder = preferFreshPaymentOrder(refreshedOrder, detailOrder);
        setOrder(latestOrder);
        syncPendingPayment(latestOrder);
      } catch {
        latestOrder = refreshedOrder;
      }

      if (!latestOrder.paymentCheckoutUrl) {
        setNotice(
          "He thong chua tao duoc lien ket PayOS moi cho don hang nay. Vui long thu lai sau.",
        );
        return;
      }

      setNotice("A new PayOS payment link has been created. Redirecting now...");

      navigateToExternalUrl(latestOrder.paymentCheckoutUrl);
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
            Syncing payment status...
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
                  <span>Subtotal: {formatPrice(order.subtotalAmount)}</span>
                  {Number(order.discountAmount ?? 0) > 0 ? (
                    <span>Discount: {formatPrice(order.discountAmount)}</span>
                  ) : null}
                  {order.promotionCode ? <span>Promotion code: {order.promotionCode}</span> : null}
                  {order.promotionScope ? <span>Promotion scope: {order.promotionScope}</span> : null}
                  {Number(order.promotionEligibleAmount ?? 0) > 0 ? (
                    <span>Eligible amount: {formatPrice(order.promotionEligibleAmount)}</span>
                  ) : null}
                  {order.promotionDishIds?.length ? (
                    <span>Promotion dish IDs: {order.promotionDishIds.join(", ")}</span>
                  ) : null}
                  <span>Delivery type: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                  {order.scheduledDeliveryAt ? (
                    <span>Scheduled for: {formatDateTime(order.scheduledDeliveryAt)}</span>
                  ) : null}
                  {order.preparingStaffName ? (
                    <span>Preparing staff: {order.preparingStaffName}</span>
                  ) : null}
                  {order.deliveringShipperName ? (
                    <span>Delivery rider: {order.deliveringShipperName}</span>
                  ) : null}
                  <span>Recipient: {order.deliveryFullName || "N/A"}</span>
                  <span>Phone: {order.deliveryPhoneNumber || "N/A"}</span>
                  <span>Delivery address: {order.deliveryAddress || "N/A"}</span>
                  {order.paymentProvider ? <span>Payment provider: {order.paymentProvider}</span> : null}
                  {order.invoiceAvailable ? <span>Invoice ready: Yes</span> : null}
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
              </article>

              <div className="flex flex-wrap gap-3">
                <button className={ui.secondaryButton} type="button" onClick={handleRefresh}>
                  {refreshing ? "Refreshing..." : "Refresh payment"}
                </button>
                {canRefreshPayment && (isPaymentExpired(order) || !order.paymentCheckoutUrl) ? (
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
                    Xuat hoa don
                  </button>
                ) : null}
                <Link className={ui.primaryButton} to={`/orders/${order.id}`}>
                  View order
                </Link>
                <Link className={ui.secondaryButton} to="/orders">
                  Back to order history
                </Link>
              </div>

              {canRefreshPayment && isPaymentExpired(order) ? (
                <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
                  The previous PayOS session has expired. Create a new payment to continue checkout.
                </div>
              ) : null}

              <OrderQrCard
                order={order}
                title="Invoice QR"
                subtitle="Sau khi thanh toan thanh cong, ban co the dua ma nay de cua hang quet va tra cuu hoa don."
              />
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

              {order.paymentCheckoutUrl &&
              canRefreshPayment &&
              !isPaymentExpired(order) ? (
                <div className="mt-5">
                  <a
                    className={ui.primaryButton}
                    href={order.paymentCheckoutUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Reopen PayOS
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
