import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";
import { fetchPublicHome, fetchUserVoucherCatalog } from "../lib/siteApi";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import { ui } from "../ui";

function formatCurrency(value) {
  return formatCurrencyVnd(value);
}

function formatPromotionValue(promotion) {
  return `${Number(promotion?.discountValue ?? 0).toLocaleString("en-US")}%`;
}

function formatDateTime(value) {
  return formatDateTimeVn(value, "No schedule");
}

function formatScopeLabel(scope) {
  switch (String(scope ?? "").toUpperCase()) {
    case "SHIP":
      return "Shipping";
    case "DISH":
      return "Dishes";
    case "ORDER":
    default:
      return "Order";
  }
}

function formatScopeSummary(scope) {
  switch (String(scope ?? "").toUpperCase()) {
    case "SHIP":
      return "Applies to the shipping fee only.";
    case "DISH":
      return "Applies to all dishes in the checkout.";
    case "ORDER":
    default:
      return "Applies to the whole order.";
  }
}

function isMembershipGated(promotion) {
  return Array.isArray(promotion?.eligibleUserLevelIds) && promotion.eligibleUserLevelIds.length > 0;
}

function PromotionCard({ promotion, onCopyCode }) {
  return (
    <article className="rounded-[1.6rem] border border-matcha-900/10 bg-white/75 p-5 shadow-[0_18px_40px_rgba(79,70,45,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={ui.pill}>{formatScopeLabel(promotion.scope)}</span>
        <span className={ui.pill}>{formatPromotionValue(promotion)}</span>
        <span className={ui.pill}>
          {isMembershipGated(promotion) ? "Membership checked at checkout" : "Open to all memberships"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-tea-900">{promotion.name || promotion.code}</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            {promotion.description || "The final rule check happens automatically during checkout."}
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-matcha-900/10 bg-[#fbf6ed] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Code</p>
          <strong className="mt-2 block text-lg font-bold text-tea-900">{promotion.code || "N/A"}</strong>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-[1.1rem] border border-matcha-900/10 bg-white/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Rule</p>
          <p className="mt-2 text-sm font-semibold text-tea-900">{formatScopeSummary(promotion.scope)}</p>
        </article>
        <article className="rounded-[1.1rem] border border-matcha-900/10 bg-white/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Discount</p>
          <p className="mt-2 text-sm font-semibold text-tea-900">
            {formatPromotionValue(promotion)}
            {Number(promotion.maxDiscountAmount ?? 0) > 0
              ? ` up to ${formatCurrency(promotion.maxDiscountAmount)}`
              : ""}
          </p>
        </article>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-stone-600">
        {Number(promotion.minOrderAmount ?? 0) > 0 ? (
          <span>Minimum order: {formatCurrency(promotion.minOrderAmount)}</span>
        ) : (
          <span>Minimum order: none</span>
        )}
        <span>
          Membership rule:{" "}
          {isMembershipGated(promotion)
            ? `restricted to level IDs ${promotion.eligibleUserLevelIds.join(", ")}`
            : "all membership levels are eligible"}
        </span>
        <span>
          Active window: {formatDateTime(promotion.startsAt)} - {formatDateTime(promotion.endsAt)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className={ui.secondaryButton} type="button" onClick={() => onCopyCode(promotion.code)}>
          Copy code
        </button>
        {promotion.code ? (
          <Link className={ui.primaryButton} to={`/checkout?promotion=${encodeURIComponent(promotion.code)}`}>
            Use at checkout
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function PromotionsPage() {
  const auth = useAuth();
  const isUser = auth.hasRole("USER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [promotions, setPromotions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPromotions() {
      setLoading(true);
      setError("");

      try {
        const nextPromotions = isUser
          ? await fetchUserVoucherCatalog(auth)
          : (await fetchPublicHome()).promotions ?? [];

        if (!cancelled) {
          setPromotions(nextPromotions);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Unable to load promotions."));
          setPromotions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPromotions();

    return () => {
      cancelled = true;
    };
  }, [auth, isUser]);

  const stats = useMemo(() => {
    const membershipFilteredCount = promotions.filter(isMembershipGated).length;
    const shippingCount = promotions.filter(
      (promotion) => String(promotion.scope ?? "").toUpperCase() === "SHIP",
    ).length;
    const dishCount = promotions.filter(
      (promotion) => String(promotion.scope ?? "").toUpperCase() === "DISH",
    ).length;
    const orderCount = promotions.filter(
      (promotion) => String(promotion.scope ?? "").toUpperCase() === "ORDER",
    ).length;

    return {
      total: promotions.length,
      membershipFilteredCount,
      shippingCount,
      dishCount,
      orderCount,
    };
  }, [promotions]);

  const handleCopyCode = async (code) => {
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setNotice(`Copied ${code}.`);
      setError("");
    } catch {
      setError(`Unable to copy ${code} right now.`);
    }
  };

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Promotions</p>
        <h1 className={ui.bannerTitle}>Simple voucher rules for checkout</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          Each code now follows one clear rule: <strong>ORDER</strong>, <strong>DISH</strong>, or{" "}
          <strong>SHIP</strong>. The server checks the minimum order amount, maximum discount, and
          membership eligibility automatically when you apply the code.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">Active codes</p>
            <strong className="mt-3 block text-2xl font-semibold text-tea-900">{stats.total}</strong>
          </article>
          <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">Order scope</p>
            <strong className="mt-3 block text-2xl font-semibold text-tea-900">{stats.orderCount}</strong>
          </article>
          <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">Dish scope</p>
            <strong className="mt-3 block text-2xl font-semibold text-tea-900">{stats.dishCount}</strong>
          </article>
          <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">Shipping scope</p>
            <strong className="mt-3 block text-2xl font-semibold text-tea-900">{stats.shippingCount}</strong>
          </article>
          <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">Membership-gated</p>
            <strong className="mt-3 block text-2xl font-semibold text-tea-900">
              {stats.membershipFilteredCount}
            </strong>
          </article>
        </div>

        {notice ? (
          <div className="mt-6 rounded-[1.3rem] border border-matcha-500/20 bg-matcha-500/10 px-4 py-3 text-sm text-matcha-700">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-[1.3rem] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading promotions...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>Available codes</p>
              <h2 className={ui.sectionTitle}>Use the right code at checkout</h2>
            </div>

            {isUser ? (
              <Link className={ui.secondaryButton} to="/checkout">
                Open checkout
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {promotions.length ? (
              promotions.map((promotion) => (
                <PromotionCard
                  key={promotion.id || promotion.code}
                  promotion={promotion}
                  onCopyCode={handleCopyCode}
                />
              ))
            ) : (
              <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600 lg:col-span-2">
                No promotion code is available right now.
              </article>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
