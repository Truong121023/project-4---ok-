import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import AdminPageHeader from "../components/admin/admin-page-header";
import AdminStatCard from "../components/admin/admin-stat-card";
import { useAuth } from "../context/AuthContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { ADMIN_SECTION_ROUTE_MAP } from "../lib/adminRoutes";
import { formatDateTimeVn, formatNumberVi } from "../lib/locale";
import { fetchOperationalOrders, fetchPublicStoreDetail } from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function normalizeListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function toIdString(value) {
  return value === undefined || value === null || value === "" ? "" : String(value);
}

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} VND`;
}

function formatCompactNumber(value) {
  return formatNumberVi(value);
}

function formatTime(value) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 5) : "--:--";
}

function formatDateTime(value) {
  return formatDateTimeVn(value, "Recently updated");
}

function isSameLocalDay(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function buildHourlySeries(orders) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    key: `hour-${hour}`,
    label: `${String(hour).padStart(2, "0")}:00`,
    revenue: 0,
    orders: 0,
  }));

  orders.forEach((order) => {
    const date = new Date(order.createdAt ?? "");

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const bucket = buckets[date.getHours()];
    if (!bucket) {
      return;
    }

    bucket.orders += 1;
    if (String(order.paymentStatus ?? "").toUpperCase() === "PAID") {
      bucket.revenue += Number(order.totalAmount ?? 0);
    }
  });

  return buckets;
}

function buildPolyline(items, key) {
  if (!items.length) {
    return "";
  }

  const maxValue = Math.max(...items.map((item) => Number(item[key] ?? 0)), 1);

  return items
    .map((item, index) => {
      const x = items.length > 1 ? (index / (items.length - 1)) * 100 : 50;
      const y = 100 - (Number(item[key] ?? 0) / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");
}

function chartPoints(items, key) {
  if (!items.length) {
    return [];
  }

  const maxValue = Math.max(...items.map((item) => Number(item[key] ?? 0)), 1);

  return items.map((item, index) => ({
    key: item.key,
    x: items.length > 1 ? (index / (items.length - 1)) * 100 : 50,
    y: 100 - (Number(item[key] ?? 0) / maxValue) * 100,
  }));
}

function statusTone(status) {
  switch (String(status ?? "").toUpperCase()) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "PREPARING":
      return "bg-amber-100 text-amber-700";
    case "READY_FOR_SHIPPER":
    case "READY":
      return "bg-sky-100 text-sky-700";
    case "OUT_FOR_DELIVERY":
    case "DELIVERING":
      return "bg-indigo-100 text-indigo-700";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

function StoreMetricChart({ color, items, metricKey, subtitle, title }) {
  const points = useMemo(() => chartPoints(items, metricKey), [items, metricKey]);
  const polyline = useMemo(() => buildPolyline(items, metricKey), [items, metricKey]);

  return (
    <section className={ui.card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminPageHeader eyebrow={subtitle} title={title} />
        <span className={ui.pill}>Today</span>
      </div>

      <div className="mt-4 rounded-lg border border-ink-900/8 bg-cream-100 p-3">
        <div className="h-44">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`${metricKey}-line`} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor="var(--color-matcha-900)" />
              </linearGradient>
            </defs>
            {polyline ? (
              <>
                <polyline
                  fill="none"
                  points={polyline}
                  stroke={`url(#${metricKey}-line)`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                {points.map((point) => (
                  <circle
                    key={point.key}
                    cx={point.x}
                    cy={point.y}
                    fill="var(--color-matcha-900)"
                    r="2.1"
                    stroke="var(--color-cream-50)"
                    strokeWidth="1.1"
                  />
                ))}
              </>
            ) : null}
          </svg>
        </div>

        <div className="mt-3 grid grid-cols-6 gap-2 xl:grid-cols-8">
          {items.filter((_, index) => index % 3 === 0).map((item) => (
            <div key={item.key} className="text-center">
              <div className="font-mono text-xs font-semibold text-ink-900">
                {Number(item[metricKey] ?? 0)}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function OperationDetailPage() {
  const { storeKey = "" } = useParams();
  const auth = useAuth();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const scopedOperationStoreId = toIdString(auth.user?.workingStoreId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storeData, setStoreData] = useState(null);
  const [publicStoreDetail, setPublicStoreDetail] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOperationDetail() {
      setLoading(true);
      setError("");

      try {
        const storesPayload = await apiRequest("/api/admin/stores?page=0&size=200", {
          token: auth.token,
          tokenType: auth.tokenType,
        });
        const stores = normalizeListResponse(storesPayload);
        const matchedStore =
          stores.find((store) => toIdString(store.id) === toIdString(storeKey)) ??
          stores.find(
            (store) =>
              String(store.slug ?? "").trim().toLowerCase() === storeKey.trim().toLowerCase(),
          );

        if (!matchedStore) {
          throw new Error("The requested store could not be found in the current scope.");
        }

        if (scopedOperationStoreId && toIdString(matchedStore.id) !== scopedOperationStoreId) {
          throw new Error("This account can only access the assigned store operations.");
        }

        const [ordersResponse, detailResponse] = await Promise.all([
          fetchOperationalOrders(auth, { storeId: matchedStore.id }),
          fetchPublicStoreDetail(matchedStore.slug || matchedStore.id).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        setStoreData(matchedStore);
        setOrders(ordersResponse.items ?? []);
        setPublicStoreDetail(detailResponse);
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Unable to load operation detail."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOperationDetail();

    return () => {
      cancelled = true;
    };
  }, [auth, scopedOperationStoreId, storeKey]);

  const todayOrders = useMemo(
    () => orders.filter((order) => isSameLocalDay(order.createdAt ?? order.updatedAt)),
    [orders],
  );
  const hourlySeries = useMemo(() => buildHourlySeries(todayOrders), [todayOrders]);
  const paidRevenue = useMemo(
    () =>
      todayOrders.reduce(
        (sum, order) =>
          String(order.paymentStatus ?? "").toUpperCase() === "PAID"
            ? sum + Number(order.totalAmount ?? 0)
            : sum,
        0,
      ),
    [todayOrders],
  );
  const completedOrders = useMemo(
    () =>
      todayOrders.filter(
        (order) => String(order.status ?? "").toUpperCase() === "COMPLETED",
      ),
    [todayOrders],
  );
  const liveOrders = useMemo(
    () =>
      todayOrders.filter((order) =>
        ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_SHIPPER", "OUT_FOR_DELIVERY"].includes(
          String(order.status ?? "").toUpperCase(),
        ),
      ),
    [todayOrders],
  );
  const delayedOrders = useMemo(
    () =>
      liveOrders.filter((order) => {
        const createdAt = new Date(order.createdAt ?? "").getTime();
        return Number.isFinite(createdAt) ? Date.now() - createdAt > 30 * 60 * 1000 : false;
      }),
    [liveOrders],
  );
  const orderStatusSummary = useMemo(
    () => [
      "PREPARING",
      "READY_FOR_SHIPPER",
      "OUT_FOR_DELIVERY",
      "DELAYED",
      "CANCELLED",
    ].map((status) => ({
      status,
      count:
        status === "DELAYED"
          ? delayedOrders.length
          : todayOrders.filter(
              (order) => String(order.status ?? "").toUpperCase() === status,
            ).length,
    })),
    [delayedOrders.length, todayOrders],
  );
  const topItems = useMemo(() => {
    const itemMap = new Map();

    todayOrders.forEach((order) => {
      (order.items ?? []).forEach((item) => {
        const key = String(item.dishId ?? item.id ?? item.name ?? "");
        if (!key) {
          return;
        }

        const current = itemMap.get(key) ?? {
          key,
          name: item.dishName || item.name || `Item ${key}`,
          quantity: 0,
        };
        current.quantity += Number(item.quantity ?? 0);
        itemMap.set(key, current);
      });
    });

    return [...itemMap.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5);
  }, [todayOrders]);
  const reviewCount = Number(publicStoreDetail?.reviews?.length ?? 0);
  const averageRating = Number(publicStoreDetail?.stats?.averageRating ?? 0);
  const openOrdersByStatus = useMemo(
    () => orderStatusSummary.filter((entry) => entry.count > 0),
    [orderStatusSummary],
  );

  if (!auth.hasRole("ADMIN", "MANAGER")) {
    return <Navigate replace to="/unauthorized" />;
  }

  if (loading) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
            Loading operational detail…
          </div>
        </section>
      </main>
    );
  }

  if (error || !storeData) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
            {error || "Store operations are unavailable."}
          </div>
        </section>
      </main>
    );
  }

  const readinessCards = [
    { label: "Catalog items", value: formatCompactNumber(publicStoreDetail?.stats?.availableItemCount ?? 0) },
    { label: "Avg rating", value: averageRating.toFixed(1) },
    { label: "Reviews", value: formatCompactNumber(reviewCount) },
    { label: "Last updated", value: formatDateTime(storeData.updatedAt) },
  ];

  return (
    <main className={ui.page}>
      {/* Store header */}
      <section className={ui.panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <AdminPageHeader
            eyebrow="Operation Detail"
            title={storeData.name}
            subtitle="Monitor live operating state: orders, revenue, menu performance, and operational alerts."
            actions={
              <div className="flex flex-wrap gap-2">
                <Link className={ui.secondaryButton} to={ADMIN_SECTION_ROUTE_MAP.stores}>
                  Back to stores
                </Link>
                <Link className={ui.secondaryButton} to={buildStorePath(storeData)}>
                  Public page
                </Link>
              </div>
            }
          />

          {/* Store info + readiness */}
          <div className="grid gap-3 lg:min-w-[20rem] lg:grid-cols-[1fr_0.85fr]">
            <div className="rounded-lg border border-ink-900/8 bg-cream-50 p-3 text-xs leading-6 text-ink-600">
              <span className={ui.pill}>{storeData.area || "Store"}</span>
              <div className="mt-2 grid gap-1">
                <span>{storeData.address || "Address unavailable"}</span>
                <span>Phone: {storeData.phoneNumber || "Not set"}</span>
                <span>Hours: {formatTime(storeData.openTime)} – {formatTime(storeData.closeTime)}</span>
                <span>Email: {storeData.contactEmail || "Not set"}</span>
              </div>
            </div>
            <div className="rounded-lg border border-matcha-700/20 bg-matcha-900 p-3 text-cream-50">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cream-50/60">Readiness</p>
              <div className="mt-2 grid gap-2">
                {readinessCards.map((entry) => (
                  <div key={entry.label}>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-cream-50/50">{entry.label}</p>
                    <strong className="block font-mono text-sm font-semibold">{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Revenue today", value: formatCurrency(paidRevenue), featured: true },
            { label: "Completed", value: formatCompactNumber(completedOrders.length) },
            { label: "Live orders", value: formatCompactNumber(liveOrders.length) },
            { label: "Avg ticket", value: formatCurrency(completedOrders.length ? paidRevenue / completedOrders.length : 0) },
            { label: "Items sold", value: formatCompactNumber(topItems.reduce((sum, item) => sum + item.quantity, 0)) },
          ].map((card) => (
            <AdminStatCard key={card.label} label={card.label} value={card.value} featured={card.featured} />
          ))}
        </div>
      </section>

      {/* Charts row */}
      <section className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
        <StoreMetricChart color="var(--color-matcha-500)" items={hourlySeries} metricKey="orders" subtitle="Sales trend" title="Orders by hour" />

        <section className={ui.card}>
          <AdminPageHeader eyebrow="Operational health" title="Queue status" />
          <div className="mt-4 grid gap-2">
            {orderStatusSummary.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between rounded-md border border-ink-900/8 bg-cream-100 px-3 py-2">
                <span className="text-xs font-medium text-ink-800">{entry.status.replaceAll("_", " ")}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(entry.status)}`}>
                  {formatCompactNumber(entry.count)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.92fr]">
        <StoreMetricChart color="var(--color-matcha-400)" items={hourlySeries} metricKey="revenue" subtitle="Revenue trend" title="Revenue by hour" />

        <section className={ui.card}>
          <div className="flex items-center justify-between gap-2">
            <AdminPageHeader eyebrow="Alerts" title="Needs attention" />
            <span className={ui.pill}>{formatCompactNumber(delayedOrders.length)} delayed</span>
          </div>
          <div className="mt-4 grid gap-2">
            {delayedOrders.length ? delayedOrders.map((order) => (
              <div key={order.id} className="rounded-md border border-warn/20 bg-warn-soft px-3 py-2 text-xs text-warn">
                Order #{order.id} — open over 30 min.
              </div>
            )) : (
              <div className="rounded-md border border-ink-900/8 bg-cream-100 px-3 py-2 text-xs text-ink-400">
                No operational alerts right now.
              </div>
            )}
          </div>
        </section>
      </section>

      {/* Bottom product + queue */}
      <section className="grid gap-5 xl:grid-cols-2">
        <section className={ui.card}>
          <div className="flex items-center justify-between gap-2">
            <AdminPageHeader eyebrow="Product performance" title="Best-selling today" />
            <span className={ui.pill}>{formatCompactNumber(topItems.length)} items</span>
          </div>
          <div className="mt-4 grid gap-2">
            {topItems.length ? topItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-md border border-ink-900/8 bg-cream-100 px-3 py-2">
                <div>
                  <span className="block text-xs font-medium text-ink-900">{item.name}</span>
                  <span className="text-[11px] text-ink-400">{formatCompactNumber(item.quantity)} sold</span>
                </div>
                <span className={ui.pill}>Top item</span>
              </div>
            )) : (
              <div className="rounded-md border border-dashed border-ink-900/10 bg-cream-100 px-3 py-4 text-xs text-ink-400">
                No product data recorded today.
              </div>
            )}
          </div>
        </section>

        <section className={ui.card}>
          <div className="flex items-center justify-between gap-2">
            <AdminPageHeader eyebrow="Live queue" title="Open orders by status" />
            <span className={ui.pill}>{formatCompactNumber(liveOrders.length)} live</span>
          </div>
          <div className="mt-4 grid gap-2">
            {openOrdersByStatus.length ? openOrdersByStatus.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between rounded-md border border-ink-900/8 bg-cream-100 px-3 py-2">
                <span className="text-xs font-medium text-ink-800">{entry.status.replaceAll("_", " ")}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(entry.status)}`}>
                  {formatCompactNumber(entry.count)}
                </span>
              </div>
            )) : (
              <div className="rounded-md border border-dashed border-ink-900/10 bg-cream-100 px-3 py-4 text-xs text-ink-400">
                No open orders in the queue.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
