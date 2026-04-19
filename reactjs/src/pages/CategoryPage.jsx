import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SmartImage from "../components/SmartImage";
import CatalogLayout from "../components/templates/catalog-layout";
import { EmptyState } from "../components/ui/empty-state";
import { Skeleton } from "../components/ui/skeleton";
import { fetchPublicDishes } from "../lib/siteApi";
import { ui } from "../ui";

function buildCategoryOptions(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item.categoryId || !item.categoryName) return;
    if (!map.has(item.categoryId)) {
      map.set(item.categoryId, {
        id: item.categoryId,
        title: item.categoryName,
        image: item.categoryImage,
        description: item.categoryDescription,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "vi"));
}

function CategoryCardSkeleton() {
  return (
    <div className="rounded-xl border border-ink-900/10 bg-cream-50 p-5 shadow-soft">
      <Skeleton className="mb-4 aspect-square w-full rounded-lg" />
      <Skeleton className="h-5 w-2/3 mb-2" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

export default function CategoryPage() {
  const { t } = useTranslation("menu");
  const location = useLocation();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = useMemo(() => buildCategoryOptions(dishes), [dishes]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const result = await fetchPublicDishes({ page: 0, size: 200 });
        if (!cancelled) {
          setDishes(Array.isArray(result.items) ? result.items : (Array.isArray(result.data) ? result.data : []));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t("category.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => { cancelled = true; };
  }, [location, t]);

  return (
    <main className="bg-bg min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
        <p className={ui.eyebrow}>{t("category.eyebrow")}</p>
        <h1 className={ui.bannerTitle}>{t("category.pageTitle")}</h1>
        <p className={ui.copy}>{t("category.pageSubtitle")}</p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <p className="mt-3 text-sm text-ink-500">
          <strong className="text-ink-800">{categories.length}</strong>{" "}
          {t("category.count")}
        </p>
      </div>

      <CatalogLayout
        loading={loading}
        skeleton={
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <CategoryCardSkeleton key={i} />)}
          </div>
        }
        empty={
          <EmptyState
            icon="🍵"
            title={t("category.noCategories")}
            description={t("category.noCategoriesBody")}
          />
        }
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/menu?category=${category.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-ink-900/10 bg-cream-50 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
          >
            {/* Category image */}
            <div className="aspect-square overflow-hidden bg-beige-100">
              <SmartImage
                src={category.image}
                alt={category.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Text */}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h2 className="font-display text-base font-semibold text-ink-900 leading-snug">
                {category.title}
              </h2>
              {category.description ? (
                <p className="text-sm text-ink-500 line-clamp-2 leading-relaxed">
                  {category.description}
                </p>
              ) : null}
              <p className="mt-auto pt-2 text-xs font-semibold text-matcha-600 uppercase tracking-widest">
                {t("category.browse")} →
              </p>
            </div>
          </Link>
        ))}
      </CatalogLayout>
    </main>
  );
}
