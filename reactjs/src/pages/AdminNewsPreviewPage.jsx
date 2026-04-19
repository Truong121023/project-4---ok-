import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import MediaLibrary from "../components/MediaLibrary";
import AdminPageHeader from "../components/admin/admin-page-header";
import { useAuth } from "../context/AuthContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { ADMIN_SECTION_ROUTE_MAP } from "../lib/adminRoutes";
import { formatShortDateTimeVn } from "../lib/locale";
import { buildNewsPath } from "../lib/newsRouting";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value, notPublishedLabel) {
  if (!value) {
    return notPublishedLabel;
  }
  return formatShortDateTimeVn(value, value);
}

function normalizeDetailResponse(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return payload.data;
    }

    return payload;
  }

  return null;
}

export default function AdminNewsPreviewPage() {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const navigate = useNavigate();
  const { newsId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newsItem, setNewsItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNewsDetail() {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest(`/api/admin/news/${newsId}`, {
          token: auth.token,
          tokenType: auth.tokenType,
        });
        const detail = normalizeDetailResponse(response);

        if (!cancelled) {
          setNewsItem(detail);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, t("orders.newsLoadError")));

          if (requestError?.status === 401) {
            auth.clearSession();
            navigate("/login", {
              replace: true,
              state: { message: "Your session has expired. Please sign in again." },
            });
          }

          if (requestError?.status === 403) {
            navigate("/unauthorized", { replace: true });
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNewsDetail();

    return () => {
      cancelled = true;
    };
  }, [auth, navigate, newsId]);

  if (loading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
            {t("news.loading")}
          </div>
        </section>
      </main>
    );
  }

  if (error || !newsItem) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
            {error || t("news.notFound")}
          </div>
        </section>
      </main>
    );
  }

  const publicNewsPath = buildNewsPath(newsItem);
  const canOpenPublicArticle = publicNewsPath !== "/news" && newsItem.published !== false;

  return (
    <main className={ui.page}>
      {/* Header + media */}
      <section className={`${ui.panel} grid gap-5 xl:grid-cols-[1fr_0.85fr]`}>
        <div>
          <AdminPageHeader
            eyebrow={t("news.eyebrow")}
            title={newsItem.title}
            subtitle={newsItem.summary}
            actions={
              <div className="flex flex-wrap gap-2">
                <Link className={ui.secondaryButton} to={ADMIN_SECTION_ROUTE_MAP.news}>
                  {t("news.backToNews")}
                </Link>
                {canOpenPublicArticle && (
                  <Link className={ui.secondaryButton} to={publicNewsPath}>
                    {t("news.publicArticle")}
                  </Link>
                )}
                {(newsItem.relatedStoreId || newsItem.relatedStoreSlug) && (
                  <Link
                    className={ui.primaryButton}
                    to={buildStorePath({ storeId: newsItem.relatedStoreId, storeSlug: newsItem.relatedStoreSlug })}
                  >
                    {t("news.relatedStore")}
                  </Link>
                )}
              </div>
            }
          />

          {/* Metadata pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={ui.pill}>{newsItem.published !== false ? t("news.statusActive") : t("news.statusInactive")}</span>
            {newsItem.featured && <span className={ui.pill}>{t("news.statusFeatured")}</span>}
            <span className={ui.pill}>{formatDateTime(newsItem.publishedAt, t("news.notPublished"))}</span>
            {(newsItem.tags ?? []).map((tag) => (
              <span key={tag} className={ui.pill}>{tag}</span>
            ))}
          </div>
        </div>

        <MediaLibrary
          images={newsItem.imagePaths}
          alt={newsItem.title}
          badge={newsItem.relatedStoreName || "Kamatcha"}
          heroClassName="h-64"
          thumbnailClassName="h-20"
        />
      </section>

      {/* Content — sandboxed preview, no script execution */}
      <section className={ui.panel}>
        <p className={ui.eyebrow}>{t("news.contentPreview")}</p>
        {/* Render as plain text blocks — no dangerouslySetInnerHTML to prevent XSS */}
        <div className="mt-3 rounded-lg border border-ink-900/8 bg-cream-50 p-4">
          <div className="grid gap-3 text-sm leading-7 text-ink-700">
            {String(newsItem.content ?? "")
              .split(/\n+/)
              .map((block) => block.trim())
              .filter(Boolean)
              .map((block, index) => (
                <p key={`${newsItem.id}-block-${index}`}>{block}</p>
              ))}
          </div>
        </div>
      </section>

      {Array.isArray(newsItem.sections) && newsItem.sections.length ? (
        <section className={ui.panel}>
          <ContentSectionsBlock
            sections={newsItem.sections}
            eyebrow={t("news.articleSections")}
            title={t("news.moreFromStory")}
            description={t("news.previewDescription")}
          />
        </section>
      ) : null}
    </main>
  );
}
