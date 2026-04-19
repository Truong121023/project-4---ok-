import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminHomepageSidebar from "../components/AdminHomepageSidebar";
import AdminPageHeader from "../components/admin/admin-page-header";
import AdminStatCard from "../components/admin/admin-stat-card";
import { sectionTabs } from "../components/admin/adminSchema";
import { useAuth } from "../context/AuthContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import {
  ADMIN_WORKSPACE_PATH,
  buildAdminWorkspacePath,
  hasAdminWorkspaceSearch,
} from "../lib/adminRoutes";
import { ui } from "../ui";

const managerSectionKeys = [
  "stores",
  "users",
  "events",
  "categories",
  "dishes",
  "storeDishes",
  "news",
  "orders",
  "reviews",
  "feedbacks",
];

const WORKSPACE_GROUPS_KEYS = [
  { key: "operations", sections: ["orders", "reviews", "feedbacks"] },
  { key: "network", sections: ["stores", "users", "events"] },
  { key: "catalog", sections: ["categories", "dishes", "storeDishes"] },
  { key: "growth", sections: ["news", "promotions", "userLevels"] },
];

function getSectionMeta(t) {
  return {
    orders: {
      title: t("workspace.sections.orders.title"),
      description: t("workspace.sections.orders.description"),
      badge: t("workspace.sections.orders.badge"),
    },
    reviews: {
      title: t("workspace.sections.reviews.title"),
      description: t("workspace.sections.reviews.description"),
      badge: t("workspace.sections.reviews.badge"),
    },
    feedbacks: {
      title: t("workspace.sections.feedbacks.title"),
      description: t("workspace.sections.feedbacks.description"),
      badge: t("workspace.sections.feedbacks.badge"),
    },
    stores: {
      title: t("workspace.sections.stores.title"),
      description: t("workspace.sections.stores.description"),
      badge: t("workspace.sections.stores.badge"),
    },
    users: {
      title: t("workspace.sections.users.title"),
      description: t("workspace.sections.users.description"),
      badge: t("workspace.sections.users.badge"),
    },
    events: {
      title: t("workspace.sections.events.title"),
      description: t("workspace.sections.events.description"),
      badge: t("workspace.sections.events.badge"),
    },
    categories: {
      title: t("workspace.sections.categories.title"),
      description: t("workspace.sections.categories.description"),
      badge: t("workspace.sections.categories.badge"),
    },
    dishes: {
      title: t("workspace.sections.dishes.title"),
      description: t("workspace.sections.dishes.description"),
      badge: t("workspace.sections.dishes.badge"),
    },
    storeDishes: {
      title: t("workspace.sections.storeDishes.title"),
      description: t("workspace.sections.storeDishes.description"),
      badge: t("workspace.sections.storeDishes.badge"),
    },
    news: {
      title: t("workspace.sections.news.title"),
      description: t("workspace.sections.news.description"),
      badge: t("workspace.sections.news.badge"),
    },
    promotions: {
      title: t("workspace.sections.promotions.title"),
      description: t("workspace.sections.promotions.description"),
      badge: t("workspace.sections.promotions.badge"),
    },
    userLevels: {
      title: t("workspace.sections.userLevels.title"),
      description: t("workspace.sections.userLevels.description"),
      badge: t("workspace.sections.userLevels.badge"),
    },
  };
}

function getWorkspaceGroups(t) {
  return WORKSPACE_GROUPS_KEYS.map((group) => ({
    key: group.key,
    eyebrow: t(`workspace.groups.${group.key}.eyebrow`),
    title: t(`workspace.groups.${group.key}.title`),
    description: t(`workspace.groups.${group.key}.description`),
    sections: group.sections,
  }));
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === "") {
    return "No data";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return `${numericValue.toLocaleString("vi-VN")} VND`;
}

function formatCount(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString("en-GB") : "--";
}

function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDateInputValue(date = new Date()) {
  return new Date(date).toISOString().split("T")[0];
}

function subtractDays(dateValue, days) {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
}

function createLastSevenDayRange(endDateValue = new Date()) {
  const endDate = new Date(endDateValue);
  return {
    startDate: formatDateInputValue(subtractDays(endDate, 6)),
    endDate: formatDateInputValue(endDate),
  };
}

