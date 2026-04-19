import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import CatalogLayout from "../components/templates/catalog-layout";
import { Badge } from "../components/ui/badge";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import {
  fetchPublicDishDetail,
  fetchPublicReviews,
  fetchPublicStoreDetail,
  fetchPublicStores,
  normalizeTargetType,
} from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTargetType(value) {
  return { store: "Store", event: "Event", dish: "Item" }[normalizeTargetType(value)] ?? "Content";
}

function fallbackTargetLabel(review) {
  const type = formatTargetType(review.targetType);
  const id = String(review.targetId ?? "").trim();
  return id ? `${type} #${id}` : type;
}

function resolveReviewTargetLabel(review, targetNameMap = {}, storeReferenceMap = {}) {
  const targetType = normalizeTargetType(review.targetType);
  const targetId = String(review.targetId ?? "").trim();
  if (review.targetLabel) return review.targetLabel;
  if (targetType === "store" && storeReferenceMap[targetId]?.name) return storeReferenceMap[targetId].name;
  return targetNameMap[targetId] || fallbackTargetLabel(review);
}

function buildStoreReferenceMap(stores) {
  return Object.fromEntries(
    stores.map((s) => {
      const id = String(s?.id ?? "").trim();
      if (!id) return null;
      return [id, { slug: String(s?.slug ?? "").trim(), name: String(s?.name ?? "").trim() }];
    }).filter(Boolean)
  );
}

function isSupportedTargetType(t) { return ["store", "event", "dish"].includes(normalizeTargetType(t)); }

function buildStoreContext(detail) {
  const store = detail?.store ?? null;
  const categories = Array.isArray(detail?.categories) ? detail.categories : [];
  const events = Array.isArray(detail?.events) ? detail.events : [];
  const dishOptions = categories.flatMap((cat) =>
    (Array.isArray(cat.items) ? cat.items : []).map((item) => ({ value: String(item.id ?? ""), label: item.name || `Item #${item.id}` }))
  );
  const eventOptions = events.map((ev) => ({ value: String(ev.id ?? ""), label: ev.title || ev.name || `Event #${ev.id}` }));
  return {
    store,
    storeId: String(store?.id ?? ""),
    dishOptions,
    eventOptions,
    dishIdSet: new Set(dishOptions.map((d) => d.value)),
    eventIdSet: new Set(eventOptions.map((e) => e.value)),
    targetNameMap: {
      ...(store?.id ? { [String(store.id)]: store.name || `Store #${store.id}` } : {}),
      ...Object.fromEntries(dishOptions.map((d) => [d.value, d.label])),
      ...Object.fromEntries(eventOptions.map((e) => [e.value, e.label])),
    },
  };
}

function reviewBelongsToStore(review, ctx) {
  if (!ctx?.storeId) return true;
  const type = normalizeTargetType(review.targetType);
  const id = String(review.targetId ?? "");
  if (type === "store") return id === ctx.storeId;
  if (type === "dish") return ctx.dishIdSet.has(id);
  if (type === "event") return ctx.eventIdSet.has(id);
  return false;
}

function resolveReviewLink(review, storeReferenceMap = {}) {
  const type = normalizeTargetType(review.targetType);
  const targetId = String(review.targetId ?? "").trim();
  if (type === "store") return { to: buildStorePath({ ...review, targetSlug: review.targetSlug || storeReferenceMap[targetId]?.slug }), label: "View store" };
  if (type === "event") return { to: buildEventPath(review), label: "View event" };
  if (type === "dish") return { to: `/menu/${review.targetId}`, label: "View item" };
  return { to: "/stores", label: "View details" };
}

function sortReviews(items, sortKey) {
  return [...items].sort((a, b) => {
    const at = new Date(a.createdAt ?? "").getTime() || 0;
    const bt = new Date(b.createdAt ?? "").getTime() || 0;
    switch (sortKey) {
      case "rating-desc": return Number(b.rating ?? 0) - Number(a.rating ?? 0) || bt - at;
      case "rating-asc": return Number(a.rating ?? 0) - Number(b.rating ?? 0) || bt - at;
      case "date-asc": return at - bt;
      default: return bt - at;
    }
  });
}

function reviewSortQuery(s) { return ({ "date-desc": "date_desc", "date-asc": "date_asc", "rating-desc": "rating_desc", "rating-asc": "rating_asc" })[s] ?? "date_desc"; }
function reviewTargetQuery(t) { return ({ store: "STORE", dish: "DISH", event: "EVENT" })[t] ?? undefined; }
function normalizeStoreKey(v) { return String(v ?? "").trim().toLowerCase(); }

