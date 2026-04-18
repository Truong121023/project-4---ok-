import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { buildAdminWorkspacePath } from "../lib/adminRoutes";
import { VIETNAM_TIME_ZONE } from "../lib/locale";
import { fetchOperationalOrders } from "../lib/siteApi";
import { ui } from "../ui";

function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function toId(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value).trim();
}

function pickText(...values) {
  const matched = values.find(
    (value) => value !== undefined && value !== null && String(value).trim() !== "",
  );

  return matched === undefined || matched === null ? "" : String(matched).trim();
}

function authOptions(auth) {
  return {
    token: auth?.token,
    tokenType: auth?.tokenType ?? "Bearer",
  };
}

function normalizeListPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizeRevenuePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return {
    scopeStoreId: toId(value.scopeStoreId),
    scopeStoreName: pickText(value.scopeStoreName),
    todayRevenue: toNumber(value.todayRevenue),
    weekRevenue: toNumber(value.weekRevenue),
    monthRevenue: toNumber(value.monthRevenue),
    yearRevenue: toNumber(value.yearRevenue),
  };
}

function normalizeDashboardPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const topSellingDishes = normalizeListPayload(payload.topSellingDishes).map((entry) => ({
    storeId: toId(entry?.storeId),
    storeName: pickText(entry?.storeName),
    dishId: toId(entry?.dishId),
    dishName: pickText(entry?.dishName, entry?.name),
    imagePaths: Array.isArray(entry?.imagePaths) ? entry.imagePaths.filter(Boolean) : [],
    quantitySold: toNumber(entry?.quantitySold),
    orderCount: toNumber(entry?.orderCount),
    revenue: toNumber(entry?.revenue),
  }));

  return {
    revenue: normalizeRevenuePayload(payload.revenue ?? payload.revenueSummary),
    topSellingDishes,
  };
}

function normalizeSummaryPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return {
    revenue: normalizeRevenuePayload(payload.revenue ?? payload.revenueSummary),
  };
}

function normalizeReviewItem(item) {
  return {
    id: toId(item?.id),
    userId: toId(item?.userId),
    userName: pickText(item?.userName, item?.userFullName, item?.fullName),
    userEmail: pickText(item?.userEmail, item?.email),
    targetType: pickText(item?.targetType),
    targetId: toId(item?.targetId),
    targetLabel: pickText(item?.targetLabel),
    comment: pickText(item?.comment),
    title: pickText(item?.title),
    createdAt: pickText(item?.createdAt),
  };
}

function normalizeUserItem(item) {
  return {
    id: toId(item?.id),
    role: pickText(item?.role).toUpperCase(),
    fullName: pickText(item?.fullName, item?.name),
    email: pickText(item?.email),
    workingStoreId: toId(item?.workingStoreId),
    createdAt: pickText(item?.createdAt),
  };
}

function parseDate(value) {
  const date = new Date(value ?? "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date = new Date()) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameLocalDay(value, referenceDate = new Date()) {
  const currentDate = parseDate(value);

  if (!currentDate) {
    return false;
  }

  return formatDayKey(currentDate) === formatDayKey(referenceDate);
}

function dateInRange(value, startDate, endDate) {
  const currentDate = parseDate(value);

  if (!currentDate) {
    return false;
  }

  const timestamp = currentDate.getTime();
  return timestamp >= startDate.getTime() && timestamp < endDate.getTime();
}

function resolveOrderDate(order) {
  return order?.createdAt || order?.updatedAt || "";
}

function isPaidOrder(order) {
  return String(order?.paymentStatus ?? "").trim().toUpperCase() === "PAID";
}

function formatCurrency(value) {
  return `${toNumber(value).toLocaleString("vi-VN")} VND`;
}

function formatCompactNumber(value) {
  return toNumber(value).toLocaleString("en-US");
}

function formatShortDate(value) {
  const date = parseDate(value);

  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatDayLabel(date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    weekday: "short",
  }).format(date);
}

