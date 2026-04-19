import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminDataTable from "../components/admin/admin-data-table";
import AdminPageHeader from "../components/admin/admin-page-header";
import AdminStatCard from "../components/admin/admin-stat-card";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../lib/api";
import { formatDateTimeVn, formatNumberVi } from "../lib/locale";
import { fetchOperationalOrders } from "../lib/siteApi";
import { ui } from "../ui";

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")} VND`;
}

function formatDateTime(value) {
  return formatDateTimeVn(value, "Not available");
}

function formatCompactNumber(value) {
  return formatNumberVi(value);
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateAtStartOfDay(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateAtEndOfDay(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesRange(dateValue, startDate, endDate) {
  const timestamp = new Date(dateValue ?? "").getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (startDate && timestamp < startDate.getTime()) {
    return false;
  }

  if (endDate && timestamp > endDate.getTime()) {
    return false;
  }

  return true;
}

function resolveCompletedDate(order) {
  return order?.updatedAt || order?.createdAt || "";
}

function resolvePaidDate(order) {
  return order?.paidAt || order?.updatedAt || order?.createdAt || "";
}

export default function ReportsPage() {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const isAdmin = auth.hasRole("ADMIN");
  const isManager = auth.hasRole("MANAGER");
  const managerStoreId = String(auth.user?.workingStoreId ?? "").trim();
  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(defaultStartDate.getDate() - 6);

  const [startDate, setStartDate] = useState(toDateInputValue(defaultStartDate));
  const [endDate, setEndDate] = useState(toDateInputValue(today));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePreset, setActivePreset] = useState("7d");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const response = await fetchOperationalOrders(auth, {
          page: 0,
          size: 500,
          ...(isManager && managerStoreId ? { storeId: managerStoreId } : {}),
        });

        if (!cancelled) {
          setOrders(response.items ?? []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, t("orders.loadError")));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [auth, isManager, managerStoreId]);

  const startFilterDate = useMemo(() => parseDateAtStartOfDay(startDate), [startDate]);
  const endFilterDate = useMemo(() => parseDateAtEndOfDay(endDate), [endDate]);

  const completedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          String(order.status ?? "").toUpperCase() === "COMPLETED" &&
          matchesRange(resolveCompletedDate(order), startFilterDate, endFilterDate),
      ),
    [endFilterDate, orders, startFilterDate],
  );

  const completedPaidOrders = useMemo(
    () =>
      completedOrders.filter(
        (order) => String(order.paymentStatus ?? "").toUpperCase() === "PAID",
      ),
    [completedOrders],
  );

  const paidPendingOrders = useMemo(
    () =>
      orders.filter((order) => {
        const normalizedPaymentStatus = String(order.paymentStatus ?? "").toUpperCase();
        const normalizedStatus = String(order.status ?? "").toUpperCase();

        return (
          normalizedPaymentStatus === "PAID" &&
          normalizedStatus !== "COMPLETED" &&
          normalizedStatus !== "CANCELLED" &&
          matchesRange(resolvePaidDate(order), startFilterDate, endFilterDate)
        );
      }),
    [endFilterDate, orders, startFilterDate],
  );

  const totalRevenue = useMemo(
    () =>
      completedPaidOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0),
    [completedPaidOrders],
  );

  const reportRows = useMemo(
    () =>
      [...completedOrders].sort((left, right) => {
        const rightTime = new Date(resolveCompletedDate(right)).getTime();
        const leftTime = new Date(resolveCompletedDate(left)).getTime();
        return rightTime - leftTime;
      }),
    [completedOrders],
  );

  const totalStores = useMemo(
    () =>
      new Set(reportRows.map((order) => String(order.storeName ?? "").trim()).filter(Boolean)).size,
    [reportRows],
  );

  const averageOrderValue = useMemo(
    () => (completedPaidOrders.length ? totalRevenue / completedPaidOrders.length : 0),
    [completedPaidOrders.length, totalRevenue],
  );

  const storeRevenueMap = useMemo(
    () =>
      reportRows.reduce((result, order) => {
        const storeLabel = String(
          order.storeName ?? auth.user?.workingStoreName ?? "Store unavailable",
        ).trim();
        result.set(storeLabel, (result.get(storeLabel) ?? 0) + Number(order.totalAmount ?? 0));
        return result;
      }, new Map()),
    [auth.user?.workingStoreName, reportRows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = String(searchQuery ?? "").trim().toLowerCase();

    if (!normalizedSearch) {
      return reportRows;
    }

    return reportRows.filter((order) => {
      const orderId = String(order.id ?? "").toLowerCase();
      const storeName = String(
        order.storeName ?? auth.user?.workingStoreName ?? "Store unavailable",
      ).toLowerCase();
      const paymentStatus = String(order.paymentStatus ?? "").toLowerCase();
      const status = String(order.status ?? "").toLowerCase();

      return [orderId, storeName, paymentStatus, status].some((value) =>
        value.includes(normalizedSearch),
      );
    });
  }, [auth.user?.workingStoreName, reportRows, searchQuery]);

  const revenueRows = useMemo(
    () =>
      filteredRows.map((order) => {
        const storeLabel = String(
          order.storeName ?? auth.user?.workingStoreName ?? "Store unavailable",
        ).trim();
        const orderRevenue = Number(order.totalAmount ?? 0);

        return {
          ...order,
          storeLabel,
          storeRevenue: storeRevenueMap.get(storeLabel) ?? 0,
          orderRevenue,
          revenueRatio: totalRevenue > 0 ? Math.min(100, (orderRevenue / totalRevenue) * 100) : 0,
        };
      }),
    [auth.user?.workingStoreName, filteredRows, storeRevenueMap, totalRevenue],
  );

  const topStoreName = useMemo(() => {
    let currentTopName = "";
    let currentTopRevenue = -1;

    storeRevenueMap.forEach((revenue, storeName) => {
      if (revenue > currentTopRevenue) {
        currentTopRevenue = revenue;
        currentTopName = storeName;
      }
    });

    return currentTopName || t("reports.noStoreData");
  }, [storeRevenueMap]);

  const handlePreset = (presetKey) => {
    const presetEnd = new Date();
    const presetStart = new Date(presetEnd);

    if (presetKey === "today") {
      setStartDate(toDateInputValue(presetEnd));
      setEndDate(toDateInputValue(presetEnd));
    } else if (presetKey === "30d") {
      presetStart.setDate(presetStart.getDate() - 29);
      setStartDate(toDateInputValue(presetStart));
      setEndDate(toDateInputValue(presetEnd));
    } else {
      presetStart.setDate(presetStart.getDate() - 6);
      setStartDate(toDateInputValue(presetStart));
      setEndDate(toDateInputValue(presetEnd));
      presetKey = "7d";
    }

    setActivePreset(presetKey);
  };

  const handleExportExcel = () => {
    const rows = revenueRows.map((order) => ({
      orderId: order.id ?? "",
      store: order.storeLabel ?? "",
      completedAt: formatDateTime(resolveCompletedDate(order)),
      status: order.status ?? "",
      paymentStatus: order.paymentStatus ?? "",
      revenuePerStore: order.storeRevenue ?? 0,
      revenuePerOrder: order.orderRevenue ?? 0,
      portfolioPercent: Math.round(order.revenueRatio ?? 0),
    }));

    const header = [
      "Order ID",
      "Store",
      "Completed At",
      "Status",
      "Payment Status",
      "Revenue Per Store",
      "Revenue Per Order",
      "Portfolio Percent",
    ];

    const csvLines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.orderId,
          row.store,
          row.completedAt,
          row.status,
          row.paymentStatus,
          row.revenuePerStore,
          row.revenuePerOrder,
          row.portfolioPercent,
        ]
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];

    const blob = new Blob([`\uFEFF${csvLines.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `report-${startDate || "start"}-to-${endDate || "end"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const tableColumns = [
    {
      key: "order",
      header: t("tables.columns.order"),
      render: (row) => (
        <div>
          <strong className="block text-xs font-semibold text-ink-900">#{row.id}</strong>
          <span className="text-[11px] text-ink-400">{row.deliveryFullName || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "store",
      header: t("tables.columns.store"),
      render: (row) => (
        <span className="text-xs text-ink-800">{row.storeLabel}</span>
      ),
    },
    {
      key: "completed",
      header: t("tables.columns.completed"),
      render: (row) => (
        <span className="text-xs text-ink-600">{formatDateTime(resolveCompletedDate(row))}</span>
      ),
    },
    {
      key: "status",
      header: t("tables.columns.status"),
      render: (row) => (
        <div>
          <span className="block text-xs text-ink-800">{row.status || "N/A"}</span>
          <span className="text-[11px] text-ink-400">{row.paymentStatus || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "storeRevenue",
      header: t("tables.columns.storeRevenue"),
      render: (row) => <span className="font-mono text-xs text-ink-800">{formatCurrency(row.storeRevenue)}</span>,
    },
    {
      key: "orderRevenue",
      header: t("tables.columns.orderRevenue"),
      render: (row) => <span className="font-mono text-xs font-semibold text-matcha-700">{formatCurrency(row.orderRevenue)}</span>,
    },
    {
      key: "portfolio",
      header: t("tables.columns.portfolio"),
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-400">{Math.round(row.revenueRatio)}%</span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-beige-200">
            <div className="h-full rounded-full bg-matcha-500" style={{ width: `${row.revenueRatio}%` }} />
          </div>
        </div>
      ),
    },
  ];

  if (!isAdmin && !isManager) {
    return <Navigate replace to="/unauthorized" />;
  }

  return (
    <main className={ui.page}>
      {/* Header */}
      <section className={ui.panel}>
        <AdminPageHeader
          eyebrow={t("reports.eyebrow")}
          title={t("reports.title")}
          subtitle={isAdmin ? t("reports.subtitleAdmin") : t("reports.subtitleManager")}
          actions={
            <span className={ui.pill}>
              {isAdmin ? t("reports.scopeAdmin") : auth.user?.workingStoreName || t("reports.scopeManager")}
            </span>
          }
        />
      </section>

      <section className={ui.panel}>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
          {/* Left column */}
          <div className="grid min-w-0 gap-4">
            {/* Filters toolbar */}
            <div className="rounded-lg border border-ink-900/8 bg-cream-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {t("reports.workspace")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="grid min-w-[9rem] gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("reports.filterStart")}</span>
                  <input
                    className={ui.input}
                    type="date"
                    value={startDate}
                    onChange={(event) => { setStartDate(event.target.value); setActivePreset(""); }}
                  />
                </label>
                <label className="grid min-w-[9rem] gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{t("reports.filterEnd")}</span>
                  <input
                    className={ui.input}
                    type="date"
                    value={endDate}
                    onChange={(event) => { setEndDate(event.target.value); setActivePreset(""); }}
                  />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  {[
                    { key: "today", label: t("reports.presetToday") },
                    { key: "7d", label: t("reports.preset7d") },
                    { key: "30d", label: t("reports.preset30d") },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      className={activePreset === preset.key ? ui.primaryButton : ui.secondaryButton}
                      type="button"
                      onClick={() => handlePreset(preset.key)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="mt-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}
            </div>

            {/* KPI cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: t("reports.kpiTotalOrders"), value: formatCompactNumber(completedOrders.length), note: t("reports.kpiVisible", { count: formatCompactNumber(filteredRows.length) }) },
                { label: t("reports.kpiTotalStores"), value: formatCompactNumber(totalStores), note: t("reports.kpiTop", { name: topStoreName }) },
                { label: t("reports.kpiRevPerStore"), value: totalStores ? formatCurrency(totalRevenue / totalStores) : formatCurrency(0), note: t("reports.kpiAvgStores") },
                { label: t("reports.kpiRevPerOrder"), value: formatCurrency(averageOrderValue), note: t("reports.kpiPaid", { count: formatCompactNumber(completedPaidOrders.length) }) },
              ].map((card) => (
                <AdminStatCard key={card.label} label={card.label} value={card.value} note={card.note} />
              ))}
            </div>

            {/* Data table */}
            <AdminDataTable
              columns={tableColumns}
              rows={revenueRows}
              loading={loading}
              loadingText={t("reports.loadingText")}
              emptyText={t("reports.emptyText")}
              stickyHeader
              toolbar={
                <input
                  className={ui.input}
                  type="text"
                  placeholder={t("tables.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              }
              toolbarEnd={
                <>
                  <span className="text-xs text-ink-400">{t("tables.rows", { count: formatCompactNumber(filteredRows.length) })}</span>
                  <button className={ui.secondaryButton} type="button" onClick={handleExportExcel}>
                    {t("tables.exportCsv")}
                  </button>
                </>
              }
            />
          </div>

          {/* Right column — summary sidebar */}
          <aside className="grid min-w-0 gap-4">
            <div className={`${ui.card} sticky top-4`}>
              <AdminPageHeader
                eyebrow={t("reports.summaryEyebrow")}
                title={t("reports.summaryTitle")}
                actions={
                  <span className={ui.pill}>{t("tables.rows", { count: formatCompactNumber(filteredRows.length) })}</span>
                }
              />

              <div className="mt-3 rounded-lg border border-matcha-200 bg-matcha-50 px-3 py-2.5 text-xs leading-5 text-ink-700">
                {t("reports.summaryNote")}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { label: t("reports.summaryCompleted"), value: formatCompactNumber(completedOrders.length) },
                  { label: t("reports.summaryPaidPending"), value: formatCompactNumber(paidPendingOrders.length) },
                  { label: t("reports.summaryRevenue"), value: formatCurrency(totalRevenue), featured: true },
                  { label: t("reports.summaryAvgOrder"), value: formatCurrency(averageOrderValue) },
                ].map((card) => (
                  <AdminStatCard key={card.label} label={card.label} value={card.value} featured={card.featured} />
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-ink-900/8 bg-cream-100 px-3 py-2.5 text-xs leading-5 text-ink-700">
                <p>{t("reports.rangeLabel")} <strong>{startDate || "N/A"}</strong> – <strong>{endDate || "N/A"}</strong></p>
                <p className="mt-1">{t("reports.scopeLabel")} <strong>{isAdmin ? t("reports.scopeAdmin") : auth.user?.workingStoreName || t("reports.scopeManager")}</strong></p>
                <p className="mt-1">{t("reports.storesLabel")} <strong>{formatCompactNumber(totalStores)}</strong></p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
