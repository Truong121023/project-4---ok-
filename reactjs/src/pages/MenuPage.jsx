import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { fetchPublicDishes } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { formatCurrencyVnd, formatNumberVi } from "../lib/locale";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { buildStorePath } from "../lib/storeRouting";
import { dateFromTimeValue, getCurrentTimeValue, isStoreOpenAt } from "../lib/timeFilters";
import { ui } from "../ui";

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function formatCompactNumber(value) {
  return formatNumberVi(value);
}

function mapSortKey(sortKey, hasLocation) {
  switch (sortKey) {
    case "rating-desc":
      return "top_rated";
    case "order-desc":
      return "most_ordered";
    case "distance-asc":
      return hasLocation ? "distance_asc" : "top_rated";
    case "favorite-desc":
      return "top_rated";
    case "top-desc":
    default:
      return "most_reviewed";
  }
}

function buildCategoryOptions(items) {
  const categoryMap = new Map();

  items.forEach((item) => {
    if (!item.categoryId || !item.categoryName) {
      return;
    }

    if (!categoryMap.has(item.categoryId)) {
      categoryMap.set(item.categoryId, {
        id: item.categoryId,
        title: item.categoryName,
      });
    }
  });

  return Array.from(categoryMap.values()).sort((left, right) =>
    left.title.localeCompare(right.title, "vi"),
  );
}

function normalizeStoreKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getDishStoreKey(item) {
  return (
    item.bestStore?.slug ||
    item.bestStore?.storeSlug ||
    item.bestStore?.storeId ||
    item.bestStore?.id ||
    item.storeSlug ||
    item.storeId ||
    ""
  );
}

function matchesStore(item, storeKey) {
  const normalizedKey = normalizeStoreKey(storeKey);

  if (!normalizedKey) {
    return true;
  }

  return normalizeStoreKey(getDishStoreKey(item)) === normalizedKey;
}

function buildStoreOptions(items) {
  const storeMap = new Map();

  items.forEach((item) => {
    const storeKey = getDishStoreKey(item);
    const normalizedKey = normalizeStoreKey(storeKey);

    if (!normalizedKey || storeMap.has(normalizedKey)) {
      return;
    }

    storeMap.set(normalizedKey, {
      value: String(storeKey),
      label:
        item.bestStore?.name ||
        item.bestStore?.storeName ||
        item.storeName ||
        `Store ${storeKey}`,
    });
  });

  return Array.from(storeMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "vi"),
  );
}

