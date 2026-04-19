import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SmartImage from "../components/SmartImage";
import EditorialLayout from "../components/templates/editorial-layout";
import { formatShortDateTimeVn } from "../lib/locale";
import { fetchPublicNews } from "../lib/siteApi";
import { buildNewsPath } from "../lib/newsRouting";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  if (!value) return "Not published yet";
  return formatShortDateTimeVn(value, value);
}

export default function NewsPage() {
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newsItems, setNewsItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchPublicNews({
          search: searchValue.trim() || undefined,
          featured: featuredOnly ? true : undefined,
          page: 0,
          size: 100,
        });
        if (!cancelled) setNewsItems(response.items);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || "Unable to load news.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNews();
    return () => { cancelled = true; };
  }, [location, featuredOnly, searchValue]);

  const filters = (
    <div className="flex flex-wrap items-end gap-4">
      <label className="grid min-w-[220px] flex-1 gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">Search</span>
        <input
          className={ui.input}
          type="text"
          placeholder="Title, summary..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">Filter</span>
        <select
          className={ui.input}
          value={featuredOnly ? "featured" : "all"}
          onChange={(e) => setFeaturedOnly(e.target.value === "featured")}
        >
          <option value="all">All news</option>
          <option value="featured">Featured only</option>
        </select>
      </label>
    </div>
  );

  return (
    <EditorialLayout
      eyebrow="News"
      kanji="新聞"
      headline="Latest updates from Kamatcha"
      subcopy="Follow launch announcements, store news, and the latest system updates."
      filters={filters}
    >
      {error ? (
        <div className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-sm text-ink-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-6 text-sm text-ink-600">
          Loading news...
        </div>
      ) : null}

      {!loading ? (
        <section className="grid gap-5">
          {newsItems.length ? (
            newsItems.map((newsItem) => {
              const newsPath = buildNewsPath(newsItem);
              const canOpenNews = newsPath !== "/news";

              return (
                <article key={newsItem.id} className={`${ui.card} grid gap-6 xl:grid-cols-[0.88fr_1.12fr]`}>
                  {canOpenNews ? (
                    <Link className="overflow-hidden rounded-xl border border-ink-900/10 bg-cream-100" to={newsPath}>
                      <SmartImage
                        className="h-full min-h-[19rem] w-full object-cover"
                        src={newsItem.imagePaths[0]}
                        alt={newsItem.title}
                        loading="lazy"
                        fallbackClassName="grid min-h-[19rem] w-full place-items-center bg-cream-100 text-xs text-ink-500"
                      />
                    </Link>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-ink-900/10 bg-cream-100">
                      <SmartImage
                        className="h-full min-h-[19rem] w-full object-cover"
                        src={newsItem.imagePaths[0]}
                        alt={newsItem.title}
                        loading="lazy"
                        fallbackClassName="grid min-h-[19rem] w-full place-items-center bg-cream-100 text-xs text-ink-500"
                      />
                    </div>
                  )}

                  <div className="flex flex-col justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {newsItem.featured ? <span className={ui.pill}>Featured</span> : null}
                        <span className={ui.pill}>{formatDateTime(newsItem.publishedAt)}</span>
                      </div>
                      <h2 className="mt-4 font-display text-3xl font-semibold text-ink-900">{newsItem.title}</h2>
                      <p className="mt-4 text-sm leading-7 text-ink-600">{newsItem.summary}</p>
                      {newsItem.tags.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {newsItem.tags.map((tag) => (
                            <span key={tag} className={ui.pill}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canOpenNews ? (
                        <Link className={ui.primaryButton} to={newsPath}>Read article</Link>
                      ) : (
                        <span className={ui.secondaryButton}>Detail slug unavailable</span>
                      )}
                      {newsItem.relatedStoreId || newsItem.relatedStoreSlug ? (
                        <Link
                          className={ui.secondaryButton}
                          to={buildStorePath({ storeId: newsItem.relatedStoreId, storeSlug: newsItem.relatedStoreSlug })}
                        >
                          View related store
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="rounded-xl border border-dashed border-beige-300 bg-cream-50 p-8 text-sm text-ink-600">
              No matching news found.
            </article>
          )}
        </section>
      ) : null}
    </EditorialLayout>
  );
}
