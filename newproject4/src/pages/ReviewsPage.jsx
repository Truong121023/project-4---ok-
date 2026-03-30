import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MediaLibrary from "../components/MediaLibrary";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { buildEventPath } from "../lib/eventRouting";
import {
  fetchPublicDishDetail,
  fetchPublicStoreDetail,
  fetchPublicReviews,
  fetchPublicStores,
  normalizeTargetType,
} from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatTargetType(value) {
  const labels = {
    store: "Store",
    event: "Event",
    dish: "Item",
  };

  return labels[normalizeTargetType(value)] ?? "Content";
}

function fallbackTargetLabel(review) {
  const targetTypeLabel = formatTargetType(review.targetType);
  const targetId = String(review.targetId ?? "").trim();
  return targetId ? `${targetTypeLabel} #${targetId}` : targetTypeLabel;
}

function resolveReviewTargetLabel(review, targetNameMap = {}, storeReferenceMap = {}) {
  const targetType = normalizeTargetType(review.targetType);
  const targetId = String(review.targetId ?? "").trim();

  if (review.targetLabel) {
    return review.targetLabel;
  }

  if (targetType === "store" && storeReferenceMap[targetId]?.name) {
    return storeReferenceMap[targetId].name;
  }

  return targetNameMap[targetId] || fallbackTargetLabel(review);
}

function normalizeStoreKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildStoreReferenceMap(stores) {
  return Object.fromEntries(
    stores
      .map((store) => {
        const id = String(store?.id ?? "").trim();

        if (!id) {
          return null;
        }

        return [
          id,
          {
            slug: String(store?.slug ?? "").trim(),
            name: String(store?.name ?? "").trim(),
          },
        ];
      })
      .filter(Boolean),
  );
}

function isSupportedReviewTargetType(targetType) {
  return ["store", "event", "dish"].includes(normalizeTargetType(targetType));
}

function buildStoreContext(detail) {
  const store = detail?.store ?? null;
  const categories = Array.isArray(detail?.categories) ? detail.categories : [];
  const events = Array.isArray(detail?.events) ? detail.events : [];
  const dishOptions = categories.flatMap((category) =>
    (Array.isArray(category.items) ? category.items : []).map((item) => ({
      value: String(item.id ?? ""),
      label: item.name || `Item #${item.id}`,
    })),
  );
  const eventOptions = events.map((event) => ({
    value: String(event.id ?? ""),
    label: event.title || event.name || `Event #${event.id}`,
  }));

  return {
    store,
    storeId: String(store?.id ?? ""),
    dishOptions,
    eventOptions,
    dishIdSet: new Set(dishOptions.map((item) => item.value)),
    eventIdSet: new Set(eventOptions.map((item) => item.value)),
    targetNameMap: {
      ...(store?.id
        ? {
            [String(store.id)]: store.name || `Store #${store.id}`,
          }
        : {}),
      ...Object.fromEntries(dishOptions.map((item) => [item.value, item.label])),
      ...Object.fromEntries(eventOptions.map((item) => [item.value, item.label])),
    },
  };
}

function reviewBelongsToStore(review, storeContext) {
  if (!storeContext?.storeId) {
    return true;
  }

  const targetType = normalizeTargetType(review.targetType);
  const targetId = String(review.targetId ?? "");

  if (targetType === "store") {
    return targetId === storeContext.storeId;
  }

  if (targetType === "dish") {
    return storeContext.dishIdSet.has(targetId);
  }

  if (targetType === "event") {
    return storeContext.eventIdSet.has(targetId);
  }

  return false;
}

function resolveReviewLink(review, storeReferenceMap = {}) {
  const targetType = normalizeTargetType(review.targetType);

  if (targetType === "store") {
    const targetId = String(review.targetId ?? "").trim();
    return {
      to: buildStorePath({
        ...review,
        targetSlug: review.targetSlug || storeReferenceMap[targetId]?.slug,
      }),
      label: "View store",
    };
  }

  if (targetType === "event") {
    return {
      to: buildEventPath(review),
      label: "View event",
    };
  }

  if (targetType === "dish") {
    return {
      to: `/menu/${review.targetId}`,
      label: "View item",
    };
  }

  return {
    to: "/stores",
    label: "View details",
  };
}

