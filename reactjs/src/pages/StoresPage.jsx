import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import { fetchPublicStores } from "../lib/siteApi";
import { calculateDistanceKm, formatDistanceKm } from "../lib/demoCatalog";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { buildStoreEventsPath, buildStorePath } from "../lib/storeRouting";
import { dateFromTimeValue, getCurrentTimeValue, isStoreOpenAt } from "../lib/timeFilters";
import { ui } from "../ui";

function formatCompactNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function formatServiceTag(tag) {
  return String(tag ?? "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function resolveDistanceKm(store, userLocation) {
  if (typeof store.distanceKm === "number") {
    return store.distanceKm;
  }

  return calculateDistanceKm(userLocation, store);
}

function availabilityLabel(store) {
  if (store.disabled) {
    return store.disabledReason || "Temporarily unavailable";
  }

  if (store.open) {
    return "Serving now";
  }

  return "Updating";
}

function mapSortKey(sortKey) {
  switch (sortKey) {
    case "rating-asc":
      return "rating_asc";
    case "distance-asc":
      return "distance_asc";
    case "name-asc":
      return "name_asc";
    case "rating-desc":
    default:
      return "rating_desc";
  }
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

        if (!cancelled) {
          setStores(response.items);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load stores.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStores();

    return () => {
      cancelled = true;
    };
  }, [location, minimumStars, searchValue, sortKey, userLocation]);

  const storesWithDistance = useMemo(
    () =>
      stores.map((store) => ({
        ...store,
        resolvedDistanceKm: resolveDistanceKm(store, userLocation),
      })),
    [stores, userLocation],
  );

  const filteredStores = useMemo(() => {
    if (timeFilterMode === "all") {
      return storesWithDistance;
    }

    const targetDate =
      timeFilterMode === "now" ? new Date() : dateFromTimeValue(customTime, new Date());

    return storesWithDistance.filter((store) => isStoreOpenAt(store, targetDate));
  }, [customTime, storesWithDistance, timeFilterMode]);

  const nearestStore = useMemo(() => {
    const distanceAwareStores = filteredStores.filter(
      (store) => typeof store.resolvedDistanceKm === "number",
    );

    if (!distanceAwareStores.length) {
      return null;
    }

    return [...distanceAwareStores].sort(
      (left, right) => left.resolvedDistanceKm - right.resolvedDistanceKm,
    )[0];
  }, [filteredStores]);

  const locateNearestStore = async () => {
    setLocating(true);
    setLocationMessage("Getting your current location...");

    try {
      const nextLocation = await requestCurrentLocation();
      setUserLocation(nextLocation);
      setLocationMessage("Current location captured for distance estimates.");
    } catch (locationError) {
      setLocationMessage(locationError.message);
    } finally {
      setLocating(false);
    }
  };

  const handleUseAddress = async () => {
    setGeocoding(true);
    setLocationMessage("Looking up address...");

    try {
      const nextLocation = await geocodeAddress(addressQuery);
      setUserLocation(nextLocation);
      setLocationMessage(`Calculating distance from: ${nextLocation.label}`);
    } catch (addressError) {
      setLocationMessage(addressError.message);
    } finally {
      setGeocoding(false);
    }
  };

  const clearLocation = () => {
    setUserLocation(null);
    setAddressQuery("");
    setLocationMessage("Distance origin cleared.");
  };

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Stores</p>
        <h1 className={ui.bannerTitle}>Kamatcha store network</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          Find stores by area, rating, and distance.
        </p>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_180px]">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Search
            </span>
            <input
              className={ui.input}
              type="text"
              placeholder="Store name, area..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Sort
            </span>
            <select
              className={ui.input}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
            >
              <option value="rating-desc">Highest rated</option>
              <option value="rating-asc">Lowest rated</option>
              <option value="distance-asc">Nearest first</option>
              <option value="name-asc">Name A-Z</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Rating filter
            </span>
            <select
              className={ui.input}
              value={minimumStars}
              onChange={(event) => setMinimumStars(event.target.value)}
            >
              <option value="all">All</option>
              <option value="4.5">From 4.5 stars</option>
              <option value="4">From 4 stars</option>
              <option value="3.5">From 3.5 stars</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[220px_180px]">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              By opening time
            </span>
            <select
              className={ui.input}
              value={timeFilterMode}
              onChange={(event) => setTimeFilterMode(event.target.value)}
            >
              <option value="all">All</option>
              <option value="now">Open now</option>
              <option value="custom">Open at selected time</option>
            </select>
          </label>

          {timeFilterMode === "custom" ? (
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Time to filter
              </span>
              <input
                className={ui.input}
                type="time"
                value={customTime}
                onChange={(event) => setCustomTime(event.target.value)}
              />
            </label>
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

        <div className="mt-4 grid gap-2 text-sm text-stone-600">
          <span>
            Showing <strong>{filteredStores.length}</strong> stores.
          </span>
          {timeFilterMode === "now" ? <span>Filtering stores that are open right now.</span> : null}
          {timeFilterMode === "custom" ? (
            <span>Filtering stores that are open at {customTime}.</span>
          ) : null}
          {favoriteMessage ? <span>{favoriteMessage}</span> : null}
          {locationMessage ? <span>{locationMessage}</span> : null}
          {nearestStore ? (
            <span>
              Nearest: <strong>{nearestStore.name}</strong> -{" "}
              {formatDistanceKm(nearestStore.resolvedDistanceKm)}
            </span>
          ) : null}
          {error ? <span>{error}</span> : null}
        </div>
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading stores...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="grid gap-6">
          {filteredStores.map((store) => (
            <article
              key={store.id}
              className={`${ui.card} grid gap-6 xl:grid-cols-[0.96fr_1.04fr] ${
                store.disabled ? "border-stone-300/70" : ""
              }`}
            >
              <MediaLibrary
                images={store.imagePaths}
                alt={store.name}
                badge={store.positionLabel || store.area}
                heroClassName="h-full min-h-[20rem]"
                thumbnailClassName="h-20"
              />

              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  {store.area ? <span className={ui.pill}>{store.area}</span> : null}
                  {store.hoursText ? <span className={ui.pill}>{store.hoursText}</span> : null}
                  <span
                    className={
                      store.disabled
                        ? "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                        : ui.pill
                    }
                  >
                    {availabilityLabel(store)}
                  </span>
                  {store.resolvedDistanceKm !== null ? (
                    <span className={ui.pill}>{formatDistanceKm(store.resolvedDistanceKm)}</span>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-3xl font-semibold text-tea-900">{store.name}</h2>
                  <p className="mt-2 text-base font-semibold text-matcha-700">{store.address}</p>
                  {store.positionLabel ? (
                    <p className="mt-2 text-sm font-medium text-stone-600">{store.positionLabel}</p>
                  ) : null}
                  {store.personality ? (
                    <p className="mt-2 text-sm font-semibold text-tea-900">{store.personality}</p>
                  ) : null}
                  {store.specialty ? (
                    <p className="mt-2 text-sm text-matcha-700">Featured drink: {store.specialty}</p>
                  ) : null}
                  <p className="mt-4 text-sm leading-7 text-stone-600">{store.description}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    {
                      label: "Rating",
                      value: store.reviewCount
                        ? `${store.averageRating.toFixed(1)} stars`
                        : "No reviews yet",
                    },
                    { label: "Review count", value: formatCompactNumber(store.reviewCount) },
                    { label: "Favorites", value: formatCompactNumber(store.favoriteCount) },
                    { label: "Items available", value: formatCompactNumber(store.availableItemCount) },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1.25rem] border border-matcha-900/10 bg-white/70 p-4"
                    >
                      <strong className="block text-2xl font-bold text-tea-900">{stat.value}</strong>
                      <span className="mt-1 block text-sm text-stone-600">{stat.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {store.specialty ? <span className={ui.pill}>Featured: {store.specialty}</span> : null}
                  {store.serviceTags?.map((tag) => (
                    <span key={`${store.id}-${tag}`} className={ui.pill}>
                      {formatServiceTag(tag)}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <QuickFavoriteButton
                    targetType="store"
                    targetId={store.id}
                    activeLabel="Saved"
                    inactiveLabel="Save store"
                    onResult={(message) => setFavoriteMessage(message)}
                  />
                  <Link className={ui.secondaryButton} to={buildStoreEventsPath(store)}>
                    Events
                  </Link>
                  <Link className={ui.primaryButton} to={buildStorePath(store)}>
                    View store
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {!filteredStores.length ? (
            <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
              No stores match the current filters.
            </article>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
