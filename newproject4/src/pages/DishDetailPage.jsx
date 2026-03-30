import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import UserReviewForm from "../components/UserReviewForm";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { fetchPublicDishDetail } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatPrice(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function formatCompactNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function formatDate(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function storeStatus(store) {
  if (store.storeDisabled) {
    return "Store unavailable";
  }

  if (store.storeOpen) {
    return "Serving now";
  }

  return "Updating";
}

function rankStoreForCart(store) {
  const availability = getCartAvailabilityDecision(store);
  return {
    store,
    availability,
    score: availability.allowed ? (availability.preorderOnly ? 1 : 2) : 0,
  };
}

export default function DishDetailPage() {
  const auth = useAuth();
  const { itemId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    addToCart,
    isFavorite,
    toggleFavorite,
    getCurrentUserReview,
    submitReview,
    deleteReview,
  } = useSiteData();
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
      const response = await fetchPublicDishDetail(itemId, {
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
      });

      setDishDetail(response);
    } catch (requestError) {
      setError(requestError.message || "Unable to load item details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDishDetail();
  }, [itemId, userLocation]);

  const dish = dishDetail?.dish ?? null;
  const category = dishDetail?.category ?? null;
  const stats = dishDetail?.stats ?? {
    averageRating: 0,
    reviewCount: 0,
    orderCount: 0,
    favoriteCount: 0,
    totalStock: 0,
  };
  const availableStores = dishDetail?.stores ?? [];
  const itemReviews = dishDetail?.reviews ?? [];
  const relatedItems = dishDetail?.relatedDishes ?? [];

  const selectedStore = useMemo(
    () => availableStores.find((store) => String(store.id) === String(selectedStoreId)) ?? null,
    [availableStores, selectedStoreId],
  );
  const selectedStoreAvailability = useMemo(
    () => (selectedStore ? getCartAvailabilityDecision(selectedStore) : null),
    [selectedStore],
  );

  useEffect(() => {
    if (!availableStores.length) {
      setSelectedStoreId("");
      return;
    }

    const queryStoreId = searchParams.get("store");

    if (queryStoreId && availableStores.some((store) => String(store.id) === queryStoreId)) {
      setSelectedStoreId(queryStoreId);
      return;
    }

    setSelectedStoreId(String(availableStores[0].id));
  }, [availableStores, searchParams]);

  useEffect(() => {
    if (!selectedStore) {
      return;
    }

    const maxStock = selectedStore.stock || 1;
    setQuantity((currentQuantity) => Math.min(Math.max(1, currentQuantity), maxStock));
  }, [selectedStore]);

  const locateStores = async () => {
    setLocating(true);
    setLocationMessage("Getting your current location...");

    try {
      const nextLocation = await requestCurrentLocation();
      setUserLocation(nextLocation);
      setLocationMessage("Distance calculated from your current location.");
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

  const resolveDishQuickAddPayload = async (dishIdValue) => {
    const response = await fetchPublicDishDetail(dishIdValue, {
      lat: userLocation?.latitude,
      lng: userLocation?.longitude,
    });

    const rankedStores = response.stores.map(rankStoreForCart).sort((left, right) => right.score - left.score);
    const selectedCandidate = rankedStores.find(
      ({ store, availability }) =>
        String(store.id) === String(selectedStore?.id) && availability.allowed,
    );
    const fallbackCandidate = selectedCandidate ?? rankedStores[0] ?? null;
    const fallbackStore = fallbackCandidate?.store ?? null;
    const fallbackAvailability = fallbackCandidate?.availability ?? {
      allowed: false,
      preorderOnly: false,
      reason: "",
    };

    if (!fallbackStore) {
      return {
        blocked: true,
        blockedMessage: "No store is currently serving this item.",
      };
    }

    if (!fallbackAvailability.allowed) {
      return {
        dishId: dishIdValue,
        storeId: fallbackStore.id,
        blocked: true,
        blockedMessage:
          fallbackAvailability.reason || "This item is not ready across the available stores yet.",
      };
    }

    return {
      dishId: dishIdValue,
      storeId: fallbackStore.id,
      quantity: 1,
      preorderOnly: fallbackAvailability.preorderOnly,
      preorderMessage: getCartSuccessMessage(fallbackAvailability.preorderOnly),
    };
  };

  const handleSelectStore = (storeIdValue) => {
    setSelectedStoreId(storeIdValue);
    setSearchParams({ store: storeIdValue }, { replace: true });
  };

  const handleAddToCart = async () => {
    if (!dish || !selectedStore) {
      setCartMessage("Please choose a store before adding this item to the cart.");
      return;
    }

    if (auth.isAuthenticated && !auth.hasRole("USER")) {
      setCartMessage("Only USER accounts can add items to the cart.");
      return;
    }

    if (!selectedStoreAvailability?.allowed) {
      setCartMessage(selectedStoreAvailability?.reason || "This item cannot be added to the cart yet.");
      return;
    }

    const result = await addToCart({
      itemId: dish.id,
      storeId: selectedStore.id,
      quantity,
    });

    setCartMessage(
      result.ok
        ? getCartSuccessMessage(selectedStoreAvailability.preorderOnly)
        : result.message,
    );
  };

  const handleToggleFavorite = async () => {
    const result = await toggleFavorite("dish", itemId);
    setCartMessage(result.message);

    if (result.ok) {
      await loadDishDetail();
    }
  };

  const handleSubmitReview = async (payload) => {
    const result = await submitReview({
      ...payload,
      targetType: "dish",
      targetId: itemId,
    });

    if (result.ok) {
      await loadDishDetail();
    }

    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);

    if (result.ok) {
      await loadDishDetail();
    }

    return result;
  };

  if (loading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading item details...
          </div>
        </section>
      </main>
    );
  }

  if (error || !dish) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <p className={ui.eyebrow}>Menu</p>
          <h1 className={ui.bannerTitle}>Item not found</h1>
          <p className={ui.copy}>{error || "This item does not have data yet."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {category ? (
              <Link className={ui.secondaryButton} to={`/menu?category=${category.id}`}>
                {category.title}
              </Link>
            ) : null}
          </div>

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

        <div className="mt-6 grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="grid gap-5 content-start">
            <div>
              <p className={ui.eyebrow}>Menu</p>
              <h1 className={ui.bannerTitle}>{dish.name}</h1>
              <p className="mt-4 text-base font-semibold text-matcha-700">
                {category?.title ?? dish.categoryName ?? "Tea Matcha"}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">{dish.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {dish.franchiseRequired ? <span className={ui.pill}>Required item</span> : null}
              <span
                className={
                  stats.totalStock
                    ? ui.pill
                    : "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                }
              >
                {stats.totalStock ? `${stats.totalStock} cups left` : "Sold out"}
              </span>
              <span className={ui.pill}>{stats.favoriteCount} saves</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: "Price", value: formatPrice(dish.price) },
                {
                  label: "Rating",
                  value: stats.reviewCount ? `${stats.averageRating.toFixed(1)} stars` : "No reviews yet",
                },
                { label: "Sold", value: formatCompactNumber(stats.orderCount) },
                { label: "Favorites", value: formatCompactNumber(stats.favoriteCount) },
              ].map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-[1.3rem] border border-matcha-900/10 bg-white/72 p-4"
                >
                  <strong className="block text-2xl font-bold text-tea-900">{stat.value}</strong>
                  <span className="mt-1 block text-sm text-stone-600">{stat.label}</span>
                </article>
              ))}
            </div>

            <section className="grid gap-3 rounded-[1.6rem] border border-matcha-900/10 bg-matcha-500/10 p-5 text-sm leading-7 text-stone-700">
              <strong className="text-base text-tea-900">Item details</strong>
              {dish.franchiseNote ? <p>{dish.franchiseNote}</p> : null}
              {dish.note ? <p>Taste note: {dish.note}</p> : null}
              {locationMessage ? <p>{locationMessage}</p> : null}
            </section>

            <ContentSectionsBlock
              sections={dish.sections}
              eyebrow="Dish story"
              title="More about this item"
              description="These sections come from the shared backend content blocks for the dish."
            />

            <div className="flex flex-wrap gap-3">
              <button
                className={isFavorite("dish", dish.id) ? ui.primaryButton : ui.secondaryButton}
                type="button"
                onClick={handleToggleFavorite}
              >
                {isFavorite("dish", dish.id) ? "Saved" : "Save item"}
              </button>
            </div>

            {relatedItems.length ? (
              <section className="grid gap-3 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-base text-tea-900">More from this category</strong>
                  {category ? (
                    <Link className={ui.secondaryButton} to={`/menu?category=${category.id}`}>
                      View category
                    </Link>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  {relatedItems.map((relatedItem) => (
                    <article
                      key={relatedItem.id}
                      className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f5ef] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <Link
                            className="font-semibold text-tea-900 transition hover:text-matcha-700"
                            to={`/menu/${relatedItem.id}`}
                          >
                            {relatedItem.name}
                          </Link>
                          {relatedItem.note ? (
                            <p className="mt-1 text-sm text-stone-600">{relatedItem.note}</p>
                          ) : null}
                        </div>
                        <strong className="text-matcha-700">{formatPrice(relatedItem.price)}</strong>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <QuickAddToCartButton
                          className={ui.primaryButton}
                          resolvePayload={() => resolveDishQuickAddPayload(relatedItem.id)}
                          blocked={!selectedStore && !availableStores.length}
                          blockedMessage="No store is currently available for adding this item to the cart."
                          onResult={(message) => setCartMessage(message)}
                        />
                        <QuickFavoriteButton
                          targetType="dish"
                          targetId={relatedItem.id}
                          activeLabel="Saved"
                          inactiveLabel="Save item"
                          onResult={(message) => setCartMessage(message)}
                        />
                        <Link className={ui.secondaryButton} to={`/menu/${relatedItem.id}`}>
                          View item
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="grid gap-5 content-start">
            <MediaLibrary
              images={dish.imagePaths}
              alt={dish.name}
              badge="Tea Matcha"
              heroClassName="h-[24rem] sm:h-[30rem]"
              thumbnailClassName="h-24"
            />

            <section className="grid gap-4 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Order
                  </span>
                  <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                    Choose a store and quantity
                  </h2>
                </div>
                <span className={ui.pill}>
                  {formatCompactNumber(availableStores.length)} stores
                </span>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Store
                </span>
                <select
                  className={ui.input}
                  value={selectedStoreId}
                  onChange={(event) => handleSelectStore(event.target.value)}
                >
                  {availableStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedStore ? (
                <div className="grid gap-3 rounded-[1.25rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 text-sm leading-7 text-stone-700">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={
                        selectedStore.storeDisabled
                          ? "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                          : ui.pill
                      }
                    >
                      {storeStatus(selectedStore)}
                    </span>
                    <span
                      className={
                        !selectedStoreAvailability?.allowed
                          ? "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                          : ui.pill
                      }
                    >
                      {Number(selectedStore.stock ?? 0) > 0
                        ? `${selectedStore.stock} cups left`
                        : "Sold out"}
                    </span>
                    {selectedStoreAvailability?.preorderOnly ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                        Preorder only
                      </span>
                    ) : null}
                    {selectedStore.distanceKm !== null && selectedStore.distanceKm !== undefined ? (
                      <span className={ui.pill}>{formatDistanceKm(selectedStore.distanceKm)}</span>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <span>{selectedStore.name}</span>
                    <span>{selectedStore.address || "Address updating"}</span>
                    <span>Store price: {formatPrice(selectedStore.price || dish.price)}</span>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[160px_auto] sm:items-end">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Quantity
                  </span>
                  <input
                    className={ui.input}
                    type="number"
                    min="1"
                    max={selectedStore?.stock ?? 1}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Math.max(1, Number(event.target.value || 1)))
                    }
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    className={ui.primaryButton}
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedStore || !selectedStoreAvailability?.allowed}
                  >
                    Add to cart
                  </button>
                </div>
              </div>

              {cartMessage ? <p className="text-sm leading-7 text-stone-600">{cartMessage}</p> : null}
            </section>

            <section className="grid gap-3 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-base text-tea-900">All stores currently selling this item</strong>
                <span className={ui.pill}>Sorted by distance</span>
              </div>

              <div className="grid gap-3">
                {availableStores.map((store) => (
                  (() => {
                    const availability = getCartAvailabilityDecision(store);

                    return (
                  <article
                    key={store.id}
                    className={`rounded-[1.2rem] border p-4 ${
                      !availability.allowed
                        ? "border-stone-300/70 bg-stone-100/90"
                        : "border-matcha-900/10 bg-[#f8f5ef]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-tea-900">{store.name}</p>
                        <p className="mt-1 text-sm text-stone-600">{store.area}</p>
                      </div>
                      <div className="text-right text-sm text-stone-600">
                        <p>
                          {store.distanceKm !== null && store.distanceKm !== undefined
                            ? formatDistanceKm(store.distanceKm)
                            : "Not calculated"}
                        </p>
                        <p className="mt-1">
                          {Number(store.stock ?? 0) > 0 ? `${store.stock} cups left` : "Sold out"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={
                          store.storeDisabled
                            ? "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                            : ui.pill
                        }
                      >
                        {storeStatus(store)}
                      </span>
                      {availability.preorderOnly ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                          Preorder only
                        </span>
                      ) : null}
                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => handleSelectStore(store.id)}
                      >
                        Choose this store
                      </button>
                      <Link className={ui.secondaryButton} to={buildStorePath(store)}>
                        View store
                      </Link>
                    </div>
                  </article>
                    );
                  })()
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Reviews</p>
            <h2 className={ui.sectionTitle}>What customers say about this item</h2>
          </div>
          <span className={ui.pill}>{formatCompactNumber(itemReviews.length)} reviews</span>
        </div>

        <div className="mt-6">
          <UserReviewForm
            title="Write a review for this item"
            existingReview={getCurrentUserReview("dish", itemId)}
            canSubmit={auth.hasRole("USER")}
            onSubmit={handleSubmitReview}
            onDelete={handleDeleteReview}
          />
        </div>

        {itemReviews.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {itemReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-tea-900">{review.title}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {review.userName || review.userEmail || "Tea Matcha guest"} -{" "}
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <span className={ui.pill}>{Number(review.rating).toFixed(1)} stars</span>
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-600">{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            This item does not have any reviews yet.
          </div>
        )}
      </section>
    </main>
  );
}
