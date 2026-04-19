import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DistanceOriginControls from "../components/DistanceOriginControls";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import CatalogLayout from "../components/templates/catalog-layout";
import { Badge } from "../components/ui/badge";
import Button from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { calculateDistanceKm, formatDistanceKm } from "../lib/demoCatalog";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { fetchPublicStores } from "../lib/siteApi";
import { buildStoreEventsPath, buildStorePath } from "../lib/storeRouting";
import { dateFromTimeValue, getCurrentTimeValue, isStoreOpenAt } from "../lib/timeFilters";
import { translateDisabledReason } from "../lib/uiText";
import { ui } from "../ui";

function formatCompact(v) { return Number(v ?? 0).toLocaleString("vi-VN"); }
function formatServiceTag(tag) { return String(tag ?? "").replace(/[-_]+/g, " ").trim(); }

function resolveDistanceKm(store, userLocation) {
  if (typeof store.distanceKm === "number") return store.distanceKm;
  return calculateDistanceKm(userLocation, store);
}

function availabilityLabel(store, t) {
  if (store.disabled) return translateDisabledReason(store.disabledReason);
  if (store.open) return t("stores.serving");
  return t("stores.updating");
}

function mapSortKey(sortKey) {
  switch (sortKey) {
    case "rating-asc": return "rating_asc";
    case "distance-asc": return "distance_asc";
    case "name-asc": return "name_asc";
    default: return "rating_desc";
  }
}

function StoreSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border border-ink-900/10 bg-cream-50 p-4 shadow-soft">
          <Skeleton className="h-44 w-full rounded-lg mb-3" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function StoreCard({ store, onFavoriteMessage, hasUserLocation, t }) {
  const img = store.imagePaths?.[0];
  const isDisabled = store.disabled;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(img) && !imgFailed;
  const showDistance = hasUserLocation && typeof store.resolvedDistanceKm === "number";

  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border bg-cream-50 shadow-soft transition-shadow duration-300 hover:shadow-lift ${isDisabled ? "border-beige-300 opacity-80" : "border-ink-900/10"}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-beige-100">
        {showImage ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-400 text-xs">{t("stores.noImage")}</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1 flex-wrap">
          {store.area ? <Badge variant="beige">{store.area}</Badge> : null}
          <Badge variant={isDisabled ? "ink" : "matcha"}>{availabilityLabel(store, t)}</Badge>
        </div>
        {showDistance ? (
          <div className="absolute right-2 bottom-2">
            <Badge variant="beige">{formatDistanceKm(store.resolvedDistanceKm)}</Badge>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="font-display text-base font-semibold leading-snug text-ink-900 line-clamp-1">
            {store.name}
          </h2>
          {store.address ? (
            <p className="mt-0.5 text-xs text-matcha-700 font-medium line-clamp-1">{store.address}</p>
          ) : null}
          {store.hoursText ? (
            <p className="mt-0.5 text-xs text-ink-500">{store.hoursText}</p>
          ) : null}
        </div>

        {store.description ? (
          <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed">{store.description}</p>
        ) : null}

        {/* Stats row */}
        <div className="flex gap-3 text-xs text-ink-500">
          {store.reviewCount ? (
            <span>{store.averageRating?.toFixed(1)}★ ({formatCompact(store.reviewCount)})</span>
          ) : (
            <span>{t("stores.noReviews")}</span>
          )}
          <span>·</span>
          <span>{t("stores.items", { count: formatCompact(store.availableItemCount ?? 0) })}</span>
        </div>

        {/* Service tags */}
        {store.serviceTags?.length ? (
          <div className="flex flex-wrap gap-1">
            {store.serviceTags.slice(0, 3).map((tag) => (
              <Badge key={`${store.id}-${tag}`} variant="beige">{formatServiceTag(tag)}</Badge>
            ))}
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link className={ui.primaryButton + " !text-xs !px-3 !py-2"} to={buildStorePath(store)}>
            {t("stores.viewStore")}
          </Link>
          <QuickFavoriteButton
            targetType="store"
            targetId={store.id}
            activeLabel={t("stores.saved")}
            inactiveLabel={t("stores.save")}
            onResult={onFavoriteMessage}
          />
          <Link className={ui.ghostButton + " !text-xs !px-3 !py-2"} to={buildStoreEventsPath(store)}>
            {t("stores.events")}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function StoresPage() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [sortKey, setSortKey] = useState("rating-desc");
  const [minimumStars, setMinimumStars] = useState("all");
  const [timeFilterMode, setTimeFilterMode] = useState("all");
  const [customTime, setCustomTime] = useState(getCurrentTimeValue());
  const [addressQuery, setAddressQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stores, setStores] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicStores({
          search: searchValue.trim() || undefined,
          sort: mapSortKey(sortKey),
          minRating: minimumStars === "all" ? undefined : minimumStars,
          lat: userLocation?.latitude,
          lng: userLocation?.longitude,
          page: 0,
          size: 100,
        });
        if (!cancelled) setStores(response.items);
      } catch (err) {
        if (!cancelled) setError(err.message || t("stores.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStores();
    return () => { cancelled = true; };
  }, [location, minimumStars, searchValue, sortKey, userLocation, t]);

  const storesWithDistance = useMemo(
    () => stores.map((s) => ({ ...s, resolvedDistanceKm: resolveDistanceKm(s, userLocation) })),
    [stores, userLocation],
  );

  const filteredStores = useMemo(() => {
    if (timeFilterMode === "all") return storesWithDistance;
    const targetDate = timeFilterMode === "now" ? new Date() : dateFromTimeValue(customTime, new Date());
    return storesWithDistance.filter((s) => isStoreOpenAt(s, targetDate));
  }, [customTime, storesWithDistance, timeFilterMode]);

  const nearestStore = useMemo(() => {
    const aware = filteredStores.filter((s) => typeof s.resolvedDistanceKm === "number");
    if (!aware.length) return null;
    return [...aware].sort((a, b) => a.resolvedDistanceKm - b.resolvedDistanceKm)[0];
  }, [filteredStores]);

  const locateNearestStore = async () => {
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

  const filterRail = (
    <div className="flex flex-col gap-5">
      <div>
        <p className={ui.eyebrow}>{t("stores.filters.search")}</p>
        <input
          className={ui.input}
          type="text"
          placeholder={t("stores.filters.searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div>
        <p className={ui.eyebrow}>{t("stores.filters.sortBy")}</p>
        <select className={ui.input} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="rating-desc">{t("stores.filters.sortHighestRated")}</option>
          <option value="rating-asc">{t("stores.filters.sortLowestRated")}</option>
          <option value="distance-asc">{t("stores.filters.sortNearest")}</option>
          <option value="name-asc">{t("stores.filters.sortNameAZ")}</option>
        </select>
      </div>

      <div>
        <p className={ui.eyebrow}>{t("stores.filters.minRating")}</p>
        <select className={ui.input} value={minimumStars} onChange={(e) => setMinimumStars(e.target.value)}>
          <option value="all">{t("stores.filters.ratingAll")}</option>
          <option value="4.5">4.5+ stars</option>
          <option value="4">4+ stars</option>
          <option value="3.5">3.5+ stars</option>
        </select>
      </div>

      <div>
        <p className={ui.eyebrow}>{t("stores.filters.openingTime")}</p>
        <select className={ui.input} value={timeFilterMode} onChange={(e) => setTimeFilterMode(e.target.value)}>
          <option value="all">{t("stores.filters.timeAll")}</option>
          <option value="now">{t("stores.filters.timeNow")}</option>
          <option value="custom">{t("stores.filters.timeCustom")}</option>
        </select>
        {timeFilterMode === "custom" ? (
          <input className={ui.input + " mt-2"} type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
        ) : null}
      </div>

      <DistanceOriginControls
        addressValue={addressQuery}
        onAddressChange={setAddressQuery}
        onUseAddress={handleUseAddress}
        onUseCurrentLocation={locateNearestStore}
        onClearLocation={clearLocation}
        addressLoading={geocoding}
        currentLocationLoading={locating}
        hasLocation={Boolean(userLocation)}
      />

      {locationMessage ? <p className="text-xs text-ink-500">{locationMessage}</p> : null}
      {userLocation && nearestStore ? (
        <p className="text-xs text-ink-500">
          {t("stores.nearest")} <strong className="text-ink-800">{nearestStore.name}</strong>
          {typeof nearestStore.resolvedDistanceKm === "number" ? ` · ${formatDistanceKm(nearestStore.resolvedDistanceKm)}` : ""}
        </p>
      ) : null}
      {favoriteMessage ? <p className="text-xs text-ink-500">{favoriteMessage}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );

  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
        <p className={ui.eyebrow}>{t("stores.eyebrow")}</p>
        <h1 className={ui.bannerTitle}>{t("stores.title")}</h1>
        <p className={ui.copy}>{t("stores.subtitle")}</p>
        <p className="mt-3 text-sm text-ink-500">
          {t("stores.showing")} <strong className="text-ink-800">{filteredStores.length}</strong> {t("stores.storesCount")}
          {timeFilterMode === "now" ? ` · ${t("stores.openNow")}` : ""}
          {timeFilterMode === "custom" ? ` · ${t("stores.openAt", { time: customTime })}` : ""}
        </p>
      </div>

      <CatalogLayout
        filters={filterRail}
        filtersLabel={t("stores.filters.label")}
        loading={loading}
        skeleton={<StoreSkeleton />}
        empty={
          <EmptyState
            icon="🏪"
            title={t("stores.empty.title")}
            description={t("stores.empty.description")}
            action={
              <Button size="sm" variant="secondary" onClick={() => { setSearchValue(""); setMinimumStars("all"); setTimeFilterMode("all"); }}>
                {t("stores.empty.clearFilters")}
              </Button>
            }
          />
        }
      >
        {filteredStores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            onFavoriteMessage={setFavoriteMessage}
            hasUserLocation={Boolean(userLocation)}
            t={t}
          />
        ))}
      </CatalogLayout>
    </main>
  );
}
