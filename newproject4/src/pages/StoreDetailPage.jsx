import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import SmartImage from "../components/SmartImage";
import UserReviewForm from "../components/UserReviewForm";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import { fetchPublicStoreDetail } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { buildStoreEventsPath, buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatCompactNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function formatPrice(value, priceDisplay = "") {
  if (priceDisplay) {
    return priceDisplay;
  }

  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function formatTimeText(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  return text.slice(0, 5);
}

function formatStoreHours(store) {
  if (store?.hoursText) {
    return store.hoursText;
  }

  const openTime = formatTimeText(store?.openTime);
  const closeTime = formatTimeText(store?.closeTime);

  if (openTime && closeTime) {
    return `Open ${openTime} - ${closeTime}`;
  }

  return "";
}

function formatServiceTag(tag) {
  return String(tag ?? "")
    .replace(/[-_]+/g, " ")
    .trim();
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
  if (store?.disabled) {
    return store.disabledReason || "Temporarily unavailable";
  }

  if (store?.open) {
    return "Serving now";
  }

  return "Updating";
}

export default function StoreDetailPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { storeKey } = useParams();
  const { addToCart, isFavorite, toggleFavorite, getCurrentUserReview, submitReview, deleteReview } =
    useSiteData();
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
      const response = await fetchPublicStoreDetail(storeKey, {
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
      });

      setStoreDetail(response);
    } catch (requestError) {
      setError(requestError.message || "Unable to load store details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreDetail();
  }, [storeKey, userLocation]);

  const store = storeDetail?.store ?? null;
  const storeHours = formatStoreHours(store);
  const stats = storeDetail?.stats ?? {
    averageRating: 0,
    reviewCount: 0,
    favoriteCount: 0,
    availableItemCount: 0,
  };
  const categories = storeDetail?.categories ?? [];
  const storeEvents = storeDetail?.events ?? [];
  const storeReviews = storeDetail?.reviews ?? [];

  useEffect(() => {
    if (!categories.length) {
      setExpandedCategoryId("");
      return;
    }

    setExpandedCategoryId((currentId) =>
      categories.some((category) => category.id === currentId) ? currentId : categories[0].id,
    );
  }, [categories]);

  useEffect(() => {
    if (!store?.slug || !storeKey || store.slug === storeKey) {
      return;
    }

    navigate(buildStorePath(store), { replace: true });
  }, [navigate, store, storeKey]);

  const locateStore = async () => {
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

  const handleQuickAddToCart = async (item) => {
    if (!store) {
      return;
    }

    if (auth.isAuthenticated && !auth.hasRole("USER")) {
      setCartMessage("Only USER accounts can add items to the cart.");
      return;
    }

    if (store.disabled) {
      setCartMessage(store.disabledReason || "This store is currently closed.");
      return;
    }

    const availability = getCartAvailabilityDecision({
      ...item,
      open: store.open,
      storeDisabled: store.disabled,
      disabledReason: store.disabledReason,
    });

    if (!availability.allowed) {
      setCartMessage(availability.reason || "This item cannot be added to the cart yet.");
      return;
    }

    const result = await addToCart({
      itemId: item.id,
      storeId: store.id,
      quantity: 1,
    });

    setCartMessage(result.ok ? getCartSuccessMessage(availability.preorderOnly) : result.message);
  };

  const handleToggleFavorite = async () => {
    const result = await toggleFavorite("store", store.id);
    setActionMessage(result.message);

    if (result.ok) {
      await loadStoreDetail();
    }
  };

  const handleSubmitReview = async (payload) => {
    const result = await submitReview({
      ...payload,
      targetType: "store",
      targetId: store.id,
    });

    if (result.ok) {
      await loadStoreDetail();
    }

    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);

    if (result.ok) {
      await loadStoreDetail();
    }

    return result;
  };

  const jumpToEvents = () => {
    eventsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading store details...
          </div>
        </section>
      </main>
    );
  }

  if (error || !store) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <p className={ui.eyebrow}>Store</p>
          <h1 className={ui.bannerTitle}>Store not found</h1>
          <p className={ui.copy}>{error || "This store does not have data yet."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                store.disabled
                  ? "inline-flex items-center rounded-full bg-stone-300/60 px-4 py-2 text-sm font-semibold text-stone-700"
                  : ui.pill
              }
            >
              {storeStatus(store)}
            </span>
          </div>

        </div>

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

        <div className="mt-6 grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="grid gap-5 content-start">
            <div>
              <p className={ui.eyebrow}>Store</p>
              <h1 className={ui.bannerTitle}>{store.name}</h1>
              {store.positionLabel ? (
                <p className="mt-4 text-base font-semibold text-matcha-700">
                  {store.positionLabel}
                </p>
              ) : null}
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                {store.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {store.area ? <span className={ui.pill}>{store.area}</span> : null}
              {storeHours ? <span className={ui.pill}>{storeHours}</span> : null}
              {store.specialty ? <span className={ui.pill}>Featured: {store.specialty}</span> : null}
              <span className={ui.pill}>{stats.favoriteCount} saves</span>
              {typeof store.distanceKm === "number" ? (
                <span className={ui.pill}>{formatDistanceKm(store.distanceKm)}</span>
              ) : null}
            </div>

            {store.serviceTags?.length ? (
              <div className="flex flex-wrap gap-3">
                {store.serviceTags.map((tag) => (
                  <span key={`${store.id}-${tag}`} className={ui.pill}>
                    {formatServiceTag(tag)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Rating",
                  value: stats.reviewCount
                    ? `${stats.averageRating.toFixed(1)} stars`
                    : "No reviews yet",
                },
                { label: "Review count", value: formatCompactNumber(stats.reviewCount) },
                { label: "Favorites", value: formatCompactNumber(stats.favoriteCount) },
                { label: "Items available", value: formatCompactNumber(stats.availableItemCount) },
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

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Address", value: store.address || "Not available" },
                { label: "Area", value: store.area },
                { label: "Location", value: store.positionLabel },
                { label: "Hours", value: storeHours },
                { label: "Style", value: store.personality },
                { label: "Design signature", value: store.designSignature },
                { label: "Brand atmosphere", value: store.franchiseMood },
                { label: "Featured item", value: store.specialty },
                { label: "Email", value: store.contactEmail },
                { label: "Phone number", value: store.phoneNumber },
              ]
                .filter((entry) => entry.value)
                .map((entry) => (
                  <article
                    key={entry.label}
                    className="rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4"
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
                      {entry.label}
                    </span>
                    <strong className="mt-2 block text-sm leading-7 text-tea-900">
                      {entry.value}
                    </strong>
                  </article>
                ))}
            </div>

            <ContentSectionsBlock
              sections={store.sections}
              eyebrow="Store story"
              title="More about this branch"
              description="Detailed branch content is now driven directly from backend content sections."
            />

            {locationMessage ? <p className="text-sm leading-7 text-stone-600">{locationMessage}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                className={isFavorite("store", store.id) ? ui.primaryButton : ui.secondaryButton}
                type="button"
                onClick={handleToggleFavorite}
              >
                {isFavorite("store", store.id) ? "Saved" : "Save store"}
              </button>
              {storeEvents.length ? (
                <button className={ui.secondaryButton} type="button" onClick={jumpToEvents}>
                  Events
                </button>
              ) : null}
              {storeEvents.length ? (
                <Link className={ui.secondaryButton} to={buildStoreEventsPath(store)}>
                  View event list
                </Link>
              ) : null}
            </div>

            {actionMessage ? <p className="text-sm leading-7 text-stone-600">{actionMessage}</p> : null}

            {storeEvents.length ? (
              <section
                ref={eventsSectionRef}
                className="grid gap-3 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-base text-tea-900">Store events</strong>
                  <Link className={ui.secondaryButton} to={buildStoreEventsPath(store)}>
                    View event schedule
                  </Link>
                </div>

                <div className="grid gap-3">
                  {storeEvents.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f5ef] p-4"
                    >
                      <Link
                        className="font-semibold text-tea-900 transition hover:text-matcha-700"
                        to={buildEventPath(event)}
                      >
                        {event.title}
                      </Link>
                      <p className="mt-1 text-sm text-stone-600">
                        {event.schedule || event.location}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="grid gap-5 content-start">
            <MediaLibrary
              images={store.imagePaths}
              alt={store.name}
              badge="Tea Matcha"
              heroClassName="h-[24rem] sm:h-[32rem]"
              thumbnailClassName="h-24"
            />

            <section className="grid gap-4 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Categories
                  </span>
                  <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                    Menu at this store
                  </h2>
                </div>
                <span className={ui.pill}>
                  {formatCompactNumber(categories.length)} categories
                </span>
              </div>

              {cartMessage ? <p className="text-sm leading-7 text-stone-600">{cartMessage}</p> : null}

              <div className="grid gap-3">
                {categories.map((category) => {
                  const isExpanded = expandedCategoryId === category.id;

                  return (
                    <section
                      key={category.id}
                      className="overflow-hidden rounded-[1.4rem] border border-matcha-900/10 bg-[#f8f5ef]"
                    >
                      <button
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                        type="button"
                        onClick={() =>
                          setExpandedCategoryId((currentId) =>
                            currentId === category.id ? "" : category.id,
                          )
                        }
                      >
                        <div>
                          <p className="text-lg font-semibold text-tea-900">{category.title}</p>
                          <p className="mt-1 text-sm text-stone-600">
                            {category.items.length} items -{" "}
                            {category.reviewCount
                              ? `${category.averageRating.toFixed(1)} stars`
                              : "no reviews yet"}
                          </p>
                          {category.description ? (
                            <p className="mt-2 text-sm leading-7 text-stone-600">
                              {category.description}
                            </p>
                          ) : null}
                        </div>
                        <span className={ui.pill}>{isExpanded ? "Collapse" : "Open"}</span>
                      </button>

                      {isExpanded ? (
                        <div className="grid gap-3 border-t border-matcha-900/10 px-5 py-5">
                          {category.items.map((item) => (
                            (() => {
                              const availability = getCartAvailabilityDecision({
                                ...item,
                                open: store.open,
                                storeDisabled: store.disabled,
                                disabledReason: store.disabledReason,
                              });

                              return (
                            <article
                              key={item.id}
                              className={`grid gap-4 rounded-[1.25rem] border p-4 ${
                                !availability.allowed
                                  ? "border-stone-300/70 bg-stone-100/90 opacity-70"
                                  : "border-matcha-900/10 bg-white/80"
                              }`}
                            >
                              <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
                                <div className="overflow-hidden rounded-[1rem] border border-matcha-900/10 bg-stone-100">
                                  <SmartImage
                                    className="h-28 w-full object-cover"
                                    src={item.imagePaths?.[0]}
                                    alt={item.name}
                                    loading="lazy"
                                    fallbackClassName="grid h-28 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                                  />
                                </div>

                                <div className="grid gap-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold text-tea-900">{item.name}</h3>
                                        {item.franchiseRequired ? (
                                          <span className={ui.pill}>Required item</span>
                                        ) : null}
                                        <span
                                          className={
                                            !availability.allowed
                                              ? "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                                              : ui.pill
                                          }
                                        >
                                          {item.stock > 0 ? `${item.stock} cups left` : "Sold out"}
                                        </span>
                                        {availability.preorderOnly ? (
                                          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                                            Preorder only
                                          </span>
                                        ) : null}
                                      </div>
                                      {item.note ? (
                                        <p className="mt-1 text-sm text-stone-600">{item.note}</p>
                                      ) : null}
                                    </div>
                                    <strong className="text-lg font-bold text-matcha-700">
                                      {formatPrice(item.price, item.priceDisplay)}
                                    </strong>
                                  </div>

                                  <div className="grid gap-3 sm:grid-cols-4">
                                    {[
                                      {
                                        label: "Average rating",
                                        value: item.reviewCount
                                          ? `${item.averageRating.toFixed(1)} stars`
                                          : "No reviews yet",
                                      },
                                      { label: "Sold", value: formatCompactNumber(item.orderCount) },
                                      {
                                        label: "Favorites",
                                        value: formatCompactNumber(item.favoriteCount),
                                      },
                                      { label: "In stock", value: formatCompactNumber(item.stock) },
                                    ].map((stat) => (
                                      <div
                                        key={stat.label}
                                        className="rounded-[1rem] border border-matcha-900/10 bg-white/80 p-3"
                                      >
                                        <strong className="block text-lg font-bold text-tea-900">
                                          {stat.value}
                                        </strong>
                                        <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-stone-500">
                                          {stat.label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  <p className="text-sm leading-7 text-stone-600">{item.description}</p>

                                  <div className="flex flex-wrap gap-3">
                                    <button
                                      className={ui.primaryButton}
                                      type="button"
                                      onClick={() => handleQuickAddToCart(item)}
                                      disabled={!availability.allowed}
                                    >
                                      Add to cart
                                    </button>
                                    <Link
                                      className={ui.secondaryButton}
                                      to={`/menu/${item.id}?store=${store.id}`}
                                    >
                                      View item
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </article>
                              );
                            })()
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ui.eyebrow}>Reviews</p>
            <h2 className={ui.sectionTitle}>What customers say about this store</h2>
          </div>
          <span className={ui.pill}>{formatCompactNumber(storeReviews.length)} reviews</span>
        </div>

        <div className="mt-6">
          <UserReviewForm
            title="Write a review for this store"
            existingReview={getCurrentUserReview("store", store.id)}
            canSubmit={auth.hasRole("USER")}
            onSubmit={handleSubmitReview}
            onDelete={handleDeleteReview}
          />
        </div>

        {storeReviews.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {storeReviews.map((review) => (
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
            This store does not have any reviews yet.
          </div>
        )}
      </section>
    </main>
  );
}
