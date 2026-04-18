import { useEffect, useMemo, useState } from "react";
import DetailModal from "../components/DetailModal";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import DistanceOriginControls from "../components/DistanceOriginControls";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import UserReviewForm from "../components/UserReviewForm";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import { formatDateTimeVn } from "../lib/locale";
import { fetchPublicEvents, fetchPublicReviews } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { geocodeAddress, requestCurrentLocation } from "../lib/locationLookup";
import { buildStorePath } from "../lib/storeRouting";
import { getCurrentDateTimeLocalValue, isEventActiveAt } from "../lib/timeFilters";
import { ui } from "../ui";

function formatDateTime(value) {
  return formatDateTimeVn(value, "Schedule unavailable");
}

function mapSortKey(sortKey, hasLocation) {
  switch (sortKey) {
    case "rating-desc":
      return "rating_desc";
    case "date-asc":
      return "date_asc";
    case "distance-asc":
      return hasLocation ? "distance_asc" : "date_desc";
    case "date-desc":
    default:
      return "date_desc";
  }
}

function statusLabel(event) {
  if (event.disabled) {
    return event.disabledReason || "Locked";
  }

  if (event.remainingSlots > 0) {
    return `${event.remainingSlots} slots left`;
  }

  return "Updating";
}

function normalizeStoreKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getEventStoreKey(event) {
  return (
    event.storeSlug ||
    event.store?.slug ||
    event.store?.storeSlug ||
    event.storeId ||
    event.store?.id ||
    ""
  );
}

function matchesStore(event, storeKey) {
  const normalizedKey = normalizeStoreKey(storeKey);

  if (!normalizedKey) {
    return true;
  }

  return normalizeStoreKey(getEventStoreKey(event)) === normalizedKey;
}