// ─── skeleton ─────────────────────────────────────────────────────────────────
function ReviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1"><Skeleton className="h-5 w-2/3 mb-2" /><Skeleton className="h-3 w-1/3" /></div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg mb-3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review, onActionMessage }) {
  const type = normalizeTargetType(review.targetType);
  const ratingNum = Number(review.rating ?? 0);
  const ratingBadgeVariant = ratingNum >= 4 ? "matcha" : ratingNum >= 3 ? "warn" : "danger";

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold leading-snug text-ink-900 line-clamp-1">
            {review.title || review.displayTargetLabel || "Customer review"}
          </h2>
          {review.displayTargetLabel && review.title !== review.displayTargetLabel ? (
            <p className="mt-0.5 text-xs font-medium text-matcha-700 line-clamp-1">{review.displayTargetLabel}</p>
          ) : null}
          <p className="mt-0.5 text-xs text-ink-400">{review.createdAt || ""}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={ratingBadgeVariant}>{ratingNum.toFixed(1)}★</Badge>
          <Badge variant="beige">{formatTargetType(review.targetType)}</Badge>
        </div>
      </div>

      {/* Comment */}
      <blockquote className="rounded-lg border border-beige-200 bg-beige-100/60 px-4 py-3 text-sm leading-relaxed text-ink-700 line-clamp-3">
        {review.comment || "The customer did not leave a detailed comment."}
      </blockquote>

      {/* Reviewer */}
      <p className="text-xs font-semibold text-ink-800">
        {review.userName || review.userEmail || "Kamatcha customer"}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {type === "dish" ? (
          <QuickAddToCartButton
            className={ui.secondaryButton + " !text-xs !px-3 !py-2"}
            resolvePayload={() => resolveDishPayload(review.targetId)}
            onResult={onActionMessage}
          />
        ) : null}
        {["dish", "store"].includes(type) ? (
          <QuickFavoriteButton
            className={ui.secondaryButton + " !text-xs !px-3 !py-2"}
            targetType={type}
            targetId={review.targetId}
            activeLabel="Saved"
            inactiveLabel={type === "store" ? "Save store" : "Save item"}
            onResult={onActionMessage}
          />
        ) : null}
        <Link className={ui.primaryButton + " !text-xs !px-3 !py-2"} to={review.link.to}>
          {review.link.label}
        </Link>
      </div>
    </article>
  );
}

