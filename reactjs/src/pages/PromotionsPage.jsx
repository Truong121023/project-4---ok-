import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";
import {
  fetchPublicHome,
  fetchUserVoucherCatalog,
  redeemUserVoucher,
} from "../lib/siteApi";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import { ui } from "../ui";

function formatCurrency(value) {
  return formatCurrencyVnd(value);
}

function formatPromotionValue(promotion) {
  if (String(promotion?.discountType ?? "").toUpperCase() === "PERCENT") {
    return `${Number(promotion?.discountValue ?? 0).toLocaleString("vi-VN")}%`;
  }

  return formatCurrency(promotion?.discountValue ?? 0);
}

function formatDiscountTarget(promotion) {
  const normalized = String(promotion?.discountTarget ?? "ITEMS").toUpperCase();

  if (normalized === "SHIPPING") {
    return "Shipping fee";
  }

  if (normalized === "BOTH") {
    return "Items + shipping";
  }

  return "Signature items";
}

function formatDateTime(value) {
  return formatDateTimeVn(value, "No schedule");
}

function PromotionCard({
  promotion,
  canRedeem = false,
  canUseVoucher = false,
  redeeming = false,
  onRedeem,
}) {
  return (
    <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={ui.pill}>{promotion.scope || "PROMOTION"}</span>
        <span className={ui.pill}>{formatDiscountTarget(promotion)}</span>
        {promotion.creditCost > 0 ? (
          <span className={ui.pill}>{promotion.creditCost} credit</span>
        ) : (
          <span className={ui.pill}>Direct code</span>
        )}
        {promotion.availableRedemptions > 0 ? (
          <span className={ui.pill}>{promotion.availableRedemptions} redeemed</span>
        ) : null}
      </div>

      <h2 className="mt-4 text-2xl font-semibold text-tea-900">
        {promotion.name || promotion.code}
      </h2>
      <p className="mt-2 text-base font-semibold text-matcha-700">
        {formatPromotionValue(promotion)}
      </p>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        {promotion.description || "Promotion details will be applied during checkout."}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-stone-600">
        <span>Code: {promotion.code || "N/A"}</span>
        {promotion.minOrderAmount > 0 ? (
          <span>Minimum order: {formatCurrency(promotion.minOrderAmount)}</span>
        ) : null}
        {promotion.maxDiscountAmount > 0 ? (
          <span>Maximum discount: {formatCurrency(promotion.maxDiscountAmount)}</span>
        ) : null}
        <span>
          Active: {formatDateTime(promotion.startsAt)} - {formatDateTime(promotion.endsAt)}
        </span>
        <span>Signature scope: valid across all stores, not store-specific.</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {canRedeem ? (
          <button
            className={ui.primaryButton}
            type="button"
            disabled={redeeming}
            onClick={() => onRedeem?.(promotion)}
          >
            {redeeming ? "Redeeming..." : `Redeem for ${promotion.creditCost} credit`}
          </button>
        ) : null}

        {canUseVoucher ? (
          <Link
            className={ui.secondaryButton}
            to={`/cart?promotion=${encodeURIComponent(promotion.code)}`}
          >
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
  const [redeemingPromotionId, setRedeemingPromotionId] = useState("");
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

  const redeemedVouchers = useMemo(
    () => promotions.filter((promotion) => Number(promotion.availableRedemptions ?? 0) > 0),
    [promotions],
  );
  const creditExchangeVouchers = useMemo(
    () =>
      promotions.filter(
        (promotion) =>
          Number(promotion.creditCost ?? 0) > 0 && Number(promotion.availableRedemptions ?? 0) <= 0,
      ),
    [promotions],
  );
  const directPromotions = useMemo(
    () => promotions.filter((promotion) => Number(promotion.creditCost ?? 0) <= 0),
    [promotions],
  );

  const handleRedeemVoucher = async (promotion) => {
    if (!promotion?.id) {
      return;
    }

    setRedeemingPromotionId(String(promotion.id));
    setError("");
    setNotice("");

    try {
      const response = await redeemUserVoucher(auth, promotion.id);
      await auth.refreshMe();
      const nextPromotions = await fetchUserVoucherCatalog(auth);
      setPromotions(nextPromotions);
      setNotice(response.message || `Redeemed voucher ${response.promotionCode}.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to redeem this voucher."));
    } finally {
      setRedeemingPromotionId("");
    }
  };

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Promotions</p>
        <h1 className={ui.bannerTitle}>Campaigns, voucher codes, and credit exchange</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          Browse active promotions, redeem credit-based vouchers, and jump straight into checkout
          with an eligible code.
        </p>

        {isUser ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Credit balance
              </p>
              <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                {Number(auth.user?.creditPoints ?? 0).toLocaleString("vi-VN")}
              </strong>
              <p className="mt-2 text-sm leading-6 text-stone-600">Available for voucher redemption.</p>
            </article>

            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Membership points
              </p>
              <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                {Number(auth.user?.membershipPoints ?? 0).toLocaleString("vi-VN")}
              </strong>
              <p className="mt-2 text-sm leading-6 text-stone-600">Used to determine your current tier.</p>
            </article>

            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Redeemed vouchers
              </p>
              <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                {redeemedVouchers.length.toLocaleString("vi-VN")}
              </strong>
              <p className="mt-2 text-sm leading-6 text-stone-600">Ready to apply at checkout.</p>
            </article>

            <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Credit exchange
              </p>
              <strong className="mt-3 block text-2xl font-semibold text-tea-900">
                {creditExchangeVouchers.length.toLocaleString("vi-VN")}
              </strong>
              <p className="mt-2 text-sm leading-6 text-stone-600">Voucher options available for redemption.</p>
            </article>
          </div>
        ) : null}

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

      {!loading && isUser ? (
        <>
          <section className={ui.panel}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Ready to use</p>
                <h2 className={ui.sectionTitle}>Redeemed vouchers in your account</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {redeemedVouchers.length ? (
                redeemedVouchers.map((promotion) => (
                  <PromotionCard
                    key={promotion.id || promotion.code}
                    promotion={promotion}
                    canUseVoucher
                  />
                ))
              ) : (
                <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600 lg:col-span-2">
                  You have not redeemed any credit-based voucher yet.
                </article>
              )}
            </div>
          </section>

          <section className={ui.panel}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Credit exchange</p>
                <h2 className={ui.sectionTitle}>Redeem vouchers with credit points</h2>
              </div>

              <Link className={ui.secondaryButton} to="/account/levels">
                View membership
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {creditExchangeVouchers.length ? (
                creditExchangeVouchers.map((promotion) => (
                  <PromotionCard
                    key={promotion.id || promotion.code}
                    promotion={promotion}
                    canRedeem
                    redeeming={redeemingPromotionId === String(promotion.id)}
                    onRedeem={handleRedeemVoucher}
                  />
                ))
              ) : (
                <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600 lg:col-span-2">
                  No credit-based vouchers are currently available for your account.
                </article>
              )}
            </div>
          </section>
        </>
      ) : null}

      {!loading ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>Promotion codes</p>
              <h2 className={ui.sectionTitle}>Direct campaigns currently available</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {directPromotions.length ? (
              directPromotions.map((promotion) => (
                <PromotionCard
                  key={promotion.id || promotion.code}
                  promotion={promotion}
                  canUseVoucher={Boolean(promotion.code)}
                />
              ))
            ) : (
              <article className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600 lg:col-span-2">
                No direct promotion code is available right now.
              </article>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
