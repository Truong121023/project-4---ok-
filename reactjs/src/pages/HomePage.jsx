import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AutoCarousel from "../components/AutoCarousel";
import BrandLogo from "../components/BrandLogo";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
import EditorialLayout from "../components/templates/editorial-layout";
import { useAuth } from "../context/AuthContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { normalizeImagePathList } from "../lib/images";
import { buildNewsPath } from "../lib/newsRouting";
import { fetchPublicDishes, fetchPublicHome, fetchPublicStores } from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function formatPromotionValue(promotion) {
  if (String(promotion?.discountType ?? "").toUpperCase() === "PERCENT") {
    return `${Number(promotion?.discountValue ?? 0).toLocaleString("en-US")}%`;
  }
  return formatCurrency(promotion?.discountValue ?? 0);
}

function formatPromotionTarget(promotion, t) {
  const normalized = String(promotion?.discountTarget ?? "ITEMS").toUpperCase();
  if (normalized === "SHIPPING") return t("home.campaign.targetShipping");
  if (normalized === "BOTH") return t("home.campaign.targetBoth");
  return t("home.campaign.targetItems");
}

function statusLabel(store, t) {
  if (store?.disabled) return store.disabledReason || t("stores.temporarilyUnavailable", t("stores.updating"));
  if (store?.open) return t("stores.serving");
  return t("stores.updating");
}

function getStoreHoursLabel(store, t) {
  if (String(store?.hours || "").trim()) return store.hours;
  if (String(store?.openTime || "").trim() && String(store?.closeTime || "").trim()) {
    return `${store.openTime} - ${store.closeTime}`;
  }
  return t("home.storesSection.fallbackBranch");
}

