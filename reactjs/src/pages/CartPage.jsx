import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SmartImage from "../components/SmartImage";
import CheckoutLayout from "../components/templates/checkout-layout";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { formatCurrencyVnd, formatNumberVi } from "../lib/locale";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatCompactNumber(value) {
  return formatNumberVi(value);
}

function describeCartItem(line) {
  const quantity = Number(line.quantity ?? 0);
  const stock = Number(line.stock ?? 0);

  if (quantity > stock) {
    return {
      label: `Only ${formatCompactNumber(stock)} left`,
      hint: `Quantity exceeds current stock. Review this line before you continue to payment details.`,
    };
  }

  if (line.available && !line.disabled) {
    return {
      label: "Available now",
      hint: "",
    };
  }

  if (line.schedulable) {
    return {
      label: "Scheduled only",
      hint: "This item is not available right now, but it may still work as a scheduled order during checkout.",
    };
  }

  return {
    label: "Temporarily unavailable",
    hint: "This item may need to be removed or replaced before payment.",
  };
}

/** Step indicator for cart page */
function CartStepper() {
  const steps = ["Cart", "Delivery", "Payment", "Confirm"];
  return (
    <nav aria-label="Checkout steps">
      <ol className="flex items-center gap-2 overflow-x-auto">
        {steps.map((step, idx) => (
          <li key={step} className="flex items-center gap-2">
            {idx > 0 && (
              <span aria-hidden="true" className="h-px w-6 shrink-0 bg-beige-300 sm:w-10" />
            )}
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${
                idx === 0
                  ? "bg-matcha-500 text-cream-50"
                  : "bg-cream-100 text-ink-400"
              }`}
            >
              <span className="hidden sm:inline">{step}</span>
              <span className="sm:hidden">{idx + 1}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function CartPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const {
    cart,
    cartItems,
    cartCount,
    cartSubtotal,
    userDataLoading,
    canUseGuestCart,
    canUseUserFeatures,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
  } = useSiteData();
  const [notice, setNotice] = useState("");

  const loginState = {
    from: { pathname: "/checkout" },
    message: "Sign in to continue with checkout and payment.",
  };

  const requiresUserCheckout = auth.isAuthenticated && !canUseUserFeatures;
  const storeCount = useMemo(
    () => new Set(cartItems.map((line) => String(line.storeId ?? "")).filter(Boolean)).size,
    [cartItems],
  );
  const unavailableCount = useMemo(
    () =>
      cartItems.filter(
        (line) =>
          Number(line.quantity ?? 0) > Number(line.stock ?? 0) ||
          line.disabled ||
          !line.available,
      ).length,
    [cartItems],
  );

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

  const handleProceedToCheckout = () => {
    if (canUseGuestCart) {
      navigate("/login", { state: loginState });
      return;
    }

    if (!canUseUserFeatures) {
      setNotice("Only USER accounts can place orders and complete payment.");
      return;
    }

    navigate("/checkout");
  };

  /* ---------- Order summary rail ---------- */
  const summaryRail = (
    <>
      <h2 className="font-display text-xl font-semibold text-ink-900">Cart summary</h2>

      <div className="mt-5 grid gap-3">
        {[
          { label: "Status", value: cart.status || "OPEN" },
          { label: "Line items", value: formatCompactNumber(cartItems.length) },
          { label: "Stores", value: formatCompactNumber(storeCount) },
          { label: "Total qty", value: formatCompactNumber(cartCount) },
          { label: "Subtotal", value: formatPrice(cartSubtotal) },
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

      {unavailableCount > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-7 text-amber-900">
          {unavailableCount} item(s) need attention before payment.
        </div>
      )}

      {!unavailableCount && cartItems.length > 0 && (
        <div className="mt-4 rounded-lg border border-matcha-200 bg-matcha-50/60 px-4 py-3 text-sm leading-7 text-matcha-700">
          Cart is ready. Continue to choose delivery details and create a payment session.
        </div>
      )}

      {canUseGuestCart ? (
        <div className="mt-5 grid gap-4">
          <p className="text-sm font-semibold text-ink-900">Sign in to order</p>
          <p className="text-sm leading-7 text-ink-600">
            Keep adding items now, then sign in with a USER account to continue.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className={ui.primaryButton} state={loginState} to="/login">
              Sign in to continue
            </Link>
            <Link className={ui.secondaryButton} to="/register">
              Create account
            </Link>
          </div>
        </div>
      ) : requiresUserCheckout ? (
        <div className="mt-5 rounded-lg border border-ink-900/10 bg-cream-100 px-4 py-3 text-sm leading-7 text-ink-600">
          Only USER accounts can place orders and complete payment.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <button className={ui.primaryButton} type="button" onClick={handleProceedToCheckout}>
            Continue to payment details
          </button>
          <Link className={ui.secondaryButton} to="/account">
            Manage addresses
          </Link>
        </div>
      )}
    </>
  );

  /* ---------- Loading state ---------- */
  if (userDataLoading) {
    return (
      <main className={ui.page}>
        <CheckoutLayout stepper={<CartStepper />}>
          <div className="rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-6 text-sm text-ink-600">
            Syncing cart...
          </div>
        </CheckoutLayout>
      </main>
    );
  }

  /* ---------- Empty cart ---------- */
  if (!cartItems.length) {
    return (
      <main className={ui.page}>
        <CheckoutLayout stepper={<CartStepper />}>
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-dashed border-ink-900/15 bg-cream-50/50 p-8 text-sm leading-7 text-ink-600">
              Your cart is empty.
            </div>
            <Link className={`${ui.primaryButton} self-start`} to="/menu">
              Browse menu
            </Link>
          </div>
        </CheckoutLayout>
      </main>
    );
  }

  /* ---------- Main view ---------- */
  return (
    <main className={ui.page}>
      <CheckoutLayout
        stepper={<CartStepper />}
        summary={cartItems.length ? summaryRail : null}
      >
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Cart</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
              Review your cart
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-600">
              Check items and quantities, then continue to the payment details page.
            </p>
          </div>
          <button className={ui.secondaryButton} type="button" onClick={handleClearCart}>
            Clear all
          </button>
        </div>

        {notice && (
          <p className="mb-4 text-sm leading-7 text-ink-600">{notice}</p>
        )}

        {/* Cart line items */}
        <div className="grid gap-5">
          {cartItems.map((line) => {
            const status = describeCartItem(line);

            return (
              <article
                key={line.id}
                className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft"
              >
                <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
                  <div className="overflow-hidden rounded-lg border border-ink-900/10 bg-beige-100">
                    <SmartImage
                      className="h-28 w-full object-cover"
                      src={line.imagePaths?.[0]}
                      alt={line.dishName}
                      fallbackClassName="grid h-28 w-full place-items-center bg-beige-100 text-xs text-ink-400"
                    />
                  </div>

                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-ink-900">
                          {line.dishName}
                        </h2>
                        <p className="mt-1 text-sm text-ink-500">{line.storeName}</p>
                      </div>

                      <div className="text-right">
                        <strong className={ui.price}>{formatPrice(line.totalPrice)}</strong>
                        <p className="mt-1 text-xs text-ink-400">
                          {formatPrice(line.unitPrice)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={ui.pill}>{status.label}</span>
                      <span className="text-xs text-ink-400">
                        Stock: {formatCompactNumber(line.stock)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Quantity stepper */}
                      <div className="inline-flex items-center gap-3 rounded-full border border-ink-900/10 bg-cream-100 px-3 py-2">
                        <button
                          aria-label="Decrease quantity"
                          className="text-lg font-semibold text-ink-900 hover:text-matcha-700"
                          type="button"
                          onClick={() => handleQuantityChange(line, line.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold text-ink-900">
                          {formatCompactNumber(line.quantity)}
                        </span>
                        <button
                          aria-label="Increase quantity"
                          className="text-lg font-semibold text-ink-900 hover:text-matcha-700"
                          type="button"
                          onClick={() => handleQuantityChange(line, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      {line.storeId ? (
                        <Link className={ui.secondaryButton} to={buildStorePath(line)}>
                          View store
                        </Link>
                      ) : null}

                      <Link
                        className={ui.secondaryButton}
                        to={`/menu/${line.dishId}?store=${line.storeId}`}
                      >
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
                      <p className="text-sm leading-7 text-amber-800">{status.hint}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </CheckoutLayout>
    </main>
  );
}
