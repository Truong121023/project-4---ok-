import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SmartImage from "../components/SmartImage";
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

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Cart</p>
            <h1 className={ui.bannerTitle}>Review your cart</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
              Check the items first, then move to the payment details page to choose the recipient,
              create the order, and open the PayOS transfer QR.
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
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="grid gap-5">
            {cartItems.map((line) => {
              const status = describeCartItem(line);

              return (
                <article key={line.id} className={ui.card}>
                  <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
                    <div className="overflow-hidden rounded-[1.2rem] border border-matcha-900/10 bg-stone-100">
                      <SmartImage
                        className="h-28 w-full object-cover"
                        src={line.imagePaths?.[0]}
                        alt={line.dishName}
                        fallbackClassName="grid h-28 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                      />
                    </div>

                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-tea-900">{line.dishName}</h2>
                          <p className="mt-1 text-sm text-stone-600">{line.storeName}</p>
                        </div>

                        <div className="text-right">
                          <strong className="text-lg font-bold text-matcha-700">
                            {formatPrice(line.totalPrice)}
                          </strong>
                          <p className="mt-1 text-sm text-stone-500">
                            {formatPrice(line.unitPrice)} each
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className={ui.pill}>{status.label}</span>
                        <span className="text-sm text-stone-600">
                          Stock: {formatCompactNumber(line.stock)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-3 rounded-full border border-matcha-900/10 bg-white/80 px-3 py-2">
                          <button
                            className="text-lg font-semibold text-tea-900"
                            type="button"
                            onClick={() => handleQuantityChange(line, line.quantity - 1)}
                          >
                            -
                          </button>
                          <span className="min-w-8 text-center text-sm font-semibold text-tea-900">
                            {formatCompactNumber(line.quantity)}
                          </span>
                          <button
                            className="text-lg font-semibold text-tea-900"
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
                        <p className="text-sm leading-7 text-stone-600">{status.hint}</p>
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
                { label: "Stores", value: formatCompactNumber(storeCount) },
                { label: "Total quantity", value: formatCompactNumber(cartCount) },
                { label: "Subtotal", value: formatPrice(cartSubtotal) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4"
                >
                  <strong className="block text-lg font-bold text-tea-900">{stat.value}</strong>
                  <span className="mt-1 block text-sm text-stone-600">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-matcha-900/10 bg-matcha-500/10 p-4 text-sm leading-7 text-stone-700">
              {unavailableCount
                ? `${unavailableCount} item(s) need attention before payment. The payment details page will recheck pricing, stock, delivery availability, and shipping fee.`
                : "The cart is ready. Continue to the payment details page to choose the recipient and create the PayOS payment session."}
            </div>

            {canUseGuestCart ? (
              <div className="mt-5 grid gap-4 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                <div>
                  <p className="text-sm font-semibold text-tea-900">Sign in to order</p>
                  <p className="mt-1 text-sm leading-7 text-stone-600">
                    Keep adding items now, then sign in with a USER account to continue to payment
                    details and create the order.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link className={ui.primaryButton} state={loginState} to="/login">
                    Sign in to continue
                  </Link>
                  <Link className={ui.secondaryButton} to="/register">
                    Create a USER account
                  </Link>
                </div>
              </div>
            ) : requiresUserCheckout ? (
              <div className="mt-5 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4 text-sm leading-7 text-stone-600">
                The current account is {auth.user?.role ?? "not USER"}. Only USER accounts can
                place orders and complete payment.
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-3">
                <button className={ui.primaryButton} type="button" onClick={handleProceedToCheckout}>
                  Continue to payment details
                </button>
                <Link className={ui.secondaryButton} to="/account">
                  Manage addresses
                </Link>
              </div>
            )}
          </aside>
        </section>
      ) : null}

      {!userDataLoading && !cartItems.length ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-8 text-sm leading-7 text-stone-600">
            Your cart is empty.
          </div>
          <div className="mt-5">
            <Link className={ui.primaryButton} to="/menu">
              Browse menu
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