function buildRoleHomePanel(auth, operationHref, t) {
  if (!auth?.isAuthenticated) {
    return {
      eyebrow: t("home.rolePanel.guest.eyebrow"),
      title: t("home.rolePanel.guest.title"),
      description: t("home.rolePanel.guest.description"),
      facts: [
        { label: t("home.rolePanel.guest.labelMode"), value: t("home.rolePanel.guest.factMode") },
        { label: t("home.rolePanel.guest.labelAccess"), value: t("home.rolePanel.guest.factAccess") },
        { label: t("home.rolePanel.guest.labelNext"), value: t("home.rolePanel.guest.factNext") },
      ],
      actions: [
        { label: t("home.rolePanel.guest.ctaMenu"), to: "/menu", primary: true },
        { label: t("home.rolePanel.guest.ctaStores"), to: "/stores" },
        { label: t("home.rolePanel.guest.ctaSignIn"), to: "/login" },
      ],
    };
  }

  const displayName = auth.user?.fullName || auth.user?.email || t("home.rolePanel.default.factRoleFallback");
  const email = auth.user?.email || t("home.rolePanel.labels.noEmail");
  const workingStoreName = auth.user?.workingStoreName || t("home.rolePanel.labels.notAssigned");

  if (auth.hasRole("ADMIN")) {
    return {
      eyebrow: t("home.rolePanel.admin.eyebrow"),
      title: t("home.rolePanel.admin.title", { name: displayName }),
      description: t("home.rolePanel.admin.description"),
      facts: [
        { label: t("home.rolePanel.admin.labelRole"), value: t("home.rolePanel.admin.factRole") },
        { label: t("home.rolePanel.admin.labelAccount"), value: email },
        { label: t("home.rolePanel.admin.labelAccess"), value: t("home.rolePanel.admin.factAccess") },
      ],
      actions: [
        { to: "/admin", label: t("home.rolePanel.admin.ctaAdmin"), primary: true },
        { to: operationHref, label: t("home.rolePanel.admin.ctaOps") },
      ],
    };
  }

  if (auth.hasRole("MANAGER")) {
    return {
      eyebrow: t("home.rolePanel.manager.eyebrow"),
      title: t("home.rolePanel.manager.title", { name: displayName }),
      description: t("home.rolePanel.manager.description"),
      facts: [
        { label: t("home.rolePanel.manager.labelRole"), value: t("home.rolePanel.manager.factRole") },
        { label: t("home.rolePanel.manager.labelAccount"), value: email },
        { label: t("home.rolePanel.manager.labelStore"), value: workingStoreName },
      ],
      actions: [
        { to: "/admin", label: t("home.rolePanel.manager.ctaAdmin"), primary: true },
        { to: operationHref, label: t("home.rolePanel.manager.ctaOps") },
      ],
    };
  }

  if (auth.hasRole("USER")) {
    return {
      eyebrow: t("home.rolePanel.user.eyebrow"),
      title: t("home.rolePanel.user.title", { name: displayName }),
      description: t("home.rolePanel.user.description"),
      facts: [
        { label: t("home.rolePanel.user.labelRole"), value: t("home.rolePanel.user.factRole") },
        { label: t("home.rolePanel.user.labelAccount"), value: email },
        { label: t("home.rolePanel.user.labelFocus"), value: t("home.rolePanel.user.factFocus") },
      ],
      actions: [
        { label: t("home.rolePanel.user.ctaAccount"), to: "/account", primary: true },
        { label: t("home.rolePanel.user.ctaOrders"), to: "/orders" },
        { label: t("home.rolePanel.user.ctaMembership"), to: "/account/levels" },
      ],
    };
  }

  if (auth.hasRole("STAFF")) {
    return {
      eyebrow: t("home.rolePanel.staff.eyebrow"),
      title: t("home.rolePanel.staff.title", { name: displayName }),
      description: t("home.rolePanel.staff.description"),
      facts: [
        { label: t("home.rolePanel.staff.labelRole"), value: t("home.rolePanel.staff.factRole") },
        { label: t("home.rolePanel.staff.labelStore"), value: workingStoreName },
        { label: t("home.rolePanel.staff.labelFocus"), value: t("home.rolePanel.staff.factFocus") },
      ],
      actions: [
        { label: t("home.rolePanel.staff.ctaWorkspace"), to: "/employee", primary: true },
        { label: t("home.rolePanel.staff.ctaAccount"), to: "/account" },
      ],
    };
  }

  if (auth.hasRole("SHIPPER")) {
    return {
      eyebrow: t("home.rolePanel.shipper.eyebrow"),
      title: t("home.rolePanel.shipper.title", { name: displayName }),
      description: t("home.rolePanel.shipper.description"),
      facts: [
        { label: t("home.rolePanel.shipper.labelRole"), value: t("home.rolePanel.shipper.factRole") },
        { label: t("home.rolePanel.shipper.labelStore"), value: workingStoreName },
        { label: t("home.rolePanel.shipper.labelFocus"), value: t("home.rolePanel.shipper.factFocus") },
      ],
      actions: [
        { label: t("home.rolePanel.shipper.ctaWorkspace"), to: "/employee", primary: true },
        { label: t("home.rolePanel.shipper.ctaAccount"), to: "/account" },
      ],
    };
  }

  return {
    eyebrow: t("home.rolePanel.default.eyebrow"),
    title: t("home.rolePanel.default.title", { name: displayName }),
    description: t("home.rolePanel.default.description"),
    facts: [
      { label: t("home.rolePanel.default.labelRole"), value: auth.user?.role || t("home.rolePanel.default.factRoleFallback") },
      { label: t("home.rolePanel.default.labelAccount"), value: email },
    ],
    actions: [{ label: t("home.rolePanel.default.ctaAccount"), to: "/account", primary: true }],
  };
}

