import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import UserReviewForm from "../components/UserReviewForm";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import { fetchPublicEventDetail, fetchPublicReviews } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "Schedule unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusLabel(event) {
  if (event?.disabled) {
    return event.disabledReason || "Locked";
  }

  if (Number(event?.remainingSlots ?? 0) > 0) {
    return `${event.remainingSlots} slots left`;
  }

  return "Updating";
}

export default function EventDetailPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { eventKey } = useParams();
  const { isFavorite, toggleFavorite, getCurrentUserReview, submitReview, deleteReview } =
    useSiteData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [eventDetail, setEventDetail] = useState(null);
  const [eventReviews, setEventReviews] = useState([]);

  const loadEventDetail = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchPublicEventDetail(eventKey);
      setEventDetail(response);

      if (response?.id) {
        try {
          const reviewResponse = await fetchPublicReviews({
            targetType: "EVENT",
            targetId: response.id,
            sort: "date_desc",
            page: 0,
            size: 20,
          });
          setEventReviews(reviewResponse.items ?? []);
        } catch {
          setEventReviews(Array.isArray(response?.reviews) ? response.reviews : []);
        }
      } else {
        setEventReviews(Array.isArray(response?.reviews) ? response.reviews : []);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to load event details.");
      setEventDetail(null);
      setEventReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEventDetail();
  }, [eventKey]);

  useEffect(() => {
    if (!eventDetail?.slug || !eventKey || eventDetail.slug === eventKey) {
      return;
    }

    navigate(buildEventPath(eventDetail), { replace: true });
  }, [eventDetail, eventKey, navigate]);

  const handleToggleFavorite = async () => {
    if (!eventDetail?.id) {
      return;
    }

    const result = await toggleFavorite("event", eventDetail.id);
    setNotice(result.message);

    if (result.ok) {
      await loadEventDetail();
    }
  };

  const handleSubmitReview = async (payload) => {
    if (!eventDetail?.id) {
      return { ok: false, message: "This event is unavailable right now." };
    }

    const result = await submitReview({
      ...payload,
      targetType: "event",
      targetId: eventDetail.id,
    });

    if (result.ok) {
      await loadEventDetail();
    }

    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);

    if (result.ok) {
      await loadEventDetail();
    }

    return result;
  };

  if (loading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading event details...
          </div>
        </section>
      </main>
    );
  }

  if (error || !eventDetail) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <p className={ui.eyebrow}>Event</p>
          <h1 className={ui.bannerTitle}>Event not found</h1>
          <p className={ui.copy}>{error || "This event does not have data yet."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={ui.secondaryButton} to="/events">
              Back to events
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const hostStoreId = eventDetail.store?.id || eventDetail.storeId;
  const hostStoreDisabled = eventDetail.store?.disabled === true;
  const hostStoreClosed = eventDetail.store?.open === false;

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={
              eventDetail.disabled
                ? "inline-flex items-center rounded-full bg-stone-300/60 px-4 py-2 text-sm font-semibold text-stone-700"
                : ui.pill
            }
          >
            {statusLabel(eventDetail)}
          </span>
          <span className={ui.pill}>
            {eventDetail.reviewCount
              ? `${eventDetail.averageRating.toFixed(1)} stars`
              : "No reviews yet"}
          </span>
          <span className={ui.pill}>{eventDetail.favoriteCount} saves</span>
          {eventDetail.distanceKm !== null && eventDetail.distanceKm !== undefined ? (
            <span className={ui.pill}>{formatDistanceKm(eventDetail.distanceKm)}</span>
          ) : null}
          {eventDetail.store?.name || eventDetail.storeName ? (
            <span className={ui.pill}>
              {eventDetail.store?.name || eventDetail.storeName}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="grid gap-5 content-start">
            <div>
              <p className={ui.eyebrow}>Event</p>
              <h1 className={ui.bannerTitle}>{eventDetail.title}</h1>
              <p className="mt-4 text-base font-semibold text-matcha-700">
                {eventDetail.location || eventDetail.store?.name || eventDetail.storeName}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                {eventDetail.summary || eventDetail.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {eventDetail.scheduleText ? <span className={ui.pill}>{eventDetail.scheduleText}</span> : null}
              {eventDetail.highlightTags?.map((tag) => (
                <span key={`${eventDetail.id}-${tag}`} className={ui.pill}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              {[
                {
                  label: "Reviews",
                  value: eventDetail.reviewCount || 0,
                },
                {
                  label: "Slots left",
                  value: eventDetail.remainingSlots || 0,
                },
                {
                  label: "Capacity",
                  value: eventDetail.capacity || 0,
                },
                {
                  label: "Booked",
                  value: eventDetail.bookedCount || 0,
                },
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
                { label: "Starts", value: formatDateTime(eventDetail.startsAt) },
                { label: "Ends", value: formatDateTime(eventDetail.endsAt) },
                { label: "Location", value: eventDetail.location },
                { label: "Schedule", value: eventDetail.scheduleText || eventDetail.schedule },
                {
                  label: "Host store",
                  value: eventDetail.store?.name || eventDetail.storeName,
                },
                { label: "Highlight", value: eventDetail.highlightSummary },
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
              sections={eventDetail.sections}
              eyebrow="Event story"
              title="What to expect"
              description="Event detail sections are now rendered directly from the backend content blocks."
            />

            <div className="flex flex-wrap gap-3">
              <button
                className={isFavorite("event", eventDetail.id) ? ui.primaryButton : ui.secondaryButton}
                type="button"
                onClick={handleToggleFavorite}
              >
                {isFavorite("event", eventDetail.id) ? "Saved" : "Save event"}
              </button>
              {hostStoreId ? (
                <Link
                  className={ui.secondaryButton}
                  to={buildStorePath(
                    eventDetail.store?.slug || eventDetail.store?.storeSlug ? eventDetail.store : eventDetail,
                  )}
                >
                  View store
                </Link>
              ) : null}
              <Link className={ui.secondaryButton} to="/events">
                Back to events
              </Link>
            </div>

            {notice ? <p className="text-sm leading-7 text-stone-600">{notice}</p> : null}

            {eventDetail.featuredDishes.length ? (
              <section className="grid gap-3 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-base text-tea-900">Featured menu items</strong>
                  <span className={ui.pill}>{eventDetail.featuredDishes.length} items</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {eventDetail.featuredDishes.map((item) => (
                    <article
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f5ef] px-4 py-3"
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
                        storeId={hostStoreId}
                        blocked={!hostStoreId || hostStoreDisabled}
                        preorderOnly={hostStoreClosed}
                        preorderMessage={getCartSuccessMessage(hostStoreClosed)}
                        blockedMessage="This item cannot be added from the host store right now."
                        onResult={(message) => setNotice(message)}
                      />
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="grid gap-5 content-start">
            <MediaLibrary
              images={eventDetail.imagePaths}
              alt={eventDetail.title}
              badge={eventDetail.scheduleText || eventDetail.location || "Event"}
              heroClassName="h-[24rem] sm:h-[32rem]"
              thumbnailClassName="h-24"
            />

            <section className="grid gap-4 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-base text-tea-900">Event reviews</strong>
                <span className={ui.pill}>
                  {eventReviews.length ? `${eventReviews.length} reviews` : "None yet"}
                </span>
              </div>

              {eventReviews.length ? (
                <div className="grid gap-3">
                  {eventReviews.map((review) => (
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
                            {review.userName || review.userEmail || "Tea Matcha guest"} -{" "}
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

              <UserReviewForm
                title="Write a review for this event"
                existingReview={getCurrentUserReview("event", eventDetail.id)}
                canSubmit={auth.hasRole("USER")}
                onSubmit={handleSubmitReview}
                onDelete={handleDeleteReview}
              />
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