// dish quick-add helper (module-level to avoid closure over state)
async function resolveDishPayload(dishId) {
  const response = await fetchPublicDishDetail(dishId);
  const ranked = response.stores
    .map((s) => ({ store: s, availability: getCartAvailabilityDecision(s) }))
    .sort((a, b) => (b.availability.allowed ? 1 : 0) - (a.availability.allowed ? 1 : 0));
  const best = ranked[0];
  if (!best?.store) return { blocked: true, blockedMessage: "No store is currently serving this item." };
  if (!best.availability.allowed) return { dishId, storeId: best.store.id, blocked: true, blockedMessage: best.availability.reason || "Not ready." };
  return { dishId, storeId: best.store.id, quantity: 1, preorderOnly: best.availability.preorderOnly, preorderMessage: getCartSuccessMessage(best.availability.preorderOnly) };
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const [sortKey, setSortKey] = useState("date-desc");
  const [targetFilter, setTargetFilter] = useState("all");
  const [selectedStoreKey, setSelectedStoreKey] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreDetail, setSelectedStoreDetail] = useState(null);
  const [storeDetailLoading, setStoreDetailLoading] = useState(false);
  const [targetNameMap, setTargetNameMap] = useState({});

  // load all stores for filter dropdown
  useEffect(() => {
    let cancelled = false;
    fetchPublicStores({ page: 0, size: 100, sort: "name_asc" })
      .then((r) => { if (!cancelled) setStores(r.items ?? []); })
      .catch(() => { if (!cancelled) setStores([]); });
    return () => { cancelled = true; };
  }, []);

  // load reviews
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPublicReviews({ targetType: reviewTargetQuery(targetFilter), sort: reviewSortQuery(sortKey), page: 0, size: 100 })
      .then((r) => { if (!cancelled) setReviews((r.items ?? []).filter((rv) => isSupportedTargetType(rv?.targetType))); })
      .catch((err) => { if (!cancelled) setError(err.message || "Unable to load reviews."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sortKey, targetFilter]);

  // load selected store detail for sub-target filtering
  useEffect(() => {
    let cancelled = false;
    if (!selectedStoreKey) { setSelectedStoreDetail(null); setTargetNameMap({}); return; }
    setStoreDetailLoading(true);
    fetchPublicStoreDetail(selectedStoreKey)
      .then((r) => {
        if (!cancelled) { setSelectedStoreDetail(r); setTargetNameMap(buildStoreContext(r).targetNameMap); }
      })
      .catch(() => { if (!cancelled) { setSelectedStoreDetail(null); setTargetNameMap({}); } })
      .finally(() => { if (!cancelled) setStoreDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedStoreKey]);

  useEffect(() => { setSelectedTargetId(""); }, [selectedStoreKey, targetFilter]);

  const storeOptions = useMemo(
    () => [...stores].map((s) => ({ value: s.slug || String(s.id ?? ""), label: s.name || `Store #${s.id}` })).sort((a, b) => a.label.localeCompare(b.label, "vi")),
    [stores]
  );
  const storeReferenceMap = useMemo(() => buildStoreReferenceMap(stores), [stores]);
  const selectedStore = useMemo(() => {
    if (selectedStoreDetail?.store) return selectedStoreDetail.store;
    return stores.find((s) => normalizeStoreKey(s.slug || s.id) === normalizeStoreKey(selectedStoreKey)) ?? null;
  }, [selectedStoreDetail, selectedStoreKey, stores]);
  const selectedStoreContext = useMemo(() => buildStoreContext(selectedStoreDetail), [selectedStoreDetail]);

  const viewModels = useMemo(
    () => sortReviews(reviews, sortKey).map((rv) => ({
      ...rv,
      displayTargetLabel: resolveReviewTargetLabel(rv, targetNameMap, storeReferenceMap),
      link: resolveReviewLink(rv, storeReferenceMap),
    })),
    [reviews, sortKey, storeReferenceMap, targetNameMap]
  );

  const storeScopedVMs = useMemo(
    () => viewModels.filter((rv) => reviewBelongsToStore(rv, selectedStoreContext)),
    [selectedStoreContext, viewModels]
  );

  const typeFilteredVMs = useMemo(() => {
    if (targetFilter === "all") return storeScopedVMs;
    return storeScopedVMs.filter((rv) => normalizeTargetType(rv.targetType) === targetFilter);
  }, [storeScopedVMs, targetFilter]);

  const targetOptions = useMemo(() => {
    if (!selectedStoreKey) return [];
    if (targetFilter === "store") return selectedStore?.id ? [{ value: String(selectedStore.id), label: selectedStore.name || `Store #${selectedStore.id}` }] : [];
    if (targetFilter === "dish") return [...selectedStoreContext.dishOptions].sort((a, b) => a.label.localeCompare(b.label, "vi"));
    if (targetFilter === "event") return [...selectedStoreContext.eventOptions].sort((a, b) => a.label.localeCompare(b.label, "vi"));
    return [];
  }, [selectedStore, selectedStoreContext, selectedStoreKey, targetFilter]);

  const filteredVMs = useMemo(() => {
    if (!selectedTargetId) return typeFilteredVMs;
    return typeFilteredVMs.filter((rv) => String(rv.targetId) === String(selectedTargetId));
  }, [selectedTargetId, typeFilteredVMs]);

  const filterLabel = { store: "store", dish: "menu item", event: "event" }[targetFilter] ?? "";

  const filterRail = (
    <div className="flex flex-col gap-5">
      <div>
        <p className={ui.eyebrow}>Store scope</p>
        <select className={ui.input} value={selectedStoreKey} onChange={(e) => setSelectedStoreKey(e.target.value)}>
          <option value="">All stores</option>
          {storeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <p className={ui.eyebrow}>Filter by type</p>
        <select className={ui.input} value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
          <option value="all">{selectedStoreKey ? "All in store" : "All"}</option>
          <option value="store">Store</option>
          <option value="dish">Menu item</option>
          <option value="event">Event</option>
        </select>
      </div>

      {targetFilter !== "all" ? (
        <div>
          <p className={ui.eyebrow}>Specific target</p>
          <select
            className={ui.input}
            value={selectedTargetId}
            disabled={!selectedStoreKey || !targetOptions.length || storeDetailLoading}
            onChange={(e) => setSelectedTargetId(e.target.value)}
          >
            <option value="">
              {!selectedStoreKey ? "Choose a store first" : storeDetailLoading ? "Loading..." : targetOptions.length ? `All ${filterLabel}` : `No ${filterLabel} yet`}
            </option>
            {targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ) : null}

      <div>
        <p className={ui.eyebrow}>Sort by</p>
        <select className={ui.input} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="rating-desc">Highest rated</option>
          <option value="rating-asc">Lowest rated</option>
        </select>
      </div>

      {actionMessage ? <p className="text-xs text-ink-500">{actionMessage}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );

  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
        <p className={ui.eyebrow}>Reviews</p>
        <h1 className={ui.bannerTitle}>Customer reviews</h1>
        <p className={ui.copy}>
          Choose a store to filter by branch, then narrow by menu item or event.
        </p>
        {selectedStoreKey ? (
          <p className="mt-2 text-sm text-ink-500">
            Store: <strong className="text-ink-800">{selectedStore?.name || selectedStoreKey}</strong>
          </p>
        ) : null}
        <p className="mt-2 text-sm text-ink-500">
          Showing <strong className="text-ink-800">{filteredVMs.length}</strong> reviews
        </p>
      </div>

      <CatalogLayout
        filters={filterRail}
        filtersLabel="Review filters"
        loading={loading}
        skeleton={<ReviewSkeleton />}
        empty={
          <EmptyState
            icon="💬"
            title="No reviews found"
            description="Try changing the filters to see more reviews."
          />
        }
      >
        {filteredVMs.map((review) => (
          <ReviewCard key={review.id} review={review} onActionMessage={setActionMessage} />
        ))}
      </CatalogLayout>
    </main>
  );
}
