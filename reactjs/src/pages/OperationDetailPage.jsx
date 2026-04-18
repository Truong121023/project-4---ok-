import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
            {subtitle}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-tea-900">{title}</h2>
        </div>
        <span className={ui.pill}>Today</span>
      </div>

      <div className="mt-6 rounded-[1.45rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,246,239,0.9))] p-4">
        <div className="h-56">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`${metricKey}-line`} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor="#27402d" />
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
                    fill="#27402d"
                    r="2.1"
                    stroke="#f8f5ef"
                    strokeWidth="1.1"
                  />
                ))}
              </>
            ) : null}
          </svg>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-3 xl:grid-cols-8">
          {items.filter((_, index) => index % 3 === 0).map((item) => (
            <div key={item.key} className="text-center">
              <div className="text-sm font-semibold text-tea-900">
                {Number(item[metricKey] ?? 0)}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
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
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            Loading operational detail...
          </div>
        </section>
      </main>
    );
  }

  if (error || !storeData) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
            {error || "Store operations are unavailable."}
          </div>
        </section>
      </main>
    );
  }

  const readinessCards = [
    { label: "Catalog items", value: formatCompactNumber(publicStoreDetail?.stats?.availableItemCount ?? 0) },
    { label: "Average rating", value: averageRating.toFixed(1) },
    { label: "Reviews", value: formatCompactNumber(reviewCount) },
    { label: "Last updated", value: formatDateTime(storeData.updatedAt) },
  ];

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className={ui.eyebrow}>Operation Detail</p>
            <h1 className="max-w-[13ch] text-4xl font-bold leading-none tracking-tight text-tea-900 sm:text-5xl">
              {storeData.name}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
              Monitor the live operating state of one Kamatcha store: orders, revenue, menu
              performance, customer signal, and urgent operational alerts.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className={ui.secondaryButton} to={ADMIN_SECTION_ROUTE_MAP.stores}>
                Back to store list
              </Link>
              <Link className={ui.secondaryButton} to={buildStorePath(storeData)}>
                Public store page
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:min-w-[22rem] lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/78 p-5">
              <div className="grid gap-2 text-sm leading-7 text-stone-600">
                <span className={ui.pill}>{storeData.area || "Store"}</span>
                <span>{storeData.address || "Address unavailable"}</span>
                <span>Phone: {storeData.phoneNumber || "Not set"}</span>
                <span>Hours: {formatTime(storeData.openTime)} - {formatTime(storeData.closeTime)}</span>
                <span>Email: {storeData.contactEmail || "Not set"}</span>
              </div>
            </article>

            <article className="rounded-[1.5rem] bg-[#203228] p-5 text-white shadow-[0_20px_44px_rgba(32,50,40,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                Readiness
              </p>
              <div className="mt-4 grid gap-3">
                {readinessCards.map((entry) => (
                  <div key={entry.label}>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                      {entry.label}
                    </p>
                    <strong className="mt-1 block text-lg font-semibold">{entry.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Revenue today", value: formatCurrency(paidRevenue), featured: true },
            { label: "Completed orders", value: formatCompactNumber(completedOrders.length) },
            { label: "Live orders", value: formatCompactNumber(liveOrders.length) },
            { label: "Average ticket", value: formatCurrency(completedOrders.length ? paidRevenue / completedOrders.length : 0) },
            { label: "Item sold", value: formatCompactNumber(topItems.reduce((sum, item) => sum + item.quantity, 0)) },
          ].map((card) => (
            <article
              key={card.label}
              className={
                card.featured
                  ? "rounded-[1.6rem] border border-matcha-700/15 bg-gradient-to-br from-[#203228] to-[#314838] p-5 text-white shadow-[0_18px_44px_rgba(34,40,24,0.2)] sm:col-span-2 xl:col-span-1"
                  : "rounded-[1.45rem] border border-matcha-900/10 bg-white/75 p-4"
              }
            >
              <p className={card.featured ? "text-xs uppercase tracking-[0.2em] text-white/60" : "text-xs uppercase tracking-[0.2em] text-stone-500"}>
                {card.label}
              </p>
              <strong className={card.featured ? "mt-4 block text-3xl font-semibold tracking-tight text-white" : "mt-3 block text-3xl font-semibold text-tea-900"}>
                {card.value}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <StoreMetricChart
          color="#8faa66"
          items={hourlySeries}
          metricKey="orders"
          subtitle="Sales trend"
          title="Orders by hour"
        />

        <section className={ui.card}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                Operational health
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                Queue and completion status
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {orderStatusSummary.map((entry) => (
              <article
                key={entry.status}
                className="flex items-center justify-between rounded-[1.2rem] border border-matcha-900/10 bg-white/75 px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-tea-900">
                    {entry.status.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                    Current queue status
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(entry.status)}`}>
                  {formatCompactNumber(entry.count)}
                </span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <StoreMetricChart
          color="#c87b3a"
          items={hourlySeries}
          metricKey="revenue"
          subtitle="Sales trend"
          title="Revenue by hour"
        />

        <section className={ui.card}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                Alerts and actions
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                What needs attention now
              </h2>
            </div>
            <span className={ui.pill}>{formatCompactNumber(delayedOrders.length)} delayed</span>
          </div>

          <div className="mt-6 grid gap-3">
            {delayedOrders.length ? delayedOrders.map((order) => (
              <article
                key={order.id}
                className="rounded-[1.2rem] border border-amber-200 bg-amber-50/80 p-4 text-sm leading-7 text-amber-900"
              >
                Order #{order.id} is still open after 30 minutes.
              </article>
            )) : (
              <article className="rounded-[1.2rem] border border-matcha-900/10 bg-white/75 p-4 text-sm leading-7 text-stone-600">
                No time-sensitive operational alerts are active right now.
              </article>
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className={ui.card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                Product performance
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                Best-selling items today
              </h2>
            </div>
            <span className={ui.pill}>{formatCompactNumber(topItems.length)} ranked item</span>
          </div>

          <div className="mt-6 grid gap-3">
            {topItems.length ? topItems.map((item) => (
              <article
                key={item.key}
                className="rounded-[1.3rem] border border-matcha-900/10 bg-white/72 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-tea-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatCompactNumber(item.quantity)} sold today
                    </p>
                  </div>
                  <span className={ui.pill}>Top item</span>
                </div>
              </article>
            )) : (
              <article className="rounded-[1.3rem] border border-dashed border-matcha-900/15 bg-white/55 p-5 text-sm text-stone-600">
                No product data has been recorded for the store today.
              </article>
            )}
          </div>
        </section>

        <section className={ui.card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                Live order queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                Open orders by status
              </h2>
            </div>
            <span className={ui.pill}>{formatCompactNumber(liveOrders.length)} live order</span>
          </div>

          <div className="mt-6 grid gap-3">
            {openOrdersByStatus.length ? openOrdersByStatus.map((entry) => (
              <article
                key={entry.status}
                className="rounded-[1.3rem] border border-matcha-900/10 bg-white/72 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-tea-900">
                      {entry.status.replaceAll("_", " ")}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Orders currently in this queue stage.
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusTone(entry.status)}`}>
                    {formatCompactNumber(entry.count)}
                  </span>
                </div>
              </article>
            )) : (
              <article className="rounded-[1.3rem] border border-dashed border-matcha-900/15 bg-white/55 p-5 text-sm text-stone-600">
                There are no open orders in the queue right now.
              </article>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
