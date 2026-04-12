import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { ApiError } from "../lib/api";
import { geocodeAddress } from "../lib/locationLookup";
import { savePendingPaymentOrder } from "../lib/paymentSession";
import {
  calculateCartShippingEstimate,
  formatShippingBreakdown,
  formatShippingDistance,
  hasCoordinatePair,
} from "../lib/shippingFee";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatPrice(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function formatCompactNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
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

function describeCartItem(line) {
  const quantity = Number(line.quantity ?? 0);
  const stock = Number(line.stock ?? 0);

  if (quantity > stock) {
    return {
      label: `Only ${formatCompactNumber(stock)} left`,
      className:
        "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700",
      hint: `Quantity exceeds current stock. Only ${formatCompactNumber(stock)} left.`,
    };
  }

  if (line.available && !line.disabled) {
    return {
      label: "Available now",
      className: ui.pill,
      hint: "",
    };
  }

  if (line.schedulable) {
    return {
      label: "Scheduled only",
      className:
        "inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800",
      hint: "This item is not available for delivery right now, but it can still be checked out as a scheduled order.",
    };
  }

  return {
    label: "Temporarily unavailable",
    className:
      "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700",
    hint: "This item is temporarily unavailable for checkout.",
  };
}

export default function CartPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const {
    cart,
    cartItems,
    cartCount,
    cartSubtotal,
    deliveryAddresses,
    userDataLoading,
    canUseGuestCart,
    canUseUserFeatures,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    previewCartCheckout,
    checkoutCart,
  } = useSiteData();
  const [notice, setNotice] = useState("");
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

  const blockingIssues = useMemo(
    () =>
      cartItems.filter((line) => {
        if (Number(line.quantity ?? 0) > Number(line.stock ?? 0)) {
          return true;
        }

        if (deliveryType === "SCHEDULED") {
          return !line.schedulable;
        }

        return line.disabled || !line.available;
      }),
    [cartItems, deliveryType],
  );

  const scheduledOnlyItems = useMemo(
    () => cartItems.filter((line) => !line.available && line.schedulable),
    [cartItems],
  );
  const storeCount = useMemo(
    () => new Set(cartItems.map((line) => String(line.storeId ?? "")).filter(Boolean)).size,
    [cartItems],
  );

  const latestDeliveryAddress = useMemo(
    () =>
      [...deliveryAddresses].sort((left, right) => {
        if (Boolean(left.primary) !== Boolean(right.primary)) {
          return left.primary ? -1 : 1;
        }

        const leftTime = Math.max(
          new Date(left.lastUsedAt || "").getTime() || 0,
          new Date(left.verifiedAt || "").getTime() || 0,
          new Date(left.updatedAt || left.createdAt || "").getTime() || 0,
        );
        const rightTime = Math.max(
          new Date(right.lastUsedAt || "").getTime() || 0,
          new Date(right.verifiedAt || "").getTime() || 0,
          new Date(right.updatedAt || right.createdAt || "").getTime() || 0,
        );

        return rightTime - leftTime;
      })[0] ?? null,
    [deliveryAddresses],
  );

  useEffect(() => {
    if (!deliveryAddresses.length) {
      if (selectedDeliveryAddressId) {
        setSelectedDeliveryAddressId("");
      }
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
  const loginState = {
    from: { pathname: "/cart" },
    message: "Sign in to continue with checkout and payment.",
  };
  const requiresUserCheckout = auth.isAuthenticated && !canUseUserFeatures;

  const checkoutDisabled =
    !canUseUserFeatures ||
    blockingIssues.length > 0 ||
    !cartItems.length ||
    !selectedDeliveryAddressId ||
    (deliveryType === "SCHEDULED" && !scheduledDeliveryAt);

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
          label: selectedDeliveryAddress.deliveryAddress,
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
          setDeliveryLocationError("");
        }
      } catch {
        if (!cancelled) {
          setResolvedDeliveryLocation(null);
          setDeliveryLocationError(
            "Shipping fee will be finalized after address coordinates are available.",
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

      if (
        !canUseUserFeatures ||
        !cartItems.length ||
        !selectedDeliveryAddressId ||
        (deliveryType === "SCHEDULED" && !scheduledDeliveryAtIso)
      ) {
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
        setPricingPreview({
          ...result.preview,
          source: "backend",
        });
        setPricingPreviewNotice("");
        setPricingPreviewLoading(false);
        return;
      }

      if (result.error instanceof ApiError && [404, 405].includes(result.error.status)) {
        setPricingPreview(null);
        setPricingPreviewNotice("");
        setPricingPreviewLoading(false);
        return;
      }

      setPricingPreview(null);
      setPricingPreviewNotice(
        result.message || "Final shipping fee will be confirmed at checkout.",
      );
      setPricingPreviewLoading(false);
    }

    const timeoutId = window.setTimeout(() => {
      void loadPricingPreview();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    canUseUserFeatures,
    cartItems,
    deliveryType,
    previewCartCheckout,
    promotionCode,
    scheduledDeliveryAtIso,
    selectedDeliveryAddressId,
  ]);

  const pricingSummary = pricingPreview ?? localPricingEstimate;
  const showPricingSummary = !canUseGuestCart && !requiresUserCheckout;
  const hasShippingFee =
    pricingSummary?.shippingFeeAmount !== undefined && pricingSummary?.shippingFeeAmount !== null;
  const hasShippingDistance =
    pricingSummary?.shippingDistanceKm !== undefined && pricingSummary?.shippingDistanceKm !== null;
  const hasDiscount =
    pricingSummary?.discountAmount !== undefined &&
    pricingSummary?.discountAmount !== null &&
    Number(pricingSummary.discountAmount) > 0;
  const shippingFeeLabel =
    pricingPreview?.source === "backend" ? "Shipping fee" : "Estimated shipping fee";
  const totalLabel =
    pricingPreview?.source === "backend" ? "Final total" : "Estimated total";
  const shippingBreakdownLabel = formatShippingBreakdown(pricingSummary?.shippingFeeBreakdown);

  const handleQuantityChange = async (line, nextQuantity) => {
    const normalizedQuantity = Math.max(1, Number(nextQuantity || 1));
    const result = await updateCartItemQuantity(line.id, normalizedQuantity, line);
    setNotice(result.message);
  };

  const handleRemoveItem = async (lineId) => {
    const result = await removeCartItem(lineId);
    setNotice(result.message);
  };

  const handleClearCart = async () => {
    const result = await clearCart();
    setNotice(result.message);
  };

  const handleCheckout = async () => {
    if (canUseGuestCart) {
      navigate("/login", { state: loginState });
      return;
    }

    if (!canUseUserFeatures) {
      setNotice("Only USER accounts can place orders and complete payment.");
      return;
    }

    if (!selectedDeliveryAddressId) {
      setNotice("Please choose a delivery address before checkout.");
      return;
    }

    let nextScheduledDeliveryAt;

    if (deliveryType === "SCHEDULED") {
      if (!scheduledDeliveryAt) {
        setNotice("Please choose a scheduled delivery time.");
        return;
      }

      const scheduledDate = new Date(scheduledDeliveryAt);

      if (Number.isNaN(scheduledDate.getTime())) {
        setNotice("The scheduled delivery time is invalid.");
        return;
      }

      if (scheduledDate.getTime() <= Date.now()) {
        setNotice("The scheduled delivery time must be in the future.");
        return;
      }

      nextScheduledDeliveryAt = scheduledDate.toISOString();
    }

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost:5173";

    const result = await checkoutCart({
      deliveryAddressId: selectedDeliveryAddressId,
      promotionCode,
      deliveryType,
      scheduledDeliveryAt: nextScheduledDeliveryAt,
      returnUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/cancel`,
    });
    setNotice(result.message);

    if (!result.ok && result.loginRequired) {
      navigate("/login", { state: loginState });
      return;
    }

    if (result.ok && result.order?.id) {
      savePendingPaymentOrder(result.order);
      const nextOrderId = resolvePrimaryOrderId(result.order);

      if (result.order.paymentCheckoutUrl && typeof window !== "undefined") {
        window.location.assign(result.order.paymentCheckoutUrl);
        return;
      }

      navigate(nextOrderId ? `/orders/${nextOrderId}` : "/orders");
    }
  };

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Cart</p>
            <h1 className={ui.bannerTitle}>Unpaid cart</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
              {canUseGuestCart
                ? "You can add items to the cart before signing in. When you are ready to order and pay, just sign in with a USER account."
                : "You can update quantities, remove line items, choose delivery when stores are open, or schedule ahead when needed."}
            </p>
          </div>

          {cartItems.length ? (
            <button className={ui.secondaryButton} type="button" onClick={handleClearCart}>
              Clear all
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Status", value: cart.status || "OPEN" },
            { label: "Total quantity", value: formatCompactNumber(cartCount) },
            { label: "Item subtotal", value: formatPrice(cartSubtotal) },
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

        {notice ? <p className="mt-4 text-sm leading-7 text-stone-600">{notice}</p> : null}
      </section>

      {userDataLoading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Syncing cart...
          </div>
        </section>
      ) : null}

      {!userDataLoading && cartItems.length ? (
        <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="grid gap-5">
            {cartItems.map((line) => {
              const stock = Number(line.stock ?? 0);
              const quantity = Number(line.quantity ?? 0);
              const status = describeCartItem(line);
              const hardBlocked = quantity > stock || (!line.available && !line.schedulable);
              const canAddMore = quantity < stock && (line.available || line.schedulable);

              return (
                <article
                  key={line.id}
                  className={`${ui.card} ${hardBlocked ? "border-stone-300/70" : ""}`}
                >
                  <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
                    <div className="overflow-hidden rounded-[1rem] border border-matcha-900/10 bg-stone-100">
                      <SmartImage
                        className="h-28 w-full object-cover"
                        src={line.imagePaths?.[0]}
                        alt={line.dishName}
                        loading="lazy"
                        fallbackClassName="grid h-28 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-semibold text-tea-900">
                            {line.dishName || "Missing item"}
                          </h2>
                          <p className="mt-2 text-sm font-semibold text-matcha-700">
                            {line.storeName || "Missing store"}
                          </p>
                        </div>
                        <strong className="text-xl font-bold text-matcha-700">
                          {formatPrice(line.totalPrice)}
                        </strong>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={status.className}>{status.label}</span>
                        <span className={ui.pill}>{formatCompactNumber(stock)} left</span>
                        <span className={ui.pill}>{formatPrice(line.unitPrice)}/item</span>
                        {line.schedulable ? <span className={ui.pill}>Can be scheduled</span> : null}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-[140px_auto_auto_auto_auto_auto] sm:items-end">
                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                            Quantity
                          </span>
                          <input
                            className={ui.input}
                            type="number"
                            min="1"
                            max={stock || 1}
                            value={line.quantity}
                            onChange={(event) =>
                              handleQuantityChange(line, Number(event.target.value || 1))
                            }
                          />
                        </label>

                        <QuickAddToCartButton
                          className={ui.primaryButton}
                          dishId={line.dishId}
                          storeId={line.storeId}
                          quantity={1}
                          blocked={!canAddMore}
                          blockedMessage={
                            quantity >= stock
                              ? "This store does not have enough stock to add more."
                              : "This item is temporarily unavailable for adding more."
                          }
                          onResult={(message) => setNotice(message)}
                        />

                        <QuickFavoriteButton
                          targetType="dish"
                          targetId={line.dishId}
                          activeLabel="Saved"
                          inactiveLabel="Save item"
                          onResult={(message) => setNotice(message)}
                        />

                          {line.storeId ? (
                            <Link className={ui.secondaryButton} to={buildStorePath(line)}>
                              View store
                            </Link>
                          ) : null}

                        <Link className={ui.secondaryButton} to={`/menu/${line.dishId}?store=${line.storeId}`}>
                          View item
                        </Link>

                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => handleRemoveItem(line.id)}
                        >
                          Remove
                        </button>
                      </div>

                      {status.hint ? (
                        <p className="mt-4 text-sm leading-7 text-stone-600">{status.hint}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className={`${ui.card} h-fit`}>
            <h2 className="text-2xl font-semibold text-tea-900">Cart summary</h2>
            <div className="mt-5 grid gap-3">
              {[
                { label: "Line items", value: formatCompactNumber(cartItems.length) },
                { label: "Total quantity", value: formatCompactNumber(cartCount) },
                { label: "Item subtotal", value: formatPrice(cartSubtotal) },
                hasDiscount
                  ? {
                      label: pricingPreview?.source === "backend" ? "Discount" : "Estimated discount",
                      value: formatPrice(pricingSummary.discountAmount),
                    }
                  : null,
                hasShippingFee
                  ? {
                      label: shippingFeeLabel,
                      value: formatPrice(pricingSummary.shippingFeeAmount),
                    }
                  : null,
                pricingSummary?.totalAmount !== undefined && pricingSummary?.totalAmount !== null
                  ? {
                      label: totalLabel,
                      value: formatPrice(pricingSummary.totalAmount),
                    }
                  : null,
              ]
                .filter(Boolean)
                .map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4"
                >
                  <strong className="block text-lg font-bold text-tea-900">{stat.value}</strong>
                  <span className="mt-1 block text-sm text-stone-600">{stat.label}</span>
                </div>
                ))}
            </div>

            {showPricingSummary ? (
              <div className="mt-5 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4 text-sm leading-7 text-stone-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-tea-900">
                      {pricingPreview?.source === "backend"
                        ? "Checkout pricing"
                        : "Shipping estimate"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                      {pricingPreview?.source === "backend"
                        ? "Confirmed by backend preview"
                        : "Calculated locally from map distance"}
                    </p>
                  </div>

                  {pricingPreviewLoading || deliveryLocationLoading ? (
                    <span className="rounded-full bg-matcha-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-700">
                      Updating...
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 text-sm text-stone-600">
                  {hasShippingDistance ? (
                    <span>
                      Shipping distance: {formatShippingDistance(pricingSummary.shippingDistanceKm)}
                    </span>
                  ) : null}
                  {shippingBreakdownLabel ? (
                    <span>Per-store breakdown: {shippingBreakdownLabel}</span>
                  ) : null}
                  {pricingPreview?.promotionCode ? (
                    <span>Promotion code: {pricingPreview.promotionCode}</span>
                  ) : null}
                </div>

                {pricingPreviewNotice ? (
                  <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
                    {pricingPreviewNotice}
                  </div>
                ) : null}

                {!pricingPreviewNotice && deliveryLocationError ? (
                  <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-7 text-amber-900">
                    {deliveryLocationError}
                  </div>
                ) : null}

                {!pricingPreviewNotice && !deliveryLocationError && pricingSummary?.statusSummary ? (
                  <p className="mt-4 text-sm leading-7 text-stone-600">{pricingSummary.statusSummary}</p>
                ) : null}

                {!pricingPreview && !pricingPreviewNotice && !deliveryLocationError && !hasCoordinatePair(resolvedDeliveryLocation) ? (
                  <p className="mt-4 text-sm leading-7 text-stone-600">
                    Final shipping fee will be confirmed by the backend during checkout.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.2rem] border border-matcha-900/10 bg-matcha-500/10 p-4 text-sm leading-7 text-stone-700">
              {blockingIssues.length ? (
                <p>
                  {deliveryType === "SCHEDULED"
                    ? `${blockingIssues.length} item(s) cannot be included in a scheduled order yet. Please check stock and availability for each line.`
                    : `${blockingIssues.length} item(s) are not available for delivery right now. You can switch to scheduled delivery if they are still schedulable.`}
                </p>
              ) : (
                <p>
                  {deliveryType === "SCHEDULED"
                    ? "Your cart is ready for a scheduled order."
                    : "Your cart is ready for delivery."}
                </p>
              )}
            </div>

            {scheduledOnlyItems.length ? (
              <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50/80 p-4 text-sm leading-7 text-amber-900">
                {scheduledOnlyItems.length} item(s) are currently available only for scheduled delivery.
              </div>
            ) : null}

            {canUseGuestCart ? (
              <div className="mt-5 grid gap-4 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <div>
                  <p className="text-sm font-semibold text-tea-900">Sign in to order</p>
                  <p className="mt-1 text-sm leading-7 text-stone-600">
                    You can keep adding items before signing in. When you are ready to place the
                    order and pay, sign in with a USER account.
                  </p>
                </div>

                <div className="rounded-[1rem] border border-matcha-900/10 bg-stone-50/90 p-4 text-sm leading-7 text-stone-600">
                  This temporary cart stays in this browser. After you sign in, the app continues
                  from the current cart so you can choose an address and pay.
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link className={ui.primaryButton} state={loginState} to="/login">
                    Sign in to order
                  </Link>
                  <Link className={ui.secondaryButton} to="/register">
                    Create a USER account
                  </Link>
                </div>
              </div>
            ) : requiresUserCheckout ? (
              <div className="mt-5 grid gap-4 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <div>
                  <p className="text-sm font-semibold text-tea-900">Checkout unavailable</p>
                  <p className="mt-1 text-sm leading-7 text-stone-600">
                    The current account is {auth.user?.role ?? "not USER"}. Only USER accounts can
                    place orders and complete payment.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-4 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <div>
                    <p className="text-sm font-semibold text-tea-900">Delivery address</p>
                    <p className="mt-1 text-sm leading-7 text-stone-600">
                      Choose the recipient, delivery method, and create the PayOS payment link.
                    </p>
                  </div>

                  {deliveryAddresses.length ? (
                    <label className="grid gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                        Address book
                      </span>
                      <select
                        className={ui.input}
                        value={selectedDeliveryAddressId}
                        onChange={(event) => setSelectedDeliveryAddressId(event.target.value)}
                      >
                        {deliveryAddresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.primary ? "[Primary] " : ""}
                            {address.fullName} - {address.phoneNumber}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="rounded-[1rem] border border-dashed border-matcha-900/15 bg-stone-50/80 p-4 text-sm leading-7 text-stone-600">
                      You have not saved any delivery addresses yet.
                    </div>
                  )}

                  {selectedDeliveryAddress ? (
                    <div className="rounded-[1rem] border border-matcha-900/10 bg-stone-50/90 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-matcha-700">
                          {selectedDeliveryAddress.fullName} - {selectedDeliveryAddress.phoneNumber}
                        </p>
                        {selectedDeliveryAddress.primary ? (
                          <span className="rounded-full bg-matcha-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-700">
                            Primary
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-stone-600">
                        {selectedDeliveryAddress.deliveryAddress}
                      </p>
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

                  <div className="rounded-[1rem] border border-matcha-900/10 bg-stone-50/90 p-4 text-sm leading-7 text-stone-600">
                    {deliveryType === "SCHEDULED"
                      ? "Scheduled delivery lets you place the order ahead of time for items that are not available right away."
                      : "Delivery is only available when every store in the cart is currently open."}
                  </div>

                  {storeCount > 1 ? (
                    <div className="rounded-[1rem] border border-matcha-900/10 bg-stone-50/90 p-4 text-sm leading-7 text-stone-600">
                      Your cart currently contains {storeCount} stores. During checkout, the backend
                      may split this into multiple orders per branch while still using a single PayOS
                      link, and a promotion code can only apply to one store bill in that checkout.
                    </div>
                  ) : null}

                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                      Promotion code
                    </span>
                    <input
                      className={ui.input}
                      type="text"
                      value={promotionCode}
                      onChange={(event) => setPromotionCode(event.target.value)}
                      placeholder="For example: MATCHA10"
                    />
                    <span className="text-xs leading-6 text-stone-500">
                      Promotions apply to one store bill only and should be used for SIGNATURE
                      dishes. If the cart includes local specialty items, the backend will reject
                      the code with a clear message.
                    </span>
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className={ui.primaryButton}
                    type="button"
                    disabled={checkoutDisabled}
                    onClick={handleCheckout}
                  >
                    Pay with PayOS
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className={ui.secondaryButton} to="/account">
                    Manage addresses
                  </Link>
                </div>
              </>
            )}
          </aside>
        </section>
      ) : null}

      {!userDataLoading && !cartItems.length ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-8 text-sm leading-7 text-stone-600">
            Your cart is empty.
          </div>
        </section>
      ) : null}
    </main>
  );
}
