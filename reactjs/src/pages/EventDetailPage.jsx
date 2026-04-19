import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import UserReviewForm from "../components/UserReviewForm";
import DetailLayout from "../components/templates/detail-layout";
import { Badge } from "../components/ui/badge";
import Button from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import { formatDateTimeVn } from "../lib/locale";
import { fetchPublicEventDetail, fetchPublicReviews } from "../lib/siteApi";
import { formatDistanceKm } from "../lib/demoCatalog";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(v) { return formatDateTimeVn(v, "Schedule unavailable"); }

function statusLabel(event) {
  if (event?.disabled) return event.disabledReason || "Locked";
  if (Number(event?.remainingSlots ?? 0) > 0) return `${event.remainingSlots} slots left`;
  return "Updating";
}

function EventDetailSkeleton() {
  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-40" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="w-full shrink-0 lg:w-[45%]">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EventDetailPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { eventKey } = useParams();
  const { isFavorite, toggleFavorite, getCurrentUserReview, submitReview, deleteReview } = useSiteData();

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
          const reviewResponse = await fetchPublicReviews({ targetType: "EVENT", targetId: response.id, sort: "date_desc", page: 0, size: 20 });
          setEventReviews(reviewResponse.items ?? []);
        } catch {
          setEventReviews(Array.isArray(response?.reviews) ? response.reviews : []);
        }
      } else {
        setEventReviews(Array.isArray(response?.reviews) ? response.reviews : []);
      }
    } catch (err) {
      setError(err.message || "Unable to load event details.");
      setEventDetail(null);
      setEventReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadEventDetail(); }, [eventKey]);

  useEffect(() => {
    if (!eventDetail?.slug || !eventKey || eventDetail.slug === eventKey) return;
    navigate(buildEventPath(eventDetail), { replace: true });
  }, [eventDetail, eventKey, navigate]);

  const handleToggleFavorite = async () => {
    if (!eventDetail?.id) return;
    const result = await toggleFavorite("event", eventDetail.id);
    setNotice(result.message);
    if (result.ok) await loadEventDetail();
  };

  const handleSubmitReview = async (payload) => {
    if (!eventDetail?.id) return { ok: false, message: "This event is unavailable right now." };
    const result = await submitReview({ ...payload, targetType: "event", targetId: eventDetail.id });
    if (result.ok) await loadEventDetail();
    return result;
  };

  const handleDeleteReview = async (review) => {
    const result = await deleteReview(review.id);
    if (result.ok) await loadEventDetail();
    return result;
  };

  if (loading) return <EventDetailSkeleton />;

  if (error || !eventDetail) {
    return (
      <main className="bg-bg min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <p className={ui.eyebrow}>Event</p>
          <h1 className={ui.bannerTitle}>Event not found</h1>
          <p className={ui.copy + " mx-auto"}>{error || "This event does not have data yet."}</p>
          <Link className={ui.secondaryButton + " mt-6 inline-flex"} to="/events">Back to events</Link>
        </div>
      </main>
    );
  }

  const hostStoreId = eventDetail.store?.id || eventDetail.storeId;
  const hostStoreDisabled = eventDetail.store?.disabled === true;
  const hostStoreClosed = eventDetail.store?.open === false;

  // ── gallery ─────────────────────────────────────────────────────────────────
  const galleryRegion = (
    <MediaLibrary
      images={eventDetail.imagePaths}
      alt={eventDetail.title}
      badge={eventDetail.scheduleText || eventDetail.location || "Event"}
      heroClassName="h-[22rem] sm:h-[30rem] rounded-xl overflow-hidden"
      thumbnailClassName="h-20"
    />
  );

  // ── sticky CTA rail ─────────────────────────────────────────────────────────
  const ctaRail = (
    <div className="flex flex-col gap-4">
      {/* Status + slots */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={eventDetail.disabled ? "ink" : "matcha"}>{statusLabel(eventDetail)}</Badge>
        {eventDetail.scheduleText ? <Badge variant="beige">{eventDetail.scheduleText}</Badge> : null}
        {typeof eventDetail.distanceKm === "number" ? <Badge variant="beige">{formatDistanceKm(eventDetail.distanceKm)}</Badge> : null}
      </div>

      {/* Quick info */}
      <div className="flex flex-col gap-1 text-sm text-ink-700">
        {eventDetail.location ? <p><span className="font-semibold text-ink-900">Location: </span>{eventDetail.location}</p> : null}
        {(eventDetail.store?.name || eventDetail.storeName) ? (
          <p><span className="font-semibold text-ink-900">Host store: </span>{eventDetail.store?.name || eventDetail.storeName}</p>
        ) : null}
        {eventDetail.startsAt ? <p><span className="font-semibold text-ink-900">Starts: </span>{formatDateTime(eventDetail.startsAt)}</p> : null}
        {eventDetail.endsAt ? <p><span className="font-semibold text-ink-900">Ends: </span>{formatDateTime(eventDetail.endsAt)}</p> : null}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isFavorite("event", eventDetail.id) ? "primary" : "secondary"}
          size="sm"
          onClick={handleToggleFavorite}
        >
          {isFavorite("event", eventDetail.id) ? "Saved" : "Save event"}
        </Button>
        {hostStoreId ? (
          <Link
            className={ui.ghostButton + " !text-sm"}
            to={buildStorePath(eventDetail.store?.slug || eventDetail.store?.storeSlug ? eventDetail.store : eventDetail)}
          >
            View store
          </Link>
        ) : null}
        <Link className={ui.ghostButton + " !text-sm"} to="/events">All events</Link>
      </div>

      {notice ? <p className="text-xs text-ink-500">{notice}</p> : null}
    </div>
  );

  // ── related: featured dishes carousel ──────────────────────────────────────
  const relatedRegion = eventDetail.featuredDishes?.length ? (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>Featured menu items</h2>
        <Badge variant="beige">{eventDetail.featuredDishes.length} items</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {eventDetail.featuredDishes.map((item) => (
          <article
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-ink-900/10 bg-cream-50 px-4 py-3 shadow-soft"
          >
            <Link
              className="font-display text-sm font-semibold text-ink-900 hover:text-matcha-700 transition-colors line-clamp-2"
              to={`/menu/${item.id}`}
            >
              {item.name}
            </Link>
            <QuickAddToCartButton
              className={ui.secondaryButton + " !text-xs !px-3 !py-1.5 shrink-0"}
              dishId={item.id}
              storeId={hostStoreId}
              blocked={!hostStoreId || hostStoreDisabled}
              preorderOnly={hostStoreClosed}
              preorderMessage={getCartSuccessMessage(hostStoreClosed)}
              blockedMessage="This item cannot be added from the host store right now."
              onResult={(msg) => setNotice(msg)}
            />
          </article>
        ))}
      </div>
    </div>
  ) : null;

  // ── breadcrumb ──────────────────────────────────────────────────────────────
  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm text-ink-500">
      <Link className="hover:text-matcha-700 transition-colors" to="/events">Events</Link>
      <span>/</span>
      <span className="text-ink-900 font-medium truncate max-w-[20ch]">{eventDetail.title}</span>
    </nav>
  );

  return (
    <main className="bg-bg min-h-screen pb-24 lg:pb-0">
      <DetailLayout breadcrumb={breadcrumb} gallery={galleryRegion} stickyBar={ctaRail} related={relatedRegion}>
        <div className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <p className={ui.eyebrow}>Event</p>
            <h1 className={ui.bannerTitle}>{eventDetail.title}</h1>
            <p className="mt-2 text-base font-semibold text-matcha-700">
              {eventDetail.location || eventDetail.store?.name || eventDetail.storeName}
            </p>
            <p className="mt-4 text-sm leading-7 text-ink-600">
              {eventDetail.summary || eventDetail.description}
            </p>
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-2">
            {eventDetail.scheduleText ? <Badge variant="beige">{eventDetail.scheduleText}</Badge> : null}
            <Badge variant="beige">{eventDetail.favoriteCount} saves</Badge>
            {eventDetail.reviewCount ? (
              <Badge variant="matcha">{eventDetail.averageRating.toFixed(1)}★ ({eventDetail.reviewCount})</Badge>
            ) : null}
            {eventDetail.highlightTags?.map((tag) => (
              <Badge key={`${eventDetail.id}-${tag}`} variant="beige">{tag}</Badge>
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Reviews", value: eventDetail.reviewCount || 0 },
              { label: "Slots left", value: eventDetail.remainingSlots || 0 },
              { label: "Capacity", value: eventDetail.capacity || 0 },
              { label: "Booked", value: eventDetail.bookedCount || 0 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4 text-center">
                <strong className="block text-xl font-bold text-ink-900">{stat.value}</strong>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-ink-400">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Detail info cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Starts", value: formatDateTime(eventDetail.startsAt) },
              { label: "Ends", value: formatDateTime(eventDetail.endsAt) },
              { label: "Location", value: eventDetail.location },
              { label: "Schedule", value: eventDetail.scheduleText || eventDetail.schedule },
              { label: "Host store", value: eventDetail.store?.name || eventDetail.storeName },
              { label: "Highlight", value: eventDetail.highlightSummary },
            ].filter((e) => e.value).map((entry) => (
              <div key={entry.label} className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
                <span className="block text-xs font-bold uppercase tracking-widest text-ink-400">{entry.label}</span>
                <strong className="mt-1 block text-sm leading-6 text-ink-900">{entry.value}</strong>
              </div>
            ))}
          </div>

          {/* Content sections */}
          <ContentSectionsBlock
            sections={eventDetail.sections}
            eyebrow="Event story"
            title="What to expect"
            description="Event detail sections rendered from backend content blocks."
          />

          {/* Divider */}
          <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent" />

          {/* Reviews */}
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Reviews</p>
                <h2 className={ui.sectionTitle}>Event reviews</h2>
              </div>
              <Badge variant="beige">{eventReviews.length ? `${eventReviews.length} reviews` : "None yet"}</Badge>
            </div>

            {eventReviews.length ? (
              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                {eventReviews.map((review) => (
                  <article key={review.id} className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-900">{review.title || "Untitled review"}</p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {review.userName || review.userEmail || "Kamatcha guest"} · {formatDateTime(review.createdAt)}
                        </p>
                      </div>
                      <Badge variant="matcha">{Number(review.rating ?? 0).toFixed(1)}★</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-ink-600">
                      {review.comment || "The user did not leave a detailed comment."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-center text-sm text-ink-400">
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
      </DetailLayout>
    </main>
  );
}
