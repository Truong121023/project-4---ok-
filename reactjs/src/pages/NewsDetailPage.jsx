import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import MediaLibrary from "../components/MediaLibrary";
import DetailLayout from "../components/templates/detail-layout";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { formatShortDateTimeVn } from "../lib/locale";
import { buildNewsPath } from "../lib/newsRouting";
import { fetchPublicNewsDetail } from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(v) {
  if (!v) return "Not published yet";
  return formatShortDateTimeVn(v, v);
}

function NewsDetailSkeleton() {
  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-4 w-32" />
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="w-full shrink-0 lg:w-[45%]">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </main>
  );
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
        if (!cancelled) setNewsItem(response);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load news details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNewsDetail();
    return () => { cancelled = true; };
  }, [newsKey]);

  if (loading) return <NewsDetailSkeleton />;

  if (error || !newsItem) {
    return (
      <main className="bg-bg min-h-screen">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <p className={ui.eyebrow}>News</p>
          <h1 className={ui.bannerTitle}>Article not found</h1>
          <p className={ui.copy + " mx-auto"}>{error || "This article does not exist or has been removed."}</p>
          <Link className={ui.secondaryButton + " mt-6 inline-flex"} to="/news">Back to news</Link>
        </div>
      </main>
    );
  }

  // ── gallery ─────────────────────────────────────────────────────────────────
  const galleryRegion = (
    <MediaLibrary
      images={newsItem.imagePaths}
      alt={newsItem.title}
      badge={newsItem.relatedStoreName || "Kamatcha"}
      heroClassName="h-[22rem] sm:h-[30rem] rounded-xl overflow-hidden"
      thumbnailClassName="h-20"
    />
  );

  // ── sticky meta rail ─────────────────────────────────────────────────────────
  const metaRail = (
    <div className="flex flex-col gap-4">
      {/* Publication meta */}
      <div className="flex flex-wrap gap-2">
        {newsItem.featured ? <Badge variant="matcha">Featured</Badge> : null}
        <Badge variant="beige">{formatDateTime(newsItem.publishedAt)}</Badge>
        {newsItem.tags?.map((tag) => <Badge key={tag} variant="beige">{tag}</Badge>)}
      </div>

      {/* Related store teaser */}
      {newsItem.relatedStoreName ? (
        <div className="rounded-lg border border-beige-200 bg-beige-100/60 px-3 py-2 text-sm text-ink-700">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-400">Related store</span>
          <p className="mt-1 font-semibold text-ink-900">{newsItem.relatedStoreName}</p>
        </div>
      ) : null}

      {/* Navigation actions */}
      <div className="flex flex-wrap gap-2">
        <Link className={ui.secondaryButton + " !text-sm"} to="/news">Back to news</Link>
        {newsItem.relatedStoreId || newsItem.relatedStoreSlug ? (
          <Link
            className={ui.primaryButton + " !text-sm"}
            to={buildStorePath({ storeId: newsItem.relatedStoreId, storeSlug: newsItem.relatedStoreSlug })}
          >
            View store
          </Link>
        ) : null}
      </div>
    </div>
  );

  // ── related: store callout or next article placeholder ───────────────────────
  const relatedRegion = newsItem.relatedStoreName ? (
    <div>
      <div className="mb-4">
        <p className={ui.eyebrow}>Related store</p>
        <h2 className={ui.sectionTitle}>{newsItem.relatedStoreName}</h2>
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-ink-900/10 bg-cream-50 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-ink-600">
          This article is linked to this store in our system.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link className={ui.secondaryButton} to={currentNewsPath}>Viewing this article</Link>
          <Link
            className={ui.primaryButton}
            to={buildStorePath({ storeId: newsItem.relatedStoreId, storeSlug: newsItem.relatedStoreSlug })}
          >
            Open store page
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  // ── breadcrumb ───────────────────────────────────────────────────────────────
  const breadcrumb = (
    <nav className="flex items-center gap-2 text-sm text-ink-500">
      <Link className="hover:text-matcha-700 transition-colors" to="/news">News</Link>
      <span>/</span>
      <span className="text-ink-900 font-medium truncate max-w-[24ch]">{newsItem.title}</span>
    </nav>
  );

  return (
    <main className="bg-bg min-h-screen pb-24 lg:pb-0">
      <DetailLayout breadcrumb={breadcrumb} gallery={galleryRegion} stickyBar={metaRail} related={relatedRegion}>
        <div className="flex flex-col gap-6">
          {/* Article header */}
          <div>
            <p className={ui.eyebrow}>News</p>
            {/* Serif display headline — per spec */}
            <h1 className="font-display max-w-[22ch] text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              {newsItem.title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-ink-600">{newsItem.summary}</p>
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {newsItem.featured ? <Badge variant="matcha">Featured</Badge> : null}
            <Badge variant="beige">{formatDateTime(newsItem.publishedAt)}</Badge>
            {newsItem.tags?.map((tag) => <Badge key={tag} variant="beige">{tag}</Badge>)}
          </div>

          {/* Divider */}
          <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent" />

          {/* Article body — rendered as paragraphs from content string */}
          {newsItem.content ? (
            <article className="prose-zen flex flex-col gap-4">
              {newsItem.content
                .split(/\n+/)
                .map((block) => block.trim())
                .filter(Boolean)
                .map((block, index) => (
                  <p
                    key={`${newsItem.id}-block-${index}`}
                    className="text-sm leading-8 text-ink-700"
                  >
                    {block}
                  </p>
                ))}
            </article>
          ) : null}

          {/* Extended content sections */}
          {Array.isArray(newsItem.sections) && newsItem.sections.length ? (
            <>
              <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-beige-300 to-transparent" />
              <ContentSectionsBlock
                sections={newsItem.sections}
                eyebrow="Article sections"
                title="More from this story"
                description="Editorial blocks from the shared backend content sections contract."
              />
            </>
          ) : null}
        </div>
      </DetailLayout>
    </main>
  );
}