function clampRangeToSevenDays(startDateStr = "", endDateStr = "") {
  if (!startDateStr || !endDateStr) {
    return createLastSevenDayRange();
  }

  let startDate = new Date(startDateStr);
  let endDate = new Date(endDateStr);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return createLastSevenDayRange();
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    startDate = new Date(endDate);
  }

  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays > 7) {
    startDate = subtractDays(endDate, 6);
    startDate.setHours(0, 0, 0, 0);
  }

  return {
    startDate: formatDateInputValue(startDate),
    endDate: formatDateInputValue(endDate),
  };
}

function buildSevenDaySeries(ordersData = [], startDateStr = "", endDateStr = "") {
  if (!startDateStr || !endDateStr) {
    return [];
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Calculate total days in range
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // If range > 7 days, only show last 7 days
  let displayStartDate = startDate;
  if (totalDays > 7) {
    displayStartDate = new Date(endDate);
    displayStartDate.setDate(displayStartDate.getDate() - 6);
    displayStartDate.setHours(0, 0, 0, 0);
  }

  const days = [];
  const current = new Date(displayStartDate);

  // Build all days in display range (max 7 days)
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const series = days.map((dayStart) => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const dayOrders = ordersData.filter((order) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dayStart && orderDate < dayEnd;
    });

    // Format date label - always show weekday for max 7 days
    const dateLabel = dayStart.toLocaleDateString("en-US", { weekday: "short" });

    return {
      date: dateLabel,
      count: dayOrders.length,
      isoDate: dayStart.toISOString().split("T")[0],
    };
  });

  return series;
}

