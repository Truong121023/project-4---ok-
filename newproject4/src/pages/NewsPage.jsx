import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SmartImage from "../components/SmartImage";
import { fetchPublicNews } from "../lib/siteApi";
import { buildNewsPath } from "../lib/newsRouting";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  if (!value) {
    return "Not published yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NewsPage() {
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

        if (!cancelled) {
          setNewsItems(response.items);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load news.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNews();

    return () => {
      cancelled = true;
    };
  }, [featuredOnly, searchValue]);

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <p className={ui.eyebrow}>News</p>
        <h1 className={ui.bannerTitle}>Latest updates from Tea Matcha</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
          Follow launch announcements, store news, and the latest system updates.
        </p>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Search
            </span>
            <input
              className={ui.input}
              type="text"
              placeholder="Title, summary..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Filter
            </span>
            <select
              className={ui.input}
              value={featuredOnly ? "featured" : "all"}
              onChange={(event) => setFeaturedOnly(event.target.value === "featured")}
            >
              <option value="all">All news</option>
              <option value="featured">Featured only</option>
            </select>
          </label>
        </div>
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
            Loading news...
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className={`${ui.panel} grid gap-5`}>
          {newsItems.length ? (
            newsItems.map((newsItem) => {
              const newsPath = buildNewsPath(newsItem);
              const canOpenNews = newsPath !== "/news";

              return (
                <article
                  key={newsItem.id}
                  className="grid gap-5 rounded-[1.75rem] border border-matcha-900/10 bg-white/70 p-5 shadow-[0_18px_44px_rgba(79,70,45,0.08)] lg:grid-cols-[0.9fr_1.1fr]"
                >
                  {canOpenNews ? (
                    <Link
                      className="overflow-hidden rounded-[1.5rem] border border-matcha-900/10 bg-stone-100"
                      to={newsPath}
                    >
                      <SmartImage
                        className="h-64 w-full object-cover"
                        src={newsItem.imagePaths[0]}
                        alt={newsItem.title}
                        loading="lazy"
                        fallbackClassName="grid h-64 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                      />
                    </Link>
                  ) : (
                    <div className="overflow-hidden rounded-[1.5rem] border border-matcha-900/10 bg-stone-100">
                      <SmartImage
                        className="h-64 w-full object-cover"
                        src={newsItem.imagePaths[0]}
                        alt={newsItem.title}
                        loading="lazy"
                        fallbackClassName="grid h-64 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                      />
                    </div>
                  )}

                  <div className="flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {newsItem.featured ? <span className={ui.pill}>Featured</span> : null}
                        <span className={ui.pill}>{formatDateTime(newsItem.publishedAt)}</span>
                      </div>

                      <h2 className="mt-4 text-3xl font-semibold text-tea-900">{newsItem.title}</h2>
                      <p className="mt-4 text-sm leading-7 text-stone-600">{newsItem.summary}</p>

                      {newsItem.tags.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {newsItem.tags.map((tag) => (
                            <span key={tag} className={ui.pill}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {canOpenNews ? (
                        <Link className={ui.primaryButton} to={newsPath}>
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
                          View related store
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
              No matching news found.
            </article>
          )}
        </section>
      ) : null}
    </main>
  );
}