export default function MenuPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
  const [sortKey, setSortKey] = useState("top-desc");
  const [minimumStars, setMinimumStars] = useState("all");
  const [timeFilterMode, setTimeFilterMode] = useState("all");
  const [customTime, setCustomTime] = useState(getCurrentTimeValue());
  const [addressQuery, setAddressQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dishes, setDishes] = useState([]);

  const selectedCategoryId = searchParams.get("category") ?? "";
  const selectedStoreKey = searchParams.get("store") ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadDishes() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchPublicDishes({
          search: searchValue.trim() || undefined,
          sort: mapSortKey(sortKey, Boolean(userLocation)),
          minRating: minimumStars === "all" ? undefined : minimumStars,
          categoryId: selectedCategoryId || undefined,
          lat: userLocation?.latitude,
          lng: userLocation?.longitude,
          page: 0,
          size: 100,
        });

        if (!cancelled) {
          let nextItems = response.items;

          if (sortKey === "favorite-desc") {
            nextItems = [...nextItems].sort(
              (left, right) =>
                right.favoriteCount - left.favoriteCount ||
                right.averageRating - left.averageRating,
            );
          } else if (sortKey === "top-desc") {
            nextItems = [...nextItems].sort(
              (left, right) =>
                right.reviewCount - left.reviewCount ||
                right.averageRating - left.averageRating,
            );
          }

          setDishes(nextItems);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load the menu.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDishes();

    return () => {
      cancelled = true;
    };
  }, [location, minimumStars, searchValue, selectedCategoryId, sortKey, userLocation]);

  const categoryOptions = useMemo(() => buildCategoryOptions(dishes), [dishes]);
  const storeOptions = useMemo(() => buildStoreOptions(dishes), [dishes]);
  const filteredDishes = useMemo(
    () => dishes.filter((item) => matchesStore(item, selectedStoreKey)),
    [dishes, selectedStoreKey],
  );

  const timeFilteredDishes = useMemo(() => {
    if (timeFilterMode === "all") {
      return filteredDishes;
    }

    const targetDate =
      timeFilterMode === "now" ? new Date() : dateFromTimeValue(customTime, new Date());

    return filteredDishes.filter(
      (item) => item.bestStore && isStoreOpenAt(item.bestStore, targetDate),
    );
  }, [customTime, filteredDishes, timeFilterMode]);

  const selectedStoreName = useMemo(() => {
    const matchedItem = filteredDishes.find((item) => matchesStore(item, selectedStoreKey));
    return (
      matchedItem?.bestStore?.name ||
      matchedItem?.bestStore?.storeName ||
      matchedItem?.storeName ||
      selectedStoreKey
    );
  }, [filteredDishes, selectedStoreKey]);

  const nearestDishSpot = useMemo(() => {
    const dishesWithStore = timeFilteredDishes.filter(
      (item) => item.bestStore && typeof item.bestStore.distanceKm === "number",
    );

    if (!dishesWithStore.length) {
      return null;
    }

    return [...dishesWithStore].sort(
      (left, right) => left.bestStore.distanceKm - right.bestStore.distanceKm,
    )[0];
  }, [timeFilteredDishes]);

  const updateFilterParams = (updates = {}) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams, { replace: true });
  };

  const locateStores = async () => {
    setLocating(true);
    setLocationMessage("Getting your current location...");

    try {
      const nextLocation = await requestCurrentLocation();
      setUserLocation(nextLocation);
      setLocationMessage("Current location captured for menu results.");
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Menu</p>
            <h1 className={ui.bannerTitle}>Most-loved drinks</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
              See featured items, stores currently selling them, and the nearest option.
            </p>
          </div>

        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_180px_280px]">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Search
            </span>
            <input
              className={ui.input}
              type="text"
              placeholder="Item name, category..."
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
              <option value="top-desc">Top reviews + rating</option>
              <option value="rating-desc">Highest rated</option>
              <option value="order-desc">Most ordered</option>
              <option value="favorite-desc">Most favorited</option>
              <option value="distance-asc">Nearest store</option>
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

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Store filter
            </span>
            <select
              className={ui.input}
              value={selectedStoreKey}
              onChange={(event) => updateFilterParams({ store: event.target.value })}
            >
              <option value="">All stores</option>
              {storeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              <option value="now">Selling now</option>
              <option value="custom">Selling at selected time</option>
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
          onUseCurrentLocation={locateStores}
          onClearLocation={clearLocation}
          addressLoading={geocoding}
          currentLocationLoading={locating}
          hasLocation={Boolean(userLocation)}
        />

        {categoryOptions.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={selectedCategoryId ? ui.secondaryButton : ui.primaryButton}
              type="button"
              onClick={() => updateFilterParams({ category: "" })}
            >
              All
            </button>
            {categoryOptions.map((category) => (
              <button
                key={category.id}
                className={selectedCategoryId === category.id ? ui.primaryButton : ui.secondaryButton}
                type="button"
                onClick={() => updateFilterParams({ category: category.id })}
              >
                {category.title}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 text-sm text-stone-600">
          <span>
            Showing <strong>{timeFilteredDishes.length}</strong> items.
          </span>
          {selectedStoreKey ? (
            <span>
              Filtering by store: <strong>{selectedStoreName}</strong>
            </span>
          ) : null}
          {timeFilterMode === "now" ? (
            <span>Filtering items by stores that are open right now.</span>
          ) : null}
          {timeFilterMode === "custom" ? (
            <span>Filtering items by stores that are open at {customTime}.</span>
          ) : null}
          {favoriteMessage ? <span>{favoriteMessage}</span> : null}
          {cartMessage ? <span>{cartMessage}</span> : null}
          {locationMessage ? <span>{locationMessage}</span> : null}
          {nearestDishSpot?.bestStore ? (
            <span>
              Nearest option: <strong>{nearestDishSpot.name}</strong> at{" "}
              <strong>{nearestDishSpot.bestStore.name}</strong> -{" "}
              {formatDistanceKm(nearestDishSpot.bestStore.distanceKm)}
            </span>
          ) : null}
          {error ? <span>{error}</span> : null}
        </div>
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading menu...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="grid gap-6">
          {timeFilteredDishes.map((item, index) => {
            const bestStoreId = item.bestStore?.storeId || item.bestStore?.id;
            const availability = item.bestStore
              ? getCartAvailabilityDecision(item.bestStore)
              : { allowed: false, preorderOnly: false, reason: "" };
            const canQuickAdd = Boolean(bestStoreId) && availability.allowed;

            return (
              <article
                key={item.id}
                className={`${ui.card} grid gap-6 xl:grid-cols-[0.88fr_1.12fr] ${
                  item.disabled ? "border-stone-300/70" : ""
                }`}
              >
                <MediaLibrary
                  images={item.imagePaths}
                  alt={item.name}
                  badge={`Top ${index + 1}`}
                  heroClassName="h-full min-h-[19rem]"
                  thumbnailClassName="h-20"
                />

                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.categoryName ? <span className={ui.pill}>{item.categoryName}</span> : null}
                    {item.franchiseRequired ? <span className={ui.pill}>Required item</span> : null}
                    {item.bestStore?.distanceKm !== null &&
                    item.bestStore?.distanceKm !== undefined ? (
                      <span className={ui.pill}>{formatDistanceKm(item.bestStore.distanceKm)}</span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-semibold text-tea-900">{item.name}</h2>
                      {item.note ? (
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-matcha-700">
                          {item.note}
                        </p>
                      ) : null}
                    </div>
                    <strong className="text-2xl font-bold text-matcha-700">
                      {formatPrice(item.price)}
                    </strong>
                  </div>

                  <p className="text-sm leading-7 text-stone-600">{item.description}</p>

                  <div className="grid gap-4 sm:grid-cols-4">
                    {[
                      {
                        label: "Rating",
                        value: item.reviewCount ? `${item.averageRating.toFixed(1)} stars` : "No reviews yet",
                      },
                      { label: "Review count", value: formatCompactNumber(item.reviewCount) },
                      { label: "Sold", value: formatCompactNumber(item.orderCount) },
                      { label: "Favorites", value: formatCompactNumber(item.favoriteCount) },
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

                  <div className="rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 p-4 text-sm leading-7 text-stone-700">
                    <strong className="block text-base text-tea-900">Recommended store</strong>
                    {item.bestStore ? (
                      <>
                        <p className="mt-2 font-semibold">{item.bestStore.name}</p>
                        <p className="text-stone-600">{item.bestStore.address || item.bestStore.area}</p>
                        <p className="mt-2">
                          Distance:{" "}
                          {item.bestStore.distanceKm !== null && item.bestStore.distanceKm !== undefined
                            ? formatDistanceKm(item.bestStore.distanceKm)
                            : "Set a location to calculate"}
                        </p>
                        <p className="mt-1">
                          Store price: {formatPrice(item.bestStore.price || item.price)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2">This item is not currently available at any store.</p>
                    )}
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
                    {item.bestStore ? (
                      <Link className={ui.secondaryButton} to={buildStorePath(item.bestStore)}>
                        View store
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}

          {!timeFilteredDishes.length ? (
            <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
              {selectedStoreKey
                ? "No items match this store."
                : "No matching items found."}
            </article>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