export default function EventsPage() {
  const location = useLocation();
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isFavorite, toggleFavorite, getCurrentUserReview, submitReview, deleteReview } = useSiteData();
  const [sortKey, setSortKey] = useState("date-desc");
  const [timeFilterMode, setTimeFilterMode] = useState("all");
  const [customDateTime, setCustomDateTime] = useState(getCurrentDateTimeLocalValue());
  const [addressQuery, setAddressQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [reviewModalEventId, setReviewModalEventId] = useState("");
  const [eventReviewsMap, setEventReviewsMap] = useState({});
  const [reviewsLoadingId, setReviewsLoadingId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const selectedStoreKey = searchParams.get("store") ?? "";

  const loadEvents = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchPublicEvents({
        sort: mapSortKey(sortKey, Boolean(userLocation)),
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
        page: 0,
        size: 100,
      });

      setEvents(response.items);
    } catch (requestError) {
      setError(requestError.message || "Unable to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [location, sortKey, userLocation]);

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesStore(event, selectedStoreKey)),
    [events, selectedStoreKey],
  );

  const timeFilteredEvents = useMemo(() => {
    if (timeFilterMode === "all") {
      return filteredEvents;
    }

    const targetDate = timeFilterMode === "now" ? new Date() : new Date(customDateTime);
    return filteredEvents.filter((event) => isEventActiveAt(event, targetDate));
  }, [customDateTime, filteredEvents, timeFilterMode]);

  const storeOptions = useMemo(() => {
    const uniqueStores = new Map();

    events.forEach((event) => {
      const storeKey = getEventStoreKey(event);
      const normalizedKey = normalizeStoreKey(storeKey);

      if (!normalizedKey || uniqueStores.has(normalizedKey)) {
        return;
      }

      uniqueStores.set(normalizedKey, {
        value: String(storeKey),
        label: event.store?.name || event.storeName || `Store ${storeKey}`,
      });
    });

    return Array.from(uniqueStores.values()).sort((left, right) =>
      left.label.localeCompare(right.label, "vi"),
    );
  }, [events]);

  const selectedStoreName = useMemo(() => {
    const matchedEvent = filteredEvents.find((event) => matchesStore(event, selectedStoreKey));
    return matchedEvent?.store?.name || matchedEvent?.storeName || selectedStoreKey;
  }, [filteredEvents, selectedStoreKey]);

  const handleStoreFilterChange = (nextValue) => {
    const nextParams = new URLSearchParams(searchParams);

    if (!nextValue) {
      nextParams.delete("store");
    } else {
      nextParams.set("store", nextValue);
    }

    setSearchParams(nextParams);
  };

  const locateEventStores = async () => {
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

  const loadEventReviews = async (eventId, forceRefresh = false) => {
    const normalizedEventId = String(eventId ?? "");

    if (!normalizedEventId) {
      return [];
    }

    if (!forceRefresh && Array.isArray(eventReviewsMap[normalizedEventId])) {
      return eventReviewsMap[normalizedEventId];
    }

    setReviewsLoadingId(normalizedEventId);

    try {
      const response = await fetchPublicReviews({
        targetType: "EVENT",
        targetId: normalizedEventId,
        sort: "date_desc",
        page: 0,
        size: 20,
      });

      const nextItems = response.items ?? [];
      setEventReviewsMap((current) => ({
        ...current,
        [normalizedEventId]: nextItems,
      }));
      return nextItems;
    } catch (reviewError) {
      setActionMessage(reviewError.message || "Unable to load event reviews.");
      return [];
    } finally {
      setReviewsLoadingId((current) => (current === normalizedEventId ? "" : current));
    }
  };

  const handleOpenReviewModal = async (event) => {
    const nextEventId = String(event?.id ?? "");

    if (!nextEventId) {
      return;
    }

    setReviewModalEventId(nextEventId);
    await loadEventReviews(nextEventId);
  };

  const handleCloseReviewModal = () => {
    setReviewModalEventId("");
  };

  const handleToggleFavorite = async (eventId) => {
    const result = await toggleFavorite("event", eventId);
    setActionMessage(result.message);

    if (result.ok) {
      await loadEvents();
    }
  };

  const handleSubmitReview = async (eventId, payload) => {
    const result = await submitReview({
      ...payload,
      targetType: "event",
      targetId: eventId,
    });

    if (result.ok) {
      await Promise.all([loadEvents(), loadEventReviews(eventId, true)]);
    }

    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);

    if (result.ok) {
      await Promise.all([loadEvents(), loadEventReviews(review.targetId, true)]);
    }

    return result;
  };

  const activeReviewEvent = useMemo(
    () =>
      events.find((event) => String(event.id) === String(reviewModalEventId)) ??
      null,
    [events, reviewModalEventId],
  );
  const activeEventReviews = useMemo(() => {
    if (!activeReviewEvent) {
      return [];
    }

    return eventReviewsMap[String(activeReviewEvent.id)] ?? activeReviewEvent.reviews ?? [];
  }, [activeReviewEvent, eventReviewsMap]);
  const activeReviewLoading =
    Boolean(activeReviewEvent) && reviewsLoadingId === String(activeReviewEvent.id);

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Events</p>
        <h1 className={ui.bannerTitle}>Store events</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          See the schedule, remaining slots, and the host store.
        </p>

        {selectedStoreKey ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={ui.pill}>Filtering by store: {selectedStoreName}</span>
            <Link className={ui.secondaryButton} to="/events">
              View all events
            </Link>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 lg:grid-cols-[220px_280px_220px_240px]">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Sort
            </span>
            <select
              className={ui.input}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Soonest first</option>
              <option value="rating-desc">Highest rated</option>
              <option value="distance-asc">Nearest first</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Store filter
            </span>
            <select
              className={ui.input}
              value={selectedStoreKey}
              onChange={(event) => handleStoreFilterChange(event.target.value)}
            >
              <option value="">All stores</option>
              {storeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              By time
            </span>
            <select
              className={ui.input}
              value={timeFilterMode}
              onChange={(event) => setTimeFilterMode(event.target.value)}
            >
              <option value="all">All</option>
              <option value="now">Happening now</option>
              <option value="custom">Happening at selected time</option>
            </select>
          </label>

          {timeFilterMode === "custom" ? (
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Date and time to filter
              </span>
              <input
                className={ui.input}
                type="datetime-local"
                value={customDateTime}
                onChange={(event) => setCustomDateTime(event.target.value)}
              />
            </label>
          ) : null}
        </div>

        <DistanceOriginControls
          addressValue={addressQuery}
          onAddressChange={setAddressQuery}
          onUseAddress={handleUseAddress}
          onUseCurrentLocation={locateEventStores}
          onClearLocation={clearLocation}
          addressLoading={geocoding}
          currentLocationLoading={locating}
          hasLocation={Boolean(userLocation)}
        />

        {locationMessage ? <p className="mt-4 text-sm leading-7 text-stone-600">{locationMessage}</p> : null}
        {timeFilterMode === "now" ? (
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Filtering events by stores that are open and events happening right now.
          </p>
        ) : null}
        {timeFilterMode === "custom" ? (
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Filtering events by stores that are open and events happening at {customDateTime}.
          </p>
        ) : null}
        {actionMessage ? <p className="mt-2 text-sm leading-7 text-stone-600">{actionMessage}</p> : null}
        {error ? <p className="mt-2 text-sm leading-7 text-stone-600">{error}</p> : null}
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading events...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="grid gap-6">
          {timeFilteredEvents.map((event) => (
            (() => {
              const eventPath = buildEventPath(event);
              const canOpenEvent = eventPath !== "/events";

              return (
                <article
                  key={event.id}
                  className={`${ui.card} grid gap-6 xl:grid-cols-[0.92fr_1.08fr] ${
                    event.disabled ? "border-stone-300/70" : ""
                  }`}
                >
                  <MediaLibrary
                    images={event.imagePaths}
                    alt={event.title}
                    badge={event.schedule || event.location}
                    heroClassName="h-full min-h-[20rem]"
                    thumbnailClassName="h-20"
                  />

                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          event.disabled
                            ? "inline-flex items-center rounded-full bg-stone-300/60 px-3 py-1.5 text-xs font-semibold text-stone-700"
                            : ui.pill
                        }
                      >
                        {statusLabel(event)}
                      </span>
                      <span className={ui.pill}>
                        {event.reviewCount ? `${event.averageRating.toFixed(1)} stars` : "No reviews yet"}
                      </span>
                      <span className={ui.pill}>{event.favoriteCount} saves</span>
                      {event.distanceKm !== null && event.distanceKm !== undefined ? (
                        <span className={ui.pill}>{formatDistanceKm(event.distanceKm)}</span>
                      ) : null}
                    </div>

                    <div>
                      {canOpenEvent ? (
                        <Link
                          className="text-3xl font-semibold text-tea-900 transition hover:text-matcha-700"
                          to={eventPath}
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <h2 className="text-3xl font-semibold text-tea-900">{event.title}</h2>
                      )}
                      <p className="mt-2 text-base font-semibold text-matcha-700">
                        {event.location || event.store?.name}
                      </p>
                      <p className="mt-4 text-sm leading-7 text-stone-600">{event.summary}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-4">
                      {[
                        { label: "Reviews", value: event.reviewCount || 0 },
                        { label: "Slots left", value: event.remainingSlots || 0 },
                        { label: "Store", value: event.store?.name || event.storeName || "Not available" },
                        { label: "Featured items", value: event.featuredDishes.length },
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

                    <div className="grid gap-2 text-sm leading-7 text-stone-600">
                      <span>Starts: {formatDateTime(event.startsAt)}</span>
                      <span>Ends: {formatDateTime(event.endsAt)}</span>
                      <span>Store: {event.store?.name || event.storeName || "Not available"}</span>
                      {event.disabledReason ? <span>Status: {event.disabledReason}</span> : null}
                    </div>

                    {event.featuredDishes.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {event.featuredDishes.map((item) => (
                          <article
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-matcha-900/10 bg-white/72 px-4 py-3"
                          >
                            <Link
                              className="font-semibold text-tea-900 transition hover:text-matcha-700"
                              to={`/menu/${item.id}`}
                            >
                              {item.name}
                            </Link>

                            <QuickAddToCartButton
                              className={ui.secondaryButton}
                              dishId={item.id}
                              storeId={event.store?.id || event.storeId}
                              blocked={
                                !(event.store?.id || event.storeId) ||
                                event.store?.disabled === true
                              }
                              preorderOnly={event.store?.open === false}
                              preorderMessage={getCartSuccessMessage(event.store?.open === false)}
                              blockedMessage="This item cannot be added to the cart from the event store right now."
                              onResult={(message) => setActionMessage(message)}
                            />
                          </article>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <button
                        className={isFavorite("event", event.id) ? ui.primaryButton : ui.secondaryButton}
                        type="button"
                        onClick={() => handleToggleFavorite(event.id)}
                      >
                        {isFavorite("event", event.id) ? "Saved" : "Save event"}
                      </button>
                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => handleOpenReviewModal(event)}
                      >
                        Reviews
                      </button>
                      {canOpenEvent ? (
                        <Link className={ui.secondaryButton} to={eventPath}>
                          View event
                        </Link>
                      ) : null}
                      {event.store?.id || event.storeId ? (
                        <Link
                          className={ui.primaryButton}
                          to={buildStorePath(
                            event.store?.slug || event.store?.storeSlug ? event.store : event,
                          )}
                        >
                          View store
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })()
          ))}

          {!timeFilteredEvents.length ? (
            <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
              {selectedStoreKey
                ? "No events match this store."
                : "No matching events found."}
            </article>
          ) : null}
        </section>
      ) : null}

      <DetailModal
        open={Boolean(activeReviewEvent)}
        onClose={handleCloseReviewModal}
        title={activeReviewEvent?.title || "Event reviews"}
        subtitle={activeReviewEvent?.summary || activeReviewEvent?.description || ""}
        badge={activeReviewEvent?.store?.name || activeReviewEvent?.storeName || "Event"}
        images={activeReviewEvent?.imagePaths}
        dialogClassName="max-w-6xl"
        bodyClassName="content-start"
        belowContent={
          activeReviewEvent ? (
            <section className="grid gap-4 rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-base text-tea-900">Event reviews</strong>
                <span className={ui.pill}>
                  {activeReviewEvent.reviewCount
                    ? `${activeReviewEvent.reviewCount} reviews`
                    : "None yet"}
                </span>
              </div>

              {activeReviewLoading ? (
                <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/50 p-4 text-sm text-stone-600">
                  Loading event reviews...
                </div>
              ) : activeEventReviews.length ? (
                <div className="grid gap-3">
                  {activeEventReviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f5ef] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-tea-900">
                            {review.title || "Untitled review"}
                          </p>
                          <p className="mt-1 text-sm text-stone-500">
                            {review.userName || review.userEmail || "Kamatcha guest"} -{" "}
                            {formatDateTime(review.createdAt)}
                          </p>
                        </div>
                        <span className={ui.pill}>
                          {Number(review.rating ?? 0).toFixed(1)} stars
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-stone-600">
                        {review.comment || "The user did not leave a detailed comment."}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/50 p-4 text-sm text-stone-600">
                  This event does not have any reviews yet.
                </div>
              )}
            </section>
          ) : null
        }
      >
        {activeReviewEvent ? (
          <>
            <div className="grid gap-3 rounded-[1.25rem] border border-matcha-900/10 bg-white/75 p-4 text-sm leading-7 text-stone-600">
              <span>Starts: {formatDateTime(activeReviewEvent.startsAt)}</span>
              <span>Ends: {formatDateTime(activeReviewEvent.endsAt)}</span>
              <span>
                Store: {activeReviewEvent.store?.name || activeReviewEvent.storeName || "Not available"}
              </span>
              <span>{statusLabel(activeReviewEvent)}</span>
            </div>

            <UserReviewForm
              title="Write a review for this event"
              existingReview={getCurrentUserReview("event", activeReviewEvent.id)}
              canSubmit={auth.hasRole("USER")}
              onSubmit={(payload) => handleSubmitReview(activeReviewEvent.id, payload)}
              onDelete={handleDeleteReview}
            />
          </>
        ) : null}
      </DetailModal>
    </main>
  );
}
