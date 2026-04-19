import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";
import { fetchPublicHome, fetchUserVoucherCatalog, redeemUserVoucher } from "../lib/siteApi";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import EditorialLayout from "../components/templates/editorial-layout";
import { ui } from "../ui";

function formatCurrency(value) {
  return formatCurrencyVnd(value);
}

function formatDateTime(value) {
  return formatDateTimeVn(value, "No schedule");
}

function PromotionCard({ promotion, canRedeem = false, canUseVoucher = false, redeeming = false, onRedeem, t }) {
  function formatDiscountTarget(p) {
    const normalized = String(p?.discountTarget ?? "ITEMS").toUpperCase();
    if (normalized === "SHIPPING") return t("promotions.target.shipping");
    if (normalized === "BOTH") return t("promotions.target.both");
    return t("promotions.target.items");
  }

  function formatPromotionValue(p) {
    if (String(p?.discountType ?? "").toUpperCase() === "PERCENT") {
      return `${Number(p?.discountValue ?? 0).toLocaleString("vi-VN")}%`;
    }
    return formatCurrency(p?.discountValue ?? 0);
  }

  return (
    <article className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex flex-wrap items-center gap-2">
        <span className={ui.pill}>{promotion.scope || "PROMOTION"}</span>
        <span className={ui.pill}>{formatDiscountTarget(promotion)}</span>
        {promotion.creditCost > 0 ? (
          <span className={ui.pill}>{t("promotions.creditCost", { count: promotion.creditCost })}</span>
        ) : (
          <span className={ui.pill}>{t("promotions.directCode")}</span>
        )}
        {promotion.availableRedemptions > 0 ? (
          <span className={ui.pill}>{t("promotions.redeemed", { count: promotion.availableRedemptions })}</span>
        ) : null}
      </div>

      <h2 className="mt-4 font-display text-2xl font-semibold text-ink-900">
        {promotion.name || promotion.code}
      </h2>
      <p className="mt-2 text-base font-semibold text-matcha-700">{formatPromotionValue(promotion)}</p>
      <p className="mt-3 text-sm leading-7 text-ink-600">
        {promotion.description || t("promotions.defaultDescription")}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-ink-600">
        <span>{t("promotions.code", { value: promotion.code || "N/A" })}</span>
        {promotion.minOrderAmount > 0 ? (
          <span>{t("promotions.minOrder", { value: formatCurrency(promotion.minOrderAmount) })}</span>
        ) : null}
        {promotion.maxDiscountAmount > 0 ? (
          <span>{t("promotions.maxDiscount", { value: formatCurrency(promotion.maxDiscountAmount) })}</span>
        ) : null}
        <span>{t("promotions.active", { from: formatDateTime(promotion.startsAt), to: formatDateTime(promotion.endsAt) })}</span>
        <span>{t("promotions.signatureScope")}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {canRedeem ? (
          <button
            className={ui.primaryButton}
            type="button"
            disabled={redeeming}
            onClick={() => onRedeem?.(promotion)}
          >
            {redeeming ? t("promotions.redeeming") : t("promotions.redeemFor", { count: promotion.creditCost })}
          </button>
        ) : null}
        {canUseVoucher ? (
          <Link className={ui.secondaryButton} to={`/cart?promotion=${encodeURIComponent(promotion.code)}`}>
            {t("promotions.useAtCheckout")}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function PromotionsPage() {
  const { t } = useTranslation("menu");
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
        if (!cancelled) setPromotions(nextPromotions);
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, t("promotions.loadError")));
          setPromotions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPromotions();
    return () => { cancelled = true; };
  }, [auth, isUser, t]);

  const redeemedVouchers = useMemo(
    () => promotions.filter((p) => Number(p.availableRedemptions ?? 0) > 0),
    [promotions],
  );
  const creditExchangeVouchers = useMemo(
    () => promotions.filter((p) => Number(p.creditCost ?? 0) > 0 && Number(p.availableRedemptions ?? 0) <= 0),
    [promotions],
  );
  const directPromotions = useMemo(
    () => promotions.filter((p) => Number(p.creditCost ?? 0) <= 0),
    [promotions],
  );

  const handleRedeemVoucher = async (promotion) => {
    if (!promotion?.id) return;
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
      setError(getApiErrorMessage(requestError, t("promotions.redeemError")));
    } finally {
      setRedeemingPromotionId("");
    }
  };

  return (
    <EditorialLayout
      eyebrow={t("promotions.eyebrow")}
      kanji={t("promotions.kanji")}
      headline={t("promotions.title")}
      subcopy={t("promotions.subtitle")}
    >
      {/* User stats */}
      {isUser ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: t("promotions.stats.creditBalance"),
              value: Number(auth.user?.creditPoints ?? 0).toLocaleString("vi-VN"),
              note: t("promotions.stats.creditBalanceNote"),
            },
            {
              label: t("promotions.stats.membershipPoints"),
              value: Number(auth.user?.membershipPoints ?? 0).toLocaleString("vi-VN"),
              note: t("promotions.stats.membershipPointsNote"),
            },
            {
              label: t("promotions.stats.redeemedVouchers"),
              value: redeemedVouchers.length.toLocaleString("vi-VN"),
              note: t("promotions.stats.redeemedVouchersNote"),
            },
            {
              label: t("promotions.stats.creditExchange"),
              value: creditExchangeVouchers.length.toLocaleString("vi-VN"),
              note: t("promotions.stats.creditExchangeNote"),
            },
          ].map((stat) => (
            <article key={stat.label} className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink-500">{stat.label}</p>
              <strong className="mt-3 block font-display text-2xl font-semibold text-ink-900">{stat.value}</strong>
              <p className="mt-2 text-sm leading-6 text-ink-600">{stat.note}</p>
            </article>
          ))}
        </section>
      ) : null}

      {/* Notices */}
      {notice ? (
        <div className="rounded-xl border border-matcha-200 bg-matcha-50 px-4 py-3 text-sm text-matcha-700">{notice}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-sm text-ink-600">
          {t("promotions.loading")}
        </div>
      ) : null}

      {!loading && isUser ? (
        <>
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>{t("promotions.sections.readyEyebrow")}</p>
                <h2 className={ui.sectionTitle}>{t("promotions.sections.readyTitle")}</h2>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {redeemedVouchers.length ? (
                redeemedVouchers.map((promotion) => (
                  <PromotionCard key={promotion.id || promotion.code} promotion={promotion} canUseVoucher t={t} />
                ))
              ) : (
                <article className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-sm text-ink-600 lg:col-span-2">
                  {t("promotions.sections.noRedeemed")}
                </article>
              )}
            </div>
          </section>

          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>{t("promotions.sections.creditEyebrow")}</p>
                <h2 className={ui.sectionTitle}>{t("promotions.sections.creditTitle")}</h2>
              </div>
              <Link className={ui.secondaryButton} to="/account/levels">{t("promotions.sections.viewMembership")}</Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {creditExchangeVouchers.length ? (
                creditExchangeVouchers.map((promotion) => (
                  <PromotionCard
                    key={promotion.id || promotion.code}
                    promotion={promotion}
                    canRedeem
                    redeeming={redeemingPromotionId === String(promotion.id)}
                    onRedeem={handleRedeemVoucher}
                    t={t}
                  />
                ))
              ) : (
                <article className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-sm text-ink-600 lg:col-span-2">
                  {t("promotions.sections.noCredit")}
                </article>
              )}
            </div>
          </section>
        </>
      ) : null}

      {!loading ? (
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>{t("promotions.sections.directEyebrow")}</p>
              <h2 className={ui.sectionTitle}>{t("promotions.sections.directTitle")}</h2>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {directPromotions.length ? (
              directPromotions.map((promotion) => (
                <PromotionCard
                  key={promotion.id || promotion.code}
                  promotion={promotion}
                  canUseVoucher={Boolean(promotion.code)}
                  t={t}
                />
              ))
            ) : (
              <article className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-sm text-ink-600 lg:col-span-2">
                {t("promotions.sections.noDirect")}
              </article>
            )}
          </div>
        </section>
      ) : null}
    </EditorialLayout>
  );
}
