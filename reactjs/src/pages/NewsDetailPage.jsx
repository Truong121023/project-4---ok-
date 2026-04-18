import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import MediaLibrary from "../components/MediaLibrary";
import { formatShortDateTimeVn } from "../lib/locale";
import { buildNewsPath } from "../lib/newsRouting";
import { fetchPublicNewsDetail } from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  if (!value) {
    return "Not published yet";
  }
  return formatShortDateTimeVn(value, value);
}

export default function NewsDetailPage() {
  const { newsKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newsItem, setNewsItem] = useState(null);
  const currentNewsPath = buildNewsPath(newsItem?.slug || newsKey);

  useEffect(() => {
    let cancelled = false;

    async function loadNewsDetail() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchPublicNewsDetail(newsKey);
        if (!cancelled) {
          setNewsItem(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Unable to load news details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNewsDetail();

    return () => {
      cancelled = true;
    };
  }, [newsKey]);

  if (loading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading news details...
          </div>
        </section>
      </main>
    );
  }

  if (error || !newsItem) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            {error || "News article not found."}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={ui.page}>
      <section className={`${ui.panel} grid gap-6 xl:grid-cols-[1fr_0.9fr]`}>
        <div>
          <p className={ui.eyebrow}>News</p>
          <h1 className="max-w-[18ch] text-4xl font-bold leading-tight tracking-tight text-tea-900 sm:text-5xl">
            {newsItem.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-700">
            {newsItem.summary}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {newsItem.featured ? <span className={ui.pill}>Featured</span> : null}
            <span className={ui.pill}>{formatDateTime(newsItem.publishedAt)}</span>
            {newsItem.tags.map((tag) => (
              <span key={tag} className={ui.pill}>
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={ui.secondaryButton} to="/news">
              Back to news
            </Link>
            {newsItem.relatedStoreId || newsItem.relatedStoreSlug ? (
              <Link
                className={ui.primaryButton}
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

        <MediaLibrary
          images={newsItem.imagePaths}
          alt={newsItem.title}
          badge={newsItem.relatedStoreName || "Kamatcha"}
          heroClassName="h-80"
          thumbnailClassName="h-24"
        />
      </section>

      <section className={ui.panel}>
        <p className={ui.eyebrow}>Content</p>
        <div className="grid gap-4 text-sm leading-8 text-stone-700">
          {newsItem.content
            .split(/\n+/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block, index) => (
              <p key={`${newsItem.id}-block-${index}`}>{block}</p>
            ))}
        </div>
      </section>

      {Array.isArray(newsItem.sections) && newsItem.sections.length ? (
        <section className={ui.panel}>
          <ContentSectionsBlock
            sections={newsItem.sections}
            eyebrow="Article sections"
            title="More from this story"
            description="Editorial blocks now come from the shared backend content sections contract."
          />
        </section>
      ) : null}

      {newsItem.relatedStoreName ? (
        <section className={ui.panel}>
          <p className={ui.eyebrow}>Related store</p>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-5">
            <div>
              <h2 className="text-2xl font-semibold text-tea-900">{newsItem.relatedStoreName}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                This article is linked to this store in the system.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className={ui.secondaryButton} to={currentNewsPath}>
                Viewing this article
              </Link>
              <Link
                className={ui.primaryButton}
                to={buildStorePath({
                  storeId: newsItem.relatedStoreId,
                  storeSlug: newsItem.relatedStoreSlug,
                })}
              >
                Open store page
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
