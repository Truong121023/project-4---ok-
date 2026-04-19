import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { ui } from "../ui";

function formatCompact(v) { return Number(v ?? 0).toLocaleString("vi-VN"); }
function formatServiceTag(tag) { return String(tag ?? "").replace(/[-_]+/g, " ").trim(); }

function resolveDistanceKm(store, userLocation) {
  if (typeof store.distanceKm === "number") return store.distanceKm;
  return calculateDistanceKm(userLocation, store);
}

function availabilityLabel(store) {
  if (store.disabled) return store.disabledReason || "Temporarily unavailable";
  if (store.open) return "Serving now";
  return "Updating";
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

function StoreCard({ store, onFavoriteMessage }) {
  const img = store.imagePaths?.[0];
  const isDisabled = store.disabled;

  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border bg-cream-50 shadow-soft transition-shadow duration-300 hover:shadow-lift ${isDisabled ? "border-beige-300 opacity-80" : "border-ink-900/10"}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-beige-100">
        {img ? (
          <img
            src={img}
            alt={store.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-400 text-xs">No image</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1 flex-wrap">
          {store.area ? <Badge variant="beige">{store.area}</Badge> : null}
          <Badge variant={isDisabled ? "ink" : "matcha"}>{availabilityLabel(store)}</Badge>
        </div>
        {typeof store.resolvedDistanceKm === "number" ? (
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
            <span>No reviews yet</span>
          )}
          <span>·</span>
          <span>{formatCompact(store.availableItemCount ?? 0)} items</span>
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
            View store
          </Link>
          <QuickFavoriteButton
            targetType="store"
            targetId={store.id}
            activeLabel="Saved"
            inactiveLabel="Save"
            onResult={onFavoriteMessage}
          />
          <Link className={ui.ghostButton + " !text-xs !px-3 !py-2"} to={buildStoreEventsPath(store)}>
            Events
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function StoresPage() {
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
        if (!cancelled) setError(err.message || "Unable to load stores.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStores();
    return () => { cancelled = true; };
  }, [location, minimumStars, searchValue, sortKey, userLocation]);

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
    setLocationMessage("Getting your current location...");
    try {
      const loc = await requestCurrentLocation();
      setUserLocation(loc);
      setLocationMessage("Current location captured for distance estimates.");
    } catch (err) { setLocationMessage(err.message); }
    finally { setLocating(false); }
  };

  const handleUseAddress = async () => {
    setGeocoding(true);
    setLocationMessage("Looking up address...");
    try {
      const loc = await geocodeAddress(addressQuery);
      setUserLocation(loc);
      setLocationMessage(`Calculating distance from: ${loc.label}`);
    } catch (err) { setLocationMessage(err.message); }
    finally { setGeocoding(false); }
  };

  const clearLocation = () => {
    setUserLocation(null);
    setAddressQuery("");
    setLocationMessage("Distance origin cleared.");
  };

  const filterRail = (
    <div className="flex flex-col gap-5">
      <div>
        <p className={ui.eyebrow}>Search</p>
        <input
          className={ui.input}
          type="text"
          placeholder="Store name, area..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div>
        <p className={ui.eyebrow}>Sort by</p>
        <select className={ui.input} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="rating-desc">Highest rated</option>
          <option value="rating-asc">Lowest rated</option>
          <option value="distance-asc">Nearest first</option>
          <option value="name-asc">Name A–Z</option>
        </select>
      </div>

      <div>
        <p className={ui.eyebrow}>Min. rating</p>
        <select className={ui.input} value={minimumStars} onChange={(e) => setMinimumStars(e.target.value)}>
          <option value="all">All</option>
          <option value="4.5">4.5+ stars</option>
          <option value="4">4+ stars</option>
          <option value="3.5">3.5+ stars</option>
        </select>
      </div>

      <div>
        <p className={ui.eyebrow}>Opening time</p>
        <select className={ui.input} value={timeFilterMode} onChange={(e) => setTimeFilterMode(e.target.value)}>
          <option value="all">All</option>
          <option value="now">Open now</option>
          <option value="custom">Open at time</option>
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
      {nearestStore ? (
        <p className="text-xs text-ink-500">
          Nearest: <strong className="text-ink-800">{nearestStore.name}</strong>
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
        <p className={ui.eyebrow}>Stores</p>
        <h1 className={ui.bannerTitle}>Kamatcha store network</h1>
        <p className={ui.copy}>Find stores by area, rating, and distance.</p>
        <p className="mt-3 text-sm text-ink-500">
          Showing <strong className="text-ink-800">{filteredStores.length}</strong> stores
          {timeFilterMode === "now" ? " · open now" : ""}
          {timeFilterMode === "custom" ? ` · open at ${customTime}` : ""}
        </p>
      </div>

      <CatalogLayout
        filters={filterRail}
        filtersLabel="Store filters"
        loading={loading}
        skeleton={<StoreSkeleton />}
        empty={
          <EmptyState
            icon="🏪"
            title="No stores found"
            description="Try adjusting the filters to see more results."
            action={
              <Button size="sm" variant="secondary" onClick={() => { setSearchValue(""); setMinimumStars("all"); setTimeFilterMode("all"); }}>
                Clear filters
              </Button>
            }
          />
        }
      >
        {filteredStores.map((store) => (
          <StoreCard key={store.id} store={store} onFavoriteMessage={setFavoriteMessage} />
        ))}
      </CatalogLayout>
    </main>
  );
}
