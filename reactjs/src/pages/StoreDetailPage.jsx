import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import SmartImage from "../components/SmartImage";
import UserReviewForm from "../components/UserReviewForm";
import DetailLayout from "../components/templates/detail-layout";
import { Badge } from "../components/ui/badge";
import Button from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import { formatCurrencyVnd, formatDateTimeVn, formatNumberVi } from "../lib/locale";
import { fetchPublicStoreDetail } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { buildStoreEventsPath, buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatCompact(v) { return formatNumberVi(v); }
function formatPrice(v, display = "") { return display || formatCurrencyVnd(v); }
function formatDate(v, fallback) { return formatDateTimeVn(v, fallback).replace(/\sGMT\+7$/, ""); }
function formatServiceTag(tag) { return String(tag ?? "").replace(/[-_]+/g, " ").trim(); }

function formatStoreHours(store, t) {
  if (store?.hoursText) return store.hoursText;
  const open = String(store?.openTime ?? "").trim().slice(0, 5);
  const close = String(store?.closeTime ?? "").trim().slice(0, 5);
  if (open && close) return t("stores.detail.openHours", { open, close });
  return "";
}

function storeStatus(store, t) {
  if (store?.disabled) return store.disabledReason || t("stores.detail.temporarilyUnavailable");
  if (store?.open) return t("stores.serving");
  return t("stores.updating");
}

function StoreDetailSkeleton() {
  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-40" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="w-full shrink-0 lg:w-[45%]">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function StoreDetailPage() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const navigate = useNavigate();
  const { storeKey } = useParams();
  const { addToCart, isFavorite, toggleFavorite, getCurrentUserReview, submitReview, deleteReview } = useSiteData();

  const [expandedCategoryId, setExpandedCategoryId] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storeDetail, setStoreDetail] = useState(null);
  const eventsSectionRef = useRef(null);

  const loadStoreDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchPublicStoreDetail(storeKey, { lat: userLocation?.latitude, lng: userLocation?.longitude });
      setStoreDetail(response);
    } catch (err) {
      setError(err.message || t("stores.detail.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStoreDetail(); }, [storeKey, userLocation]);

  const store = storeDetail?.store ?? null;
  const storeHours = store ? formatStoreHours(store, t) : "";
  const stats = storeDetail?.stats ?? { averageRating: 0, reviewCount: 0, favoriteCount: 0, availableItemCount: 0 };
  const categories = storeDetail?.categories ?? [];
  const storeEvents = storeDetail?.events ?? [];
  const storeReviews = storeDetail?.reviews ?? [];

  useEffect(() => {
    if (!categories.length) { setExpandedCategoryId(""); return; }
    setExpandedCategoryId((cur) => categories.some((c) => c.id === cur) ? cur : categories[0].id);
  }, [categories]);

  useEffect(() => {
    if (!store?.slug || !storeKey || store.slug === storeKey) return;
    navigate(buildStorePath(store), { replace: true });
  }, [navigate, store, storeKey]);

  const locateStore = async () => {
    setLocating(true);
    setLocationMessage(t("stores.location.getting"));
    try {
      const loc = await requestCurrentLocation();
      setUserLocation(loc);
      setLocationMessage(t("stores.location.captured"));
    } catch (err) { setLocationMessage(err.message); }
    finally { setLocating(false); }
  };

  const handleUseAddress = async () => {
    setGeocoding(true);
    setLocationMessage(t("stores.location.lookingUp"));
    try {
      const loc = await geocodeAddress(addressQuery);
      setUserLocation(loc);
      setLocationMessage(t("stores.location.calculatingFrom", { label: loc.label }));
    } catch (err) { setLocationMessage(err.message); }
    finally { setGeocoding(false); }
  };

  const clearLocation = () => {
    setUserLocation(null);
    setAddressQuery("");
    setLocationMessage(t("stores.location.cleared"));
  };

  const handleQuickAddToCart = async (item) => {
    if (!store) return;
    if (auth.isAuthenticated && !auth.hasRole("USER")) { setCartMessage(t("stores.detail.userOnly")); return; }
    if (store.disabled) { setCartMessage(store.disabledReason || t("stores.detail.storeClosed")); return; }
    const availability = getCartAvailabilityDecision({ ...item, open: store.open, storeDisabled: store.disabled, disabledReason: store.disabledReason });
    if (!availability.allowed) { setCartMessage(availability.reason || t("stores.detail.itemUnavailable")); return; }
    const result = await addToCart({ itemId: item.id, storeId: store.id, quantity: 1 });
    setCartMessage(result.ok ? getCartSuccessMessage(availability.preorderOnly) : result.message);
  };

  const handleToggleFavorite = async () => {
    const result = await toggleFavorite("store", store.id);
    setActionMessage(result.message);
    if (result.ok) await loadStoreDetail();
  };

  const handleSubmitReview = async (payload) => {
    const result = await submitReview({ ...payload, targetType: "store", targetId: store.id });
    if (result.ok) await loadStoreDetail();
    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);
    if (result.ok) await loadStoreDetail();
    return result;
  };

  const jumpToEvents = () => eventsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) return <StoreDetailSkeleton />;

  if (error || !store) {
    return (
      <main className="bg-bg min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <p className={ui.eyebrow}>{t("stores.detail.eyebrow")}</p>
          <h1 className={ui.bannerTitle}>{t("stores.detail.notFound")}</h1>
          <p className={ui.copy + " mx-auto"}>{error || t("stores.detail.noData")}</p>
          <Link className={ui.secondaryButton + " mt-6 inline-flex"} to="/stores">{t("stores.detail.backToStores")}</Link>
        </div>
      </main>
    );
  }

  // ── gallery ─────────────────────────────────────────────────────────────────
  const galleryRegion = (
    <MediaLibrary
      images={store.imagePaths}
      alt={store.name}
      badge="Kamatcha"
      heroClassName="h-[22rem] sm:h-[30rem] rounded-xl overflow-hidden"
      thumbnailClassName="h-20"
    />
  );

  // ── sticky info rail ────────────────────────────────────────────────────────
  const infoRail = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant={store.disabled ? "ink" : "matcha"}>{storeStatus(store, t)}</Badge>
        {storeHours ? <Badge variant="beige">{storeHours}</Badge> : null}
        {typeof store.distanceKm === "number" ? <Badge variant="beige">{formatDistanceKm(store.distanceKm)}</Badge> : null}
      </div>

      <div className="flex flex-col gap-1 text-sm text-ink-700">
        {store.address ? <p><span className="font-semibold text-ink-900">{t("stores.detail.address")}: </span>{store.address}</p> : null}
        {store.area ? <p><span className="font-semibold text-ink-900">{t("stores.detail.area")}: </span>{store.area}</p> : null}
        {store.contactEmail ? <p><span className="font-semibold text-ink-900">{t("stores.detail.email")}: </span>{store.contactEmail}</p> : null}
        {store.phoneNumber ? <p><span className="font-semibold text-ink-900">{t("stores.detail.phone")}: </span>{store.phoneNumber}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={isFavorite("store", store.id) ? "primary" : "secondary"}
          size="sm"
          onClick={handleToggleFavorite}
        >
          {isFavorite("store", store.id) ? t("stores.detail.saved") : t("stores.detail.saveStore")}
        </Button>
        {storeEvents.length ? (
          <Button variant="secondary" size="sm" onClick={jumpToEvents}>{t("stores.detail.events")}</Button>
        ) : null}
        {storeEvents.length ? (
          <Link className={ui.ghostButton + " !text-sm"} to={buildStoreEventsPath(store)}>{t("stores.detail.viewSchedule")}</Link>
        ) : null}
      </div>

      {actionMessage ? <p className="text-xs text-ink-500">{actionMessage}</p> : null}
    </div>
  );

  // ── related / events carousel ───────────────────────────────────────────────
  const relatedRegion = storeEvents.length ? (
    <div ref={eventsSectionRef}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>{t("stores.detail.storeEvents")}</h2>
        <Link className={ui.ghostButton} to={buildStoreEventsPath(store)}>{t("stores.detail.viewSchedule")}</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {storeEvents.map((event) => (
          <article key={event.id} className="rounded-xl border border-ink-900/10 bg-cream-50 p-4 shadow-soft">
            <Link
              className="font-display text-sm font-semibold text-ink-900 hover:text-matcha-700 transition-colors line-clamp-2"
              to={buildEventPath(event)}
            >
              {event.title}
            </Link>
            {(event.schedule || event.location) ? (
              <p className="mt-1 text-xs text-ink-500">{event.schedule || event.location}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  ) : null;

  // ── breadcrumb ──────────────────────────────────────────────────────────────
  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm text-ink-500">
      <Link className="hover:text-matcha-700 transition-colors" to="/stores">{t("breadcrumb.store")}</Link>
      <span>/</span>
      <span className="text-ink-900 font-medium truncate max-w-[20ch]">{store.name}</span>
    </nav>
  );

  return (
    <main className="bg-bg min-h-screen pb-24 lg:pb-0">
      <DetailLayout breadcrumb={breadcrumb} gallery={galleryRegion} stickyBar={infoRail} related={relatedRegion}>
        <div className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <p className={ui.eyebrow}>{t("stores.detail.eyebrow")}</p>
            <h1 className={ui.bannerTitle}>{store.name}</h1>
            {store.positionLabel ? <p className="mt-2 text-base font-semibold text-matcha-700">{store.positionLabel}</p> : null}
            {store.personality ? <p className="mt-1 text-sm font-semibold text-ink-700">{store.personality}</p> : null}
            {store.specialty ? <p className="mt-1 text-sm text-matcha-700">{t("stores.detail.featured", { value: store.specialty })}</p> : null}
            <p className="mt-4 text-sm leading-7 text-ink-600">{store.description}</p>
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-2">
            {store.area ? <Badge variant="beige">{store.area}</Badge> : null}
            {storeHours ? <Badge variant="beige">{storeHours}</Badge> : null}
            {store.specialty ? <Badge variant="matcha">{t("stores.detail.featured", { value: store.specialty })}</Badge> : null}
            <Badge variant="beige">{t("stores.detail.saves", { count: formatCompact(stats.favoriteCount) })}</Badge>
            {store.serviceTags?.map((tag) => <Badge key={`${store.id}-${tag}`} variant="beige">{formatServiceTag(tag)}</Badge>)}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t("stores.detail.statRating"), value: stats.reviewCount ? `${stats.averageRating.toFixed(1)}★` : t("stores.detail.statNew") },
              { label: t("stores.detail.statReviews"), value: formatCompact(stats.reviewCount) },
              { label: t("stores.detail.statFavorites"), value: formatCompact(stats.favoriteCount) },
              { label: t("stores.detail.statItems"), value: formatCompact(stats.availableItemCount) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4 text-center">
                <strong className="block text-xl font-bold text-ink-900">{stat.value}</strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-ink-400">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Address detail cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t("stores.detail.address"), value: store.address },
              { label: t("stores.detail.area"), value: store.area },
              { label: t("stores.detail.statRating"), value: store.positionLabel },
              { label: t("nav.store"), value: storeHours },
              { label: store.personality && "Style", value: store.personality },
              { label: store.designSignature && "Design", value: store.designSignature },
              { label: store.franchiseMood && "Atmosphere", value: store.franchiseMood },
              { label: store.specialty && t("stores.detail.featured", { value: "" }).replace(": ", ""), value: store.specialty },
              { label: t("stores.detail.email"), value: store.contactEmail },
              { label: t("stores.detail.phone"), value: store.phoneNumber },
            ].filter((e) => e.value && e.label).map((entry) => (
              <div key={entry.label} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                <span className="block text-xs font-bold uppercase tracking-widest text-ink-400">{entry.label}</span>
                <strong className="mt-1 block text-sm leading-6 text-ink-900">{entry.value}</strong>
              </div>
            ))}
          </div>

          {/* Location lookup */}
          <DistanceOriginControls
            addressValue={addressQuery}
            onAddressChange={setAddressQuery}
            onUseAddress={handleUseAddress}
            onUseCurrentLocation={locateStore}
            onClearLocation={clearLocation}
            addressLoading={geocoding}
            currentLocationLoading={locating}
            hasLocation={Boolean(userLocation)}
          />
          {locationMessage ? <p className="text-sm text-ink-500">{locationMessage}</p> : null}

          {/* Content sections */}
          <ContentSectionsBlock
            sections={store.sections}
            eyebrow={t("stores.detail.storeStory")}
            title={t("stores.detail.moreAbout")}
            description={t("stores.detail.storeStoryBody")}
          />

          {/* Menu accordion */}
          {categories.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-ink-900">{t("stores.detail.menuAtStore")}</h2>
                <Badge variant="beige">{t("stores.detail.categories", { count: formatCompact(categories.length) })}</Badge>
              </div>
              {cartMessage ? <p className="mb-3 text-sm text-ink-500">{cartMessage}</p> : null}
              <div className="flex flex-col gap-2">
                {categories.map((category) => {
                  const isExpanded = expandedCategoryId === category.id;
                  return (
                    <section key={category.id} className="overflow-hidden rounded-xl border border-ink-900/10 bg-cream-50">
                      <button
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                        type="button"
                        onClick={() => setExpandedCategoryId((cur) => cur === category.id ? "" : category.id)}
                      >
                        <div>
                          <p className="font-display font-semibold text-ink-900">{category.title}</p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {t("stores.detail.itemsCount", { count: category.items.length })}
                            {category.reviewCount ? ` · ${category.averageRating.toFixed(1)}★` : ` · ${t("stores.detail.noReviewsYet")}`}
                          </p>
                          {category.description ? <p className="mt-1 text-xs text-ink-500 line-clamp-1">{category.description}</p> : null}
                        </div>
                        <Badge variant="matcha">{isExpanded ? t("stores.detail.collapse") : t("stores.detail.open")}</Badge>
                      </button>

                      {isExpanded ? (
                        <div className="flex flex-col gap-3 border-t border-ink-900/10 px-5 py-5">
                          {category.items.map((item) => {
                            const availability = getCartAvailabilityDecision({ ...item, open: store.open, storeDisabled: store.disabled, disabledReason: store.disabledReason });
                            return (
                              <article
                                key={item.id}
                                className={`grid gap-4 rounded-xl border p-4 sm:grid-cols-[100px_1fr] ${
                                  !availability.allowed ? "border-beige-300 bg-beige-100/50 opacity-70" : "border-ink-900/10 bg-cream-100"
                                }`}
                              >
                                <div className="overflow-hidden rounded-lg border border-ink-900/10 bg-beige-100">
                                  <SmartImage
                                    className="h-24 w-full object-cover"
                                    src={item.imagePaths?.[0]}
                                    alt={item.name}
                                    loading="lazy"
                                    fallbackClassName="grid h-24 w-full place-items-center bg-beige-100 text-xs text-ink-400"
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <h3 className="font-display text-sm font-semibold text-ink-900">{item.name}</h3>
                                        {item.franchiseRequired ? <Badge variant="beige">{t("stores.detail.required")}</Badge> : null}
                                        <Badge variant={availability.allowed ? "matcha" : "ink"}>
                                          {item.stock > 0 ? t("stores.detail.stockLeft", { count: item.stock }) : t("stores.detail.soldOut")}
                                        </Badge>
                                        {availability.preorderOnly ? <Badge variant="warn">{t("stores.detail.preorder")}</Badge> : null}
                                      </div>
                                      {item.note ? <p className="mt-0.5 text-xs text-ink-500">{item.note}</p> : null}
                                    </div>
                                    <strong className="text-sm font-bold text-matcha-700">{formatPrice(item.price, item.priceDisplay)}</strong>
                                  </div>
                                  {item.description ? <p className="text-xs text-ink-600 line-clamp-2">{item.description}</p> : null}
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => handleQuickAddToCart(item)} disabled={!availability.allowed}>
                                      {t("stores.detail.addToCart")}
                                    </Button>
                                    <Link className={ui.secondaryButton + " !text-xs !px-3 !py-2"} to={`/menu/${item.id}?store=${store.id}`}>
                                      {t("stores.detail.viewItem")}
                                    </Link>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Divider */}
          <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent" />

          {/* Reviews */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>{t("stores.detail.reviewsEyebrow")}</p>
                <h2 className={ui.sectionTitle}>{t("stores.detail.reviewsTitle")}</h2>
              </div>
              <Badge variant="beige">{t("stores.detail.reviewsCount", { count: formatCompact(storeReviews.length) })}</Badge>
            </div>

            <UserReviewForm
              title={t("stores.detail.writeReview")}
              existingReview={getCurrentUserReview("store", store.id)}
              canSubmit={auth.hasRole("USER")}
              onSubmit={handleSubmitReview}
              onDelete={handleDeleteReview}
            />

            {storeReviews.length ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {storeReviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-900">{review.title}</p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {review.userName || review.userEmail || "Kamatcha guest"} · {formatDate(review.createdAt, t("stores.detail.recentlyUpdated"))}
                        </p>
                      </div>
                      <Badge variant="matcha">{Number(review.rating).toFixed(1)}★</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-ink-600">{review.comment}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-center text-sm text-ink-400">
                {t("stores.detail.noReviewsEmpty")}
              </div>
            )}
          </section>
        </div>
      </DetailLayout>
    </main>
  );
}
