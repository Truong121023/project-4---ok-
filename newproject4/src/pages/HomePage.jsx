import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AutoCarousel from "../components/AutoCarousel";
import QuickAddToCartButton from "../components/QuickAddToCartButton";
import QuickFavoriteButton from "../components/QuickFavoriteButton";
import SmartImage from "../components/SmartImage";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { fetchPublicDishes, fetchPublicHome, fetchPublicStores } from "../lib/siteApi";
import { normalizeImagePathList } from "../lib/images";
import { buildNewsPath } from "../lib/newsRouting";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function statusLabel(store) {
  if (store?.disabled) {
    return store.disabledReason || "Temporarily unavailable";
  }

  if (store?.open) {
    return "Serving now";
  }

  return "Updating";
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [homeData, setHomeData] = useState(null);
  const [topStores, setTopStores] = useState([]);
  const [topDishes, setTopDishes] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      setLoading(true);
      setError("");

      try {
        const [homeResponse, storesResponse, dishesResponse] = await Promise.all([
          fetchPublicHome(),
          fetchPublicStores({ page: 0, size: 6, sort: "rating_desc" }),
          fetchPublicDishes({ page: 0, size: 6, sort: "top_rated", franchiseRequired: true }),
        ]);

        if (cancelled) {
          return;
        }

        setHomeData(homeResponse);
        setTopStores(
          homeResponse.featuredStores.length
            ? homeResponse.featuredStores
            : storesResponse.items,
        );
        setTopDishes(
          homeResponse.featuredDishes.length
            ? homeResponse.featuredDishes
            : dishesResponse.items,
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(requestError.message || "Unable to load the homepage.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHome();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredStore = topStores[0] ?? null;
  const featuredStoreImages = normalizeImagePathList(featuredStore?.imagePaths);
  const locationHighlights = useMemo(
    () => homeData?.storeLocations?.length ? homeData.storeLocations : topStores,
    [homeData?.storeLocations, topStores],
  );
  const latestNews = useMemo(() => homeData?.latestNews ?? [], [homeData?.latestNews]);

  const overviewStats = useMemo(
    () => [
      { label: "Stores", value: topStores.length || 0, note: "currently active in the system" },
      {
        label: "Featured drinks",
        value: topDishes.length || 0,
        note: "pulled from the signature catalog",
      },
      {
        label: "Store locations",
        value: locationHighlights.length || 0,
        note: "ready to expand with the franchise model",
      },
      {
        label: "Latest news",
        value: latestNews.length || 0,
        note: "pulled directly from backend latestNews",
      },
    ],
    [latestNews.length, locationHighlights.length, topDishes.length, topStores.length],
  );

  return (
    <main className={ui.page}>
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className={`${ui.panel} flex flex-col justify-between`}>
          <div>
            <p className={ui.eyebrow}>Tea Matcha</p>
            <h1 className={ui.heroTitle}>
              Clean, calm, and consistent across every store.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-700">
              Tea Matcha is a beverage chain with a required signature lineup, tidy spaces, and
              comfortable seating for longer visits. Each store has its own character while keeping
              the same brand experience.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((stat) => (
              <article
                key={`${stat.label}-${stat.value}`}
                className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4"
              >
                <strong className="block text-2xl font-bold text-tea-900">{stat.value}</strong>
                <span className="mt-1 block text-sm font-semibold text-matcha-700">
                  {stat.label}
                </span>
                <p className="mt-2 text-xs leading-6 text-stone-500">{stat.note}</p>
              </article>
            ))}
          </div>
        </div>

        <section className={`${ui.panel} grid gap-5`}>
          <div>
            <p className={ui.eyebrow}>Featured store</p>
            <h2 className="text-3xl font-bold tracking-tight text-tea-900">
              {featuredStore?.name ?? "Tea Matcha"}
            </h2>
          </div>

          {featuredStore ? (
            <>
              <div className="overflow-hidden rounded-[1.75rem] border border-matcha-900/10 bg-stone-100">
                <SmartImage
                  className="h-80 w-full object-cover"
                  src={featuredStoreImages[0]}
                  alt={featuredStore.name}
                  loading="lazy"
                  fallbackClassName="grid h-80 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                />
              </div>

              <div className="grid gap-2 text-sm leading-7 text-stone-600">
                <span>Address: {featuredStore.address || "Not available"}</span>
                <span>Area: {featuredStore.area || "Not available"}</span>
                <span>Status: {statusLabel(featuredStore)}</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <QuickFavoriteButton
                  targetType="store"
                  targetId={featuredStore.id}
                  activeLabel="Store saved"
                  inactiveLabel="Save store"
                  onResult={(message) => setFavoriteMessage(message)}
                />
                <Link className={ui.secondaryButton} to={buildStorePath(featuredStore)}>
                  View store
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              No store data is available to show.
            </div>
          )}
        </section>
      </section>

      {error ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            {error}
          </div>
        </section>
      ) : null}

      {loading ? (
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading homepage...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <>
          <section className={`${ui.panel} grid gap-6 lg:grid-cols-[0.92fr_1.08fr]`}>
            <div>
              <p className={ui.eyebrow}>Shared spirit</p>
              <h2 className={ui.sectionTitle}>
                Every branch has its own personality while keeping the same spirit.
              </h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-700">
                District 1 leans toward client meetings, Thu Duc suits study sessions, and Thao
                Dien feels lighter for casual meetups. This section updates with backend data.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {locationHighlights.slice(0, 3).map((store) => (
                <article key={store.id} className={`${ui.card} h-full`}>
                  <h3 className="text-xl font-semibold text-tea-900">
                    {store.area || store.name}
                  </h3>
                  <p className={`${ui.muted} mt-3`}>{store.positionLabel || store.address}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={`${ui.panel} grid gap-5`}>
            <div>
              <p className={ui.eyebrow}>Latest news</p>
              <h2 className={ui.sectionTitle}>Recent updates from Tea Matcha</h2>
            </div>

            {latestNews.length ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {latestNews.slice(0, 3).map((newsItem) => {
                  const newsPath = buildNewsPath(newsItem);
                  const canOpenNews = newsPath !== "/news";

                  return (
                    <article
                      key={newsItem.id}
                      className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4"
                    >
                      <div className="overflow-hidden rounded-[1.25rem] border border-matcha-900/10 bg-stone-100">
                        {canOpenNews ? (
                          <Link to={newsPath}>
                            <SmartImage
                              className="h-48 w-full object-cover"
                              src={newsItem.imagePaths[0]}
                              alt={newsItem.title}
                              loading="lazy"
                              fallbackClassName="grid h-48 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                            />
                          </Link>
                        ) : (
                          <SmartImage
                            className="h-48 w-full object-cover"
                            src={newsItem.imagePaths[0]}
                            alt={newsItem.title}
                            loading="lazy"
                            fallbackClassName="grid h-48 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                          />
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {newsItem.featured ? <span className={ui.pill}>Featured</span> : null}
                        {newsItem.relatedStoreName ? (
                          <span className={ui.pill}>{newsItem.relatedStoreName}</span>
                        ) : null}
                      </div>

                      <h3 className="mt-4 text-xl font-semibold text-tea-900">{newsItem.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-stone-600">{newsItem.summary}</p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {canOpenNews ? (
                          <Link className={ui.secondaryButton} to={newsPath}>
                            Read article
                          </Link>
                        ) : (
                          <span className={ui.secondaryButton}>Detail slug unavailable</span>
                        )}
                        {newsItem.relatedStoreId || newsItem.relatedStoreSlug ? (
                          <Link
                            className={ui.secondaryButton}
                            to={buildStorePath({
                              storeId: newsItem.relatedStoreId,
                              storeSlug: newsItem.relatedStoreSlug,
                            })}
                          >
                            View store
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
                No news is available yet.
              </article>
            )}
          </section>

          <section className={`${ui.panel} flex flex-col gap-5`}>
            <div>
              <p className={ui.eyebrow}>Store locations</p>
              <h2 className={ui.sectionTitle}>Tea Matcha is currently present in these areas</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {locationHighlights.map((store) => (
                <article
                  key={store.id}
                  className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4"
                >
                  <span className={ui.pill}>{store.positionLabel || "Tea Matcha"}</span>
                  <h3 className="mt-4 text-xl font-semibold text-tea-900">
                    {store.area || store.name}
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-matcha-700">
                    {store.address || "Updating"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className={`${ui.panel} grid gap-5`}>
            <div>
              <p className={ui.eyebrow}>Featured stores</p>
              <h2 className={ui.sectionTitle}>Highlighted branches</h2>
              {favoriteMessage ? (
                <p className="mt-3 text-sm leading-7 text-stone-600">{favoriteMessage}</p>
              ) : null}
            </div>

            <AutoCarousel
              items={topStores}
              label="stores"
              getKey={(store) => store.id}
              autoMs={5000}
              renderSlide={(store) => {
                const imagePaths = normalizeImagePathList(store.imagePaths);

                return (
                  <article className="grid w-full gap-5 rounded-[1.85rem] border border-matcha-900/10 bg-white/72 p-5 text-left shadow-[0_18px_44px_rgba(79,70,45,0.08)] lg:grid-cols-[1fr_0.95fr]">
                    <Link
                      className="overflow-hidden rounded-[1.5rem] border border-matcha-900/10 bg-stone-100"
                              to={buildStorePath(store)}
                    >
                      <SmartImage
                        className="h-72 w-full object-cover"
                        src={imagePaths[0]}
                        alt={store.name}
                        loading="lazy"
                        fallbackClassName="grid h-72 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                      />
                    </Link>

                    <div className="flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {store.positionLabel ? <span className={ui.pill}>{store.positionLabel}</span> : null}
                          <span className={ui.pill}>{statusLabel(store)}</span>
                        </div>

                        <h3 className="mt-4 text-3xl font-semibold text-tea-900">{store.name}</h3>
                        <p className="mt-2 text-base font-semibold text-matcha-700">
                          {store.area}
                        </p>
                        <p className="mt-4 text-sm leading-7 text-stone-600">
                          {store.description}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-stone-600">
                        <span>{store.address}</span>
                        <span>{store.reviewCount} reviews</span>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <QuickFavoriteButton
                          targetType="store"
                          targetId={store.id}
                          activeLabel="Saved"
                          inactiveLabel="Save store"
                          onResult={(message) => setFavoriteMessage(message)}
                        />
                        <Link className={ui.secondaryButton} to={buildStorePath(store)}>
                          View store
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              }}
            />
          </section>

          <section className={`${ui.panel} grid gap-5`}>
            <div>
              <p className={ui.eyebrow}>Signature drinks</p>
              <h2 className={ui.sectionTitle}>Tea Matcha core menu</h2>
              {favoriteMessage ? (
                <p className="mt-3 text-sm leading-7 text-stone-600">{favoriteMessage}</p>
              ) : null}
              {cartMessage ? (
                <p className="mt-3 text-sm leading-7 text-stone-600">{cartMessage}</p>
              ) : null}
            </div>

            <AutoCarousel
              items={topDishes}
              label="signature drinks"
              getKey={(item) => item.id}
              autoMs={5000}
              renderSlide={(item) => {
                const imagePaths = normalizeImagePathList(item.imagePaths);
                const bestStoreId = item.bestStore?.storeId || item.bestStore?.id;
                const availability = item.bestStore
                  ? getCartAvailabilityDecision(item.bestStore)
                  : { allowed: false, preorderOnly: false, reason: "" };
                const canQuickAdd = Boolean(bestStoreId) && availability.allowed;

                return (
                  <article className="grid w-full gap-5 rounded-[1.85rem] border border-matcha-900/10 bg-white/72 p-5 text-left shadow-[0_18px_44px_rgba(79,70,45,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
                    <Link
                      className="overflow-hidden rounded-[1.5rem] border border-matcha-900/10 bg-stone-100"
                      to={`/menu/${item.id}`}
                    >
                      <SmartImage
                        className="h-72 w-full object-cover"
                        src={imagePaths[0]}
                        alt={item.name}
                        loading="lazy"
                        fallbackClassName="grid h-72 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                      />
                    </Link>

                    <div className="flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={ui.pill}>Core item</span>
                          {item.categoryName ? <span className={ui.pill}>{item.categoryName}</span> : null}
                        </div>

                        <h3 className="mt-4 text-3xl font-semibold text-tea-900">{item.name}</h3>
                        <p className="mt-2 text-base font-semibold text-matcha-700">
                          {formatCurrency(item.price)}
                        </p>
                        <p className="mt-4 text-sm leading-7 text-stone-600">
                          {item.description}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-stone-600">
                        <span>{item.reviewCount} reviews</span>
                        <span>{item.favoriteCount} saves</span>
                        {item.bestStore?.name ? <span>Recommended at {item.bestStore.name}</span> : null}
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
                      </div>
                    </div>
                  </article>
                );
              }}
            />
          </section>
        </>
      ) : null}
    </main>
  );
}
