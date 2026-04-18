import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
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
          setError(getApiErrorMessage(requestError, "Unable to load report data."));
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

    return currentTopName || "No store data";
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

  if (!isAdmin && !isManager) {
    return <Navigate replace to="/unauthorized" />;
  }

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={ui.eyebrow}>Reports</p>
            <h1 className="text-3xl font-semibold text-tea-900 sm:text-4xl">
              Order and revenue analytics
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
              {isAdmin
                ? "Track completed orders, compare store contribution, and review revenue distribution across the network."
                : "Track completed orders and revenue contribution for your assigned store scope."}
            </p>
          </div>
          <span className={ui.pill}>
            {isAdmin ? "Admin scope" : auth.user?.workingStoreName || "Manager scope"}
          </span>
        </div>
      </section>

      <section className={ui.panel}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.82fr)]">
          <div className="grid min-w-0 content-start self-start gap-4">
            <div className="rounded-[1.75rem] border border-matcha-900/10 bg-white/60 p-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                  Reports workspace
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  Use the date range and search field below to inspect order and store revenue.
                </p>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(0,1.35fr)]">
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Start date
                  </span>
                  <input
                    className={`${ui.input} min-w-0 pr-10`}
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setActivePreset("");
                    }}
                  />
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    End date
                  </span>
                  <input
                    className={`${ui.input} min-w-0 pr-10`}
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setActivePreset("");
                    }}
                  />
                </label>

                <div className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Quick range
                  </span>
                  <div className="flex flex-wrap items-end gap-3">
                    {[
                      { key: "today", label: "Today" },
                      { key: "7d", label: "Last 7 days" },
                      { key: "30d", label: "Last 30 days" },
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
              </div>

              {error ? (
                <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  label: "Total orders",
                  value: formatCompactNumber(completedOrders.length),
                  note: `${formatCompactNumber(filteredRows.length)} visible rows`,
                },
                {
                  label: "Total stores",
                  value: formatCompactNumber(totalStores),
                  note: `Top store: ${topStoreName}`,
                },
                {
                  label: "Revenue per store",
                  value: totalStores ? formatCurrency(totalRevenue / totalStores) : formatCurrency(0),
                  note: "Average across reporting stores",
                },
                {
                  label: "Revenue per order",
                  value: formatCurrency(averageOrderValue),
                  note: `${formatCompactNumber(completedPaidOrders.length)} paid completed orders`,
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className="min-w-0 rounded-[1.55rem] border border-matcha-900/10 bg-white/78 p-5 shadow-[0_18px_44px_rgba(79,70,45,0.08)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {card.label}
                  </p>
                  <strong className="mt-3 block min-h-[3.4rem] break-words text-[clamp(1.05rem,1.35vw,1.7rem)] font-semibold leading-tight text-tea-900">
                    {card.value}
                  </strong>
                  <p className="mt-2 break-words text-xs leading-6 text-stone-500">{card.note}</p>
                </article>
              ))}
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-matcha-900/10 bg-white/72 shadow-[0_18px_44px_rgba(79,70,45,0.08)]">
              <div className="flex flex-col gap-3 border-b border-matcha-900/8 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Search orders and stores</span>
                  <input
                    className={ui.input}
                    type="text"
                    placeholder="Search orders or stores..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 lg:justify-end">
                  <span>{formatCompactNumber(filteredRows.length)} selected rows</span>
                  <button className={ui.secondaryButton} type="button" onClick={handleExportExcel}>
                    Export Excel
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-sm text-stone-600">Loading report data...</div>
              ) : revenueRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Order</th>
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Store</th>
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Completed</th>
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Status</th>
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Revenue per store</th>
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Revenue per order</th>
                        <th className="border-b border-matcha-900/8 px-5 py-4 font-semibold">Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueRows.map((order) => (
                        <tr key={order.id} className="text-sm text-stone-600">
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top">
                            <div>
                              <strong className="block text-tea-900">Order #{order.id}</strong>
                              <span className="mt-1 block text-xs text-stone-500">
                                Customer: {order.deliveryFullName || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top">
                            <div>
                              <strong className="block text-tea-900">{order.storeLabel}</strong>
                              <span className="mt-1 block text-xs text-stone-500">
                                {isAdmin ? "Network scope" : "Assigned store scope"}
                              </span>
                            </div>
                          </td>
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top">
                            {formatDateTime(resolveCompletedDate(order))}
                          </td>
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top">
                            <div className="grid gap-1">
                              <span className="text-tea-900">{order.status || "N/A"}</span>
                              <span className="text-xs text-stone-500">
                                Payment: {order.paymentStatus || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top text-tea-900">
                            {formatCurrency(order.storeRevenue)}
                          </td>
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top text-matcha-700">
                            {formatCurrency(order.orderRevenue)}
                          </td>
                          <td className="border-b border-matcha-900/8 px-5 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-stone-500">
                                {Math.round(order.revenueRatio)}%
                              </span>
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200">
                                <div
                                  className="h-full rounded-full bg-[#4f7cff]"
                                  style={{ width: `${order.revenueRatio}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-sm text-stone-600">
                  No completed orders match the selected date range or search query.
                </div>
              )}
            </div>
          </div>

          <section className="grid min-w-0 gap-4">
            <div className={`${ui.card} sticky top-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                    Report summary
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                    Performance in selected range
                  </h2>
                </div>
                <span className={ui.pill}>{formatCompactNumber(filteredRows.length)} rows</span>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                This report only counts orders that reached <strong>COMPLETED</strong> inside the
                selected date range. The <strong>Paid pending</strong> card below shows orders that
                were already paid but have not reached <strong>COMPLETED</strong> yet.
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Completed orders", value: formatCompactNumber(completedOrders.length) },
                  { label: "Paid pending", value: formatCompactNumber(paidPendingOrders.length) },
                  { label: "Revenue", value: formatCurrency(totalRevenue) },
                  { label: "Average order", value: formatCurrency(averageOrderValue) },
                ].map((card) => (
                  <article
                    key={card.label}
                    className="min-w-0 rounded-[1.4rem] border border-matcha-900/10 bg-white/75 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {card.label}
                    </p>
                    <strong className="mt-3 block min-h-[3.6rem] break-words text-[clamp(1rem,1.2vw,1.55rem)] font-semibold leading-tight text-tea-900">
                      {card.value}
                    </strong>
                  </article>
                ))}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-4 py-4 text-sm leading-7 text-stone-700">
                <p>
                  Range: <strong>{startDate || "N/A"}</strong> to <strong>{endDate || "N/A"}</strong>
                </p>
                <p className="mt-2">
                  Scope:{" "}
                  <strong>{isAdmin ? "Admin scope" : auth.user?.workingStoreName || "Manager scope"}</strong>
                </p>
                <p className="mt-2">
                  Store coverage: <strong>{formatCompactNumber(totalStores)}</strong>
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
