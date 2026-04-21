import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AutoCarousel from "../components/AutoCarousel";
import BrandLogo from "../components/BrandLogo";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
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
  const normalized = String(promotion?.scope ?? "ORDER").toUpperCase();

  if (normalized === "SHIP") {
    return "Shipping";
  }

  if (normalized === "DISH") {
    return "Dishes";
  }

  return "Order";
}

function statusLabel(store) {
  if (store?.disabled) {
    return store.disabledReason || "Temporarily unavailable";
  }

  if (store?.open) {
    return "Serving now";
  }

  return "Updating";
}

function getStoreHoursLabel(store) {
  if (String(store?.hours || "").trim()) {
    return store.hours;
  }

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
      description:
        "Your admin homepage provides quick access to operations, store management, and system analytics.",
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
      description:
        "Your manager homepage focuses on store operations and team management for your assigned location.",
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
      description:
        "Your homepage highlights the sections used most often after sign-in: account details, membership, and order history.",
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
      description:
        "This homepage now surfaces your operational context first, then keeps the public storefront below.",
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
      description:
        "This homepage points you directly to the delivery board and keeps your assigned store visible after login.",
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

        if (cancelled) {
          return;
        }

        setHomeData(homeResponse);
        setTopStores(
          homeResponse.featuredStores.length
            ? homeResponse.featuredStores
            : storesResponse.items,
        );
        setTopDishes(
          homeResponse.featuredDishes.length
            ? homeResponse.featuredDishes
            : dishesResponse.items,
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(requestError.message || "Unable to load the homepage.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHome();

    return () => {
      cancelled = true;
    };
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

  const overviewStats = useMemo(
    () => [
      { label: "Stores", value: topStores.length || 0, note: "currently active in the network" },
      {
        label: "Featured drinks",
        value: topDishes.length || 0,
        note: "pulled from the live signature catalog",
      },
      {
        label: "Store locations",
        value: locationHighlights.length || 0,
        note: "ready to support dine-in and delivery growth",
      },
      {
        label: "Latest news",
        value: latestNews.length || 0,
        note: "updated directly from backend publishing",
      },
      {
        label: "Campaigns",
        value: promotions.length || 0,
        note: "available vouchers and current promotions",
      },
    ],
    [latestNews.length, locationHighlights.length, promotions.length, topDishes.length, topStores.length],
  );

  const featuredStoreFacts = useMemo(
    () => [
      {
        label: "Hours",
        value: featuredStore ? getStoreHoursLabel(featuredStore) : "Daily service",
      },
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
      {
        label: "Specialty",
        value: featuredStore?.specialty || "Signature drinks",
      },
    ],
    [featuredStore],
  );

  const spotlightPromotion = promotions[0] ?? null;
  const spotlightNews = latestNews[0] ?? null;
  const spotlightEvent = upcomingEvents[0] ?? null;
  const supportingStores = topStores.slice(1, 4);
  const locationCards = locationHighlights.slice(0, 4);

  return (
    <main className={`${ui.page} relative pb-12`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-28 hidden h-px w-[118vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d7c3a0] to-transparent xl:block"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.92fr)]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,252,246,0.94),rgba(246,238,224,0.9))] p-6 shadow-[0_28px_80px_rgba(79,70,45,0.16)] sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="absolute -left-12 top-12 h-44 w-44 rounded-full bg-[#efe1bd]/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-8 right-0 h-56 w-56 rounded-full bg-matcha-200/35 blur-3xl"
          />

          <div className="relative z-10">
            <BrandLogo size="lg" subtitle="Calm tea spaces with consistent service" />

            <h1 className="mt-8 max-w-[8ch] text-[clamp(3.2rem,9vw,5.7rem)] font-bold leading-[0.92] tracking-[-0.06em] text-tea-900">
              Clean, calm, and consistent across every store.
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-stone-700 sm:text-[15px]">
              Kamatcha is a tea house network built around a required signature lineup, tidy store
              layouts, and a comfortable pace for longer stays. Each branch keeps its own local
              personality while staying visually and operationally aligned with the brand.
            </p>

            <div className="mt-8 rounded-[2rem] border border-matcha-900/10 bg-white/72 p-5 shadow-[0_18px_45px_rgba(79,70,45,0.08)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-tea-700">
                {roleHomePanel.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-tea-900 sm:text-[2rem]">
                {roleHomePanel.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{roleHomePanel.description}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {roleHomePanel.facts.map((fact) => (
                  <article
                    key={`${fact.label}-${fact.value}`}
                    className="rounded-[1.3rem] border border-matcha-900/10 bg-[#fbf6ed] px-4 py-3"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                      {fact.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-tea-900">{fact.value}</p>
                  </article>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
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

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {overviewStats.map((stat) => (
                <article
                  key={`${stat.label}-${stat.value}`}
                  className="rounded-[1.55rem] border border-matcha-900/10 bg-white/78 p-4"
                >
                  <strong className="block text-3xl font-bold tracking-tight text-tea-900">
                    {stat.value}
                  </strong>
                  <span className="mt-1 block text-sm font-semibold text-matcha-700">
                    {stat.label}
                  </span>
                  <p className="mt-2 text-xs leading-6 text-stone-500">{stat.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="relative overflow-hidden rounded-[2.5rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,251,245,0.94),rgba(244,236,223,0.92))] p-6 shadow-[0_28px_80px_rgba(79,70,45,0.16)] sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -right-8 top-10 h-36 w-36 rounded-full bg-[#efe1bd]/60 blur-3xl"
          />

          <div className="relative z-10 flex h-full flex-col gap-6">
            <div>
              <p className={ui.eyebrow}>Featured store</p>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="max-w-[14ch] text-3xl font-bold tracking-tight text-tea-900">
                    {featuredStore?.name ?? "Kamatcha flagship highlight"}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
                    {featuredStore?.description ||
                      "A rotating spotlight branch with backend-driven details, service status, and live media."}
                  </p>
                </div>

                <span className="inline-flex rounded-full border border-matcha-900/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-matcha-700">
                  {statusLabel(featuredStore)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(featuredStore?.serviceTags?.slice(0, 4) ?? []).map((tag) => (
                <span key={tag} className={ui.pill}>
                  {tag}
                </span>
              ))}
              {featuredStore?.positionLabel ? (
                <span className={ui.pill}>{featuredStore.positionLabel}</span>
              ) : null}
            </div>

            {featuredStore ? (
              <>
                <div className="relative overflow-hidden rounded-[2rem] border border-matcha-900/10 bg-white/70 p-4">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-6 left-0 w-4 rounded-r-full bg-[#a74428]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-6 right-0 w-4 rounded-l-full bg-[#a74428]"
                  />
                  <SmartImage
                    className="h-[22rem] w-full rounded-[1.45rem] object-cover"
                    src={featuredStoreImages[0]}
                    alt={featuredStore.name}
                    loading="lazy"
                    fallbackClassName="grid h-[22rem] w-full place-items-center rounded-[1.45rem] bg-stone-100 text-xs text-stone-500"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {featuredStoreFacts.map((fact) => (
                    <article
                      key={`${fact.label}-${fact.value}`}
                      className="rounded-[1.35rem] border border-matcha-900/10 bg-white/72 px-4 py-3"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                        {fact.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-tea-900">{fact.value}</p>
                    </article>
                  ))}
                </div>

                <div className="grid gap-2 text-sm leading-7 text-stone-600">
                  <span>Address: {featuredStore.address || "Not available"}</span>
                  <span>Area: {featuredStore.area || "Not available"}</span>
                  <span>
                    Suggested use: {featuredStore.personality || "Comfortable for repeat daily visits"}
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap gap-3">
                  <QuickFavoriteButton
                    targetType="store"
                    targetId={featuredStore.id}
                    activeLabel="Store saved"
                    inactiveLabel="Save store"
                    onResult={(message) => setFavoriteMessage(message)}
                  />
                  <Link className={ui.secondaryButton} to={buildStorePath(featuredStore)}>
                    View store
                  </Link>
                  <Link className={ui.secondaryButton} to="/stores">
                    Open all stores
                  </Link>
                </div>

                {favoriteMessage ? (
                  <p className="text-sm leading-7 text-stone-600">{favoriteMessage}</p>
                ) : null}
              </>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                No store data is available to show.
              </div>
            )}
          </div>
        </aside>
      </section>

      {error ? (
        <section className={`${ui.panel} border-dashed`}>
          <p className="text-sm leading-7 text-stone-600">{error}</p>
        </section>
      ) : null}

      {loading ? (
        <section className={`${ui.panel} border-dashed`}>
          <p className="text-sm leading-7 text-stone-600">Loading homepage...</p>
        </section>
      ) : null}

      {!loading ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
            <article className={`${ui.panel} relative overflow-hidden`}>
              <div
                aria-hidden="true"
                className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#efe1bd]/60 blur-3xl"
              />
              <div className="relative z-10">
                <p className={ui.eyebrow}>Campaign spotlight</p>
                <h2 className="max-w-[11ch] text-3xl font-bold leading-tight tracking-tight text-tea-900">
                  {spotlightPromotion?.name || "Promotions update live from checkout"}
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  {spotlightPromotion?.description ||
                    "Each promotion here is pulled from backend data and can be used directly during checkout when eligible."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {spotlightPromotion?.scope ? <span className={ui.pill}>{spotlightPromotion.scope}</span> : null}
                  {spotlightPromotion ? (
                    <span className={ui.pill}>{formatPromotionTarget(spotlightPromotion)}</span>
                  ) : null}
                  {Array.isArray(spotlightPromotion?.eligibleUserLevelIds) &&
                  spotlightPromotion.eligibleUserLevelIds.length ? (
                    <span className={ui.pill}>Membership checked at checkout</span>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/75 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                      Promo code
                    </p>
                    <p className="mt-2 text-lg font-semibold text-tea-900">
                      {spotlightPromotion?.code || "Available in checkout"}
                    </p>
                  </article>
                  <article className="rounded-[1.4rem] border border-matcha-900/10 bg-white/75 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                      Discount
                    </p>
                    <p className="mt-2 text-lg font-semibold text-matcha-700">
                      {spotlightPromotion ? formatPromotionValue(spotlightPromotion) : "Dynamic pricing"}
                    </p>
                  </article>
                </div>

                {promotions.length > 1 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {promotions.slice(1, 4).map((promotion) => (
                      <span key={promotion.id || promotion.code} className={ui.pill}>
                        {promotion.code}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link className={ui.primaryButton} to="/promotions">
                    Open promotions
                  </Link>
                  {spotlightPromotion?.code ? (
                    <Link
                      className={ui.secondaryButton}
                      to={`/cart?promotion=${encodeURIComponent(spotlightPromotion.code)}`}
                    >
                      Use at checkout
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>

            <article className={ui.panel}>
              <p className={ui.eyebrow}>Latest news</p>
              <h2 className="max-w-[11ch] text-3xl font-bold leading-tight tracking-tight text-tea-900">
                {spotlightNews?.title || "Fresh notes from the Kamatcha network"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {spotlightNews?.summary ||
                  "Publishing cards on the homepage stay connected to backend news so the landing page always has something current to read."}
              </p>

              <div className="mt-6 grid gap-3">
                {latestNews.slice(0, 3).map((newsItem) => {
                  const newsPath = buildNewsPath(newsItem);
                  const canOpenNews = newsPath !== "/news";

                  return (
                    <article
                      key={newsItem.id}
                      className="rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                        {newsItem.relatedStoreName || "Kamatcha update"}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-tea-900">
                        {newsItem.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{newsItem.summary}</p>
                      {canOpenNews ? (
                        <Link className="mt-3 inline-flex text-sm font-semibold text-matcha-700" to={newsPath}>
                          Read article
                        </Link>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </article>

            <article className={ui.panel}>
              <p className={ui.eyebrow}>Upcoming event</p>
              <h2 className="max-w-[12ch] text-3xl font-bold leading-tight tracking-tight text-tea-900">
                {spotlightEvent?.title || "Programs that keep the brand feeling active"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {spotlightEvent?.summary ||
                  "The homepage keeps event visibility high without turning the first screen into a crowded dashboard."}
              </p>

              <div className="mt-6 grid gap-3">
                <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                    Schedule
                  </p>
                  <p className="mt-2 text-sm font-semibold text-tea-900">
                    {spotlightEvent?.schedule || "Updated from backend events"}
                  </p>
                </article>
                <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                    Location
                  </p>
                  <p className="mt-2 text-sm font-semibold text-tea-900">
                    {spotlightEvent?.location || "Selected branches"}
                  </p>
                </article>
                <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                    Footprint
                  </p>
                  <p className="mt-2 text-sm font-semibold text-tea-900">
                    {locationHighlights.length} active store areas in the current dataset
                  </p>
                </article>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link className={ui.primaryButton} to="/events">
                  Open events
                </Link>
                <Link className={ui.secondaryButton} to="/stores">
                  View store map
                </Link>
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <article className={`${ui.panel} flex h-full flex-col justify-between`}>
              <div>
                <SectionIntro
                  eyebrow="Branch spotlight"
                  title="A premium store rail with room for each location's own character."
                  description="The homepage now treats stores like a curated rail instead of a flat grid, so the first impression feels more intentional and brand-led."
                  action={{ to: "/stores", label: "Open store directory" }}
                />

                <div className="mt-6 grid gap-3">
                  {supportingStores.length ? (
                    supportingStores.map((store) => (
                      <article
                        key={store.id}
                        className="rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold tracking-tight text-tea-900">
                              {store.name}
                            </p>
                            <p className="mt-1 text-sm text-stone-600">
                              {store.area || store.address || "Kamatcha branch"}
                            </p>
                          </div>
                          <span className={ui.pill}>{statusLabel(store)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="rounded-[1.35rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm text-stone-600">
                      Additional store highlights will appear here once the dataset is available.
                    </article>
                  )}
                </div>
              </div>

              {favoriteMessage ? (
                <p className="mt-6 text-sm leading-7 text-stone-600">{favoriteMessage}</p>
              ) : null}
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
                    <article className="grid w-full gap-5 rounded-[1.95rem] border border-matcha-900/10 bg-white/78 p-5 text-left shadow-[0_18px_44px_rgba(79,70,45,0.08)] lg:grid-cols-[1.02fr_0.98fr]">
                      <Link
                        className="overflow-hidden rounded-[1.6rem] border border-matcha-900/10 bg-stone-100"
                        to={buildStorePath(store)}
                      >
                        <SmartImage
                          className="h-80 w-full object-cover"
                          src={imagePaths[0]}
                          alt={store.name}
                          loading="lazy"
                          fallbackClassName="grid h-80 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                        />
                      </Link>

                      <div className="flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {store.positionLabel ? <span className={ui.pill}>{store.positionLabel}</span> : null}
                            <span className={ui.pill}>{statusLabel(store)}</span>
                          </div>

                          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-tea-900">
                            {store.name}
                          </h3>
                          <p className="mt-2 text-base font-semibold text-matcha-700">
                            {store.area || "Kamatcha branch"}
                          </p>
                          <p className="mt-4 text-sm leading-7 text-stone-600">
                            {store.description || "Backend store content will appear here once published."}
                          </p>
                        </div>

                        <div className="grid gap-2 text-sm text-stone-600">
                          <span>{store.address || "Address pending"}</span>
                          <span>{store.reviewCount || 0} reviews</span>
                          <span>{getStoreHoursLabel(store)}</span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <QuickFavoriteButton
                            targetType="store"
                            targetId={store.id}
                            activeLabel="Saved"
                            inactiveLabel="Save store"
                            onResult={(message) => setFavoriteMessage(message)}
                          />
                          <Link className={ui.secondaryButton} to={buildStorePath(store)}>
                            View store
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                }}
              />
            </section>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
            <section className={ui.panel}>
              <SectionIntro
                eyebrow="Signature drinks"
                title="The core menu still feels like a hero section, not a spreadsheet."
                description="Featured drinks stay tied to live backend data, while the presentation keeps the landing page feeling editorial and easier to scan."
                action={{ to: "/menu", label: "Browse menu" }}
              />

              {cartMessage ? (
                <p className="mt-4 text-sm leading-7 text-stone-600">{cartMessage}</p>
              ) : null}

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
                      <article className="grid w-full gap-5 rounded-[1.95rem] border border-matcha-900/10 bg-white/78 p-5 text-left shadow-[0_18px_44px_rgba(79,70,45,0.08)] lg:grid-cols-[0.98fr_1.02fr]">
                        <Link
                          className="overflow-hidden rounded-[1.6rem] border border-matcha-900/10 bg-stone-100"
                          to={`/menu/${item.id}`}
                        >
                          <SmartImage
                            className="h-80 w-full object-cover"
                            src={imagePaths[0]}
                            alt={item.name}
                            loading="lazy"
                            fallbackClassName="grid h-80 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                          />
                        </Link>

                        <div className="flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={ui.pill}>Core item</span>
                              {item.categoryName ? <span className={ui.pill}>{item.categoryName}</span> : null}
                              {item.franchiseRequired ? <span className={ui.pill}>Required line</span> : null}
                            </div>

                            <h3 className="mt-4 text-3xl font-semibold tracking-tight text-tea-900">
                              {item.name}
                            </h3>
                            <p className="mt-2 text-base font-semibold text-matcha-700">
                              {formatCurrency(item.price)}
                            </p>
                            <p className="mt-4 text-sm leading-7 text-stone-600">
                              {item.description || "Signature menu content will appear here once available."}
                            </p>
                          </div>

                          <div className="grid gap-2 text-sm text-stone-600">
                            <span>{item.reviewCount || 0} reviews</span>
                            <span>{item.favoriteCount || 0} saves</span>
                            {item.bestStore?.name ? <span>Recommended at {item.bestStore.name}</span> : null}
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
                                  ? availability.reason ||
                                    "This item cannot be added to the cart at the recommended store right now."
                                  : "No eligible store is currently available for adding this item to the cart."
                              }
                              onResult={(message) => setCartMessage(message)}
                            />
                            <QuickFavoriteButton
                              targetType="dish"
                              targetId={item.id}
                              activeLabel="Saved"
                              inactiveLabel="Save item"
                              onResult={(message) => setFavoriteMessage(message)}
                            />
                            <Link className={ui.secondaryButton} to={`/menu/${item.id}`}>
                              View item
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  }}
                />
              </div>
            </section>

            <section className={`${ui.panel} flex flex-col justify-between`}>
              <div>
                <SectionIntro
                  eyebrow="Store footprint"
                  title="Kamatcha stays legible by showing fewer locations at a time."
                  description="Instead of pushing every store into one dense block, the homepage now turns the footprint into a cleaner set of location cards."
                  action={{ to: "/stores", label: "View all locations" }}
                />

                <div className="mt-6 grid gap-3">
                  {locationCards.length ? (
                    locationCards.map((store) => (
                      <article
                        key={store.id}
                        className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold tracking-tight text-tea-900">
                              {store.area || store.name}
                            </p>
                            <p className="mt-1 text-sm text-stone-600">
                              {store.positionLabel || store.address || "Kamatcha branch"}
                            </p>
                          </div>
                          <span className={ui.pill}>{statusLabel(store)}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="rounded-[1.35rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm text-stone-600">
                      Location cards will appear here once the backend provides active store data.
                    </article>
                  )}
                </div>
              </div>

              {favoriteMessage ? (
                <p className="mt-6 text-sm leading-7 text-stone-600">{favoriteMessage}</p>
              ) : null}
            </section>
          </section>
        </>
      ) : null}
    </main>
  );
}
