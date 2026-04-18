import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SmartImage from "../components/SmartImage";
import { fetchPublicDishes } from "../lib/siteApi";
import { ui } from "../ui";

function buildCategoryOptions(items) {
  const categoryMap = new Map();

  items.forEach((item) => {
    if (!item.categoryId || !item.categoryName) {
      return;
    }

    if (!categoryMap.has(item.categoryId)) {
      categoryMap.set(item.categoryId, {
        id: item.categoryId,
        title: item.categoryName,
        image: item.categoryImage,
        description: item.categoryDescription,
      });
    }
  });

  return Array.from(categoryMap.values()).sort((left, right) =>
    left.title.localeCompare(right.title, "vi"),
  );
}

export default function CategoryPage() {
  const location = useLocation();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categories = useMemo(() => buildCategoryOptions(dishes), [dishes]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchPublicDishes();

        if (!result.ok) {
          setError(result.message);
          return;
        }

        setDishes(result.data);
      } catch (err) {
        setError("Failed to load categories");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [location]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-matcha-500 border-t-transparent" />
          <p className="text-stone-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            className={ui.primaryButton}
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-tea-900">Categories</h1>
        <p className="mt-2 text-stone-600">
          Explore our menu by category
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/menu?category=${category.id}`}
            className="group rounded-[1.6rem] border border-matcha-900/10 bg-white p-6 shadow-[0_10px_24px_rgba(79,70,45,0.08)] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(79,70,45,0.12)]"
          >
            <div className="aspect-square mb-4 overflow-hidden rounded-2xl bg-matcha-50">
              <SmartImage
                src={category.image}
                alt={category.title}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
            <h3 className="text-lg font-semibold text-tea-900">
              {category.title}
            </h3>
            {category.description && (
              <p className="mt-2 text-sm text-stone-600 line-clamp-2">
                {category.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}