function buildOrdersByStore(ordersData = [], startDateStr = "", endDateStr = "") {
  if (!startDateStr || !endDateStr) {
    return [];
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  // Filter orders in date range
  const filteredOrders = ordersData.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Group by store
  const storeMap = {};
  filteredOrders.forEach((order) => {
    const storeName = order.storeName || "Unknown Store";
    if (!storeMap[storeName]) {
      storeMap[storeName] = 0;
    }
    storeMap[storeName]++;
  });

  // Convert to array and sort by count (descending)
  const series = Object.entries(storeMap)
    .map(([storeName, count]) => ({
      storeName,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Limit to top 10 stores

  return series;
}

function buildTopSellingDishes(ordersData = [], startDateStr = "", endDateStr = "") {
  if (!startDateStr || !endDateStr) {
    return [];
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const dishMap = new Map();

  ordersData.forEach((order) => {
    const orderDate = new Date(order.createdAt);

    if (orderDate < startDate || orderDate > endDate) {
      return;
    }

    (order.items ?? []).forEach((item) => {
      const dishId = String(item?.dishId ?? item?.id ?? "").trim();
      const dishName = String(item?.dishName ?? item?.name ?? "").trim();
      const key = dishId || dishName;

      if (!key) {
        return;
      }

      const current = dishMap.get(key) ?? {
        dishId,
        dishName: dishName || `Dish ${key}`,
        quantitySold: 0,
        revenue: 0,
        orderCount: 0,
        storeName: String(order?.storeName ?? "").trim(),
      };

      current.quantitySold += Number(item?.quantity ?? 0);
      current.revenue += Number(item?.lineTotal ?? item?.totalPrice ?? 0);
      current.orderCount += 1;
      dishMap.set(key, current);
    });
  });

  return [...dishMap.values()]
    .sort((left, right) => {
      if (right.quantitySold !== left.quantitySold) {
        return right.quantitySold - left.quantitySold;
      }

      return right.revenue - left.revenue;
    })
    .slice(0, 4);
}

function calculateRevenueFromOrders(ordersData = []) {
  const now = new Date();
  const todayStart = getStartOfDay(now);
  const monthStart = getStartOfMonth(now);
  const monthEnd = getEndOfMonth(now);

  let todayRevenue = 0;
  let monthRevenue = 0;

  ordersData.forEach((order) => {
    // Only count paid orders
    if (String(order.paymentStatus ?? "").toUpperCase() !== "PAID") {
      return;
    }

    const totalAmount = Number(order.totalAmount) || 0;
    const orderDate = new Date(order.createdAt);

    // Today revenue
    if (orderDate >= todayStart && orderDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)) {
      todayRevenue += totalAmount;
    }

    // Month revenue
    if (orderDate >= monthStart && orderDate <= monthEnd) {
      monthRevenue += totalAmount;
    }
  });

  return { todayRevenue, monthRevenue };
}

function buildMetricCards({ summary, dashboard, revenueSummary, isAdmin, workingStoreName, t }) {
  const sharedCards = [
    {
      label: t("overview.revenueToday"),
      value: formatCurrency(revenueSummary?.todayRevenue),
      featured: true,
    },
    {
      label: t("overview.revenueMonth"),
      value: formatCurrency(revenueSummary?.monthRevenue),
    },
    {
      label: t("overview.orders"),
      value: formatCount(summary?.orderCount),
    },
    {
      label: t("overview.reviewsLabel"),
      value: formatCount(summary?.reviewCount),
    },
    {
      label: t("overview.feedbackLabel"),
      value: formatCount(Array.isArray(dashboard?.feedbacks) ? dashboard.feedbacks.length : 0),
    },
  ];

  if (isAdmin) {
    return [
      ...sharedCards,
      {
        label: t("overview.usersLabel"),
        value: formatCount(summary?.userCount),
      },
    ];
  }

  return [
    {
      label: t("overview.workingStore"),
      value: workingStoreName || t("overview.notAssigned"),
      featured: true,
    },
    ...sharedCards,
    {
      label: t("overview.storeDishes"),
      value: formatCount(summary?.storeDishCount),
    },
  ];
}

export default function AdminHomePage() {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const location = useLocation();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const accessibleSectionKeys = useMemo(
    () =>
      isManagerMode
        ? managerSectionKeys
        : sectionTabs.map((tab) => tab.key),
    [isManagerMode],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [storeRange, setStoreRange] = useState(() => createLastSevenDayRange());
  const [bestSellerRange, setBestSellerRange] = useState(() => createLastSevenDayRange());
  const shouldRedirectToWorkspace = hasAdminWorkspaceSearch(location.search);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      return;
    }

    let isCancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const [summaryPayload, dashboardPayload, ordersPayload] = await Promise.all([
          apiRequest("/api/admin/summary", {
            token: auth.token,
            tokenType: auth.tokenType,
          }),
          apiRequest("/api/admin/dashboard", {
            token: auth.token,
            tokenType: auth.tokenType,
          }),
          apiRequest("/api/admin/orders?page=0&size=1000", {
            token: auth.token,
            tokenType: auth.tokenType,
          }),
        ]);

        console.log("Summary Payload:", summaryPayload);
        console.log("Dashboard Payload:", dashboardPayload);
        console.log("Orders Payload:", ordersPayload);

        if (isCancelled) {
          return;
        }

        setSummary(summaryPayload && typeof summaryPayload === "object" ? summaryPayload : null);
        setDashboard(dashboardPayload && typeof dashboardPayload === "object" ? dashboardPayload : null);
        setOrders(Array.isArray(ordersPayload?.items) ? ordersPayload.items : []);
      } catch (requestError) {
        console.error("Error loading overview:", requestError);
        if (!isCancelled) {
          setError(getApiErrorMessage(requestError, t("orders.overviewLoadError")));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      isCancelled = true;
    };
  }, [auth.isAuthenticated, auth.token, auth.tokenType]);

  const { todayRevenue, monthRevenue } = useMemo(
    () => calculateRevenueFromOrders(orders),
    [orders],
  );

  const revenueSummary = useMemo(
    () => ({
      scopeStoreName: isManagerMode ? auth.user?.workingStoreName || "Manager scope" : "All stores",
      todayRevenue: todayRevenue || summary?.revenue?.todayRevenue || dashboard?.revenue?.todayRevenue,
      monthRevenue: monthRevenue || summary?.revenue?.monthRevenue || dashboard?.revenue?.monthRevenue,
    }),
    [todayRevenue, monthRevenue, summary?.revenue, dashboard?.revenue, isManagerMode, auth.user?.workingStoreName],
  );
  const weeklyOrdersSeries = useMemo(
    () => buildSevenDaySeries(orders, startDate, endDate),
    [orders, startDate, endDate],
  );
  const totalWeeklyOrders = useMemo(
    () => weeklyOrdersSeries.reduce((sum, day) => sum + day.count, 0),
    [weeklyOrdersSeries],
  );
  const maxDayOrders = useMemo(
    () => Math.max(...weeklyOrdersSeries.map((day) => day.count), 1),
    [weeklyOrdersSeries],
  );
  const normalizedStoreRange = useMemo(
    () => clampRangeToSevenDays(storeRange.startDate, storeRange.endDate),
    [storeRange.endDate, storeRange.startDate],
  );
  const normalizedBestSellerRange = useMemo(
    () => clampRangeToSevenDays(bestSellerRange.startDate, bestSellerRange.endDate),
    [bestSellerRange.endDate, bestSellerRange.startDate],
  );
  const ordersByStoreSeries = useMemo(
    () =>
      buildOrdersByStore(
        orders,
        normalizedStoreRange.startDate,
        normalizedStoreRange.endDate,
      ),
    [normalizedStoreRange.endDate, normalizedStoreRange.startDate, orders],
  );
  const maxStoreOrders = useMemo(
    () => Math.max(...ordersByStoreSeries.map((store) => store.count), 1),
    [ordersByStoreSeries],
  );
  const topSellingDishes = useMemo(
    () =>
      buildTopSellingDishes(
        orders,
        normalizedBestSellerRange.startDate,
        normalizedBestSellerRange.endDate,
      ),
    [normalizedBestSellerRange.endDate, normalizedBestSellerRange.startDate, orders],
  );
  const totalStoreOrders = useMemo(
    () => ordersByStoreSeries.reduce((sum, store) => sum + store.count, 0),
    [ordersByStoreSeries],
  );
  const totalBestSellerQuantity = useMemo(
    () => topSellingDishes.reduce((sum, dish) => sum + Number(dish.quantitySold ?? 0), 0),
    [topSellingDishes],
  );
  const sectionCountMap = useMemo(
    () => ({
      users: summary?.userCount,
      stores: summary?.storeCount,
      events: summary?.eventCount,
      categories: summary?.categoryCount,
      dishes: summary?.dishCount,
      storeDishes: summary?.storeDishCount,
      news: summary?.newsCount,
      promotions: summary?.promotionCount,
      userLevels: summary?.userLevelCount,
      orders: summary?.orderCount,
      reviews: summary?.reviewCount,
      feedbacks: Array.isArray(dashboard?.feedbacks) ? dashboard.feedbacks.length : 0,
    }),
    [dashboard?.feedbacks, summary],
  );
  const workspaceGroups = useMemo(() => getWorkspaceGroups(t), [t]);
  const sectionMeta = useMemo(() => getSectionMeta(t), [t]);
  const visibleGroups = useMemo(
    () =>
      workspaceGroups
        .map((group) => ({
          ...group,
          sections: group.sections.filter((sectionKey) => accessibleSectionKeys.includes(sectionKey)),
        }))
        .filter((group) => group.sections.length),
    [accessibleSectionKeys, workspaceGroups],
  );
  const metricCards = useMemo(
    () =>
      buildMetricCards({
        summary,
        dashboard,
        revenueSummary,
        isAdmin,
        workingStoreName: auth.user?.workingStoreName,
        t,
      }),
    [auth.user?.workingStoreName, dashboard, isAdmin, revenueSummary, summary, t],
  );
  const landingTitle = isManagerMode ? t("home.managerTitle") : t("home.title");
  const landingHeadline = isManagerMode
    ? t("home.managerHeadline")
    : t("home.headline");
  const landingCopy = isManagerMode
    ? t("home.managerCopy")
    : t("home.copy");

  const handleStoreRangeChange = (field, value) => {
    setStoreRange((current) => clampRangeToSevenDays(
      field === "startDate" ? value : current.startDate,
      field === "endDate" ? value : current.endDate,
    ));
  };

  const handleBestSellerRangeChange = (field, value) => {
    setBestSellerRange((current) => clampRangeToSevenDays(
      field === "startDate" ? value : current.startDate,
      field === "endDate" ? value : current.endDate,
    ));
  };

  if (shouldRedirectToWorkspace) {
    return <Navigate replace to={`${ADMIN_WORKSPACE_PATH}${location.search}`} />;
  }

  return (
    <main className={ui.page}>
      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <AdminHomepageSidebar />
        <div className="grid gap-5">
          <section className={ui.panel}>
            <AdminPageHeader
              eyebrow={t("overview.eyebrow")}
              title={t("overview.title")}
              actions={
                <Link className={ui.secondaryButton} to={buildAdminWorkspacePath({ sectionKey: "orders" })}>
                  {t("overview.orders")}
                </Link>
              }
            />

            {error ? (
              <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card, idx) => (
                <AdminStatCard
                  key={card.label}
                  label={card.label}
                  value={loading ? "—" : card.value}
                  featured={idx === 0}
                />
              ))}
            </div>
          </section>

          <section className={ui.panel}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <AdminPageHeader eyebrow={t("charts.weeklyActivity")} title={t("charts.ordersOverTime")} />
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("charts.from")}</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={ui.input}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("charts.to")}</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={ui.input}
                  />
                </label>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">{t("charts.total")}</p>
                  <strong className="block font-mono text-xl font-semibold text-ink-900">
                    {loading ? "—" : formatCount(totalWeeklyOrders)}
                  </strong>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-400">
              {t("charts.chartNote")}
            </p>

            <div className="mt-4">
              <div className="flex items-end justify-between gap-2">
                {weeklyOrdersSeries.map((day) => {
                  const barHeight = maxDayOrders > 0 ? (day.count / maxDayOrders) * 100 : 0;
                  return (
                    <div key={day.isoDate} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="w-full rounded-t bg-matcha-100" style={{ height: `${Math.max(barHeight * 1.2, 6)}px` }}>
                        <div
                          className="w-full rounded-t bg-matcha-500 transition-all"
                          style={{ height: `${barHeight * 1.2}px` }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="font-mono text-xs font-semibold text-ink-900">{day.count}</p>
                        <p className="text-[11px] text-ink-400">{day.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={ui.panel}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <AdminPageHeader eyebrow={t("charts.storePerformance")} title={t("charts.ordersByStore")} />
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-900/8 bg-cream-100 px-3 py-2.5 sm:min-w-[22rem]">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("charts.from")}</span>
                  <input
                    type="date"
                    value={normalizedStoreRange.startDate}
                    onChange={(event) => handleStoreRangeChange("startDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("charts.to")}</span>
                  <input
                    type="date"
                    value={normalizedStoreRange.endDate}
                    onChange={(event) => handleStoreRangeChange("endDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">{t("charts.total")}</p>
                  <strong className="block font-mono text-xl font-semibold text-ink-900">
                    {loading ? "—" : formatCount(totalStoreOrders)}
                  </strong>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-400">
              {t("charts.storeNote")}
            </p>

            <div className="mt-4">
              {ordersByStoreSeries.length > 0 ? (
                <div className="space-y-2.5">
                  {ordersByStoreSeries.map((store) => {
                    const barWidth = maxStoreOrders > 0 ? (store.count / maxStoreOrders) * 100 : 0;
                    return (
                      <div key={store.storeName} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="max-w-xs truncate text-sm font-medium text-ink-900">
                            {store.storeName}
                          </p>
                          <span className="font-mono text-xs font-semibold text-ink-600">
                            {store.count}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-matcha-100">
                          <div
                            className="h-1.5 rounded-full bg-matcha-500 transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
                  {t("charts.noOrdersData")}
                </div>
              )}
            </div>
          </section>

          <section className={ui.panel}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <AdminPageHeader
                eyebrow={t("charts.bestSellers")}
                title={
                  revenueSummary?.scopeStoreName
                    ? t("charts.topDishesScopeLabel", { scope: revenueSummary.scopeStoreName })
                    : t("charts.topDishes")
                }
                subtitle={t("charts.dishesNote")}
              />
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-900/8 bg-cream-100 px-3 py-2.5">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("charts.from")}</span>
                  <input
                    type="date"
                    value={normalizedBestSellerRange.startDate}
                    onChange={(event) => handleBestSellerRangeChange("startDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("charts.to")}</span>
                  <input
                    type="date"
                    value={normalizedBestSellerRange.endDate}
                    onChange={(event) => handleBestSellerRangeChange("endDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">{t("charts.totalSold")}</p>
                  <strong className="block font-mono text-xl font-semibold text-ink-900">
                    {loading ? "—" : formatCount(totalBestSellerQuantity)}
                  </strong>
                </div>
                <Link className={ui.secondaryButton} to={buildAdminWorkspacePath({ sectionKey: "feedbacks" })}>
                  {t("charts.customerFeedback")}
                </Link>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
                  {t("charts.loading")}
                </div>
              ) : topSellingDishes.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {topSellingDishes.map((dish, index) => (
                    <article
                      key={`admin-home-top-selling-${dish.storeId ?? "all"}-${dish.dishId ?? index}`}
                      className="rounded-lg border border-ink-900/8 bg-cream-50 p-4 shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {dish.dishName || "Dish"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-500">
                            {dish.storeName || "All stores"}
                          </p>
                        </div>
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-matcha-100 text-xs font-semibold text-matcha-700">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {[
                          { label: t("analytics.qtyLabel"), value: formatCount(dish.quantitySold) },
                          { label: t("analytics.ordersLabel"), value: formatCount(dish.orderCount) },
                          { label: t("analytics.revenueLabel"), value: formatCurrency(dish.revenue) },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-md border border-ink-900/8 bg-beige-100 px-2.5 py-2">
                            <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-500">
                              {stat.label}
                            </span>
                            <strong className="mt-0.5 block font-mono text-sm text-ink-900">
                              {stat.value}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
                  {t("charts.noTopSelling")}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
