import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { geocodeAddress } from "../lib/locationLookup";
import { formatCurrencyVnd, formatNumberVi } from "../lib/locale";
import { savePendingPaymentOrder } from "../lib/paymentSession";
import { fetchUserVoucherCatalog } from "../lib/siteApi";
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

function formatDeliveryType(value) {
  return value === "SCHEDULED" ? "Scheduled" : "Delivery";
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

export default function CheckoutPage() {
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
      deliveryAddresses.find((address) => String(address.id) === String(selectedDeliveryAddressId)) ??
      null,
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
        setDeliveryLocationError("Shipping fee will be finalized after address coordinates are available.");
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
          setDeliveryLocationError("Shipping fee will be finalized after address coordinates are available.");
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
          setVoucherError(requestError.message || "Unable to load vouchers.");
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

      setPricingPreviewNotice(result.message || "Final shipping fee will be confirmed at checkout.");
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
  const availableVoucherCodes = voucherCatalog.filter((voucher) =>
    String(voucher.code ?? "").trim(),
  );

  const handleApplyPromotionCode = (nextCode) => {
    const normalizedCode = String(nextCode ?? "").trim();
    setPromotionCode(normalizedCode);
    setNotice("");
    setVoucherError("");
    setVoucherNotice(normalizedCode ? `Applied voucher ${normalizedCode}.` : "");
    setPricingPreviewNotice(
      normalizedCode ? `Recalculating the order total with ${normalizedCode}...` : "",
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

  const handleCheckout = async () => {
    if (checkoutSubmitting) {
      return;
    }

    if (!selectedDeliveryAddressId) {
      setNotice("Please choose a delivery address before creating the order.");
      return;
    }

    let nextScheduledDeliveryAt;

    if (deliveryType === "SCHEDULED") {
      if (!scheduledDeliveryAt) {
        setNotice("Please choose a scheduled delivery time.");
        return;
      }

      const scheduledDate = new Date(scheduledDeliveryAt);

      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        setNotice("The scheduled delivery time must be valid and in the future.");
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
        setNotice("The order was created, but the payment details are not ready yet.");
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
      setNotice(error?.message || "Unable to create the order right now.");
      setCheckoutSubmitting(false);
    }
  };

  if (userDataLoading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <p className={ui.eyebrow}>Checkout</p>
          <h1 className={ui.bannerTitle}>Preparing payment details</h1>
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Syncing your cart, addresses, and pricing preview...
          </div>
        </section>
      </main>
    );
  }

  if (!cartItems.length) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <p className={ui.eyebrow}>Checkout</p>
          <h1 className={ui.bannerTitle}>There is nothing to pay yet</h1>
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-8 text-sm leading-7 text-stone-600">
            Your cart is empty. Add items first, then come back here to create the payment order.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className={ui.primaryButton} to="/menu">
              Browse menu
            </Link>
            <Link className={ui.secondaryButton} to="/cart">
              Back to cart
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (checkoutSubmitting) {
    return (
      <main className={ui.page}>
        <section className={`${ui.panel} mx-auto max-w-3xl`}>
          <p className={ui.eyebrow}>Checkout</p>
          <h1 className={ui.bannerTitle}>Creating your payment request</h1>
          <div className="mt-6 rounded-[2rem] border border-matcha-900/10 bg-white/70 p-8 shadow-[0_18px_44px_rgba(79,70,45,0.08)]">
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 animate-spin rounded-full border-4 border-matcha-200 border-t-matcha-700" />
              <div>
                <p className="text-lg font-semibold text-tea-900">
                  Please wait while Kamatcha prepares the PayOS QR.
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  We are creating the order, checking the payment link, and retrying automatically
                  if payOS reports that the previous payment code already exists.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.25rem] border border-matcha-900/10 bg-[#fbf6ed] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Delivery
                </p>
                <p className="mt-2 text-sm font-semibold text-tea-900">
                  {formatDeliveryType(deliveryType)}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-matcha-900/10 bg-[#fbf6ed] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Address
                </p>
                <p className="mt-2 text-sm font-semibold text-tea-900">
                  {selectedDeliveryAddress?.fullName || "Selected address"}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-matcha-900/10 bg-[#fbf6ed] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Total
                </p>
                <p className="mt-2 text-sm font-semibold text-tea-900">
                  {formatPrice(previewTotalAmount)}
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Checkout</p>
            <h1 className={ui.bannerTitle}>Payment details</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
              Review the cart, choose delivery details, and create the order before you transfer
              money with PayOS.
            </p>
          </div>

          <Link className={ui.secondaryButton} to="/cart">
            Back to cart
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-3xl gap-6">
        <aside className={`${ui.card} h-fit`}>
          <h2 className="text-2xl font-semibold text-tea-900">Payment summary</h2>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
              <strong className="block text-lg font-bold text-tea-900">
                {formatCompactNumber(cartItems.length)}
              </strong>
              <span className="mt-1 block text-sm text-stone-600">Line items</span>
            </div>
            <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
              <strong className="block text-lg font-bold text-tea-900">
                {formatCompactNumber(cartCount)}
              </strong>
              <span className="mt-1 block text-sm text-stone-600">Total quantity</span>
            </div>
            <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
              <strong className="block text-lg font-bold text-tea-900">{formatPrice(cartSubtotal)}</strong>
              <span className="mt-1 block text-sm text-stone-600">Item subtotal</span>
            </div>
            {showDiscountBreakdown ? (
              <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <strong className="block text-lg font-bold text-matcha-700">
                  -{formatPrice(previewDiscountAmount)}
                </strong>
                <span className="mt-1 block text-sm text-stone-600">
                  {pricingPreview?.promotionCode
                    ? `Discount from ${pricingPreview.promotionCode}`
                    : normalizedPromotionCode
                      ? `Discount preview for ${normalizedPromotionCode}`
                      : "Discount"}
                </span>
              </div>
            ) : null}
            {pricingSummary?.shippingFeeAmount !== null && pricingSummary?.shippingFeeAmount !== undefined ? (
              <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <strong className="block text-lg font-bold text-tea-900">
                  {formatPrice(pricingSummary.shippingFeeAmount)}
                </strong>
                <span className="mt-1 block text-sm text-stone-600">
                  {pricingPreview?.source === "backend" ? "Shipping fee" : "Estimated shipping fee"}
                </span>
              </div>
            ) : null}
            <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
              <strong className="block text-lg font-bold text-tea-900">
                {formatPrice(previewTotalAmount)}
              </strong>
              <span className="mt-1 block text-sm text-stone-600">
                {pricingPreview?.source === "backend" ? "Final total" : "Estimated total"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-[1rem] border border-matcha-900/10 bg-stone-50/90 p-4">
            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Delivery address
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  className={`${ui.input} min-w-0 flex-1`}
                  value={selectedDeliveryAddressId}
                  onChange={(event) => setSelectedDeliveryAddressId(event.target.value)}
                >
                  {deliveryAddresses.length ? (
                    deliveryAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.primary ? "[Primary] " : ""}
                        {address.fullName} - {address.phoneNumber}
                      </option>
                    ))
                  ) : (
                    <option value="">No saved addresses</option>
                  )}
                </select>
                <Link
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-matcha-900/10 bg-white/80 px-4 py-3.5 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                  to="/account/addresses"
                >
                  Manage addresses
                </Link>
              </div>
            </div>

            {selectedDeliveryAddress ? (
              <div className="rounded-[1rem] border border-matcha-900/10 bg-white/80 p-4 text-sm leading-7 text-stone-600">
                <p className="font-semibold text-tea-900">
                  {selectedDeliveryAddress.fullName} - {selectedDeliveryAddress.phoneNumber}
                </p>
                <p className="mt-1">{selectedDeliveryAddress.deliveryAddress}</p>
              </div>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Delivery type
              </span>
              <select
                className={ui.input}
                value={deliveryType}
                onChange={(event) => setDeliveryType(event.target.value)}
              >
                <option value="DELIVERY">{formatDeliveryType("DELIVERY")}</option>
                <option value="SCHEDULED">{formatDeliveryType("SCHEDULED")}</option>
              </select>
            </label>

            {deliveryType === "SCHEDULED" ? (
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Schedule for
                </span>
                <input
                  className={ui.input}
                  type="datetime-local"
                  min={getMinDateTimeLocalValue()}
                  value={scheduledDeliveryAt}
                  onChange={(event) => setScheduledDeliveryAt(event.target.value)}
                />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Promotion code
              </span>
              <input
                className={ui.input}
                type="text"
                value={promotionCode}
                onChange={(event) => handleApplyPromotionCode(event.target.value)}
                placeholder="For example: MATCHA10"
              />
            </label>

            <div className="rounded-[1rem] border border-matcha-900/10 bg-white/80 p-4 text-sm leading-7 text-stone-600">
              <p className="font-semibold text-tea-900">Quick tip</p>
              <p className="mt-1">
                Try <strong className="text-matcha-700">KAMATCHASHIP</strong> on any delivery order.
                Voucher rules are now simple: ORDER, DISH, or SHIP. The server checks the minimum
                order amount, maximum discount, and membership eligibility automatically.
              </p>
              {normalizedPromotionCode ? (
                <p className="mt-2 text-matcha-700">
                  {pricingPreviewLoading
                    ? `Recalculating the order total with ${normalizedPromotionCode}...`
                    : pricingPreview?.promotionCode
                      ? `${pricingPreview.promotionCode} is now reflected in the order total.`
                      : `Checking whether ${normalizedPromotionCode} can be applied to this order.`}
                </p>
              ) : null}
            </div>

            {voucherLoading ? <span className="text-sm text-stone-600">Loading vouchers...</span> : null}
            {availableVoucherCodes.length ? (
              <div className="grid gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Available codes
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableVoucherCodes.slice(0, 6).map((voucher) => (
                    <button
                      key={`${voucher.id}-${voucher.code}-available`}
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => handleApplyPromotionCode(voucher.code)}
                    >
                      {voucher.code}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {availableVoucherCodes.length ? (
              <div className="rounded-[1rem] border border-matcha-900/10 bg-white/90 px-4 py-3 text-sm leading-7 text-stone-600">
                Pick a code and the server will validate the scope, minimum order amount, maximum
                discount, and membership rule before confirming the final total.
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-[1rem] border border-matcha-900/10 bg-white/72 p-4 text-sm leading-7 text-stone-600">
            {pricingPreviewLoading || deliveryLocationLoading ? (
              <p>
                {normalizedPromotionCode
                  ? `Recalculating the order total with ${normalizedPromotionCode}...`
                  : "Updating pricing preview..."}
              </p>
            ) : null}
            {pricingSummary?.shippingDistanceKm !== undefined &&
            pricingSummary?.shippingDistanceKm !== null ? (
              <p>Shipping distance: {formatShippingDistance(pricingSummary.shippingDistanceKm)}</p>
            ) : null}
            {pricingSummary?.shippingFeeBreakdown?.length ? (
              <p>Per-store breakdown: {formatShippingBreakdown(pricingSummary.shippingFeeBreakdown)}</p>
            ) : null}
            {pricingPreview?.statusSummary ? <p>{pricingPreview.statusSummary}</p> : null}
            {deliveryLocationError ? <p>{deliveryLocationError}</p> : null}
            {pricingPreviewNotice ? <p>{pricingPreviewNotice}</p> : null}
            {voucherNotice ? <p>{voucherNotice}</p> : null}
            {voucherError ? <p>{voucherError}</p> : null}
            {notice ? <p>{notice}</p> : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
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
              Create order and show payment QR
            </button>
            <Link className={ui.secondaryButton} to="/cart">
              Edit cart
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