function SectionIntro({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className={ui.eyebrow}>{eyebrow}</p>
        <h2 className={ui.sectionTitle}>{title}</h2>
        {description ? <p className={ui.copy}>{description}</p> : null}
      </div>
      {action ? (
        <Link className={ui.secondaryButton} to={action.to}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const operationHref = useAdminOperationHref();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [homeData, setHomeData] = useState(null);
  const [topStores, setTopStores] = useState([]);
  const [topDishes, setTopDishes] = useState([]);
  const roleHomePanel = useMemo(
    () => buildRoleHomePanel(auth, operationHref, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, operationHref, t],
  );

  useEffect(() => {
    if (auth.isAuthenticated && auth.hasRole("ADMIN", "MANAGER")) {
      navigate("/admin", { replace: true });
    }
  }, [auth.isAuthenticated, auth, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      setLoading(true);
      setError("");

      try {
        const [homeResponse, storesResponse, dishesResponse] = await Promise.all([
          fetchPublicHome(),
          fetchPublicStores({ page: 0, size: 6, sort: "rating_desc" }),
          fetchPublicDishes({ page: 0, size: 6, sort: "top_rated", franchiseRequired: true }),
        ]);

        if (cancelled) return;

        setHomeData(homeResponse);
        setTopStores(
          homeResponse.featuredStores.length ? homeResponse.featuredStores : storesResponse.items,
        );
        setTopDishes(
          homeResponse.featuredDishes.length ? homeResponse.featuredDishes : dishesResponse.items,
        );
      } catch (requestError) {
        if (cancelled) return;
        setError(requestError.message || t("home.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHome();
    return () => { cancelled = true; };
  }, [t]);

  const featuredStore = topStores[0] ?? null;
  const featuredStoreImages = normalizeImagePathList(featuredStore?.imagePaths);
  const promotions = useMemo(() => homeData?.promotions ?? [], [homeData?.promotions]);
  const latestNews = useMemo(() => homeData?.latestNews ?? [], [homeData?.latestNews]);
  const upcomingEvents = useMemo(() => homeData?.upcomingEvents ?? [], [homeData?.upcomingEvents]);
  const locationHighlights = useMemo(
    () => (homeData?.storeLocations?.length ? homeData.storeLocations : topStores),
    [homeData?.storeLocations, topStores],
  );

  const featuredStoreFacts = useMemo(
    () => [
      { label: t("home.storesSection.eyebrow"), value: featuredStore ? getStoreHoursLabel(featuredStore, t) : t("home.storesSection.fallbackBranch") },
      {
        label: t("stores.detail.statReviews"),
        value: featuredStore?.reviewCount
          ? t("home.storesSection.reviewsCount", { count: formatCompactNumber(featuredStore.reviewCount) })
          : t("stores.detail.recentlyUpdated"),
      },
      {
        label: t("stores.detail.statRating"),
        value:
          featuredStore && Number(featuredStore.averageRating) > 0
            ? `${Number(featuredStore.averageRating).toFixed(1)} / 5`
            : t("stores.detail.recentlyUpdated"),
      },
      { label: "Specialty", value: featuredStore?.specialty || t("home.carousel.fallbackItemDesc") },
    ],
    [featuredStore, t],
  );

  const spotlightPromotion = promotions[0] ?? null;
  const spotlightNews = latestNews[0] ?? null;
  const spotlightEvent = upcomingEvents[0] ?? null;
  const supportingStores = topStores.slice(1, 4);
  const locationCards = locationHighlights.slice(0, 4);

  const heroContent = (
    <div className="relative mx-auto max-w-7xl">
      <p aria-hidden="true" className="mb-2 font-display text-3xl font-medium tracking-wider text-matcha-600/60">
        抹茶
      </p>
      <p className={ui.eyebrow}>{t("home.hero.eyebrow")}</p>
      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <BrandLogo size="lg" subtitle="Kamatcha" />
          <h1 className="mt-6 max-w-[16ch] font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-ink-900 sm:text-5xl lg:text-6xl">
            {t("home.hero.headline")}
          </h1>
          <p className="reveal-on-scroll mt-5 max-w-xl text-base leading-8 text-ink-600">
            {t("home.hero.subcopy")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className={ui.primaryButton} to="/menu">{t("home.hero.ctaMenu")}</Link>
            <Link className={ui.secondaryButton} to="/stores">{t("home.hero.ctaStore")}</Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-ink-900/10 pt-8">
            {[
              { value: topStores.length || "6", label: t("home.hero.statStores") },
              { value: topDishes.length || "12", label: t("home.hero.statItems") },
              { value: t("home.hero.statHeritageValue"), label: t("home.hero.statHeritage") },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-matcha-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream-100 lg:aspect-auto lg:h-80">
          {featuredStore && featuredStoreImages[0] ? (
            <SmartImage
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              src={featuredStoreImages[0]}
              alt={featuredStore.name || t("home.hero.fallbackLabel")}
              loading="eager"
              fallbackClassName="grid h-full w-full place-items-center bg-matcha-50 text-sm text-matcha-700"
            />
          ) : (
            <div className="grid h-full min-h-[300px] w-full place-items-center bg-gradient-to-br from-matcha-50 to-matcha-100">
              <div className="text-center">
                <p className="font-display text-5xl text-matcha-300">抹茶</p>
                <p className="mt-2 text-sm text-matcha-500">{t("home.hero.fallbackLabel")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <EditorialLayout hero={heroContent}>
      {/* Role-based panel */}
      <section className="rounded-xl border border-ink-900/10 bg-cream-50 p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className={ui.eyebrow}>{roleHomePanel.eyebrow}</p>
            <h2 className={ui.sectionTitle}>{roleHomePanel.title}</h2>
            <p className="mt-3 text-sm leading-7 text-ink-600">{roleHomePanel.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {roleHomePanel.actions.map((action) => (
              <Link
                key={action.to}
                className={action.primary ? ui.primaryButton : ui.secondaryButton}
                to={action.to}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {roleHomePanel.facts.map((fact) => (
            <article key={`${fact.label}-${fact.value}`} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">{fact.label}</p>
              <p className="mt-2 text-sm font-semibold text-ink-900">{fact.value}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Error / loading */}
      {error ? (
        <section className={`${ui.panel} border-dashed`}>
          <p className="text-sm leading-7 text-ink-600">{error}</p>
        </section>
      ) : null}
      {loading ? (
        <section className={`${ui.panel} border-dashed`}>
          <p className="text-sm leading-7 text-ink-600">{t("home.loading")}</p>
        </section>
      ) : null}

      {!loading ? (
        <>
          {/* Section divider */}
          <div className={ui.sectionDivider}><span>{t("home.divider.updates")}</span></div>

          {/* Spotlight 3-col */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Campaign */}
            <article className={`${ui.panel} relative overflow-hidden`}>
              <div className="relative z-10">
                <p className={ui.eyebrow}>{t("home.campaign.eyebrow")}</p>
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                  {spotlightPromotion?.name || t("home.campaign.fallbackTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink-600">
                  {spotlightPromotion?.description || t("home.campaign.fallbackDesc")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {spotlightPromotion?.scope ? <span className={ui.pill}>{spotlightPromotion.scope}</span> : null}
                  {spotlightPromotion ? <span className={ui.pill}>{formatPromotionTarget(spotlightPromotion, t)}</span> : null}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">{t("home.campaign.labelCode")}</p>
                    <p className="mt-2 text-base font-semibold text-ink-900">{spotlightPromotion?.code || t("home.campaign.fallbackCode")}</p>
                  </article>
                  <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">{t("home.campaign.labelDiscount")}</p>
                    <p className="mt-2 text-base font-semibold text-matcha-700">
                      {spotlightPromotion ? formatPromotionValue(spotlightPromotion) : t("home.campaign.fallbackDiscount")}
                    </p>
                  </article>
                </div>
                <div className="mt-5">
                  <Link className={ui.primaryButton} to="/promotions">{t("home.campaign.viewAll")}</Link>
                </div>
              </div>
            </article>

            {/* News */}
            <article className={ui.panel}>
              <p className={ui.eyebrow}>{t("home.news.eyebrow")}</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900">
                {spotlightNews?.title || t("home.news.fallbackTitle")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink-600">
                {spotlightNews?.summary || t("home.news.fallbackDesc")}
              </p>
              <div className="mt-5 grid gap-3">
                {latestNews.slice(0, 2).map((newsItem) => {
                  const newsPath = buildNewsPath(newsItem);
                  const canOpenNews = newsPath !== "/news";
                  return (
                    <article key={newsItem.id} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">
                        {newsItem.relatedStoreName || t("home.news.fallbackCategory")}
                      </p>
                      <h3 className="mt-2 font-semibold text-ink-900">{newsItem.title}</h3>
                      {canOpenNews ? (
                        <Link className="mt-2 inline-flex text-sm font-medium text-matcha-700 transition hover:text-matcha-500" to={newsPath}>
                          {t("home.news.readMore")}
                        </Link>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </article>

            {/* Events */}
            <article className={ui.panel}>
              <p className={ui.eyebrow}>{t("home.events.eyebrow")}</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900">
                {spotlightEvent?.title || t("home.events.fallbackTitle")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink-600">
                {spotlightEvent?.summary || t("home.events.fallbackDesc")}
              </p>
              <div className="mt-5 grid gap-3">
                <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">{t("home.events.labelSchedule")}</p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{spotlightEvent?.schedule || t("home.events.fallbackSchedule")}</p>
                </article>
                <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">{t("home.events.labelLocation")}</p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{spotlightEvent?.location || t("home.events.fallbackLocation")}</p>
                </article>
              </div>
              <div className="mt-5">
                <Link className={ui.primaryButton} to="/events">{t("home.events.viewEvents")}</Link>
              </div>
            </article>
          </section>

          {/* Section divider */}
          <div className={ui.sectionDivider}><span>{t("home.divider.stores")}</span></div>

          {/* Stores section */}
          <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <article className={`${ui.panel} flex h-full flex-col justify-between`}>
              <div>
                <SectionIntro
                  eyebrow={t("home.storesSection.eyebrow")}
                  title={t("home.storesSection.title")}
                  description={t("home.storesSection.description")}
                  action={{ to: "/stores", label: t("home.storesSection.allStores") }}
                />
                <div className="mt-6 grid gap-3">
                  {supportingStores.length ? (
                    supportingStores.map((store) => (
                      <article key={store.id} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink-900">{store.name}</p>
                            <p className="mt-1 text-sm text-ink-600">{store.area || store.address || t("home.storesSection.fallbackBranch")}</p>
                          </div>
                          <span className={ui.pill}>{statusLabel(store, t)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="rounded-xl border border-dashed border-beige-300 bg-cream-100/50 p-4 text-sm text-ink-600">
                      {t("home.storesSection.loadingStores")}
                    </article>
                  )}
                </div>
              </div>
            </article>

            <section className={ui.panel}>
              <AutoCarousel
                items={topStores}
                label="stores"
                getKey={(store) => store.id}
                autoMs={5000}
                renderSlide={(store) => {
                  const imagePaths = normalizeImagePathList(store.imagePaths);
                  return (
                    <article className="grid w-full gap-5 rounded-2xl border border-ink-900/10 bg-cream-100/80 p-5 text-left lg:grid-cols-2">
                      <Link className="group relative overflow-hidden rounded-xl" to={buildStorePath(store)}>
                        <SmartImage
                          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          src={imagePaths[0]}
                          alt={store.name}
                          loading="lazy"
                          fallbackClassName="grid aspect-[4/3] w-full place-items-center bg-matcha-50 text-sm text-matcha-500"
                        />
                      </Link>
                      <div className="flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {store.positionLabel ? <span className={ui.pill}>{store.positionLabel}</span> : null}
                            <span className={ui.pill}>{statusLabel(store, t)}</span>
                          </div>
                          <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">{store.name}</h3>
                          <p className="mt-2 text-sm font-medium text-matcha-700">{store.area || t("home.carousel.fallbackBranch")}</p>
                          <p className="mt-3 text-sm leading-7 text-ink-600">
                            {store.description || t("home.carousel.fallbackDesc")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-ink-500">
                          <span>{t("home.storesSection.reviewsCount", { count: store.reviewCount || 0 })}</span>
                          <span>{getStoreHoursLabel(store, t)}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <QuickFavoriteButton
                            targetType="store"
                            targetId={store.id}
                            activeLabel={t("home.carousel.savedStore")}
                            inactiveLabel={t("home.carousel.saveStore")}
                            onResult={(message) => setFavoriteMessage(message)}
                          />
                          <Link className={ui.secondaryButton} to={buildStorePath(store)}>{t("home.carousel.visitStore")}</Link>
                        </div>
                      </div>
                    </article>
                  );
                }}
              />
            </section>
          </section>

          {/* Section divider */}
          <div className={ui.sectionDivider}><span>{t("home.divider.featured")}</span></div>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className={ui.panel}>
              <SectionIntro
                eyebrow={t("home.menu.eyebrow")}
                title={t("home.menu.title")}
                description={t("home.menu.description")}
                action={{ to: "/menu", label: t("home.menu.viewMenu") }}
              />
              {cartMessage ? <p className="mt-4 text-sm leading-7 text-ink-600">{cartMessage}</p> : null}
              <div className="mt-6">
                <AutoCarousel
                  items={topDishes}
                  label="signature drinks"
                  getKey={(item) => item.id}
                  autoMs={5000}
                  renderSlide={(item) => {
                    const imagePaths = normalizeImagePathList(item.imagePaths);
                    const bestStoreId = item.bestStore?.storeId || item.bestStore?.id;
                    const availability = item.bestStore
                      ? getCartAvailabilityDecision(item.bestStore)
                      : { allowed: false, preorderOnly: false, reason: "" };
                    const canQuickAdd = Boolean(bestStoreId) && availability.allowed;

                    return (
                      <article className="grid w-full gap-5 rounded-2xl border border-ink-900/10 bg-cream-100/80 p-5 text-left lg:grid-cols-2">
                        <Link className="group relative overflow-hidden rounded-xl" to={`/menu/${item.id}`}>
                          <SmartImage
                            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            src={imagePaths[0]}
                            alt={item.name}
                            loading="lazy"
                            fallbackClassName="grid aspect-square w-full place-items-center bg-matcha-50 text-sm text-matcha-500"
                          />
                        </Link>
                        <div className="flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={ui.pill}>{t("home.carousel.ceremonialPill")}</span>
                              {item.categoryName ? <span className={ui.pill}>{item.categoryName}</span> : null}
                            </div>
                            <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">{item.name}</h3>
                            <p className={`mt-2 ${ui.price}`}>{formatCurrency(item.price)}</p>
                            <p className="mt-3 text-sm leading-7 text-ink-600">
                              {item.description || t("home.carousel.fallbackItemDesc")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-ink-500">
                            <span>{t("home.carousel.reviewsCount", { count: item.reviewCount || 0 })}</span>
                            <span>{t("home.carousel.savesCount", { count: item.favoriteCount || 0 })}</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <QuickAddToCartButton
                              className={ui.primaryButton}
                              dishId={item.id}
                              storeId={bestStoreId}
                              blocked={!canQuickAdd}
                              preorderOnly={availability.preorderOnly}
                              preorderMessage={getCartSuccessMessage(availability.preorderOnly)}
                              blockedMessage={
                                item.bestStore
                                  ? availability.reason || t("home.carousel.unavailableAtStore")
                                  : t("home.carousel.noStoreAvailable")
                              }
                              onResult={(message) => setCartMessage(message)}
                            />
                            <QuickFavoriteButton
                              targetType="dish"
                              targetId={item.id}
                              activeLabel={t("home.carousel.savedDish")}
                              inactiveLabel={t("home.carousel.saveDish")}
                              onResult={(message) => setFavoriteMessage(message)}
                            />
                            <Link className={ui.ghostButton} to={`/menu/${item.id}`}>{t("home.carousel.details")}</Link>
                          </div>
                        </div>
                      </article>
                    );
                  }}
                />
              </div>
            </section>

            {/* Store locations */}
            <section className={`${ui.panel} flex flex-col justify-between`}>
              <div>
                <SectionIntro
                  eyebrow={t("home.locations.eyebrow")}
                  title={t("home.locations.title")}
                  description={t("home.locations.description")}
                  action={{ to: "/stores", label: t("home.locations.allLocations") }}
                />
                <div className="mt-6 grid gap-3">
                  {locationCards.length ? (
                    locationCards.map((store) => (
                      <article key={store.id} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink-900">{store.area || store.name}</p>
                            <p className="mt-1 text-sm text-ink-600">{store.positionLabel || store.address || t("home.locations.fallbackBranch")}</p>
                          </div>
                          <span className={ui.pill}>{statusLabel(store, t)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="rounded-xl border border-dashed border-beige-300 bg-cream-100/50 p-4 text-sm text-ink-600">
                      {t("home.locations.loadingLocations")}
                    </article>
                  )}
                </div>
              </div>
              {favoriteMessage ? <p className="mt-6 text-sm leading-7 text-ink-600">{favoriteMessage}</p> : null}
            </section>
          </section>
        </>
      ) : null}
    </EditorialLayout>
  );
}