function buildSevenDaySeries(orders) {
  const todayStart = startOfLocalDay();
  const seriesStart = addDays(todayStart, -6);
  const seriesEnd = addDays(todayStart, 1);
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(seriesStart, index);

    return {
      key: formatDayKey(date),
      label: formatDayLabel(date),
      shortDate: formatShortDate(date),
      count: 0,
      revenue: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  orders.forEach((order) => {
    const orderDate = parseDate(resolveOrderDate(order));

    if (!orderDate || orderDate < seriesStart || orderDate >= seriesEnd) {
      return;
    }

    const matchedBucket = bucketMap.get(formatDayKey(orderDate));

    if (!matchedBucket) {
      return;
    }

    matchedBucket.count += 1;

    if (isPaidOrder(order)) {
      matchedBucket.revenue += toNumber(order?.totalAmount);
    }
  });

  return buckets;
}

function buildTopSellerFromOrders(orders) {
  const orderMap = new Map();

  orders.forEach((order) => {
    (order?.items ?? []).forEach((item) => {
      const dishId = toId(item?.dishId ?? item?.id);
      const dishName = pickText(item?.dishName, item?.name);
      const key = dishId || dishName;

      if (!key) {
        return;
      }

      const current = orderMap.get(key) ?? {
        dishId,
        dishName: dishName || `Dish ${key}`,
        quantitySold: 0,
        revenue: 0,
        orderCount: 0,
        storeName: pickText(order?.storeName),
      };

      current.quantitySold += toNumber(item?.quantity);
      current.revenue += toNumber(item?.lineTotal ?? item?.totalPrice);
      current.orderCount += 1;
      orderMap.set(key, current);
    });
  });

  return [...orderMap.values()].sort((left, right) => {
    if (right.quantitySold !== left.quantitySold) {
      return right.quantitySold - left.quantitySold;
    }

    return right.revenue - left.revenue;
  })[0] ?? null;
}

function buildBestStore(orders, fallbackStore) {
  const storeMap = new Map();

  orders.forEach((order) => {
    const storeId = toId(order?.storeId);
    const storeName = pickText(order?.storeName);
    const key = storeId || storeName;

    if (!key) {
      return;
    }

    const current = storeMap.get(key) ?? {
      storeId,
      storeName: storeName || fallbackStore?.storeName || "Store",
      revenue: 0,
      paidOrders: 0,
      totalOrders: 0,
    };

    current.totalOrders += 1;

    if (isPaidOrder(order)) {
      current.revenue += toNumber(order?.totalAmount);
      current.paidOrders += 1;
    }

    storeMap.set(key, current);
  });

  const rankedStore = [...storeMap.values()].sort((left, right) => {
    if (right.revenue !== left.revenue) {
      return right.revenue - left.revenue;
    }

    return right.totalOrders - left.totalOrders;
  })[0];

  if (rankedStore) {
    return rankedStore;
  }

  if (!fallbackStore?.storeName) {
    return null;
  }

  return {
    storeId: fallbackStore.storeId,
    storeName: fallbackStore.storeName,
    revenue: 0,
    paidOrders: 0,
    totalOrders: 0,
  };
}

function buildFallbackNewCustomerCountFromOrders(orders, todayReference = new Date()) {
  const firstOrderDateByCustomer = new Map();

  orders.forEach((order) => {
    const customerKey =
      toId(order?.userId) ||
      pickText(order?.deliveryPhoneNumber) ||
      pickText(order?.deliveryFullName);
    const orderDate = parseDate(resolveOrderDate(order));

    if (!customerKey || !orderDate) {
      return;
    }

    const currentDate = firstOrderDateByCustomer.get(customerKey);

    if (!currentDate || orderDate < currentDate) {
      firstOrderDateByCustomer.set(customerKey, orderDate);
    }
  });

  return [...firstOrderDateByCustomer.values()].filter((date) =>
    isSameLocalDay(date, todayReference),
  ).length;
}

function BarColumn({ count, isPeak, label, shortDate, value }) {
  return (
    <article className="grid gap-3">
      <div className="flex h-44 items-end">
        <div
          className={`w-full rounded-t-[1rem] transition ${
            isPeak ? "bg-[#203228]" : "bg-matcha-500/70"
          }`}
          style={{ height: `${Math.max(12, value)}%` }}
        />
      </div>
      <div className="grid gap-1 text-center">
        <strong className="text-base text-tea-900">{count}</strong>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          {label}
        </span>
        <span className="text-xs text-stone-500">{shortDate}</span>
      </div>
    </article>
  );
}

function MetricCard({ label, value, note, featured = false }) {
  return (
    <article
      className={
        featured
          ? "rounded-[1.6rem] border border-matcha-700/15 bg-gradient-to-br from-[#203228] to-[#314838] p-5 text-white shadow-[0_18px_44px_rgba(34,40,24,0.2)]"
          : "rounded-[1.45rem] border border-matcha-900/10 bg-white/75 p-4"
      }
    >
      <p
        className={
          featured
            ? "text-xs uppercase tracking-[0.2em] text-white/60"
            : "text-xs uppercase tracking-[0.2em] text-stone-500"
        }
      >
        {label}
      </p>
      <strong
        className={
          featured
            ? "mt-4 block text-3xl font-semibold tracking-tight text-white"
            : "mt-3 block text-3xl font-semibold text-tea-900"
        }
      >
        {value}
      </strong>
      <p
        className={
          featured
            ? "mt-3 text-sm leading-6 text-white/72"
            : "mt-2 text-sm leading-6 text-stone-600"
        }
      >
        {note}
      </p>
    </article>
  );
}

export default function AdminHomepageAnalytics() {
  const auth = useAuth();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const managerStoreId = toId(auth.user?.workingStoreId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!auth.token || !auth.hasRole("ADMIN", "MANAGER")) {
      return undefined;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const [summaryPayload, dashboardPayload, ordersPayload, reviewsPayload, usersPayload] =
          await Promise.all([
            apiRequest("/api/admin/summary", authOptions(auth)),
            apiRequest("/api/admin/dashboard", authOptions(auth)),
            fetchOperationalOrders(auth, {
              page: 0,
              size: 500,
              ...(isManagerMode && managerStoreId ? { storeId: managerStoreId } : {}),
            }),
            apiRequest("/api/admin/reviews?page=0&size=200", authOptions(auth)),
            apiRequest("/api/admin/users?page=0&size=200", authOptions(auth)).catch(() => null),
          ]);

        if (cancelled) {
          return;
        }

        const summary = normalizeSummaryPayload(summaryPayload);
        const dashboard = normalizeDashboardPayload(dashboardPayload);
        const orders = Array.isArray(ordersPayload?.items) ? ordersPayload.items : [];
        const reviews = normalizeListPayload(reviewsPayload).map(normalizeReviewItem);
        const users = normalizeListPayload(usersPayload).map(normalizeUserItem);
        const todayStart = startOfLocalDay();
        const tomorrowStart = addDays(todayStart, 1);
        const sevenDayStart = addDays(todayStart, -6);
        const todayOrders = orders.filter((order) =>
          dateInRange(resolveOrderDate(order), todayStart, tomorrowStart),
        );
        const todayPaidOrders = todayOrders.filter(isPaidOrder);
        const ordersLast7Days = orders.filter((order) =>
          dateInRange(resolveOrderDate(order), sevenDayStart, tomorrowStart),
        );
        const paidOrdersLast7Days = ordersLast7Days.filter(isPaidOrder);
        const customerAccounts = users.filter((user) => user.role === "USER");
        const newCustomerCount = customerAccounts.length
          ? customerAccounts.filter((user) => isSameLocalDay(user.createdAt)).length
          : buildFallbackNewCustomerCountFromOrders(orders);
        const bestSeller =
          dashboard?.topSellingDishes?.[0] ??
          buildTopSellerFromOrders(paidOrdersLast7Days);
        const bestStore = buildBestStore(paidOrdersLast7Days, {
          storeId: managerStoreId,
          storeName:
            auth.user?.workingStoreName ||
            summary?.revenue?.scopeStoreName ||
            dashboard?.revenue?.scopeStoreName,
        });
        const ordersLast7DaysSeries = buildSevenDaySeries(ordersLast7Days);
        const latestComment = [...reviews].sort((left, right) => {
          const rightTime = parseDate(right.createdAt)?.getTime() ?? 0;
          const leftTime = parseDate(left.createdAt)?.getTime() ?? 0;
          return rightTime - leftTime;
        })[0] ?? null;
        const dailyRevenue =
          summary?.revenue?.todayRevenue ??
          dashboard?.revenue?.todayRevenue ??
          todayPaidOrders.reduce((sum, order) => sum + toNumber(order.totalAmount), 0);
        const dailyOrderVolume = todayOrders.length;
        const averageOrderValue = todayPaidOrders.length
          ? dailyRevenue / todayPaidOrders.length
          : 0;

        setAnalytics({
          scopeLabel: isManagerMode
            ? auth.user?.workingStoreName || summary?.revenue?.scopeStoreName || "Manager scope"
            : "All stores",
          todayRevenue: dailyRevenue,
          todayOrders: dailyOrderVolume,
          averageOrderValue,
          newComments: reviews.filter((review) => isSameLocalDay(review.createdAt)).length,
          newCustomers: newCustomerCount,
          bestSeller,
          bestStore,
          latestComment,
          ordersLast7DaysSeries,
          ordersLast7DaysTotal: ordersLast7Days.length,
          ordersLast7DaysRevenue:
            summary?.revenue?.weekRevenue ??
            dashboard?.revenue?.weekRevenue ??
            paidOrdersLast7Days.reduce((sum, order) => sum + toNumber(order.totalAmount), 0),
        });
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, "Unable to load homepage analytics."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [auth, isManagerMode, managerStoreId]);

  const peakOrderCount = useMemo(
    () =>
      analytics?.ordersLast7DaysSeries?.reduce(
        (maxValue, entry) => Math.max(maxValue, toNumber(entry.count)),
        0,
      ) ?? 0,
    [analytics?.ordersLast7DaysSeries],
  );

  return (
    <section className={ui.panel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ui.eyebrow}>{isManagerMode ? "Manager analytics" : "Admin analytics"}</p>
          <h1 className="max-w-[14ch] text-4xl font-bold leading-none tracking-tight text-tea-900 sm:text-5xl">
            Homepage operational overview
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600">
            {isManagerMode
              ? "These numbers are locked to your assigned store only."
              : "These numbers summarize activity across all stores in the system."}
          </p>
        </div>

        <div className="grid gap-3 rounded-[1.5rem] border border-matcha-900/10 bg-white/78 p-4 text-sm leading-7 text-stone-600">
          <span className={ui.pill}>{analytics?.scopeLabel || "Current scope"}</span>
          <span>Orders workspace: live order processing and fulfillment.</span>
          <span>Reviews workspace: customer comments submitted today.</span>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
          Loading homepage analytics...
        </div>
      ) : null}

      {!loading && analytics ? (
        <>
          <div className="mt-6 grid gap-4 xl:grid-cols-5">
            <MetricCard
              featured
              label="Daily revenue"
              note="Paid revenue recorded today in the current scope."
              value={formatCurrency(analytics.todayRevenue)}
            />
            <MetricCard
              label="Order volume"
              note="Orders created today."
              value={formatCompactNumber(analytics.todayOrders)}
            />
            <MetricCard
              label="Average order value"
              note="Daily paid revenue divided by today's paid orders."
              value={formatCurrency(analytics.averageOrderValue)}
            />
            <MetricCard
              label="New comments"
              note="Customer reviews created today."
              value={formatCompactNumber(analytics.newComments)}
            />
            <MetricCard
              label="New customers"
              note="New customer accounts today, or first-time buyers in this scope when account data is unavailable."
              value={formatCompactNumber(analytics.newCustomers)}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[1.8rem] border border-matcha-900/10 bg-white/75 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                    Best seller product
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                    {analytics.bestSeller?.dishName || "No best seller data yet"}
                  </h2>
                </div>

                <Link
                  className={ui.secondaryButton}
                  to={buildAdminWorkspacePath({ sectionKey: "orders" })}
                >
                  Open orders
                </Link>
              </div>

              {analytics.bestSeller ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f4ea] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Quantity sold
                    </p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {formatCompactNumber(analytics.bestSeller.quantitySold)}
                    </strong>
                  </article>
                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f4ea] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Order count
                    </p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {formatCompactNumber(analytics.bestSeller.orderCount)}
                    </strong>
                  </article>
                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f4ea] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Revenue
                    </p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {formatCurrency(analytics.bestSeller.revenue)}
                    </strong>
                  </article>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.3rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm text-stone-600">
                  There is no best seller data yet for the current scope.
                </div>
              )}

              {analytics.bestSeller?.storeName ? (
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  Leading store in this ranking: <strong>{analytics.bestSeller.storeName}</strong>
                </p>
              ) : null}
            </article>

            <article className="rounded-[1.8rem] border border-matcha-900/10 bg-[#203228] p-5 text-white shadow-[0_20px_44px_rgba(32,50,40,0.22)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Best store
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {analytics.bestStore?.storeName || analytics.scopeLabel}
                  </h2>
                </div>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/78">
                  Last 7 days
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Revenue</p>
                  <strong className="mt-2 block text-2xl font-semibold">
                    {formatCurrency(analytics.bestStore?.revenue)}
                  </strong>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Paid orders</p>
                  <strong className="mt-2 block text-2xl font-semibold">
                    {formatCompactNumber(analytics.bestStore?.paidOrders)}
                  </strong>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Total orders</p>
                  <strong className="mt-2 block text-2xl font-semibold">
                    {formatCompactNumber(analytics.bestStore?.totalOrders)}
                  </strong>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-white/72">
                {isManagerMode
                  ? "As manager, this panel stays locked to your own store."
                  : "For admin, the best store is ranked by paid revenue first and total orders second."}
              </p>
            </article>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[1.8rem] border border-matcha-900/10 bg-white/75 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                    Orders last 7 days
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                    Daily order trend
                  </h2>
                </div>

                <Link
                  className={ui.secondaryButton}
                  to={isManagerMode ? "/admin/reports" : "/admin/reports"}
                >
                  Open report
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f4ea] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                    Total orders
                  </p>
                  <strong className="mt-2 block text-2xl text-tea-900">
                    {formatCompactNumber(analytics.ordersLast7DaysTotal)}
                  </strong>
                </div>
                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f4ea] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                    Revenue
                  </p>
                  <strong className="mt-2 block text-2xl text-tea-900">
                    {formatCurrency(analytics.ordersLast7DaysRevenue)}
                  </strong>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-7 gap-3">
                {analytics.ordersLast7DaysSeries.map((entry) => (
                  <BarColumn
                    key={entry.key}
                    count={entry.count}
                    isPeak={entry.count === peakOrderCount && peakOrderCount > 0}
                    label={entry.label}
                    shortDate={entry.shortDate}
                    value={peakOrderCount ? (entry.count / peakOrderCount) * 100 : 0}
                  />
                ))}
              </div>
            </article>

            <article className="rounded-[1.8rem] border border-matcha-900/10 bg-white/75 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-tea-700">
                    Latest comment
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                    Customer review signal
                  </h2>
                </div>

                <Link
                  className={ui.secondaryButton}
                  to={buildAdminWorkspacePath({ sectionKey: "reviews" })}
                >
                  Open reviews
                </Link>
              </div>

              {analytics.latestComment ? (
                <div className="mt-5 grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    {analytics.latestComment.targetType ? (
                      <span className={ui.pill}>{analytics.latestComment.targetType}</span>
                    ) : null}
                    {analytics.latestComment.targetLabel ? (
                      <span className={ui.pill}>{analytics.latestComment.targetLabel}</span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-tea-900">
                      {analytics.latestComment.title || "Latest customer comment"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">
                      {analytics.latestComment.comment ||
                        "The latest review does not include a detailed comment."}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm leading-7 text-stone-600">
                    <span>
                      User:{" "}
                      {analytics.latestComment.userName ||
                        analytics.latestComment.userEmail ||
                        "Customer"}
                    </span>
                    <span>Created at: {formatShortDate(analytics.latestComment.createdAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.3rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm text-stone-600">
                  There are no review comments yet in the current scope.
                </div>
              )}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
