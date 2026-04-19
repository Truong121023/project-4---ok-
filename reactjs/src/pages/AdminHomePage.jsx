import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
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

const sectionMeta = {
  orders: {
    title: "Orders",
    description: "Track payment state, QR scans, invoice flow, and branch fulfillment handoff.",
    badge: "Operations",
  },
  reviews: {
    title: "Reviews",
    description: "Moderate store, event, and dish reviews from one moderation queue.",
    badge: "Support",
  },
  feedbacks: {
    title: "Feedback",
    description: "Handle support replies, complaints, and follow-up messages from customers.",
    badge: "Support",
  },
  stores: {
    title: "Stores",
    description: "Maintain branch identity, opening hours, address data, and operational scope.",
    badge: "Network",
  },
  users: {
    title: "Users",
    description: "Manage admin, manager, staff, shipper, and customer accounts with working store scope.",
    badge: "People",
  },
  events: {
    title: "Events",
    description: "Plan store events, featured dishes, capacity, and calendar visibility.",
    badge: "People",
  },
  categories: {
    title: "Categories",
    description: "Organize menu structure by branch so the storefront stays easy to scan.",
    badge: "Catalog",
  },
  dishes: {
    title: "Core dishes",
    description: "Maintain the franchise-level catalog, signatures, highlights, and pricing baseline.",
    badge: "Catalog",
  },
  storeDishes: {
    title: "Store dishes",
    description: "Control branch stock, availability, and local price overrides for each dish.",
    badge: "Catalog",
  },
  news: {
    title: "News",
    description: "Publish brand stories, branch updates, and editorial content for the storefront.",
    badge: "Growth",
  },
  promotions: {
    title: "Promotions",
    description: "Create offers and time-bound campaigns for conversion and retention.",
    badge: "Growth",
  },
  userLevels: {
    title: "User levels",
    description: "Set membership tiers and loyalty thresholds used across the customer journey.",
    badge: "Growth",
  },
};

const workspaceGroups = [
  {
    key: "operations",
    eyebrow: "Daily flow",
    title: "Operations and customer care",
    description:
      "This block groups the modules used most often during live store operations: orders, moderation, and customer support.",
    sections: ["orders", "reviews", "feedbacks"],
  },
  {
    key: "network",
    eyebrow: "Stores",
    title: "Stores, people, and experiences",
    description:
      "Use this area for branch setup, team assignment, and event management across the network or your assigned store.",
    sections: ["stores", "users", "events"],
  },
  {
    key: "catalog",
    eyebrow: "Menu",
    title: "Catalog and inventory structure",
    description:
      "These tools shape how the menu is structured, stocked, and exposed in each store scope.",
    sections: ["categories", "dishes", "storeDishes"],
  },
  {
    key: "growth",
    eyebrow: "Growth",
    title: "Content, campaigns, and retention",
    description:
      "This area follows the sample dashboard structure for editorial content and growth modules, while staying inside the existing admin workspace.",
    sections: ["news", "promotions", "userLevels"],
  },
];

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

function buildMetricCards({ summary, dashboard, revenueSummary, isAdmin, workingStoreName }) {
  const sharedCards = [
    {
      label: "Revenue today",
      value: formatCurrency(revenueSummary?.todayRevenue),
      featured: true,
    },
    {
      label: "Revenue month",
      value: formatCurrency(revenueSummary?.monthRevenue),
    },
    {
      label: "Orders",
      value: formatCount(summary?.orderCount),
    },
    {
      label: "Reviews",
      value: formatCount(summary?.reviewCount),
    },
    {
      label: "Feedback",
      value: formatCount(Array.isArray(dashboard?.feedbacks) ? dashboard.feedbacks.length : 0),
    },
  ];

  if (isAdmin) {
    return [
      ...sharedCards,
      {
        label: "Users",
        value: formatCount(summary?.userCount),
      },
    ];
  }

  return [
    {
      label: "Working store",
      value: workingStoreName || "Not assigned",
      featured: true,
    },
    ...sharedCards,
    {
      label: "Store dishes",
      value: formatCount(summary?.storeDishCount),
    },
  ];
}

