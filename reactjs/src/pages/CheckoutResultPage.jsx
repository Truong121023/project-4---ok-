import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PaymentQrCard from "../components/PaymentQrCard";
import CheckoutLayout from "../components/templates/checkout-layout";
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

/** Stepper with "Confirm" active */
function ConfirmStepper({ t }) {
  const steps = [
    t("checkoutResult.steps.cart"),
    t("checkoutResult.steps.delivery"),
    t("checkoutResult.steps.payment"),
    t("checkoutResult.steps.confirm"),
  ];
  return (
    <nav aria-label="Checkout steps">
      <ol className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = idx === 3;
          const isPast = idx < 3;
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

export default function CheckoutResultPage() {
  const { t } = useTranslation("checkout");
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
          setError(requestError.message || t("checkoutResult.loadError"));
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

  /* ---------- Next-step rail (right column) ---------- */
  const nextStepRail = checkoutResult ? (
    <>
      <h2 className="font-display text-xl font-semibold text-ink-900">{t("checkoutResult.nextStepTitle")}</h2>
      <p className="mt-2 text-sm leading-7 text-ink-600">
        {t("checkoutResult.nextStepBody")}
      </p>

      <div className="mt-5 grid gap-3">
        {[
          { label: t("checkoutResult.statusPayment"), value: paymentStatusMeta.label },
          {
            label: t("checkoutResult.statusOrdersCreated"),
            value: createdOrders.length.toLocaleString("vi-VN"),
          },
          { label: t("checkoutResult.statusOrderStage"), value: orderStatusMeta.label },
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

      <div className="mt-5 flex flex-col gap-3">
        {checkoutResult.paymentCheckoutUrl && (
          <button
            className={ui.primaryButton}
            type="button"
            onClick={() => navigateToExternalUrl(checkoutResult.paymentCheckoutUrl)}
          >
            {t("checkoutResult.openPayos")}
          </button>
        )}
        {primaryOrderId && (
          <Link
            className={ui.secondaryButton}
            to={`/payment/success?orderId=${primaryOrderId}`}
          >
            {t("checkoutResult.paidRefresh")}
          </Link>
        )}
        {primaryOrderId && (
          <Link className={ui.secondaryButton} to={`/orders/${primaryOrderId}`}>
            {t("checkoutResult.trackPrimaryOrder")}
          </Link>
        )}
        <Link className={ui.secondaryButton} to="/orders">
          {t("checkoutResult.orderHistory")}
        </Link>
        <Link className={ui.secondaryButton} to="/cart">
          {t("checkoutResult.backToCart")}
        </Link>
      </div>
    </>
  ) : null;

  return (
    <main className={ui.page}>
      <CheckoutLayout
        stepper={<ConfirmStepper t={t} />}
        summary={checkoutResult ? nextStepRail : null}
      >
        {/* Page header */}
        <div className="mb-6">
          <p className={ui.eyebrow}>{t("checkoutResult.eyebrow")}</p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
            {t("checkoutResult.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-600">
            {t("checkoutResult.subtitle")}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-6 text-sm text-ink-600">
            {t("checkoutResult.loading")}
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

        {/* Result content */}
        {!loading && checkoutResult && (
          <div className="grid gap-6">
            {/* Hero status card */}
            <article className="overflow-hidden rounded-xl border border-ink-900/10 shadow-soft">
              <div className="bg-gradient-to-r from-matcha-900 to-matcha-700 px-6 py-6 text-cream-50">
                <span className="inline-flex rounded-full bg-cream-50/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]">
                  {checkoutResult.statusSummary || t("checkoutResult.paymentCreated")}
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-cream-50/70">
                  {t("checkoutResult.totalPayment")}
                </p>
                <strong className="mt-2 block font-display text-4xl font-bold">
                  {formatPrice(checkoutResult.totalAmount)}
                </strong>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-cream-50/80">
                  <span>{paymentStatusMeta.label}</span>
                  <span>{formatDeliveryTypeLabel(checkoutResult.deliveryType)}</span>
                  {checkoutResult.promotionCode && (
                    <span>{checkoutResult.promotionCode}</span>
                  )}
                </div>
              </div>
            </article>

            {/* QR card — internals untouched */}
            <PaymentQrCard
              order={checkoutResult}
              title="PayOS QR"
              subtitle="Scan the QR code from your banking app or open PayOS in a new tab to finish payment."
            />

            {/* Delivery details */}
            <article className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
              <h2 className="font-display text-xl font-semibold text-ink-900">{t("checkoutResult.deliveryDetails")}</h2>
              <div className="mt-4 grid gap-2 text-sm leading-7 text-ink-600">
                <span>{t("checkoutResult.recipient", { value: checkoutResult.deliveryFullName || "N/A" })}</span>
                <span>{t("checkoutResult.phone", { value: checkoutResult.deliveryPhoneNumber || "N/A" })}</span>
                <span>{t("checkoutResult.address", { value: checkoutResult.deliveryAddress || "N/A" })}</span>
                <span>{t("checkoutResult.payment", { value: paymentStatusMeta.label })}</span>
                <span>{t("checkoutResult.orderStage", { value: orderStatusMeta.label })}</span>
                {checkoutResult.scheduledDeliveryAt && (
                  <span>{t("checkoutResult.scheduledFor", { value: formatDateTime(checkoutResult.scheduledDeliveryAt) })}</span>
                )}
                {checkoutResult.shippingFeeAmount !== undefined &&
                  checkoutResult.shippingFeeAmount !== null && (
                    <span>{t("checkoutResult.shippingFee", { value: formatPrice(checkoutResult.shippingFeeAmount) })}</span>
                  )}
                {checkoutResult.shippingDistanceKm !== undefined &&
                  checkoutResult.shippingDistanceKm !== null && (
                    <span>{t("checkoutResult.shippingDistance", { value: formatShippingDistance(checkoutResult.shippingDistanceKm) })}</span>
                  )}
                {checkoutResult.shippingFeeBreakdown?.length > 0 && (
                  <span>{t("checkoutResult.shippingBreakdown", { value: formatShippingBreakdown(checkoutResult.shippingFeeBreakdown) })}</span>
                )}
              </div>
            </article>

            {/* Created orders list */}
            <article className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
              <h2 className="font-display text-xl font-semibold text-ink-900">{t("checkoutResult.createdOrders")}</h2>
              <div className="mt-4 grid gap-4">
                {createdOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-lg border border-ink-900/10 bg-cream-100/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-ink-900">
                          {order.storeName}
                        </h3>
                        <p className="mt-1 text-sm text-ink-500">
                          {t("checkoutResult.orderSummary", { id: order.id, status: getOrderStatusMeta(order.status).label })}
                        </p>
                      </div>
                      <strong className={ui.price}>{formatPrice(order.totalAmount)}</strong>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-ink-600">
                      <span>{t("checkoutResult.orderPayment", { value: getPaymentStatusMeta(order.paymentStatus).label })}</span>
                      <span>{t("checkoutResult.orderDelivery", { value: formatDeliveryTypeLabel(order.deliveryType) })}</span>
                      {order.shippingFeeAmount !== undefined &&
                        order.shippingFeeAmount !== null && (
                          <span>{t("checkoutResult.shippingFee", { value: formatPrice(order.shippingFeeAmount) })}</span>
                        )}
                    </div>
                    <div className="mt-4">
                      <Link className={ui.primaryButton} to={`/orders/${order.id}`}>
                        {t("checkoutResult.trackThisOrder")}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        )}
      </CheckoutLayout>
    </main>
  );
}
