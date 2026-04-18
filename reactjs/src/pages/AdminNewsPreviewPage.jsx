import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ContentSectionsBlock from "../components/ContentSectionsBlock";
import MediaLibrary from "../components/MediaLibrary";
import { useAuth } from "../context/AuthContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { ADMIN_SECTION_ROUTE_MAP } from "../lib/adminRoutes";
import { formatShortDateTimeVn } from "../lib/locale";
import { buildNewsPath } from "../lib/newsRouting";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  if (!value) {
    return "Not published yet";
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
          setError(getApiErrorMessage(requestError, "Unable to load news details."));

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
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading news preview...
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

  const publicNewsPath = buildNewsPath(newsItem);
  const canOpenPublicArticle = publicNewsPath !== "/news" && newsItem.published !== false;

  return (
    <main className={ui.page}>
      <section className={`${ui.panel} grid gap-6 xl:grid-cols-[1fr_0.9fr]`}>
        <div>
          <p className={ui.eyebrow}>Admin News Preview</p>
          <h1 className="max-w-[18ch] text-4xl font-bold leading-tight tracking-tight text-tea-900 sm:text-5xl">
            {newsItem.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-700">{newsItem.summary}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={ui.pill}>{newsItem.published !== false ? "Active" : "Inactive"}</span>
            {newsItem.featured ? <span className={ui.pill}>Featured</span> : null}
            <span className={ui.pill}>{formatDateTime(newsItem.publishedAt)}</span>
            {(newsItem.tags ?? []).map((tag) => (
              <span key={tag} className={ui.pill}>
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={ui.secondaryButton} to={ADMIN_SECTION_ROUTE_MAP.news}>
              Back to news
            </Link>
            {canOpenPublicArticle ? (
              <Link className={ui.secondaryButton} to={publicNewsPath}>
                Open public article
              </Link>
            ) : null}
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
          {String(newsItem.content ?? "")
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
            description="This preview reads directly from the admin news record."
          />
        </section>
      ) : null}
    </main>
  );
}
