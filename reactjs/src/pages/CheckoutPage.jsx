import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CheckoutLayout from "../components/templates/checkout-layout";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { geocodeAddress } from "../lib/locationLookup";
import { formatCurrencyVnd, formatNumberVi } from "../lib/locale";
import { savePendingPaymentOrder } from "../lib/paymentSession";
import { fetchUserVoucherCatalog, redeemUserVoucher } from "../lib/siteApi";
import {
  calculateCartShippingEstimate,
  formatShippingBreakdown,
  formatShippingDistance,
  hasCoordinatePair,
} from "../lib/shippingFee";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatCompactNumber(value) {
  return formatNumberVi(value);
}

function formatDeliveryType(value, t) {
  return value === "SCHEDULED" ? t("checkout.deliveryType.scheduled") : t("checkout.deliveryType.delivery");
}

function resolvePrimaryOrderId(checkoutResult) {
  if (Array.isArray(checkoutResult?.orders) && checkoutResult.orders.length) {
    return String(checkoutResult.orders[0]?.id ?? "");
  }

  return checkoutResult?.id ? String(checkoutResult.id) : "";
}

function getMinDateTimeLocalValue() {
  const now = new Date();
  const shifted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

/** Checkout stepper — highlights "Delivery" + "Payment" step */
function CheckoutStepper({ t }) {
  const steps = [
    t("checkout.steps.cart"),
    t("checkout.steps.delivery"),
    t("checkout.steps.payment"),
    t("checkout.steps.confirm"),
  ];
  return (
    <nav aria-label="Checkout steps">
      <ol className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = idx === 1 || idx === 2;
          const isPast = idx === 0;
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

export default function CheckoutPage() {
  const { t } = useTranslation("checkout");
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    deliveryAddresses,
    userDataLoading,
    previewCartCheckout,
    checkoutCart,
    saveDeliveryAddress,
  } = useSiteData();
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [deliveryType, setDeliveryType] = useState("DELIVERY");
  const [scheduledDeliveryAt, setScheduledDeliveryAt] = useState("");
  const [resolvedDeliveryLocation, setResolvedDeliveryLocation] = useState(null);
  const [deliveryLocationLoading, setDeliveryLocationLoading] = useState(false);
  const [deliveryLocationError, setDeliveryLocationError] = useState("");
  const [pricingPreview, setPricingPreview] = useState(null);
  const [pricingPreviewLoading, setPricingPreviewLoading] = useState(false);
  const [pricingPreviewNotice, setPricingPreviewNotice] = useState("");
  const [voucherCatalog, setVoucherCatalog] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherNotice, setVoucherNotice] = useState("");
  const [redeemingVoucherId, setRedeemingVoucherId] = useState("");
  const [notice, setNotice] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  const latestDeliveryAddress = useMemo(
    () =>
      [...deliveryAddresses].sort((left, right) => {
        if (Boolean(left.primary) !== Boolean(right.primary)) {
          return left.primary ? -1 : 1;
        }
        return (
          new Date(right.updatedAt || right.createdAt || 0).getTime() -
          new Date(left.updatedAt || left.createdAt || 0).getTime()
        );
      })[0] ?? null,
    [deliveryAddresses],
  );

  useEffect(() => {
    if (!deliveryAddresses.length) {
      setSelectedDeliveryAddressId("");
      return;
    }

    const hasSelection = deliveryAddresses.some(
      (address) => String(address.id) === String(selectedDeliveryAddressId),
    );

    if (!selectedDeliveryAddressId || !hasSelection) {
      setSelectedDeliveryAddressId(
        String(latestDeliveryAddress?.id ?? deliveryAddresses[0]?.id ?? ""),
      );
    }
  }, [deliveryAddresses, latestDeliveryAddress, selectedDeliveryAddressId]);

  const selectedDeliveryAddress = useMemo(
    () =>
      deliveryAddresses.find(
        (address) => String(address.id) === String(selectedDeliveryAddressId),
      ) ?? null,
    [deliveryAddresses, selectedDeliveryAddressId],
  );

  const scheduledDeliveryAtIso = useMemo(() => {
    if (deliveryType !== "SCHEDULED" || !scheduledDeliveryAt) {
      return undefined;
    }

    const scheduledDate = new Date(scheduledDeliveryAt);
    return Number.isNaN(scheduledDate.getTime()) ? undefined : scheduledDate.toISOString();
  }, [deliveryType, scheduledDeliveryAt]);

  useEffect(() => {
    const queryPromotionCode = String(
      searchParams.get("promotion") ?? searchParams.get("voucher") ?? "",
    ).trim();

    if (queryPromotionCode && queryPromotionCode !== promotionCode) {
      setPromotionCode(queryPromotionCode);
    }
  }, [promotionCode, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function resolveDeliveryLocation() {
      if (!selectedDeliveryAddress) {
        setResolvedDeliveryLocation(null);
        setDeliveryLocationError("");
        setDeliveryLocationLoading(false);
        return;
      }

      if (hasCoordinatePair(selectedDeliveryAddress)) {
        setResolvedDeliveryLocation({
          latitude: Number(selectedDeliveryAddress.latitude),
          longitude: Number(selectedDeliveryAddress.longitude),
        });
        setDeliveryLocationError("");
        setDeliveryLocationLoading(false);
        return;
      }

      if (!selectedDeliveryAddress.deliveryAddress) {
        setResolvedDeliveryLocation(null);
        setDeliveryLocationError(
          t("checkout.validation.shippingFeeFinalized"),
        );
        setDeliveryLocationLoading(false);
        return;
      }

      setDeliveryLocationLoading(true);
      setDeliveryLocationError("");

      try {
        const geocodedLocation = await geocodeAddress(selectedDeliveryAddress.deliveryAddress);

        if (!cancelled) {
          setResolvedDeliveryLocation(geocodedLocation);
        }

        if (
          !hasCoordinatePair(selectedDeliveryAddress) ||
          geocodedLocation.normalizedAddress !==
            String(selectedDeliveryAddress.deliveryAddress ?? "").trim()
        ) {
          void saveDeliveryAddress(
            {
              fullName: selectedDeliveryAddress.fullName,
              phoneNumber: selectedDeliveryAddress.phoneNumber,
              deliveryAddress: geocodedLocation.normalizedAddress,
              latitude: geocodedLocation.latitude,
              longitude: geocodedLocation.longitude,
              primary: Boolean(selectedDeliveryAddress.primary),
            },
            String(selectedDeliveryAddress.id ?? ""),
          );
        }
      } catch {
        if (!cancelled) {
          setResolvedDeliveryLocation(null);
          setDeliveryLocationError(
            t("checkout.validation.shippingFeeFinalized"),
          );
        }
      } finally {
        if (!cancelled) {
          setDeliveryLocationLoading(false);
        }
      }
    }

    void resolveDeliveryLocation();
    return () => {
      cancelled = true;
    };
  }, [selectedDeliveryAddress]);

  useEffect(() => {
    let cancelled = false;

    async function loadVoucherCatalog() {
      setVoucherLoading(true);
      setVoucherError("");

      try {
        const nextVouchers = await fetchUserVoucherCatalog(auth);
        if (!cancelled) {
          setVoucherCatalog(nextVouchers);
        }
      } catch (requestError) {
        if (!cancelled) {
          setVoucherError(requestError.message || t("checkout.promotion.loadingVouchers"));
        }
      } finally {
        if (!cancelled) {
          setVoucherLoading(false);
        }
      }
    }

    void loadVoucherCatalog();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const localPricingEstimate = useMemo(
    () =>
      calculateCartShippingEstimate({
        cartItems,
        deliveryAddress: resolvedDeliveryLocation,
        deliveryType,
        subtotalAmount: cartSubtotal,
        discountAmount: 0,
      }),
    [cartItems, cartSubtotal, deliveryType, resolvedDeliveryLocation],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPricingPreview() {
      setPricingPreview(null);
      setPricingPreviewNotice("");

      if (!cartItems.length || !selectedDeliveryAddressId) {
        setPricingPreviewLoading(false);
        return;
      }

      if (deliveryType === "SCHEDULED" && !scheduledDeliveryAtIso) {
        setPricingPreviewLoading(false);
        return;
      }

      setPricingPreviewLoading(true);
      const result = await previewCartCheckout({
        deliveryAddressId: selectedDeliveryAddressId,
        promotionCode,
        deliveryType,
        scheduledDeliveryAt: scheduledDeliveryAtIso,
      });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setPricingPreview({ ...result.preview, source: "backend" });
        setPricingPreviewLoading(false);
        return;
      }

      if (result.error instanceof ApiError && [404, 405].includes(result.error.status)) {
        setPricingPreviewLoading(false);
        return;
      }

      setPricingPreviewNotice(
        result.message || "Final shipping fee will be confirmed at checkout.",
      );
      setPricingPreviewLoading(false);
    }

    const timeoutId = window.setTimeout(() => {
      void loadPricingPreview();
    }, promotionCode.trim() ? 120 : 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    cartItems,
    deliveryType,
    previewCartCheckout,
    promotionCode,
    scheduledDeliveryAtIso,
    selectedDeliveryAddressId,
  ]);

  const pricingSummary = pricingPreview ?? localPricingEstimate;
  const normalizedPromotionCode = String(promotionCode ?? "").trim();
  const previewDiscountAmount = Number(pricingSummary?.discountAmount ?? 0);
  const previewTotalAmount = Number(pricingSummary?.totalAmount ?? cartSubtotal);
  const showDiscountBreakdown = Boolean(normalizedPromotionCode) || previewDiscountAmount > 0;
  const ownedVouchers = voucherCatalog.filter(
    (voucher) => Number(voucher.availableRedemptions ?? 0) > 0,
  );
  const readyToUseVouchers = voucherCatalog.filter(
    (voucher) => Number(voucher.creditCost ?? 0) <= 0,
  );
  const redeemableCreditVouchers = voucherCatalog.filter(
    (voucher) =>
      Number(voucher.creditCost ?? 0) > 0 && Number(voucher.availableRedemptions ?? 0) <= 0,
  );

  const handleApplyPromotionCode = (nextCode) => {
    const normalizedCode = String(nextCode ?? "").trim();
    setPromotionCode(normalizedCode);
    setNotice("");
    setVoucherError("");
    setVoucherNotice(normalizedCode ? t("checkout.promotion.applied2", { code: normalizedCode }) : "");
    setPricingPreviewNotice(
      normalizedCode ? t("checkout.promotion.recalculating", { code: normalizedCode }) : "",
    );
    if (selectedDeliveryAddressId) {
      setPricingPreviewLoading(true);
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    if (normalizedCode) {
      nextSearchParams.set("promotion", normalizedCode);
    } else {
      nextSearchParams.delete("promotion");
      nextSearchParams.delete("voucher");
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleRedeemVoucher = async (voucher) => {
    if (!voucher?.id) {
      return;
    }

    setRedeemingVoucherId(String(voucher.id));
    setVoucherError("");

    try {
      const response = await redeemUserVoucher(auth, voucher.id);
      await auth.refreshMe();
      setVoucherCatalog(await fetchUserVoucherCatalog(auth));
      handleApplyPromotionCode(response.promotionCode);
      setVoucherNotice(response.message || t("checkout.promotion.applied2", { code: response.promotionCode }));
    } catch (requestError) {
      setVoucherError(requestError.message || "Unable to redeem this voucher.");
    } finally {
      setRedeemingVoucherId("");
    }
  };

  const handleCheckout = async () => {
    if (checkoutSubmitting) {
      return;
    }

    if (!selectedDeliveryAddressId) {
      setNotice(t("checkout.validation.chooseAddress"));
      return;
    }

    let nextScheduledDeliveryAt;

    if (deliveryType === "SCHEDULED") {
      if (!scheduledDeliveryAt) {
        setNotice(t("checkout.validation.chooseScheduledTime"));
        return;
      }

      const scheduledDate = new Date(scheduledDeliveryAt);

      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        setNotice(t("checkout.validation.invalidScheduledTime"));
        return;
      }

      nextScheduledDeliveryAt = scheduledDate.toISOString();
    }

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost:5173";

    setNotice("");
    setCheckoutSubmitting(true);

    try {
      const result = await checkoutCart({
        deliveryAddressId: selectedDeliveryAddressId,
        promotionCode,
        deliveryType,
        scheduledDeliveryAt: nextScheduledDeliveryAt,
        returnUrl: `${origin}/payment/success`,
        cancelUrl: `${origin}/payment/cancel`,
      });

      if (!result.ok) {
        setNotice(result.message);
        setCheckoutSubmitting(false);
        return;
      }

      if (!result.order?.id) {
        setNotice(t("checkout.validation.orderCreatedNoPayment"));
        setCheckoutSubmitting(false);
        return;
      }

      savePendingPaymentOrder(result.order);
      const primaryOrderId = resolvePrimaryOrderId(result.order);
      navigate(primaryOrderId ? `/checkout/result/${primaryOrderId}` : "/checkout/result", {
        replace: true,
        state: { checkoutResult: result.order },
      });
    } catch (error) {
      setNotice(error?.message || t("checkout.validation.unableToCreate"));
      setCheckoutSubmitting(false);
    }
  };

  /* ---------- Loading ---------- */
  if (userDataLoading) {
    return (
      <main className={ui.page}>
        <CheckoutLayout stepper={<CheckoutStepper t={t} />}>
          <div>
            <p className={ui.eyebrow}>{t("checkout.eyebrow")}</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
              {t("checkout.syncingTitle")}
            </h1>
            <div className="mt-6 rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-6 text-sm text-ink-600">
              {t("checkout.syncingBody")}
            </div>
          </div>
        </CheckoutLayout>
      </main>
    );
  }

  /* ---------- Empty cart ---------- */
  if (!cartItems.length) {
    return (
      <main className={ui.page}>
        <CheckoutLayout stepper={<CheckoutStepper t={t} />}>
          <div>
            <p className={ui.eyebrow}>{t("checkout.eyebrow")}</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
              {t("checkout.emptyTitle")}
            </h1>
            <div className="mt-6 rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-8 text-sm leading-7 text-ink-600">
              {t("checkout.emptyBody")}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className={ui.primaryButton} to="/menu">
                {t("checkout.browseMenu")}
              </Link>
              <Link className={ui.secondaryButton} to="/cart">
                {t("checkout.backToCart")}
              </Link>
            </div>
          </div>
        </CheckoutLayout>
      </main>
    );
  }

  /* ---------- Submitting spinner ---------- */
  if (checkoutSubmitting) {
    return (
      <main className={ui.page}>
        <CheckoutLayout stepper={<CheckoutStepper t={t} />} centered>
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <span
              aria-label="Loading"
              className="h-12 w-12 animate-spin rounded-full border-4 border-matcha-200 border-t-matcha-700"
            />
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">
                {t("checkout.creatingTitle")}
              </p>
              <p className="mt-2 text-sm leading-7 text-ink-600">
                {t("checkout.creatingBody")}
              </p>
            </div>
            <div className="w-full grid gap-3 sm:grid-cols-3">
              {[
                { label: t("checkout.deliveryType.title"), value: formatDeliveryType(deliveryType, t) },
                {
                  label: t("checkout.deliveryAddress.title"),
                  value: selectedDeliveryAddress?.fullName || t("checkout.deliveryAddress.noSaved"),
                },
                { label: t("checkout.summary.finalTotal"), value: formatPrice(previewTotalAmount) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3 text-left"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </CheckoutLayout>
      </main>
    );
  }

  /* ---------- Order summary rail ---------- */
  const summaryRail = (
    <>
      <h2 className="font-display text-xl font-semibold text-ink-900">{t("checkout.summary.title")}</h2>

      <div className="mt-5 grid gap-3">
        {[
          { label: t("checkout.summary.lineItems"), value: formatCompactNumber(cartItems.length) },
          { label: t("checkout.summary.totalQty"), value: formatCompactNumber(cartCount) },
          { label: t("checkout.summary.itemSubtotal"), value: formatPrice(cartSubtotal) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3"
          >
            <span className="text-sm text-ink-600">{stat.label}</span>
            <strong className="text-sm font-semibold text-ink-900">{stat.value}</strong>
          </div>
        ))}

        {showDiscountBreakdown && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-matcha-200 bg-matcha-50/60 px-4 py-3">
            <span className="text-sm text-matcha-700">
              {pricingPreview?.promotionCode
                ? t("checkout.summary.discountCode", { code: pricingPreview.promotionCode })
                : t("checkout.summary.discount")}
            </span>
            <strong className="text-sm font-semibold text-matcha-700">
              -{formatPrice(previewDiscountAmount)}
            </strong>
          </div>
        )}

        {pricingSummary?.shippingFeeAmount !== null &&
          pricingSummary?.shippingFeeAmount !== undefined && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3">
              <span className="text-sm text-ink-600">
                {pricingPreview?.source === "backend" ? t("checkout.summary.shipping") : t("checkout.summary.estShipping")}
              </span>
              <strong className="text-sm font-semibold text-ink-900">
                {formatPrice(pricingSummary.shippingFeeAmount)}
              </strong>
            </div>
          )}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/10 bg-ink-900/5 px-4 py-3">
          <span className="text-sm font-semibold text-ink-900">
            {pricingPreview?.source === "backend" ? t("checkout.summary.finalTotal") : t("checkout.summary.estTotal")}
          </span>
          <strong className={ui.price}>{formatPrice(previewTotalAmount)}</strong>
        </div>
      </div>

      {/* Notices */}
      {(pricingPreviewLoading || deliveryLocationLoading || pricingPreviewNotice ||
        deliveryLocationError || voucherNotice || voucherError || notice) && (
        <div className="mt-4 grid gap-1 rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3 text-sm leading-7 text-ink-600">
          {(pricingPreviewLoading || deliveryLocationLoading) && (
            <p>
              {normalizedPromotionCode
                ? t("checkout.promotion.recalculating", { code: normalizedPromotionCode })
                : t("checkout.summary.updatingPreview")}
            </p>
          )}
          {pricingSummary?.shippingDistanceKm !== undefined &&
            pricingSummary?.shippingDistanceKm !== null && (
              <p>{t("checkout.summary.distance", { value: formatShippingDistance(pricingSummary.shippingDistanceKm) })}</p>
            )}
          {pricingSummary?.shippingFeeBreakdown?.length > 0 && (
            <p>{t("checkout.summary.breakdown", { value: formatShippingBreakdown(pricingSummary.shippingFeeBreakdown) })}</p>
          )}
          {pricingPreview?.statusSummary && <p>{pricingPreview.statusSummary}</p>}
          {deliveryLocationError && <p>{deliveryLocationError}</p>}
          {pricingPreviewNotice && <p>{pricingPreviewNotice}</p>}
          {voucherNotice && <p className="text-matcha-700">{voucherNotice}</p>}
          {voucherError && <p className="text-rose-700">{voucherError}</p>}
          {notice && <p className="text-rose-700">{notice}</p>}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <button
          className={ui.primaryButton}
          type="button"
          disabled={
            !cartItems.length ||
            !selectedDeliveryAddressId ||
            (deliveryType === "SCHEDULED" && !scheduledDeliveryAt)
          }
          onClick={handleCheckout}
        >
          {t("checkout.createOrder")}
        </button>
        <Link className={ui.secondaryButton} to="/cart">
          {t("checkout.backToCart")}
        </Link>
      </div>
    </>
  );

  /* ---------- Main form ---------- */
  return (
    <main className={ui.page}>
      <CheckoutLayout stepper={<CheckoutStepper t={t} />} summary={summaryRail}>
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>{t("checkout.eyebrow")}</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
              {t("checkout.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-600">
              {t("checkout.subtitle")}
            </p>
          </div>
          <Link className={ui.secondaryButton} to="/cart">
            {t("checkout.backToCart")}
          </Link>
        </div>

        {/* Delivery address */}
        <section className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-ink-900">{t("checkout.deliveryAddress.title")}</h2>

          <div className="mt-4 grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className={`${ui.input} min-w-0 flex-1`}
                value={selectedDeliveryAddressId}
                onChange={(event) => setSelectedDeliveryAddressId(event.target.value)}
              >
                {deliveryAddresses.length ? (
                  deliveryAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.primary ? `${t("checkout.deliveryAddress.primary")} ` : ""}
                      {address.fullName} - {address.phoneNumber}
                    </option>
                  ))
                ) : (
                  <option value="">{t("checkout.deliveryAddress.noSaved")}</option>
                )}
              </select>
              <Link
                className={`${ui.secondaryButton} shrink-0`}
                to="/account/addresses"
              >
                {t("checkout.deliveryAddress.manage")}
              </Link>
            </div>

            {!selectedDeliveryAddressId && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold"
                  >
                    !
                  </span>
                  <div>
                    <p className="font-semibold">{t("checkout.deliveryAddress.missingTitle")}</p>
                    <p className="mt-1 text-amber-800">{t("checkout.deliveryAddress.missingBody")}</p>
                  </div>
                </div>
                <Link className={`${ui.primaryButton} shrink-0`} to="/account/addresses">
                  {t("checkout.deliveryAddress.addNow")}
                </Link>
              </div>
            )}

            {selectedDeliveryAddress && (
              <div className="rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3 text-sm leading-7 text-ink-600">
                <p className="font-semibold text-ink-900">
                  {selectedDeliveryAddress.fullName} — {selectedDeliveryAddress.phoneNumber}
                </p>
                <p className="mt-1">{selectedDeliveryAddress.deliveryAddress}</p>
              </div>
            )}
          </div>
        </section>

        {/* Delivery type */}
        <section className="mt-5 rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-ink-900">{t("checkout.deliveryType.title")}</h2>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
                {t("checkout.deliveryType.typeLabel")}
              </span>
              <select
                className={ui.input}
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
              >
                <option value="DELIVERY">{formatDeliveryType("DELIVERY", t)}</option>
                <option value="SCHEDULED">{formatDeliveryType("SCHEDULED", t)}</option>
              </select>
            </label>

            {deliveryType === "SCHEDULED" && (
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
                  {t("checkout.deliveryType.scheduleFor")}
                </span>
                <input
                  className={ui.input}
                  type="datetime-local"
                  min={getMinDateTimeLocalValue()}
                  value={scheduledDeliveryAt}
                  onChange={(event) => setScheduledDeliveryAt(event.target.value)}
                />
              </label>
            )}
          </div>
        </section>

        {/* Promotion code */}
        <section className="mt-5 rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
          <h2 className="font-display text-lg font-semibold text-ink-900">{t("checkout.promotion.title")}</h2>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
                {t("checkout.promotion.codeLabel")}
              </span>
              <input
                className={ui.input}
                type="text"
                value={promotionCode}
                onChange={(event) => handleApplyPromotionCode(event.target.value)}
                placeholder={t("checkout.promotion.placeholder")}
              />
            </label>

            <div className="rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3 text-sm leading-7 text-ink-600">
              <p className="font-semibold text-ink-900">{t("checkout.promotion.tip")}</p>
              <p className="mt-1">
                Try{" "}
                <strong className="text-matcha-700">KAMATCHASHIP</strong> on any delivery order.
              </p>
              {normalizedPromotionCode && (
                <p className="mt-2 text-matcha-700">
                  {pricingPreviewLoading
                    ? t("checkout.promotion.recalculating", { code: normalizedPromotionCode })
                    : pricingPreview?.promotionCode
                      ? t("checkout.promotion.applied", { code: pricingPreview.promotionCode })
                      : t("checkout.promotion.checking", { code: normalizedPromotionCode })}
                </p>
              )}
            </div>

            {voucherLoading && (
              <span className="text-sm text-ink-600">{t("checkout.promotion.loadingVouchers")}</span>
            )}

            {readyToUseVouchers.length > 0 && (
              <div className="grid gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
                  {t("checkout.promotion.readyToUse")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {readyToUseVouchers.slice(0, 4).map((voucher) => (
                    <button
                      key={`${voucher.id}-${voucher.code}-ready`}
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => handleApplyPromotionCode(voucher.code)}
                    >
                      {voucher.code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {ownedVouchers.length > 0 && (
              <div className="grid gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
                  {t("checkout.promotion.redeemedCredit")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ownedVouchers.map((voucher) => (
                    <button
                      key={`${voucher.id}-${voucher.code}`}
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => handleApplyPromotionCode(voucher.code)}
                    >
                      {voucher.code} x{voucher.availableRedemptions}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {redeemableCreditVouchers.slice(0, 2).map((voucher) => (
              <div
                key={voucher.id || voucher.code}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {voucher.name || voucher.code}
                  </p>
                  <p className="text-sm text-ink-600">
                    {t("checkout.promotion.redeemWith", { count: Number(voucher.creditCost ?? 0).toLocaleString("vi-VN") })}
                  </p>
                </div>
                <button
                  className={ui.primaryButton}
                  type="button"
                  disabled={redeemingVoucherId === String(voucher.id)}
                  onClick={() => handleRedeemVoucher(voucher)}
                >
                  {redeemingVoucherId === String(voucher.id) ? t("checkout.promotion.redeeming") : t("checkout.promotion.redeem")}
                </button>
              </div>
            ))}
          </div>
        </section>
      </CheckoutLayout>
    </main>
  );
}