export default function AdminHomePage() {
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
          setError(getApiErrorMessage(requestError, "Unable to load the admin overview."));
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
  const visibleGroups = useMemo(
    () =>
      workspaceGroups
        .map((group) => ({
          ...group,
          sections: group.sections.filter((sectionKey) => accessibleSectionKeys.includes(sectionKey)),
        }))
        .filter((group) => group.sections.length),
    [accessibleSectionKeys],
  );
  const metricCards = useMemo(
    () =>
      buildMetricCards({
        summary,
        dashboard,
        revenueSummary,
        isAdmin,
        workingStoreName: auth.user?.workingStoreName,
      }),
    [auth.user?.workingStoreName, dashboard, isAdmin, revenueSummary, summary],
  );
  const landingTitle = isManagerMode ? "Manager home" : "Admin home";
  const landingHeadline = isManagerMode
    ? "Store-scoped control room for daily operations"
    : "Separate admin landing page with a clearer workspace map";
  const landingCopy = isManagerMode
    ? "Your manager area stays focused on one working store. The admin workspace below is grouped by daily flow so the live tasks are easier to reach."
    : "The sample dashboard from the older folder separated overview and management more clearly. This page keeps that structure while reusing the existing CRUD workspace in the current project.";

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
              eyebrow="Overview"
              title="Performance Review"
              actions={
                <Link className={ui.secondaryButton} to={buildAdminWorkspacePath({ sectionKey: "orders" })}>
                  Orders
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
              <AdminPageHeader eyebrow="Weekly Activity" title="Orders over time" />
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={ui.input}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={ui.input}
                  />
                </label>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total</p>
                  <strong className="block font-mono text-xl font-semibold text-ink-900">
                    {loading ? "—" : formatCount(totalWeeklyOrders)}
                  </strong>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-400">
              Chart shows max 7 days. Longer ranges show the last 7 days.
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
              <AdminPageHeader eyebrow="Store Performance" title="Orders by store" />
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-900/8 bg-cream-100 px-3 py-2.5 sm:min-w-[22rem]">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">From</span>
                  <input
                    type="date"
                    value={normalizedStoreRange.startDate}
                    onChange={(event) => handleStoreRangeChange("startDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">To</span>
                  <input
                    type="date"
                    value={normalizedStoreRange.endDate}
                    onChange={(event) => handleStoreRangeChange("endDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total</p>
                  <strong className="block font-mono text-xl font-semibold text-ink-900">
                    {loading ? "—" : formatCount(totalStoreOrders)}
                  </strong>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-ink-400">
              Max 7 days. Longer ranges show the last 7 days ending at the chosen end date.
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
                  No orders data for the selected date range.
                </div>
              )}
            </div>
          </section>

          <section className={ui.panel}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <AdminPageHeader
                eyebrow="Best sellers"
                title={
                  revenueSummary?.scopeStoreName
                    ? `Top dishes — ${revenueSummary.scopeStoreName}`
                    : "Top dishes in current scope"
                }
                subtitle="Dishes driving volume in the last 7-day window."
              />
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-900/8 bg-cream-100 px-3 py-2.5">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">From</span>
                  <input
                    type="date"
                    value={normalizedBestSellerRange.startDate}
                    onChange={(event) => handleBestSellerRangeChange("startDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">To</span>
                  <input
                    type="date"
                    value={normalizedBestSellerRange.endDate}
                    onChange={(event) => handleBestSellerRangeChange("endDate", event.target.value)}
                    className={ui.input}
                  />
                </label>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Total sold</p>
                  <strong className="block font-mono text-xl font-semibold text-ink-900">
                    {loading ? "—" : formatCount(totalBestSellerQuantity)}
                  </strong>
                </div>
                <Link className={ui.secondaryButton} to={buildAdminWorkspacePath({ sectionKey: "feedbacks" })}>
                  Customer feedback
                </Link>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="rounded-lg border border-dashed border-ink-900/10 bg-cream-100 p-4 text-sm text-ink-400">
                  Loading analytics…
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
                          { label: "Qty sold", value: formatCount(dish.quantitySold) },
                          { label: "Orders", value: formatCount(dish.orderCount) },
                          { label: "Revenue", value: formatCurrency(dish.revenue) },
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
                  No top-selling dish data yet for the current analytics scope.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
