import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import DetailLayout from "../components/templates/detail-layout";
import { Badge } from "../components/ui/badge";
import Button from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { formatDistanceKm } from "../lib/demoCatalog";
import { formatCurrencyVnd, formatDateTimeVn, formatNumberVi } from "../lib/locale";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { fetchPublicDishDetail } from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import UserReviewForm from "../components/UserReviewForm";
import { ui } from "../ui";

function formatPrice(v) { return formatCurrencyVnd(v); }
function formatCompact(v) { return formatNumberVi(v); }
function formatDate(v) { return formatDateTimeVn(v, "Recently updated").replace(/\sGMT\+7$/, ""); }

function storeStatus(store) {
  if (store.storeDisabled) return "Store unavailable";
  if (store.storeOpen) return "Serving now";
  return "Updating";
}

function rankStoreForCart(store) {
  const availability = getCartAvailabilityDecision(store);
  return { store, availability, score: availability.allowed ? (availability.preorderOnly ? 1 : 2) : 0 };
}

// ─── loading skeleton ─────────────────────────────────────────────────────────
function DishDetailSkeleton() {
  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-48" />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 lg:w-[45%]">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <div className="mt-3 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-16 rounded-lg" />)}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DishDetailPage() {
  const auth = useAuth();
  const { itemId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, isFavorite, toggleFavorite, getCurrentUserReview, submitReview, deleteReview } = useSiteData();

  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addressQuery, setAddressQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dishDetail, setDishDetail] = useState(null);

  const loadDishDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchPublicDishDetail(itemId, { lat: userLocation?.latitude, lng: userLocation?.longitude });
      setDishDetail(response);
    } catch (err) {
      setError(err.message || "Unable to load item details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDishDetail(); }, [itemId, userLocation]);

  const dish = dishDetail?.dish ?? null;
  const category = dishDetail?.category ?? null;
  const stats = dishDetail?.stats ?? { averageRating: 0, reviewCount: 0, orderCount: 0, favoriteCount: 0, totalStock: 0 };
  const availableStores = dishDetail?.stores ?? [];
  const itemReviews = dishDetail?.reviews ?? [];
  const relatedItems = dishDetail?.relatedDishes ?? [];

  const selectedStore = useMemo(
    () => availableStores.find((s) => String(s.id) === String(selectedStoreId)) ?? null,
    [availableStores, selectedStoreId]
  );
  const selectedStoreAvailability = useMemo(
    () => (selectedStore ? getCartAvailabilityDecision(selectedStore) : null),
    [selectedStore]
  );

  useEffect(() => {
    if (!availableStores.length) { setSelectedStoreId(""); return; }
    const queryStoreId = searchParams.get("store");
    if (queryStoreId && availableStores.some((s) => String(s.id) === queryStoreId)) {
      setSelectedStoreId(queryStoreId);
      return;
    }
    setSelectedStoreId(String(availableStores[0].id));
  }, [availableStores, searchParams]);

  useEffect(() => {
    if (!selectedStore) return;
    const maxStock = selectedStore.stock || 1;
    setQuantity((q) => Math.min(Math.max(1, q), maxStock));
  }, [selectedStore]);

  const locateStores = async () => {
    setLocating(true);
    setLocationMessage("Getting your current location...");
    try {
      const loc = await requestCurrentLocation();
      setUserLocation(loc);
      setLocationMessage("Distance calculated from your current location.");
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

  const clearLocation = () => { setUserLocation(null); setAddressQuery(""); setLocationMessage("Distance origin cleared."); };

  const resolveDishQuickAddPayload = async (dishIdValue) => {
    const response = await fetchPublicDishDetail(dishIdValue, { lat: userLocation?.latitude, lng: userLocation?.longitude });
    const rankedStores = response.stores.map(rankStoreForCart).sort((a, b) => b.score - a.score);
    const selectedCandidate = rankedStores.find(({ store, availability }) => String(store.id) === String(selectedStore?.id) && availability.allowed);
    const fallback = selectedCandidate ?? rankedStores[0] ?? null;
    if (!fallback?.store) return { blocked: true, blockedMessage: "No store is currently serving this item." };
    if (!fallback.availability.allowed) return { dishId: dishIdValue, storeId: fallback.store.id, blocked: true, blockedMessage: fallback.availability.reason || "Item not ready." };
    return { dishId: dishIdValue, storeId: fallback.store.id, quantity: 1, preorderOnly: fallback.availability.preorderOnly, preorderMessage: getCartSuccessMessage(fallback.availability.preorderOnly) };
  };

  const handleSelectStore = (storeIdValue) => {
    setSelectedStoreId(storeIdValue);
    setSearchParams({ store: storeIdValue }, { replace: true });
  };

  const handleAddToCart = async () => {
    if (!dish || !selectedStore) { setCartMessage("Please choose a store before adding to the cart."); return; }
    if (auth.isAuthenticated && !auth.hasRole("USER")) { setCartMessage("Only USER accounts can add items to the cart."); return; }
    if (!selectedStoreAvailability?.allowed) { setCartMessage(selectedStoreAvailability?.reason || "This item cannot be added to the cart yet."); return; }
    const result = await addToCart({ itemId: dish.id, storeId: selectedStore.id, quantity });
    setCartMessage(result.ok ? getCartSuccessMessage(selectedStoreAvailability.preorderOnly) : result.message);
  };

  const handleToggleFavorite = async () => {
    const result = await toggleFavorite("dish", itemId);
    setCartMessage(result.message);
    if (result.ok) await loadDishDetail();
  };

  const handleSubmitReview = async (payload) => {
    const result = await submitReview({ ...payload, targetType: "dish", targetId: itemId });
    if (result.ok) await loadDishDetail();
    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);
    if (result.ok) await loadDishDetail();
    return result;
  };

  if (loading) return <DishDetailSkeleton />;

  if (error || !dish) {
    return (
      <main className="bg-bg min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <p className={ui.eyebrow}>Menu</p>
          <h1 className={ui.bannerTitle}>Item not found</h1>
          <p className={ui.copy + " mx-auto"}>{error || "This item does not have data yet."}</p>
          <Link className={ui.secondaryButton + " mt-6 inline-flex"} to="/menu">Back to menu</Link>
        </div>
      </main>
    );
  }

  // ── gallery region ──────────────────────────────────────────────────────────
  const galleryRegion = (
    <MediaLibrary
      images={dish.imagePaths}
      alt={dish.name}
      badge="Kamatcha"
      heroClassName="h-[22rem] sm:h-[30rem] rounded-xl overflow-hidden"
      thumbnailClassName="h-20"
    />
  );

  // ── sticky buy rail ─────────────────────────────────────────────────────────
  const buyRail = (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-2xl font-bold text-ink-900">{formatPrice(dish.price)}</span>
        <Badge variant={stats.totalStock ? "matcha" : "ink"}>
          {stats.totalStock ? `${stats.totalStock} in stock` : "Sold out"}
        </Badge>
      </div>

      {availableStores.length ? (
        <label className="flex flex-col gap-1">
          <span className={ui.eyebrow}>Store</span>
          <select
            className={ui.input}
            value={selectedStoreId}
            onChange={(e) => handleSelectStore(e.target.value)}
          >
            {availableStores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      {selectedStore ? (
        <div className="rounded-lg border border-beige-200 bg-beige-100/60 px-3 py-2 text-xs text-ink-700 flex flex-wrap gap-2">
          <Badge variant={selectedStore.storeDisabled ? "ink" : "matcha"}>{storeStatus(selectedStore)}</Badge>
          <Badge variant={selectedStoreAvailability?.allowed ? "matcha" : "ink"}>
            {Number(selectedStore.stock ?? 0) > 0 ? `${selectedStore.stock} left` : "Sold out"}
          </Badge>
          {selectedStoreAvailability?.preorderOnly ? <Badge variant="warn">Preorder</Badge> : null}
          <span className="ml-auto font-semibold text-matcha-700">{formatPrice(selectedStore.price || dish.price)}</span>
        </div>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className={ui.eyebrow}>Quantity</span>
        <input
          className={ui.input}
          type="number"
          min="1"
          max={selectedStore?.stock ?? 1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
        />
      </label>

      <Button
        variant="primary"
        size="lg"
        onClick={handleAddToCart}
        disabled={!selectedStore || !selectedStoreAvailability?.allowed}
      >
        Add to cart
      </Button>

      <div className="flex gap-2">
        <Button
          variant={isFavorite("dish", dish.id) ? "primary" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={handleToggleFavorite}
        >
          {isFavorite("dish", dish.id) ? "Saved" : "Save item"}
        </Button>
      </div>

      {cartMessage ? <p className="text-xs text-ink-600">{cartMessage}</p> : null}
    </div>
  );

  // ── related carousel ────────────────────────────────────────────────────────
  const relatedRegion = relatedItems.length ? (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>More from this category</h2>
        {category ? (
          <Link className={ui.ghostButton} to={`/menu?category=${category.id}`}>View all</Link>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {relatedItems.map((relatedItem) => (
          <article
            key={relatedItem.id}
            className="flex flex-col gap-3 rounded-xl border border-ink-900/10 bg-cream-50 p-4 shadow-soft transition-shadow hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                className="font-display text-sm font-semibold text-ink-900 hover:text-matcha-700 transition-colors line-clamp-2"
                to={`/menu/${relatedItem.id}`}
              >
                {relatedItem.name}
              </Link>
              <span className="shrink-0 font-semibold text-matcha-700 text-sm">{formatPrice(relatedItem.price)}</span>
            </div>
            {relatedItem.note ? <p className="text-xs text-ink-500 line-clamp-1">{relatedItem.note}</p> : null}
            <div className="mt-auto flex flex-wrap gap-2">
              <QuickAddToCartButton
                className={ui.primaryButton + " !text-xs !px-3 !py-1.5"}
                resolvePayload={() => resolveDishQuickAddPayload(relatedItem.id)}
                blocked={!selectedStore && !availableStores.length}
                blockedMessage="No store currently available."
                onResult={(msg) => setCartMessage(msg)}
              />
              <QuickFavoriteButton
                targetType="dish"
                targetId={relatedItem.id}
                activeLabel="Saved"
                inactiveLabel="Save"
                onResult={(msg) => setCartMessage(msg)}
              />
              <Link className={ui.ghostButton + " !text-xs !px-3 !py-1.5"} to={`/menu/${relatedItem.id}`}>
                Details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  ) : null;

  // ── breadcrumb ──────────────────────────────────────────────────────────────
  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm text-ink-500">
      <Link className="hover:text-matcha-700 transition-colors" to="/menu">Menu</Link>
      {category ? (
        <>
          <span>/</span>
          <Link className="hover:text-matcha-700 transition-colors" to={`/menu?category=${category.id}`}>{category.title}</Link>
        </>
      ) : null}
      <span>/</span>
      <span className="text-ink-900 font-medium truncate max-w-[20ch]">{dish.name}</span>
    </nav>
  );

  return (
    <main className="bg-bg min-h-screen pb-24 lg:pb-0">
      <DetailLayout
        breadcrumb={breadcrumb}
        gallery={galleryRegion}
        stickyBar={buyRail}
        related={relatedRegion}
      >
        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Title block */}
          <div>
            <p className={ui.eyebrow}>{dish.franchiseRequired ? "Ceremonial Grade" : "Premium Selection"}</p>
            <h1 className={ui.bannerTitle}>{dish.name}</h1>
            {dish.note ? <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-matcha-700">{dish.note}</p> : null}
            <p className="mt-4 text-sm leading-7 text-ink-600">{dish.description}</p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            {dish.franchiseRequired ? <Badge variant="beige">Signature Item</Badge> : null}
            <Badge variant={stats.totalStock ? "matcha" : "ink"}>
              {stats.totalStock ? `${stats.totalStock} available` : "Sold out"}
            </Badge>
            <Badge variant="beige">{formatCompact(stats.favoriteCount)} saves</Badge>
            {stats.reviewCount ? <Badge variant="matcha">{stats.averageRating.toFixed(1)}★ ({formatCompact(stats.reviewCount)})</Badge> : null}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Price", value: formatPrice(dish.price) },
              { label: "Rating", value: stats.reviewCount ? `${stats.averageRating.toFixed(1)}★` : "New" },
              { label: "Sold", value: formatCompact(stats.orderCount) },
              { label: "Saves", value: formatCompact(stats.favoriteCount) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4 text-center">
                <strong className="block text-xl font-bold text-ink-900">{stat.value}</strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-ink-400">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {(dish.franchiseNote || dish.note || locationMessage) ? (
            <div className="rounded-xl border border-beige-200 bg-beige-100/60 p-4 text-sm leading-7 text-ink-700">
              <strong className="text-base text-ink-900">About this item</strong>
              <div className="mt-2 flex flex-col gap-1">
                {dish.franchiseNote ? <p>{dish.franchiseNote}</p> : null}
                {dish.note ? <p><span className="font-medium text-matcha-700">Taste note:</span> {dish.note}</p> : null}
                {locationMessage ? <p className="text-matcha-700">{locationMessage}</p> : null}
              </div>
            </div>
          ) : null}

          {/* Location controls */}
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

          {/* Available stores list */}
          {availableStores.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-ink-900">Available at</h2>
                <Badge variant="beige">{formatCompact(availableStores.length)} stores</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {availableStores.map((store) => {
                  const avail = getCartAvailabilityDecision(store);
                  return (
                    <div
                      key={store.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all ${
                        !avail.allowed ? "border-beige-300 bg-beige-100/50 opacity-70" : "border-ink-900/10 bg-cream-50 hover:border-matcha-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-ink-900 truncate">{store.name}</p>
                        <p className="text-xs text-ink-500">{store.area}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {typeof store.distanceKm === "number" ? <span className="text-xs text-ink-400">{formatDistanceKm(store.distanceKm)}</span> : null}
                        <Badge variant={store.storeDisabled ? "ink" : "matcha"}>{storeStatus(store)}</Badge>
                        <button className={ui.ghostButton + " !text-xs !px-3 !py-1"} type="button" onClick={() => handleSelectStore(store.id)}>Select</button>
                        <Link className={ui.ghostButton + " !text-xs !px-3 !py-1"} to={buildStorePath(store)}>Store</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Content sections */}
          <ContentSectionsBlock
            sections={dish.sections}
            eyebrow="Dish story"
            title="More about this item"
            description="Extended content blocks from our backend."
          />

          {/* Divider before reviews */}
          <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent" />

          {/* Reviews */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Customer reviews</p>
                <h2 className={ui.sectionTitle}>What our guests say</h2>
              </div>
              <Badge variant="beige">{formatCompact(itemReviews.length)} reviews</Badge>
            </div>

            <UserReviewForm
              title="Share your experience"
              existingReview={getCurrentUserReview("dish", itemId)}
              canSubmit={auth.hasRole("USER")}
              onSubmit={handleSubmitReview}
              onDelete={handleDeleteReview}
            />

            {itemReviews.length ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {itemReviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-900">{review.title}</p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {review.userName || review.userEmail || "Guest"} · {formatDate(review.createdAt)}
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
                Be the first to share your experience.
              </div>
            )}
          </section>
        </div>
      </DetailLayout>
    </main>
  );
}
