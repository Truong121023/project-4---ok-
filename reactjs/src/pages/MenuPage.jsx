import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import DistanceOriginControls from "../components/DistanceOriginControls";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import CatalogLayout from "../components/templates/catalog-layout";
import { Badge } from "../components/ui/badge";
import Button from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { formatDistanceKm } from "../lib/demoCatalog";
import { formatCurrencyVnd, formatNumberVi } from "../lib/locale";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { fetchPublicDishes } from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { dateFromTimeValue, getCurrentTimeValue, isStoreOpenAt } from "../lib/timeFilters";
import { ui } from "../ui";

function formatPrice(v) { return formatCurrencyVnd(v); }
function formatCompact(v) { return formatNumberVi(v); }

function mapSortKey(sortKey, hasLocation) {
  switch (sortKey) {
    case "rating-desc": return "top_rated";
    case "order-desc": return "most_ordered";
    case "distance-asc": return hasLocation ? "distance_asc" : "top_rated";
    case "favorite-desc": return "top_rated";
    default: return "most_reviewed";
  }
}

function buildCategoryOptions(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item.categoryId || !item.categoryName) return;
    if (!map.has(item.categoryId)) map.set(item.categoryId, { id: item.categoryId, title: item.categoryName });
  });
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "vi"));
}

