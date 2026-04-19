import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminPageHeader from "./admin/admin-page-header";
import AdminStatCard from "./admin/admin-stat-card";
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
    <article className="grid gap-2">
      <div className="flex h-36 items-end">
        <div
          className={`w-full rounded-t transition-all ${isPeak ? "bg-matcha-900" : "bg-matcha-500"}`}
          style={{ height: `${Math.max(8, value)}%` }}
        />
      </div>
      <div className="grid gap-0.5 text-center">
        <strong className="font-mono text-xs font-semibold text-ink-900">{count}</strong>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</span>
        <span className="text-[10px] text-ink-400">{shortDate}</span>
      </div>
    </article>
  );
}

export default function AdminHomepageAnalytics() {
  const { t } = useTranslation("admin");
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
          setError(getApiErrorMessage(requestError, t("orders.analyticsLoadError")));
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          eyebrow={isManagerMode ? t("analytics.managerEyebrow") : t("analytics.eyebrow")}
          title={t("analytics.title")}
          subtitle={
            isManagerMode
              ? t("analytics.managerSubtitle")
              : t("analytics.subtitle")
          }
        />
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-900/8 bg-cream-100 px-3 py-2 text-xs text-ink-600">
          <span className={ui.pill}>{analytics?.scopeLabel || t("analytics.scopeLabel")}</span>
          <span>{t("analytics.ordersLive")}</span>
          <span>{t("analytics.reviewsToday")}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-4 rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
          {t("charts.loading")}
        </div>
      )}

      {!loading && analytics ? (
        <>
          {/* KPI strip */}
          <div className="mt-4 grid gap-3 xl:grid-cols-5">
            <AdminStatCard featured label={t("analytics.dailyRevenue")} note={t("analytics.dailyRevenueNote")} value={formatCurrency(analytics.todayRevenue)} />
            <AdminStatCard label={t("analytics.orderVolume")} note={t("analytics.orderVolumeNote")} value={formatCompactNumber(analytics.todayOrders)} />
            <AdminStatCard label={t("analytics.avgOrderValue")} note={t("analytics.avgOrderValueNote")} value={formatCurrency(analytics.averageOrderValue)} />
            <AdminStatCard label={t("analytics.newComments")} note={t("analytics.newCommentsNote")} value={formatCompactNumber(analytics.newComments)} />
            <AdminStatCard label={t("analytics.newCustomers")} note={t("analytics.newCustomersNote")} value={formatCompactNumber(analytics.newCustomers)} />
          </div>

          {/* Best seller + Best store */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-lg border border-ink-900/8 bg-cream-50 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminPageHeader eyebrow={t("analytics.bestSeller")} title={analytics.bestSeller?.dishName || t("analytics.noData")} />
                <Link className={ui.secondaryButton} to={buildAdminWorkspacePath({ sectionKey: "orders" })}>
                  {t("analytics.openOrders")}
                </Link>
              </div>

              {analytics.bestSeller ? (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {[
                      { label: t("analytics.qtyLabel"), value: formatCompactNumber(analytics.bestSeller.quantitySold) },
                      { label: t("analytics.ordersLabel"), value: formatCompactNumber(analytics.bestSeller.orderCount) },
                      { label: t("analytics.revenueLabel"), value: formatCurrency(analytics.bestSeller.revenue) },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-md border border-ink-900/8 bg-beige-100 px-2.5 py-2">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{stat.label}</p>
                        <strong className="mt-0.5 block font-mono text-sm text-ink-900">{stat.value}</strong>
                      </div>
                    ))}
                  </div>
                  {analytics.bestSeller.storeName && (
                    <p className="mt-2 text-xs text-ink-500">
                      {t("analytics.leadingStore")} <strong>{analytics.bestSeller.storeName}</strong>
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-3 rounded-md border border-dashed border-ink-900/10 bg-cream-100 p-3 text-xs text-ink-400">
                  {t("analytics.bestSellerEmpty")}
                </div>
              )}
            </article>

            <article className="rounded-lg border border-matcha-700/20 bg-matcha-900 p-4 text-cream-50 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminPageHeader eyebrow={t("analytics.bestStore")} title={analytics.bestStore?.storeName || analytics.scopeLabel} />
                <span className="rounded-full bg-cream-50/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-50/70">
                  {t("analytics.lastSevenDays")}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { label: t("analytics.revenueLabel"), value: formatCurrency(analytics.bestStore?.revenue) },
                  { label: t("analytics.paidOrders"), value: formatCompactNumber(analytics.bestStore?.paidOrders) },
                  { label: t("analytics.totalOrdersLabel"), value: formatCompactNumber(analytics.bestStore?.totalOrders) },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-cream-50/50">{stat.label}</p>
                    <strong className="mt-0.5 block font-mono text-sm font-semibold text-cream-50">{stat.value}</strong>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs leading-5 text-cream-50/60">
                {isManagerMode
                  ? t("analytics.lockedToStore")
                  : t("analytics.rankedByRevenue")}
              </p>
            </article>
          </div>

          {/* 7-day chart + Latest comment */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-lg border border-ink-900/8 bg-cream-50 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminPageHeader eyebrow={t("analytics.ordersLast7Days")} title={t("analytics.dailyOrderTrend")} />
                <Link className={ui.secondaryButton} to="/admin/reports">{t("analytics.openReport")}</Link>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { label: t("analytics.totalOrders"), value: formatCompactNumber(analytics.ordersLast7DaysTotal) },
                  { label: t("analytics.revenue"), value: formatCurrency(analytics.ordersLast7DaysRevenue) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-md border border-ink-900/8 bg-beige-100 px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{stat.label}</p>
                    <strong className="mt-0.5 block font-mono text-sm text-ink-900">{stat.value}</strong>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
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

            <article className="rounded-lg border border-ink-900/8 bg-cream-50 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AdminPageHeader eyebrow={t("analytics.latestComment")} title={t("analytics.customerReviewSignal")} />
                <Link className={ui.secondaryButton} to={buildAdminWorkspacePath({ sectionKey: "reviews" })}>
                  {t("analytics.openReviews")}
                </Link>
              </div>

              {analytics.latestComment ? (
                <div className="mt-3 grid gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {analytics.latestComment.targetType && (
                      <span className={ui.pill}>{analytics.latestComment.targetType}</span>
                    )}
                    {analytics.latestComment.targetLabel && (
                      <span className={ui.pill}>{analytics.latestComment.targetLabel}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {analytics.latestComment.title || t("analytics.latestComment")}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-ink-600">
                      {analytics.latestComment.comment || ""}
                    </p>
                  </div>
                  <div className="text-xs text-ink-400">
                    <span>
                      {analytics.latestComment.userName || analytics.latestComment.userEmail || t("analytics.customer")}
                    </span>
                    <span className="mx-1.5">·</span>
                    <span>{formatShortDate(analytics.latestComment.createdAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-dashed border-ink-900/10 bg-cream-100 p-3 text-xs text-ink-400">
                  {t("analytics.latestCommentEmpty")}
                </div>
              )}
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
