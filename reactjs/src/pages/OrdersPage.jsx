import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AccountLayout from "../components/templates/account-layout";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderStatusTracker from "../components/OrderStatusTracker";
import PaymentQrCard from "../components/PaymentQrCard";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
import { useAuth } from "../context/AuthContext";
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
  fetchUserOrderDetail,
  fetchUserOrders,
  refreshUserOrderPayment,
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

function isCancelledOrder(order) {
  const status = String(order?.status ?? "").toUpperCase();
  const paymentStatus = String(order?.paymentStatus ?? "").toUpperCase();

  return status === "CANCELLED" || paymentStatus === "CANCELLED";
}

export default function OrdersPage() {
  const { t } = useTranslation("orders");
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
  const paidProfileRefreshRef = useRef("");
  const orderDetailInvoicePreviewUrl = getOrderInvoicePreviewHref(orderDetail);
  const canRefreshDetailPayment = canRefreshOrderPayment(orderDetail);
  const canViewDetailInvoice = canViewOrderInvoice(orderDetail);
  const orderDetailHasUsablePaymentSession = hasUsablePaymentSession(orderDetail);

  useToastMessage(error, { type: "error", title: t("page.eyebrow") });
  useToastMessage(paymentMessage, { type: "info", title: t("payment.eyebrow") });

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
          setError(requestError.message || t("page.loadError"));
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
          setError(requestError.message || t("page.loadDetailError"));
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
      setPaymentMessage(t("payment.newLinkReady"));
      navigateToExternalUrl(nextOrder.paymentCheckoutUrl);
      return true;
    }

    setPaymentMessage(t("payment.newQrReady"));
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
      setPaymentMessage(t("payment.orderNotFound"));
      return;
    }

    setRefreshingPaymentId(String(targetOrderId));
    setPaymentMessage("");
    setError("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, targetOrderId);
      const latestOrder = await syncOrderPaymentState(targetOrderId, refreshedOrder);
      setPaymentMessage(
        latestOrder.paymentStatus === "PAID"
          ? t("payment.paid")
          : latestOrder.paymentStatus === "CANCELLED"
            ? t("payment.cancelled")
          : t("payment.refreshed"),
      );
    } catch (requestError) {
      setError(requestError.message || t("payment.refreshError"));
    } finally {
      setRefreshingPaymentId("");
    }
  };

  const handleRecreatePayment = async (targetOrderId = orderDetail?.id) => {
    if (!targetOrderId) {
      setPaymentMessage(t("payment.createNotFound"));
      return;
    }

    setRecreatingPaymentId(String(targetOrderId));
    setPaymentMessage("");
    setError("");

    try {
      const refreshedOrder = await refreshUserOrderPayment(auth, targetOrderId);
      const latestOrder = await syncOrderPaymentState(targetOrderId, refreshedOrder);

      if (!canRetryPayment(latestOrder)) {
        setPaymentMessage(t("payment.notEligible"));
        return;
      }

      if (continueWithPaymentSession(latestOrder)) {
        return;
      }

      setPaymentMessage(t("payment.couldNotCreate"));
    } catch (requestError) {
      setError(requestError.message || t("payment.createError"));
    } finally {
      setRecreatingPaymentId("");
    }
  };

  /* ---------- Account nav rail ---------- */
  const profileRail = (
    <div className="grid gap-4">
      <div>
        <p className={ui.eyebrow}>{t("page.eyebrow")}</p>
        <h2 className="font-display text-xl font-semibold text-ink-900">{t("page.title")}</h2>
      </div>
      <nav aria-label="Account sections" className="grid gap-1">
        {[
          { href: "/account", label: t("nav.overview") },
          { href: "/orders", label: t("nav.orders"), active: true },
          { href: "/account/levels", label: t("nav.membership") },
          { href: "/account/addresses", label: t("nav.addresses") },
          { href: "/account/favorites", label: t("nav.favorites") },
        ].map((link) => (
          <Link
            key={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              link.active
                ? "bg-matcha-500/10 font-semibold text-matcha-800"
                : "text-ink-700 hover:bg-cream-100"
            }`}
            to={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Stats summary */}
      <div className="grid gap-2">
        {[
          { label: t("stats.totalOrders"), value: formatCompactNumber(orders.length) },
          { label: t("stats.active"), value: formatCompactNumber(orderStats.activeCount) },
          { label: t("stats.completed"), value: formatCompactNumber(orderStats.completedCount) },
          { label: t("stats.totalSpend"), value: formatPrice(orderStats.totalAmount) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between gap-2 rounded-lg border border-ink-900/10 bg-cream-100/60 px-3 py-2"
          >
            <span className="text-xs text-ink-500">{stat.label}</span>
            <strong className="text-xs font-semibold text-ink-900">{stat.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className={ui.page}>
      <AccountLayout profile={profileRail}>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className={ui.eyebrow}>{t("page.eyebrow")}</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
              {t("page.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-600">
              {t("page.subtitle")}
            </p>
          </div>
        </div>

        {error && <p className="mt-4 text-sm leading-7 text-ink-600">{error}</p>}
        {cartMessage && <p className="mt-2 text-sm leading-7 text-ink-600">{cartMessage}</p>}
        {favoriteMessage && <p className="mt-2 text-sm leading-7 text-ink-600">{favoriteMessage}</p>}
        {paymentMessage && <p className="mt-2 text-sm leading-7 text-ink-600">{paymentMessage}</p>}
      </div>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            {t("page.loading")}
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
                  {order.storeName ? <span>{t("orderCard.store", { value: order.storeName })}</span> : null}
                  <span>{t("orderCard.lineItems", { count: order.items.length })}</span>
                  <span>
                    {t("orderCard.products", {
                      count: order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
                    })}
                  </span>
                  <span>{t("orderCard.deliveryType", { value: formatDeliveryTypeLabel(order.deliveryType) })}</span>
                  {order.shippingFeeAmount !== undefined && order.shippingFeeAmount !== null ? (
                    <span>{t("orderCard.shippingFee", { value: formatPrice(order.shippingFeeAmount) })}</span>
                  ) : null}
                  {Number(order.creditPointsAwarded ?? 0) > 0 ? (
                    <span>{t("orderCard.creditEarned", { count: order.creditPointsAwarded })}</span>
                  ) : null}
                  {order.scheduledDeliveryAt ? (
                    <span>{t("orderCard.scheduledFor", { value: formatDateTime(order.scheduledDeliveryAt) })}</span>
                  ) : null}
                  {order.promotionScope ? <span>{t("orderCard.promotionScope", { value: order.promotionScope })}</span> : null}
                  {order.deliveryFullName ? <span>{t("orderCard.recipient", { value: order.deliveryFullName })}</span> : null}
                  {order.invoiceNumber ? <span>{t("orderCard.invoice", { value: order.invoiceNumber })}</span> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className={ui.primaryButton}
                    type="button"
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    {t("detail.viewDetails")}
                  </button>
                </div>
              </article>
            ))}

            {!orders.length ? (
              <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-8 text-sm leading-7 text-stone-600">
                {t("page.noOrders")}
              </article>
            ) : null}
          </div>

          <aside className={`${ui.card} h-fit`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                  {t("detail.title")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                  {orderDetail ? t("detail.orderNumber", { id: orderDetail.id }) : t("detail.chooseOrder")}
                </h2>
              </div>
            </div>

            {detailLoading ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                {t("detail.loading")}
              </div>
            ) : null}

            {!detailLoading && orderDetail ? (
              <div className="mt-6 grid gap-4">
                <OrderStatusTracker order={orderDetail} />

                <div className="grid gap-2 text-sm leading-7 text-stone-600">
                  <span>{t("detailFields.status", { value: getOrderStatusMeta(orderDetail.status).label })}</span>
                  <span>{t("detailFields.payment", { value: orderDetail.paymentStatus || "N/A" })}</span>
                  {orderDetail.paymentProvider ? (
                    <span>{t("detailFields.paymentProvider", { value: orderDetail.paymentProvider })}</span>
                  ) : null}
                  {orderDetail.paymentReference ? (
                    <span>{t("detailFields.paymentReference", { value: orderDetail.paymentReference })}</span>
                  ) : null}
                  {orderDetail.invoiceAvailable ? <span>{t("detailFields.invoiceReady")}</span> : null}
                  {orderDetail.invoiceNumber ? (
                    <span>{t("detailFields.invoiceNumber", { value: orderDetail.invoiceNumber })}</span>
                  ) : null}
                  {orderDetail.invoiceIssuedAt ? (
                    <span>{t("detailFields.invoiceIssuedAt", { value: formatDateTime(orderDetail.invoiceIssuedAt) })}</span>
                  ) : null}
                  <span>{t("detailFields.subtotal", { value: formatPrice(orderDetail.subtotalAmount) })}</span>
                  {Number(orderDetail.discountAmount ?? 0) > 0 ? (
                    <span>{t("detailFields.discount", { value: formatPrice(orderDetail.discountAmount) })}</span>
                  ) : null}
                  {orderDetail.shippingFeeAmount !== undefined &&
                  orderDetail.shippingFeeAmount !== null ? (
                    <span>{t("detailFields.shippingFee", { value: formatPrice(orderDetail.shippingFeeAmount) })}</span>
                  ) : null}
                  {Number(orderDetail.creditPointsAwarded ?? 0) > 0 ? (
                    <span>{t("detailFields.creditEarned", { count: orderDetail.creditPointsAwarded })}</span>
                  ) : null}
                  {orderDetail.shippingDistanceKm !== undefined &&
                  orderDetail.shippingDistanceKm !== null ? (
                    <span>{t("detailFields.shippingDistance", { value: formatShippingDistance(orderDetail.shippingDistanceKm) })}</span>
                  ) : null}
                  {orderDetail.shippingFeeBreakdown?.length ? (
                    <span>{t("detailFields.shippingBreakdown", { value: formatShippingBreakdown(orderDetail.shippingFeeBreakdown) })}</span>
                  ) : null}
                  <span>{t("detailFields.total", { value: formatPrice(orderDetail.totalAmount) })}</span>
                  {orderDetail.promotionCode ? (
                    <span>{t("detailFields.promotionCode", { value: orderDetail.promotionCode })}</span>
                  ) : null}
                  {orderDetail.promotionScope ? (
                    <span>{t("detailFields.promotionScope", { value: orderDetail.promotionScope })}</span>
                  ) : null}
                  {Number(orderDetail.promotionEligibleAmount ?? 0) > 0 ? (
                    <span>{t("detailFields.eligibleAmount", { value: formatPrice(orderDetail.promotionEligibleAmount) })}</span>
                  ) : null}
                  {orderDetail.promotionDishIds?.length ? (
                    <span>{t("detailFields.promotionDishIds", { value: orderDetail.promotionDishIds.join(", ") })}</span>
                  ) : null}
                  <span>{t("detailFields.deliveryType", { value: formatDeliveryTypeLabel(orderDetail.deliveryType) })}</span>
                  {orderDetail.scheduledDeliveryAt ? (
                    <span>{t("detailFields.scheduledFor", { value: formatDateTime(orderDetail.scheduledDeliveryAt) })}</span>
                  ) : null}
                  {orderDetail.preparingStaffName ? (
                    <span>{t("detailFields.preparingStaff", { value: orderDetail.preparingStaffName })}</span>
                  ) : null}
                  {orderDetail.deliveringShipperName ? (
                    <span>{t("detailFields.deliveryRider", { value: orderDetail.deliveringShipperName })}</span>
                  ) : null}
                  {orderDetail.deliveryFullName ? (
                    <span>{t("detailFields.deliverTo", { name: orderDetail.deliveryFullName, phone: orderDetail.deliveryPhoneNumber })}</span>
                  ) : null}
                  {orderDetail.deliveryAddress ? (
                    <span>{t("detailFields.deliveryAddress", { value: orderDetail.deliveryAddress })}</span>
                  ) : null}
                  {orderDetail.paymentExpiresAt ? (
                    <span>{t("detailFields.paymentExpiresAt", { value: formatDateTime(orderDetail.paymentExpiresAt) })}</span>
                  ) : null}
                  {orderDetail.paidAt ? (
                    <span>{t("detailFields.paidAt", { value: formatDateTime(orderDetail.paidAt) })}</span>
                  ) : null}
                  <span>{t("detailFields.createdAt", { value: formatDateTime(orderDetail.createdAt) })}</span>
                  <span>{t("detailFields.updatedAt", { value: formatDateTime(orderDetail.updatedAt) })}</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    disabled={refreshingPaymentId === String(orderDetail.id)}
                    onClick={() => handleRefreshPayment(orderDetail.id)}
                  >
                    {refreshingPaymentId === String(orderDetail.id)
                      ? t("payment.refreshing")
                      : t("payment.refreshPayment")}
                  </button>

                  {canRefreshDetailPayment &&
                  !orderDetailHasUsablePaymentSession ? (
                    <button
                      className={ui.primaryButton}
                      type="button"
                      disabled={recreatingPaymentId === String(orderDetail.id)}
                      onClick={() => handleRecreatePayment(orderDetail.id)}
                    >
                      {recreatingPaymentId === String(orderDetail.id)
                        ? t("payment.creatingNewPayos")
                        : t("payment.createNewPayos")}
                    </button>
                  ) : null}

                  {orderDetail.paymentCheckoutUrl && orderDetailHasUsablePaymentSession ? (
                    <a
                      className={ui.primaryButton}
                      href={orderDetail.paymentCheckoutUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t("payment.payNow")}
                    </a>
                  ) : null}

                  {canViewDetailInvoice && orderDetailInvoicePreviewUrl ? (
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => setInvoiceModalOpen(true)}
                    >
                      {t("payment.openInvoice")}
                    </button>
                  ) : null}
                </div>

                {canRefreshDetailPayment && !orderDetailHasUsablePaymentSession ? (
                  <div
                    className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900"
                    dangerouslySetInnerHTML={{ __html: t("payment.expiredSession") }}
                  />
                ) : null}

                <PaymentQrCard
                  order={orderDetail}
                  title={t("qr.title")}
                  subtitle={t("qr.subtitle")}
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
                          <span>{t("item.quantity", { count: item.quantity })}</span>
                          <span>{t("item.unitPrice", { value: formatPrice(item.unitPrice) })}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <QuickAddToCartButton
                            className={ui.primaryButton}
                            dishId={item.dishId}
                            storeId={item.storeId}
                            quantity={1}
                            blocked={!item.dishId || !item.storeId}
                            blockedMessage={t("item.itemNotReady")}
                            onResult={(message) => setCartMessage(message)}
                          />
                          <QuickFavoriteButton
                            targetType="dish"
                            targetId={item.dishId}
                            activeLabel={t("item.saved")}
                            inactiveLabel={t("item.saveItem")}
                            onResult={(message) => setFavoriteMessage(message)}
                          />
                          <Link className={ui.secondaryButton} to={`/menu/${item.dishId}?store=${item.storeId}`}>
                            {t("item.viewItem")}
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
                {t("detail.clickToView")}
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
      </AccountLayout>
    </main>
  );
}