function sortReviews(items, sortKey) {
  const clonedItems = [...items];

  return clonedItems.sort((left, right) => {
    const leftTime = new Date(left.createdAt ?? "").getTime() || 0;
    const rightTime = new Date(right.createdAt ?? "").getTime() || 0;

    switch (sortKey) {
      case "rating-desc":
        return Number(right.rating ?? 0) - Number(left.rating ?? 0) || rightTime - leftTime;
      case "rating-asc":
        return Number(left.rating ?? 0) - Number(right.rating ?? 0) || rightTime - leftTime;
      case "date-asc":
        return leftTime - rightTime;
      case "date-desc":
      default:
        return rightTime - leftTime;
    }
  });
}

function reviewSortQuery(sortKey) {
  const mapping = {
    "date-desc": "date_desc",
    "date-asc": "date_asc",
    "rating-desc": "rating_desc",
    "rating-asc": "rating_asc",
  };

  return mapping[sortKey] ?? "date_desc";
}

function reviewTargetQuery(targetFilter) {
  const mapping = {
    store: "STORE",
    dish: "DISH",
    event: "EVENT",
  };

  return mapping[targetFilter] ?? undefined;
}

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

  const resolveDishQuickAddPayload = async (dishId) => {
    const response = await fetchPublicDishDetail(dishId);
    const rankedStores = response.stores
      .map((store) => ({
        store,
        availability: getCartAvailabilityDecision(store),
        score: getCartAvailabilityDecision(store).allowed
          ? getCartAvailabilityDecision(store).preorderOnly
            ? 1
            : 2
          : 0,
      }))
      .sort((left, right) => right.score - left.score);
    const validStore = rankedStores[0]?.store ?? null;
    const availability = rankedStores[0]?.availability ?? {
      allowed: false,
      preorderOnly: false,
      reason: "",
    };

    if (!validStore) {
      return {
        blocked: true,
        blockedMessage: "No store is currently serving this item.",
      };
    }

    if (!availability.allowed) {
      return {
        dishId,
        storeId: validStore.id,
        blocked: true,
        blockedMessage: availability.reason || "This item is not ready across the available stores yet.",
      };
    }

    return {
      dishId,
      storeId: validStore.id,
      quantity: 1,
      preorderOnly: availability.preorderOnly,
      preorderMessage: getCartSuccessMessage(availability.preorderOnly),
    };
  };

  useEffect(() => {
    let cancelled = false;

    async function loadStores() {
      try {
        const response = await fetchPublicStores({
          page: 0,
          size: 100,
          sort: "name_asc",
        });

        if (!cancelled) {
          setStores(response.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setStores([]);
        }
      }
    }

    void loadStores();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchPublicReviews({
          targetType: reviewTargetQuery(targetFilter),
          sort: reviewSortQuery(sortKey),
          page: 0,
          size: 100,
        });

        if (!cancelled) {
          setReviews((response.items ?? []).filter((review) => isSupportedReviewTargetType(review?.targetType)));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load reviews.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [sortKey, targetFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedStoreDetail() {
      if (!selectedStoreKey) {
        setSelectedStoreDetail(null);
        setTargetNameMap({});
        return;
      }

      setStoreDetailLoading(true);

      try {
        const response = await fetchPublicStoreDetail(selectedStoreKey);
        const storeContext = buildStoreContext(response);

        if (!cancelled) {
          setSelectedStoreDetail(response);
          setTargetNameMap(storeContext.targetNameMap);
        }
      } catch {
        if (!cancelled) {
          setSelectedStoreDetail(null);
          setTargetNameMap({});
        }
      } finally {
        if (!cancelled) {
          setStoreDetailLoading(false);
        }
      }
    }

    void loadSelectedStoreDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedStoreKey]);

  useEffect(() => {
    setSelectedTargetId("");
  }, [selectedStoreKey, targetFilter]);

  const storeOptions = useMemo(
    () =>
      [...stores]
        .map((store) => ({
          value: store.slug || String(store.id ?? ""),
          label: store.name || `Store #${store.id}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "vi")),
    [stores],
  );

  const storeReferenceMap = useMemo(() => buildStoreReferenceMap(stores), [stores]);

  const selectedStore = useMemo(() => {
    if (selectedStoreDetail?.store) {
      return selectedStoreDetail.store;
    }

    return (
      stores.find((store) => normalizeStoreKey(store.slug || store.id) === normalizeStoreKey(selectedStoreKey)) ??
      null
    );
  }, [selectedStoreDetail, selectedStoreKey, stores]);

  const selectedStoreContext = useMemo(
    () => buildStoreContext(selectedStoreDetail),
    [selectedStoreDetail],
  );

  const viewModels = useMemo(
    () =>
      sortReviews(reviews, sortKey).map((review) => ({
        ...review,
        displayTargetLabel: resolveReviewTargetLabel(review, targetNameMap, storeReferenceMap),
        link: resolveReviewLink(review, storeReferenceMap),
      })),
    [reviews, sortKey, storeReferenceMap, targetNameMap],
  );

  const storeScopedViewModels = useMemo(
    () => viewModels.filter((review) => reviewBelongsToStore(review, selectedStoreContext)),
    [selectedStoreContext, viewModels],
  );

  const typeFilteredViewModels = useMemo(() => {
    if (targetFilter === "all") {
      return storeScopedViewModels;
    }

    return storeScopedViewModels.filter(
      (review) => normalizeTargetType(review.targetType) === targetFilter,
    );
  }, [storeScopedViewModels, targetFilter]);

  const targetOptions = useMemo(() => {
    if (!selectedStoreKey) {
      return [];
    }

    if (targetFilter === "store") {
      return selectedStore?.id
        ? [
            {
              value: String(selectedStore.id),
              label: selectedStore.name || `Store #${selectedStore.id}`,
            },
          ]
        : [];
    }

    if (targetFilter === "dish") {
      return [...selectedStoreContext.dishOptions].sort((left, right) =>
        left.label.localeCompare(right.label, "vi"),
      );
    }

    if (targetFilter === "event") {
      return [...selectedStoreContext.eventOptions].sort((left, right) =>
        left.label.localeCompare(right.label, "vi"),
      );
    }

    return [];
  }, [selectedStore, selectedStoreContext, selectedStoreKey, targetFilter]);

  const filteredViewModels = useMemo(() => {
    if (!selectedTargetId) {
      return typeFilteredViewModels;
    }

    return typeFilteredViewModels.filter(
      (review) => String(review.targetId) === String(selectedTargetId),
    );
  }, [selectedTargetId, typeFilteredViewModels]);

  const filterLabel =
    targetFilter === "store"
      ? "store"
      : targetFilter === "dish"
        ? "menu item"
        : targetFilter === "event"
          ? "event"
          : "";

  const selectedTargetLabel =
    targetOptions.find((option) => option.value === selectedTargetId)?.label ?? selectedTargetId;

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>Reviews</p>
        <h1 className={ui.bannerTitle}>Customer reviews</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          Choose a store if you want to filter by store scope, then continue filtering by menu
          items or events within that branch.
        </p>

        <div className="mt-6 grid gap-3 lg:grid-cols-[260px_220px_260px]">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Store scope
            </span>
            <select
              className={ui.input}
              value={selectedStoreKey}
              onChange={(event) => setSelectedStoreKey(event.target.value)}
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
              Sort
            </span>
            <select
              className={ui.input}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="rating-desc">Highest rated</option>
              <option value="rating-asc">Lowest rated</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Filter by
            </span>
            <select
              className={ui.input}
              value={targetFilter}
              onChange={(event) => {
                setTargetFilter(event.target.value);
              }}
            >
              <option value="all">
                {selectedStoreKey ? "All in store" : "All"}
              </option>
              <option value="store">Store</option>
              <option value="dish">Menu item</option>
              <option value="event">Event</option>
            </select>
          </label>
        </div>

        {targetFilter !== "all" ? (
          <div className="mt-3 max-w-md">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Specific target
              </span>
              <select
                className={ui.input}
                value={selectedTargetId}
                disabled={!selectedStoreKey || !targetOptions.length || storeDetailLoading}
                onChange={(event) => setSelectedTargetId(event.target.value)}
              >
                <option value="">
                  {!selectedStoreKey
                    ? "Choose a store first"
                    : storeDetailLoading
                      ? "Loading store data..."
                      : targetOptions.length
                        ? `All ${filterLabel}`
                        : `No ${filterLabel} yet`}
                </option>
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {selectedStoreKey ? (
          <p className="mt-4 text-sm leading-7 text-stone-600">
            Filtering by store <strong>{selectedStore?.name || selectedStoreKey}</strong>.
          </p>
        ) : null}
        {targetFilter !== "all" ? (
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Filtering reviews by <strong>{filterLabel}</strong>.
          </p>
        ) : null}
        {selectedTargetId ? (
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Showing reviews for <strong>{selectedTargetLabel}</strong>.
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm leading-7 text-stone-600">{error}</p> : null}
        {actionMessage ? <p className="mt-2 text-sm leading-7 text-stone-600">{actionMessage}</p> : null}
      </section>

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading reviews...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {filteredViewModels.map((review) => (
            <article
              key={review.id}
              className={`${ui.card} grid gap-5 xl:grid-cols-[0.9fr_1.1fr]`}
            >
              <MediaLibrary
                images={review.targetImagePaths}
                alt={review.targetLabel || review.title}
                badge={`${review.rating}/5`}
                heroClassName="h-full min-h-[18rem]"
                thumbnailClassName="h-16"
              />

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={ui.pill}>{formatTargetType(review.targetType)}</span>
                  <span className="text-sm text-stone-500">{review.createdAt}</span>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold text-tea-900">
                    {review.title || review.displayTargetLabel || "Customer review"}
                  </h2>
                  {review.displayTargetLabel ? (
                    <p className="mt-2 text-base font-semibold text-matcha-700">
                      {review.displayTargetLabel}
                    </p>
                  ) : null}
                </div>

                <blockquote className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4 text-sm leading-7 text-stone-700">
                  {review.comment || "The customer did not leave a detailed comment."}
                </blockquote>

                <div className="grid gap-1 text-sm text-stone-600">
                  <strong className="text-base text-tea-900">
                    {review.userName || review.userEmail || "Tea Matcha customer"}
                  </strong>
                </div>

                <div className="flex flex-wrap gap-3">
                  {normalizeTargetType(review.targetType) === "dish" ? (
                    <QuickAddToCartButton
                      className={ui.secondaryButton}
                      resolvePayload={() => resolveDishQuickAddPayload(review.targetId)}
                      onResult={(message) => setActionMessage(message)}
                    />
                  ) : null}
                  {["dish", "store"].includes(normalizeTargetType(review.targetType)) ? (
                    <QuickFavoriteButton
                      className={ui.secondaryButton}
                      targetType={normalizeTargetType(review.targetType)}
                      targetId={review.targetId}
                      activeLabel="Saved"
                      inactiveLabel={
                        normalizeTargetType(review.targetType) === "store"
                          ? "Save store"
                          : "Save item"
                      }
                      onResult={(message) => setActionMessage(message)}
                    />
                  ) : null}
                  <Link className={ui.primaryButton} to={review.link.to}>
                    {review.link.label}
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {!filteredViewModels.length ? (
            <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
              No matching reviews found.
            </article>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
