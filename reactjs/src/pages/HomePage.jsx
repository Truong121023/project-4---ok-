import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

function formatPromotionTarget(promotion) {
  const normalized = String(promotion?.discountTarget ?? "ITEMS").toUpperCase();
  if (normalized === "SHIPPING") return "Shipping fee";
  if (normalized === "BOTH") return "Items + shipping";
  return "Signature items";
}

function statusLabel(store) {
  if (store?.disabled) return store.disabledReason || "Temporarily unavailable";
  if (store?.open) return "Serving now";
  return "Updating";
}

function getStoreHoursLabel(store) {
  if (String(store?.hours || "").trim()) return store.hours;
  if (String(store?.openTime || "").trim() && String(store?.closeTime || "").trim()) {
    return `${store.openTime} - ${store.closeTime}`;
  }
  return "Daily service";
}

function buildRoleHomePanel(auth, operationHref) {
  if (!auth?.isAuthenticated) {
    return {
      eyebrow: "Guest home",
      title: "Browse the core menu before you sign in.",
      description:
        "Explore stores, check current campaigns, and create an account when you are ready to save favorites and complete checkout faster.",
      facts: [
        { label: "Mode", value: "Guest browsing" },
        { label: "Access", value: "Menu, stores, news, promotions" },
        { label: "Best next step", value: "Sign in for faster checkout" },
      ],
      actions: [
        { label: "Browse menu", to: "/menu", primary: true },
        { label: "Explore stores", to: "/stores" },
        { label: "Sign in", to: "/login" },
      ],
    };
  }

  const displayName = auth.user?.fullName || auth.user?.email || "Account";
  const email = auth.user?.email || "No email available";
  const workingStoreName = auth.user?.workingStoreName || "Not assigned";

  if (auth.hasRole("ADMIN")) {
    return {
      eyebrow: "Admin home",
      title: `Welcome back, ${displayName}.`,
      description: "Your admin homepage provides quick access to operations, store management, and system analytics.",
      facts: [
        { label: "Role", value: "Administrator" },
        { label: "Account", value: email },
        { label: "Access", value: "Full system control" },
      ],
      actions: [
        { to: "/admin", label: "Go to admin panel", primary: true },
        { to: operationHref, label: "Operations" },
      ],
    };
  }

  if (auth.hasRole("MANAGER")) {
    return {
      eyebrow: "Manager home",
      title: `Welcome back, ${displayName}.`,
      description: "Your manager homepage focuses on store operations and team management for your assigned location.",
      facts: [
        { label: "Role", value: "Manager" },
        { label: "Account", value: email },
        { label: "Store", value: workingStoreName },
      ],
      actions: [
        { to: "/admin", label: "Go to manager panel", primary: true },
        { to: operationHref, label: "Operations" },
      ],
    };
  }

  if (auth.hasRole("USER")) {
    return {
      eyebrow: "User home",
      title: `Welcome back, ${displayName}.`,
      description: "Your homepage highlights the sections used most often after sign-in: account details, membership, and order history.",
      facts: [
        { label: "Role", value: "User" },
        { label: "Account", value: email },
        { label: "Focus", value: "Orders, favorites, membership" },
      ],
      actions: [
        { label: "Open account", to: "/account", primary: true },
        { label: "Order history", to: "/orders" },
        { label: "Membership", to: "/account/levels" },
      ],
    };
  }

  if (auth.hasRole("STAFF")) {
    return {
      eyebrow: "Staff home",
      title: `Staff workspace for ${displayName}.`,
      description: "This homepage now surfaces your operational context first, then keeps the public storefront below.",
      facts: [
        { label: "Role", value: "Staff" },
        { label: "Working store", value: workingStoreName },
        { label: "Focus", value: "Preparing and handling live orders" },
      ],
      actions: [
        { label: "Open workspace", to: "/employee", primary: true },
        { label: "Account", to: "/account" },
      ],
    };
  }

  if (auth.hasRole("SHIPPER")) {
    return {
      eyebrow: "Shipper home",
      title: `Delivery workspace for ${displayName}.`,
      description: "This homepage points you directly to the delivery board and keeps your assigned store visible after login.",
      facts: [
        { label: "Role", value: "Shipper" },
        { label: "Working store", value: workingStoreName },
        { label: "Focus", value: "Delivery tasks and proof upload" },
      ],
      actions: [
        { label: "Open workspace", to: "/employee", primary: true },
        { label: "Account", to: "/account" },
      ],
    };
  }

  return {
    eyebrow: "Account home",
    title: `Signed in as ${displayName}.`,
    description: "This homepage now shows a role-aware entry block before the public storefront content.",
    facts: [
      { label: "Role", value: auth.user?.role || "Account" },
      { label: "Account", value: email },
    ],
    actions: [{ label: "Open account", to: "/account", primary: true }],
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
    () => buildRoleHomePanel(auth, operationHref),
    [auth, operationHref],
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
        setError(requestError.message || "Unable to load the homepage.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHome();
    return () => { cancelled = true; };
  }, []);

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
      { label: "Hours", value: featuredStore ? getStoreHoursLabel(featuredStore) : "Daily service" },
      {
        label: "Reviews",
        value: featuredStore?.reviewCount
          ? `${formatCompactNumber(featuredStore.reviewCount)} reviews`
          : "Freshly updated",
      },
      {
        label: "Rating",
        value:
          featuredStore && Number(featuredStore.averageRating) > 0
            ? `${Number(featuredStore.averageRating).toFixed(1)} / 5`
            : "Consistent service",
      },
      { label: "Specialty", value: featuredStore?.specialty || "Signature drinks" },
    ],
    [featuredStore],
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
      <p className={ui.eyebrow}>Premium Ceremonial Matcha</p>
      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <BrandLogo size="lg" subtitle="Kamatcha" />
          <h1 className="mt-6 max-w-[16ch] font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-ink-900 sm:text-5xl lg:text-6xl">
            Sourced from Uji, Kyoto
          </h1>
          <p className="reveal-on-scroll mt-5 max-w-xl text-base leading-8 text-ink-600">
            Kamatcha brings you authentic ceremonial-grade matcha, crafted with centuries of tradition.
            Experience the art of tea in our calm, minimalist spaces.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className={ui.primaryButton} to="/menu">Explore Collection</Link>
            <Link className={ui.secondaryButton} to="/stores">Visit Store</Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-ink-900/10 pt-8">
            {[
              { value: topStores.length || "6", label: "Stores" },
              { value: topDishes.length || "12", label: "Signature Items" },
              { value: "Since 1832", label: "Heritage" },
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
              alt={featuredStore.name || "Premium Matcha"}
              loading="eager"
              fallbackClassName="grid h-full w-full place-items-center bg-matcha-50 text-sm text-matcha-700"
            />
          ) : (
            <div className="grid h-full min-h-[300px] w-full place-items-center bg-gradient-to-br from-matcha-50 to-matcha-100">
              <div className="text-center">
                <p className="font-display text-5xl text-matcha-300">抹茶</p>
                <p className="mt-2 text-sm text-matcha-500">Premium Matcha</p>
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
          <p className="text-sm leading-7 text-ink-600">Loading homepage...</p>
        </section>
      ) : null}

      {!loading ? (
        <>
          {/* Section divider */}
          <div className={ui.sectionDivider}><span>Latest Updates</span></div>

          {/* Spotlight 3-col */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Campaign */}
            <article className={`${ui.panel} relative overflow-hidden`}>
              <div className="relative z-10">
                <p className={ui.eyebrow}>Campaign</p>
                <h2 className="font-display text-2xl font-semibold text-ink-900">
                  {spotlightPromotion?.name || "Current Promotions"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink-600">
                  {spotlightPromotion?.description || "Special offers available at checkout."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {spotlightPromotion?.scope ? <span className={ui.pill}>{spotlightPromotion.scope}</span> : null}
                  {spotlightPromotion ? <span className={ui.pill}>{formatPromotionTarget(spotlightPromotion)}</span> : null}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">Code</p>
                    <p className="mt-2 text-base font-semibold text-ink-900">{spotlightPromotion?.code || "At checkout"}</p>
                  </article>
                  <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">Discount</p>
                    <p className="mt-2 text-base font-semibold text-matcha-700">
                      {spotlightPromotion ? formatPromotionValue(spotlightPromotion) : "Dynamic"}
                    </p>
                  </article>
                </div>
                <div className="mt-5">
                  <Link className={ui.primaryButton} to="/promotions">View All</Link>
                </div>
              </div>
            </article>

            {/* News */}
            <article className={ui.panel}>
              <p className={ui.eyebrow}>News</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900">
                {spotlightNews?.title || "Latest Updates"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink-600">
                {spotlightNews?.summary || "Stay connected with Kamatcha."}
              </p>
              <div className="mt-5 grid gap-3">
                {latestNews.slice(0, 2).map((newsItem) => {
                  const newsPath = buildNewsPath(newsItem);
                  const canOpenNews = newsPath !== "/news";
                  return (
                    <article key={newsItem.id} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">
                        {newsItem.relatedStoreName || "Update"}
                      </p>
                      <h3 className="mt-2 font-semibold text-ink-900">{newsItem.title}</h3>
                      {canOpenNews ? (
                        <Link className="mt-2 inline-flex text-sm font-medium text-matcha-700 transition hover:text-matcha-500" to={newsPath}>
                          Read more →
                        </Link>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </article>

            {/* Events */}
            <article className={ui.panel}>
              <p className={ui.eyebrow}>Events</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900">
                {spotlightEvent?.title || "Upcoming Events"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink-600">
                {spotlightEvent?.summary || "Join us for special experiences."}
              </p>
              <div className="mt-5 grid gap-3">
                <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">Schedule</p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{spotlightEvent?.schedule || "Coming soon"}</p>
                </article>
                <article className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-matcha-600">Location</p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">{spotlightEvent?.location || "Select stores"}</p>
                </article>
              </div>
              <div className="mt-5">
                <Link className={ui.primaryButton} to="/events">View Events</Link>
              </div>
            </article>
          </section>

          {/* Section divider */}
          <div className={ui.sectionDivider}><span>Our Stores</span></div>

          {/* Stores section */}
          <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <article className={`${ui.panel} flex h-full flex-col justify-between`}>
              <div>
                <SectionIntro
                  eyebrow="Locations"
                  title="Carefully curated spaces."
                  description="Each store is designed to bring tranquility to your day."
                  action={{ to: "/stores", label: "All Stores" }}
                />
                <div className="mt-6 grid gap-3">
                  {supportingStores.length ? (
                    supportingStores.map((store) => (
                      <article key={store.id} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink-900">{store.name}</p>
                            <p className="mt-1 text-sm text-ink-600">{store.area || store.address || "Kamatcha branch"}</p>
                          </div>
                          <span className={ui.pill}>{statusLabel(store)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="rounded-xl border border-dashed border-beige-300 bg-cream-100/50 p-4 text-sm text-ink-600">
                      Store listings loading...
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
                            <span className={ui.pill}>{statusLabel(store)}</span>
                          </div>
                          <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">{store.name}</h3>
                          <p className="mt-2 text-sm font-medium text-matcha-700">{store.area || "Kamatcha branch"}</p>
                          <p className="mt-3 text-sm leading-7 text-ink-600">
                            {store.description || "A peaceful space for your daily matcha ritual."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-ink-500">
                          <span>{store.reviewCount || 0} reviews</span>
                          <span>{getStoreHoursLabel(store)}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <QuickFavoriteButton
                            targetType="store"
                            targetId={store.id}
                            activeLabel="Saved"
                            inactiveLabel="Save"
                            onResult={(message) => setFavoriteMessage(message)}
                          />
                          <Link className={ui.secondaryButton} to={buildStorePath(store)}>Visit Store</Link>
                        </div>
                      </div>
                    </article>
                  );
                }}
              />
            </section>
          </section>

          {/* Section divider */}
          <div className={ui.sectionDivider}><span>Featured Selection</span></div>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className={ui.panel}>
              <SectionIntro
                eyebrow="Signature Collection"
                title="Premium ceremonial matcha and artisan blends."
                description="Each item is crafted with care, sourced from the finest tea gardens in Kyoto."
                action={{ to: "/menu", label: "View Menu" }}
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
                              <span className={ui.pill}>Ceremonial</span>
                              {item.categoryName ? <span className={ui.pill}>{item.categoryName}</span> : null}
                            </div>
                            <h3 className="mt-4 font-display text-2xl font-semibold text-ink-900">{item.name}</h3>
                            <p className={`mt-2 ${ui.price}`}>{formatCurrency(item.price)}</p>
                            <p className="mt-3 text-sm leading-7 text-ink-600">
                              {item.description || "Premium grade matcha from Kyoto."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-ink-500">
                            <span>{item.reviewCount || 0} reviews</span>
                            <span>{item.favoriteCount || 0} saves</span>
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
                                  ? availability.reason || "Currently unavailable at this store."
                                  : "No store available."
                              }
                              onResult={(message) => setCartMessage(message)}
                            />
                            <QuickFavoriteButton
                              targetType="dish"
                              targetId={item.id}
                              activeLabel="Saved"
                              inactiveLabel="Save"
                              onResult={(message) => setFavoriteMessage(message)}
                            />
                            <Link className={ui.ghostButton} to={`/menu/${item.id}`}>Details →</Link>
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
                  eyebrow="Store Locations"
                  title="Find your nearest Kamatcha."
                  description="Visit us at any of our carefully designed spaces."
                  action={{ to: "/stores", label: "All Locations" }}
                />
                <div className="mt-6 grid gap-3">
                  {locationCards.length ? (
                    locationCards.map((store) => (
                      <article key={store.id} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink-900">{store.area || store.name}</p>
                            <p className="mt-1 text-sm text-ink-600">{store.positionLabel || store.address || "Kamatcha branch"}</p>
                          </div>
                          <span className={ui.pill}>{statusLabel(store)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="rounded-xl border border-dashed border-beige-300 bg-cream-100/50 p-4 text-sm text-ink-600">
                      Store locations loading...
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
