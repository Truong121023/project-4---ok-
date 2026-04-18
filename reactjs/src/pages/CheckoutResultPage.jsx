import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import PaymentQrCard from "../components/PaymentQrCard";
import { useAuth } from "../context/AuthContext";
import { navigateToExternalUrl } from "../lib/externalNavigation";
import {
  formatDeliveryTypeLabel,
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "../lib/orderStatus";
import { getPendingPaymentOrder, savePendingPaymentOrder } from "../lib/paymentSession";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import { fetchUserOrderDetail } from "../lib/siteApi";
import { formatShippingBreakdown, formatShippingDistance } from "../lib/shippingFee";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatDateTime(value) {
  return formatDateTimeVn(value);
}

export default function CheckoutResultPage() {
  const auth = useAuth();
  const location = useLocation();
  const { orderId } = useParams();
  const pendingPayment = useMemo(() => getPendingPaymentOrder(), []);
  const [checkoutResult, setCheckoutResult] = useState(
    location.state?.checkoutResult ?? pendingPayment?.checkoutSnapshot ?? null,
  );
  const [loading, setLoading] = useState(
    !location.state?.checkoutResult && !pendingPayment?.checkoutSnapshot && Boolean(orderId),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!checkoutResult) {
      return;
    }

    savePendingPaymentOrder(checkoutResult);
  }, [checkoutResult]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrderDetail() {
      if (checkoutResult || !orderId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const detail = await fetchUserOrderDetail(auth, orderId);

        if (!cancelled) {
          setCheckoutResult(detail);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load the payment details for this order.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrderDetail();
    return () => {
      cancelled = true;
    };
  }, [auth, checkoutResult, orderId]);

  const createdOrders = useMemo(() => {
    if (Array.isArray(checkoutResult?.orders) && checkoutResult.orders.length) {
      return checkoutResult.orders;
    }

    return checkoutResult ? [checkoutResult] : [];
  }, [checkoutResult]);

  const primaryOrderId = createdOrders[0]?.id ?? checkoutResult?.id ?? "";
  const paymentStatusMeta = getPaymentStatusMeta(checkoutResult?.paymentStatus);
  const orderStatusMeta = getOrderStatusMeta(checkoutResult?.status);

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Checkout result</p>
        <h1 className={ui.bannerTitle}>Payment details ready</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          Your order has been created. Review the transfer details, complete the payment, then
          track the order status from the next step.
        </p>
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading the payment details...
          </div>
        </section>
      ) : null}

      {!loading && error ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 text-sm leading-7 text-red-700">
            {error}
          </div>
        </section>
      ) : null}

      {!loading && checkoutResult ? (
        <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <div className="grid gap-6">
            <article className={`${ui.card} overflow-hidden bg-[linear-gradient(135deg,rgba(23,51,42,0.98),rgba(59,92,76,0.94))] text-white`}>
              <div className="grid gap-4">
                <span className="inline-flex w-fit rounded-full bg-white/14 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {checkoutResult.statusSummary || "Payment session created"}
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    Total payment
                  </p>
                  <strong className="mt-3 block text-4xl font-bold">
                    {formatPrice(checkoutResult.totalAmount)}
                  </strong>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-white/82">
                  <span>{paymentStatusMeta.label}</span>
                  <span>{formatDeliveryTypeLabel(checkoutResult.deliveryType)}</span>
                  {checkoutResult.promotionCode ? <span>{checkoutResult.promotionCode}</span> : null}
                </div>
              </div>
            </article>

            <PaymentQrCard
              order={checkoutResult}
              title="PayOS QR"
              subtitle="Scan the QR code from your banking app or open PayOS in a new tab to finish payment."
            />

            <article className={ui.card}>
              <h2 className="text-2xl font-semibold text-tea-900">Delivery details</h2>
              <div className="mt-5 grid gap-2 text-sm leading-7 text-stone-600">
                <span>Recipient: {checkoutResult.deliveryFullName || "N/A"}</span>
                <span>Phone: {checkoutResult.deliveryPhoneNumber || "N/A"}</span>
                <span>Address: {checkoutResult.deliveryAddress || "N/A"}</span>
                <span>Payment: {paymentStatusMeta.label}</span>
                <span>Order stage: {orderStatusMeta.label}</span>
                {checkoutResult.scheduledDeliveryAt ? (
                  <span>Scheduled for: {formatDateTime(checkoutResult.scheduledDeliveryAt)}</span>
                ) : null}
                {checkoutResult.shippingFeeAmount !== undefined &&
                checkoutResult.shippingFeeAmount !== null ? (
                  <span>Shipping fee: {formatPrice(checkoutResult.shippingFeeAmount)}</span>
                ) : null}
                {checkoutResult.shippingDistanceKm !== undefined &&
                checkoutResult.shippingDistanceKm !== null ? (
                  <span>
                    Shipping distance: {formatShippingDistance(checkoutResult.shippingDistanceKm)}
                  </span>
                ) : null}
                {checkoutResult.shippingFeeBreakdown?.length ? (
                  <span>
                    Per-store breakdown: {formatShippingBreakdown(checkoutResult.shippingFeeBreakdown)}
                  </span>
                ) : null}
              </div>
            </article>

            <article className={ui.card}>
              <h2 className="text-2xl font-semibold text-tea-900">Created orders</h2>
              <div className="mt-5 grid gap-4">
                {createdOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-tea-900">{order.storeName}</h3>
                        <p className="mt-1 text-sm text-stone-600">
                          Order #{order.id} • {getOrderStatusMeta(order.status).label}
                        </p>
                      </div>
                      <strong className="text-lg font-bold text-matcha-700">
                        {formatPrice(order.totalAmount)}
                      </strong>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-stone-600">
                      <span>Payment: {getPaymentStatusMeta(order.paymentStatus).label}</span>
                      <span>Delivery: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                      {order.shippingFeeAmount !== undefined && order.shippingFeeAmount !== null ? (
                        <span>Shipping fee: {formatPrice(order.shippingFeeAmount)}</span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link className={ui.primaryButton} to={`/orders/${order.id}`}>
                        Track this order
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>

          <aside className={`${ui.card} h-fit`}>
            <h2 className="text-2xl font-semibold text-tea-900">Next step</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Complete the transfer, then refresh or open the order page to follow the status from
              preparing to delivery.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <strong className="block text-lg font-bold text-tea-900">{paymentStatusMeta.label}</strong>
                <span className="mt-1 block text-sm text-stone-600">Payment</span>
              </div>
              <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <strong className="block text-lg font-bold text-tea-900">
                  {createdOrders.length.toLocaleString("vi-VN")}
                </strong>
                <span className="mt-1 block text-sm text-stone-600">Orders created</span>
              </div>
              <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <strong className="block text-lg font-bold text-tea-900">{orderStatusMeta.label}</strong>
                <span className="mt-1 block text-sm text-stone-600">Current order stage</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {checkoutResult.paymentCheckoutUrl ? (
                <button
                  className={ui.primaryButton}
                  type="button"
                  onClick={() => navigateToExternalUrl(checkoutResult.paymentCheckoutUrl)}
                >
                  Open PayOS
                </button>
              ) : null}

              {primaryOrderId ? (
                <Link className={ui.secondaryButton} to={`/payment/success?orderId=${primaryOrderId}`}>
                  I have paid - refresh status
                </Link>
              ) : null}

              {primaryOrderId ? (
                <Link className={ui.secondaryButton} to={`/orders/${primaryOrderId}`}>
                  Track primary order
                </Link>
              ) : null}

              <Link className={ui.secondaryButton} to="/orders">
                Order history
              </Link>

              <Link className={ui.secondaryButton} to="/cart">
                Back to cart
              </Link>
            </div>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
