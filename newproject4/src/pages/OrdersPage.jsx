import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderQrCard from "../components/OrderQrCard";
import OrderStatusTracker from "../components/OrderStatusTracker";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import {
  canRetryPayment,
  formatDeliveryTypeLabel,
  getOrderStatusMeta,
  isPaymentExpired,
  preferFreshPaymentOrder,
} from "../lib/orderStatus";
import {
  canRefreshOrderPayment,
  canViewOrderInvoice,
  getOrderInvoicePreviewHref,
} from "../lib/orderWorkflow";
import {
  fetchUserOrderDetail,
  fetchUserOrders,
  refreshUserOrderPayment,
} from "../lib/siteApi";
import {
  clearPendingPaymentOrder,
  savePendingPaymentOrder,
} from "../lib/paymentSession";
import { navigateToExternalUrl } from "../lib/externalNavigation";
import { ui } from "../ui";

function formatPrice(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function formatCompactNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
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

function isCancelledOrder(order) {
  const status = String(order?.status ?? "").toUpperCase();
  const paymentStatus = String(order?.paymentStatus ?? "").toUpperCase();

  return status === "CANCELLED" || paymentStatus === "CANCELLED";
}

export default function OrdersPage() {
  const auth = useAuth();
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
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const orderDetailInvoicePreviewUrl = getOrderInvoicePreviewHref(orderDetail);
  const canRefreshDetailPayment = canRefreshOrderPayment(orderDetail);
  const canViewDetailInvoice = canViewOrderInvoice(orderDetail);

  useToastMessage(error, { type: "error", title: "Don hang" });
  useToastMessage(paymentMessage, { type: "info", title: "Thanh toan" });

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchUserOrders(auth, {
          page: 0,
          size: 20,
        });

        if (!cancelled) {
          setOrders(response.items);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load order history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrderDetail() {
      if (!orderId) {
        setOrderDetail(null);
        return;
      }

      setDetailLoading(true);

      try {
        const response = await fetchUserOrderDetail(auth, orderId);

        if (!cancelled) {
          setOrderDetail(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load order details.");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadOrderDetail();

    return () => {
      cancelled = true;
    };
  }, [auth, orderId]);

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
    if (!order?.id) {
      return;
    }

    if (["PAID", "CANCELLED"].includes(String(order.paymentStatus ?? "").toUpperCase())) {
      clearPendingPaymentOrder();
      return;
    }

    if (["CONFIRMED", "CANCELLED"].includes(String(order.status ?? "").toUpperCase())) {
      clearPendingPaymentOrder();
      return;
    }

    savePendingPaymentOrder(order);
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
      setPaymentMessage("Unable to find the order to refresh payment status.");
      return;
    }

    setRefreshingPaymentId(String(targetOrderId));
    setPaymentMessage("");
    setError("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, targetOrderId);
      await syncOrderPaymentState(targetOrderId, refreshedOrder);
      setPaymentMessage(
        refreshedOrder.paymentStatus === "PAID"
          ? "The order has been paid successfully."
          : refreshedOrder.paymentStatus === "CANCELLED"
            ? "The payment was cancelled."
            : "The latest payment status has been refreshed.",
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to refresh payment status.");
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
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          String(order.id) === String(refreshedOrder.id) ? refreshedOrder : order,
        ),
      );
      setOrderDetail((currentOrder) =>
        String(currentOrder?.id) === String(refreshedOrder.id) ? refreshedOrder : currentOrder,
      );
      syncPendingPaymentStorage(refreshedOrder);

      if (!canRetryPayment(refreshedOrder)) {
        setPaymentMessage("This order is no longer eligible for a new payment session.");
        return;
      }

      if (refreshedOrder.paymentCheckoutUrl) {
        setPaymentMessage("A new PayOS payment link has been created. Redirecting now...");

        navigateToExternalUrl(refreshedOrder.paymentCheckoutUrl);

        return;
      }

      const latestOrder = await syncOrderPaymentState(targetOrderId, refreshedOrder);

      if (!latestOrder.paymentCheckoutUrl) {
        setPaymentMessage(
          "He thong chua tao duoc lien ket PayOS moi cho don hang nay. Vui long thu lai sau.",
        );
        return;
      }

      setPaymentMessage("A new PayOS payment link has been created. Redirecting now...");

      navigateToExternalUrl(latestOrder.paymentCheckoutUrl);
    } catch (requestError) {
      setError(requestError.message || "Unable to create a new PayOS payment.");
    } finally {
      setRecreatingPaymentId("");
    }
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
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-5">
            {orders.map((order) => (
              <article key={order.id} className={ui.card}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-tea-900">Order #{order.id}</h2>
                    <p className="mt-2 text-sm font-semibold text-matcha-700">
                      {getOrderStatusMeta(order.status).label}
                    </p>
                  </div>

                  <div className="text-right">
                    <strong className="text-xl font-bold text-matcha-700">
                      {formatPrice(order.totalAmount)}
                    </strong>
                    <p className="mt-2 text-sm text-stone-500">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <OrderStatusTracker compact order={order} />
                </div>

                <div className="mt-4 grid gap-2 text-sm text-stone-600">
                  {order.storeName ? <span>Store: {order.storeName}</span> : null}
                  <span>{formatCompactNumber(order.items.length)} line items</span>
                  <span>
                    {formatCompactNumber(
                      order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
                    )}{" "}
                    products
                  </span>
                  <span>Delivery type: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                  {order.scheduledDeliveryAt ? (
                    <span>Scheduled for: {formatDateTime(order.scheduledDeliveryAt)}</span>
                  ) : null}
                  {order.promotionScope ? <span>Promotion scope: {order.promotionScope}</span> : null}
                  {order.deliveryFullName ? <span>Recipient: {order.deliveryFullName}</span> : null}
                  {order.invoiceNumber ? <span>Invoice: {order.invoiceNumber}</span> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className={ui.primaryButton}
                    type="button"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    View details
                  </button>
                </div>
              </article>
            ))}

            {!orders.length ? (
              <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-8 text-sm leading-7 text-stone-600">
                You do not have any orders yet.
              </article>
            ) : null}
          </div>

          <aside className={`${ui.card} h-fit`}>
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
                  {orderDetail.paymentProvider ? (
                    <span>Payment provider: {orderDetail.paymentProvider}</span>
                  ) : null}
                  {orderDetail.invoiceAvailable ? <span>Invoice ready: Yes</span> : null}
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
                  {orderDetail.promotionDishIds?.length ? (
                    <span>Promotion dish IDs: {orderDetail.promotionDishIds.join(", ")}</span>
                  ) : null}
                  <span>Delivery type: {formatDeliveryTypeLabel(orderDetail.deliveryType)}</span>
                  {orderDetail.scheduledDeliveryAt ? (
                    <span>Scheduled for: {formatDateTime(orderDetail.scheduledDeliveryAt)}</span>
                  ) : null}
                  {orderDetail.preparingStaffName ? (
                    <span>Preparing staff: {orderDetail.preparingStaffName}</span>
                  ) : null}
                  {orderDetail.deliveringShipperName ? (
                    <span>Delivery rider: {orderDetail.deliveringShipperName}</span>
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
                  <span>Created at: {formatDateTime(orderDetail.createdAt)}</span>
                  <span>Updated at: {formatDateTime(orderDetail.updatedAt)}</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    disabled={refreshingPaymentId === String(orderDetail.id)}
                    onClick={() => handleRefreshPayment(orderDetail.id)}
                  >
                    {refreshingPaymentId === String(orderDetail.id)
                      ? "Refreshing..."
                      : "Refresh payment"}
                  </button>

                  {canRefreshDetailPayment &&
                  (isPaymentExpired(orderDetail) || !orderDetail.paymentCheckoutUrl) ? (
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

                  {orderDetail.paymentCheckoutUrl &&
                  canRefreshDetailPayment &&
                  !isPaymentExpired(orderDetail) ? (
                    <a
                      className={ui.primaryButton}
                      href={orderDetail.paymentCheckoutUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Mo PayOS
                    </a>
                  ) : null}

                  {canViewDetailInvoice && orderDetailInvoicePreviewUrl ? (
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => setInvoiceModalOpen(true)}
                    >
                      Xuat hoa don
                    </button>
                  ) : null}
                </div>

                {canRefreshDetailPayment && isPaymentExpired(orderDetail) ? (
                  <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
                    The old PayOS link has expired. Use <strong>Create new PayOS payment</strong> to
                    generate a fresh payment session.
                  </div>
                ) : null}

                <OrderQrCard
                  order={orderDetail}
                  title="Invoice QR"
                  subtitle="Quet ma nay de mo hoa don cong khai tren trinh duyet hoac dua cho staff/shipper quet trong app noi bo."
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