function buildStoreOptions(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = String(item.bestStore?.slug || item.bestStore?.storeId || item.bestStore?.id || item.storeSlug || item.storeId || "").toLowerCase();
    if (!key || map.has(key)) return;
    map.set(key, { value: key, label: item.bestStore?.name || item.storeName || key });
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function matchesStore(item, storeKey) {
  if (!storeKey) return true;
  const itemKey = String(item.bestStore?.slug || item.bestStore?.storeId || item.bestStore?.id || item.storeSlug || item.storeId || "").toLowerCase();
  return itemKey === storeKey.toLowerCase();
}

function DishSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="rounded-xl border border-ink-900/10 bg-cream-50 p-4 shadow-soft">
          <Skeleton className="h-44 w-full rounded-lg mb-3" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function DishCard({ item, index, onCartMessage, onFavoriteMessage, userLocation }) {
  const bestStoreId = item.bestStore?.storeId || item.bestStore?.id;
  const availability = item.bestStore
    ? getCartAvailabilityDecision(item.bestStore)
    : { allowed: false, preorderOnly: false, reason: "" };
  const canQuickAdd = Boolean(bestStoreId) && availability.allowed;
  const img = item.imagePaths?.[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-ink-900/10 bg-cream-50 shadow-soft transition-shadow duration-300 hover:shadow-lift">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-beige-100">
        {img ? (
          <img
            src={img}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-400 text-xs">No image</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Badge variant="matcha">#{index + 1}</Badge>
          {item.categoryName ? <Badge variant="beige">{item.categoryName}</Badge> : null}
        </div>
        {!availability.allowed && item.bestStore ? (
          <div className="absolute inset-0 bg-ink-900/25" />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h2 className="font-display text-base font-semibold leading-snug text-ink-900 line-clamp-2">
            {item.name}
          </h2>
          {item.note ? <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{item.note}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-matcha-700">{formatPrice(item.price)}</span>
          {item.reviewCount ? (
            <span className="text-xs text-ink-500">{item.averageRating.toFixed(1)}★ ({formatCompact(item.reviewCount)})</span>
          ) : (
            <span className="text-xs text-ink-400">No reviews yet</span>
          )}
        </div>

        {item.bestStore ? (
          <p className="text-xs text-ink-500 line-clamp-1">
            {item.bestStore.name}
            {typeof item.bestStore.distanceKm === "number"
              ? ` · ${formatDistanceKm(item.bestStore.distanceKm)}`
              : ""}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <QuickAddToCartButton
            className={ui.primaryButton + " !text-xs !px-3 !py-2"}
            dishId={item.id}
            storeId={bestStoreId}
            blocked={!canQuickAdd}
            preorderOnly={availability.preorderOnly}
            preorderMessage={getCartSuccessMessage(availability.preorderOnly)}
            blockedMessage={
              item.bestStore
                ? availability.reason || "Not available at this store."
                : "No eligible store available."
            }
            onResult={onCartMessage}
          />
          <QuickFavoriteButton
            targetType="dish"
            targetId={item.id}
            activeLabel="Saved"
            inactiveLabel="Save"
            onResult={onFavoriteMessage}
          />
          <Link className={ui.ghostButton + " !text-xs !px-3 !py-2"} to={`/menu/${item.id}`}>
            Details
          </Link>
          {item.bestStore ? (
            <Link className={ui.ghostButton + " !text-xs !px-3 !py-2"} to={buildStorePath(item.bestStore)}>
              Store
            </Link>
          ) : null}
        </div>
      </div>
    </article>
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
            nextItems = [...nextItems].sort((a, b) => b.favoriteCount - a.favoriteCount || b.averageRating - a.averageRating);
          } else if (sortKey === "top-desc") {
            nextItems = [...nextItems].sort((a, b) => b.reviewCount - a.reviewCount || b.averageRating - a.averageRating);
          }
          setDishes(nextItems);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load the menu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDishes();
    return () => { cancelled = true; };
  }, [location, minimumStars, searchValue, selectedCategoryId, sortKey, userLocation]);

  const categoryOptions = useMemo(() => buildCategoryOptions(dishes), [dishes]);
  const storeOptions = useMemo(() => buildStoreOptions(dishes), [dishes]);
  const filteredDishes = useMemo(() => dishes.filter((item) => matchesStore(item, selectedStoreKey)), [dishes, selectedStoreKey]);

  const timeFilteredDishes = useMemo(() => {
    if (timeFilterMode === "all") return filteredDishes;
    const targetDate = timeFilterMode === "now" ? new Date() : dateFromTimeValue(customTime, new Date());
    return filteredDishes.filter((item) => item.bestStore && isStoreOpenAt(item.bestStore, targetDate));
  }, [customTime, filteredDishes, timeFilterMode]);

  const updateFilterParams = (updates = {}) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => { v ? nextParams.set(k, v) : nextParams.delete(k); });
    setSearchParams(nextParams, { replace: true });
  };

  const locateStores = async () => {
    setLocating(true);
    setLocationMessage("Getting your current location...");
    try {
      const loc = await requestCurrentLocation();
      setUserLocation(loc);
      setLocationMessage("Current location captured for menu results.");
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
          placeholder="Item name, category..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div>
        <p className={ui.eyebrow}>Sort by</p>
        <select className={ui.input} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="top-desc">Top reviews + rating</option>
          <option value="rating-desc">Highest rated</option>
          <option value="order-desc">Most ordered</option>
          <option value="favorite-desc">Most favorited</option>
          <option value="distance-asc">Nearest store</option>
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
        <p className={ui.eyebrow}>Store</p>
        <select className={ui.input} value={selectedStoreKey} onChange={(e) => updateFilterParams({ store: e.target.value })}>
          <option value="">All stores</option>
          {storeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <p className={ui.eyebrow}>Opening time</p>
        <select className={ui.input} value={timeFilterMode} onChange={(e) => setTimeFilterMode(e.target.value)}>
          <option value="all">All</option>
          <option value="now">Selling now</option>
          <option value="custom">At specific time</option>
        </select>
        {timeFilterMode === "custom" ? (
          <input className={ui.input + " mt-2"} type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
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

      {locationMessage ? <p className="text-xs text-ink-500">{locationMessage}</p> : null}
      {favoriteMessage ? <p className="text-xs text-ink-500">{favoriteMessage}</p> : null}
      {cartMessage ? <p className="text-xs text-ink-500">{cartMessage}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );

  return (
    <main className="bg-bg min-h-screen">
      {/* Page header */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
        <p className={ui.eyebrow}>Menu</p>
        <h1 className={ui.bannerTitle}>Most-loved drinks</h1>
        <p className={ui.copy}>Browse our full menu. Filter by category, rating, or store.</p>

        {/* Category pills */}
        {categoryOptions.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant={selectedCategoryId ? "secondary" : "primary"}
              size="sm"
              onClick={() => updateFilterParams({ category: "" })}
            >
              All
            </Button>
            {categoryOptions.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategoryId === cat.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateFilterParams({ category: cat.id })}
              >
                {cat.title}
              </Button>
            ))}
          </div>
        ) : null}

        <p className="mt-3 text-sm text-ink-500">
          Showing <strong className="text-ink-800">{timeFilteredDishes.length}</strong> items
        </p>
      </div>

      <CatalogLayout
        filters={filterRail}
        filtersLabel="Menu filters"
        loading={loading}
        skeleton={<DishSkeleton />}
        empty={
          <EmptyState
            icon="🍵"
            title="No matching items"
            description={selectedStoreKey ? "No items match this store." : "Try adjusting your filters."}
            action={<Button size="sm" onClick={() => updateFilterParams({ category: "", store: "" })}>Clear filters</Button>}
          />
        }
      >
        {timeFilteredDishes.map((item, idx) => (
          <DishCard
            key={item.id}
            item={item}
            index={idx}
            onCartMessage={setCartMessage}
            onFavoriteMessage={setFavoriteMessage}
            userLocation={userLocation}
          />
        ))}
      </CatalogLayout>
    </main>
  );
}
