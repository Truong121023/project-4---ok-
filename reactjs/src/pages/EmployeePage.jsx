import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRef } from "react";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderStatusTracker from "../components/OrderStatusTracker";
import { useAuth } from "../context/AuthContext";
import { useAppRealtime } from "../context/AppRealtimeContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage, resolveApiUrl } from "../lib/api";
import {
  formatDeliveryTypeLabel,
  getOrderActionLabel,
  getOrderAllowedActions,
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "../lib/orderStatus";
import {
  canViewOrderInvoice,
  getOrderInvoicePreviewHref,
} from "../lib/orderWorkflow";
import {
  acceptEmployeeDelivery,
  fetchEmployeeNotifications,
  fetchEmployeeNotificationUnreadCount,
  fetchEmployeeOrderDetail,
  fetchEmployeeOrders,
  markAllEmployeeNotificationsRead,
  markEmployeeNotificationRead,
  markEmployeeNotificationUnread,
  uploadEmployeeDeliveryProof,
} from "../lib/siteApi";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import { ui } from "../ui";

function formatDateTime(value) {
  return formatDateTimeVn(value);
}

function formatDateTimeLocalInput(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatPrice(value) {
  return formatCurrencyVnd(value);
}

function normalizeRole(role) {
  return String(role ?? "").trim().toUpperCase();
}

function isMyPreparingTask(order, currentUserId) {
  return false;
}

function isMyDeliveryTask(order, currentUserId) {
  return (
    String(order?.deliveringShipperId ?? "") === String(currentUserId ?? "") &&
    ["OUT_FOR_DELIVERY", "COMPLETED"].includes(normalizeRole(order?.status))
  );
}

function getLegacyEmployeeOrderAction(order, role, currentUserId) {
  const normalizedStatus = normalizeRole(order?.status);
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "SHIPPER") {
    if (normalizedStatus === "READY_FOR_SHIPPER") {
      return {
        label: "Accept order",
        successMessage: "Order accepted for delivery.",
        run: acceptEmployeeDelivery,
      };
    }
  }

  return null;
}

const EMPLOYEE_ORDER_ACTION_CONFIG = {
  ACCEPT_DELIVERY: {
    successMessage: "Order accepted for delivery.",
    run: acceptEmployeeDelivery,
  },
};

function getEmployeeOrderAction(order, role, currentUserId) {
  const availableActions = getOrderAllowedActions(order);

  if (!availableActions.length) {
    return getLegacyEmployeeOrderAction(order, role, currentUserId);
  }

  const preferredActions =
    normalizeRole(role) === "SHIPPER"
      ? ["ACCEPT_DELIVERY"]
      : [];
  const actionKey = preferredActions.find((action) => availableActions.includes(action));

  if (!actionKey) {
    return null;
  }

  const actionConfig = EMPLOYEE_ORDER_ACTION_CONFIG[actionKey];

  if (!actionConfig) {
    return null;
  }

  return {
    key: actionKey,
    label: getOrderActionLabel(actionKey),
    ...actionConfig,
  };
}

function buildEmployeeNotificationTarget(notification) {
  return (
    String(notification?.actionUrl ?? "").trim() ||
    (notification?.relatedOrderId || notification?.orderId
      ? `/employee/orders/${notification.relatedOrderId || notification.orderId}`
      : "/employee")
  );
}

function applyDeliveryProofToOrder(order, proof) {
  if (!order) {
    return order;
  }

  return {
    ...order,
    status: "COMPLETED",
    deliveryProofImagePath:
      String(proof?.imagePath ?? "").trim() || order.deliveryProofImagePath,
    deliveryProofCapturedAt:
      String(proof?.capturedAt ?? "").trim() || order.deliveryProofCapturedAt,
    deliveryProofUploadedAt:
      String(proof?.uploadedAt ?? "").trim() || order.deliveryProofUploadedAt,
    deliveryProofNote:
      String(proof?.note ?? "").trim() || order.deliveryProofNote,
  };
}

export default function EmployeePage() {
  const auth = useAuth();
  const realtime = useAppRealtime();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const employeeRole = normalizeRole(auth.user?.role);
  const currentUserId = String(auth.user?.id ?? "");
  const [taskMode, setTaskMode] = useState("available");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ordersFeed, setOrdersFeed] = useState({
    items: [],
    page: 0,
    size: 12,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [taskNotice, setTaskNotice] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [orderDetail, setOrderDetail] = useState(null);
  const [invoicePreviewOrder, setInvoicePreviewOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const lastHandledOrderRealtimeVersionRef = useRef(0);
  const lastHandledNotificationRealtimeVersionRef = useRef(0);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [deliveryProofFile, setDeliveryProofFile] = useState(null);
  const [deliveryProofNote, setDeliveryProofNote] = useState("");
  const [deliveryProofCapturedAt, setDeliveryProofCapturedAt] = useState("");
  const [deliveryProofUploading, setDeliveryProofUploading] = useState(false);
  const [deliveryProofInputKey, setDeliveryProofInputKey] = useState(0);

  useToastMessage(ordersError, { type: "error", title: "Task" });
  useToastMessage(detailError, { type: "error", title: "Task details" });
  useToastMessage(taskNotice, { type: "info", title: "Task" });
  useToastMessage(notificationsError, { type: "error", title: "Notifications" });
  useToastMessage(notificationNotice, { type: "info", title: "Notifications" });

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setOrdersLoading(true);
      }
      setOrdersError("");

      try {
        const response = await fetchEmployeeOrders(auth, {
          page: 0,
          size: 12,
          mine: taskMode === "mine" ? true : undefined,
          search: searchQuery,
        });

        setOrdersFeed(response);
      } catch (requestError) {
        setOrdersError(getApiErrorMessage(requestError, "Unable to load the task list."));
      } finally {
        if (!silent) {
          setOrdersLoading(false);
        }
      }
    },
    [auth, searchQuery, taskMode],
  );

  const loadOrderDetail = useCallback(async ({ silent = false } = {}) => {
    if (!orderId) {
      setOrderDetail(null);
      setDetailError("");
      return;
    }

    if (!silent) {
      setDetailLoading(true);
    }
    setDetailError("");

    try {
      const response = await fetchEmployeeOrderDetail(auth, orderId);
      setOrderDetail(response);
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "Unable to load task details."));
    } finally {
      if (!silent) {
        setDetailLoading(false);
      }
    }
  }, [auth, orderId]);

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setNotificationsLoading(true);
      }
      setNotificationsError("");

      try {
        const [notificationResponse, unreadCount] = await Promise.all([
          fetchEmployeeNotifications(auth, { page: 0, size: 8 }),
          fetchEmployeeNotificationUnreadCount(auth),
        ]);

        setNotifications(notificationResponse.items ?? []);
        setUnreadNotifications(unreadCount);
      } catch (requestError) {
        setNotificationsError(getApiErrorMessage(requestError, "Unable to load task notifications."));
      } finally {
        if (!silent) {
          setNotificationsLoading(false);
        }
      }
    },
    [auth],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadOrderDetail();
  }, [loadOrderDetail]);

  useEffect(() => {
    setDeliveryProofFile(null);
    setDeliveryProofNote("");
    setDeliveryProofCapturedAt("");
    setDeliveryProofInputKey((value) => value + 1);
  }, [orderId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!realtime.orderEventVersion) {
      return;
    }

    if (lastHandledOrderRealtimeVersionRef.current === realtime.orderEventVersion) {
      return;
    }

    lastHandledOrderRealtimeVersionRef.current = realtime.orderEventVersion;

    void loadOrders({ silent: true });

    const eventOrderId = String(realtime.lastOrderEvent?.orderId ?? "").trim();
    if (!orderId || !eventOrderId || eventOrderId === String(orderId)) {
      void loadOrderDetail({ silent: true });
    }
  }, [
    loadOrderDetail,
    loadOrders,
    orderId,
    realtime.lastOrderEvent?.orderId,
    realtime.orderEventVersion,
  ]);

  useEffect(() => {
    if (!realtime.notificationEventVersion) {
      return;
    }

    if (lastHandledNotificationRealtimeVersionRef.current === realtime.notificationEventVersion) {
      return;
    }

    lastHandledNotificationRealtimeVersionRef.current = realtime.notificationEventVersion;

    void loadNotifications({ silent: true });
  }, [loadNotifications, realtime.notificationEventVersion]);

  const stats = useMemo(() => {
    const availableCount = ordersFeed.items.filter((order) =>
      Boolean(getEmployeeOrderAction(order, employeeRole, currentUserId)),
    ).length;

    const myActiveCount = ordersFeed.items.filter((order) => {
      if (employeeRole === "STAFF") {
        return isMyPreparingTask(order, currentUserId);
      }

      if (employeeRole === "SHIPPER") {
        return isMyDeliveryTask(order, currentUserId);
      }

      return false;
    }).length;

    return {
      availableCount,
      myActiveCount,
      totalRevenue: ordersFeed.items.reduce(
        (sum, order) => sum + Number(order.totalAmount ?? 0),
        0,
      ),
    };
  }, [currentUserId, employeeRole, ordersFeed.items]);

  const handleTaskSearch = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleOpenOrder = (targetOrderId) => {
    if (!targetOrderId) {
      return;
    }

    navigate(`/employee/orders/${targetOrderId}`);
  };

  const handleTaskAction = async (order) => {
    const taskAction = getEmployeeOrderAction(order, employeeRole, currentUserId);

    if (!taskAction) {
      return;
    }

    setTaskNotice("");
    setOrdersError("");
    setDetailError("");
    setActionLoadingId(String(order.id));

    try {
      const updatedOrder = await taskAction.run(auth, order.id);

      setTaskNotice(taskAction.successMessage);
      if (String(orderId ?? "") === String(order.id)) {
        setOrderDetail(updatedOrder);
      }

      await Promise.all([
        loadOrders({ silent: true }),
        loadNotifications({ silent: true }),
        orderId ? loadOrderDetail() : Promise.resolve(),
      ]);
    } catch (requestError) {
      setTaskNotice(getApiErrorMessage(requestError, "Unable to update the task right now."));
    } finally {
      setActionLoadingId("");
    }
  };

  const handleNotificationOpen = async (notification) => {
    setNotificationNotice("");

    try {
      if (!notification?.read) {
        await markEmployeeNotificationRead(auth, notification.id);
      }

      await loadNotifications({ silent: true });
      navigate(buildEmployeeNotificationTarget(notification));
    } catch (requestError) {
      setNotificationNotice(
        getApiErrorMessage(requestError, "Unable to open the task notification."),
      );
    }
  };

  const handleNotificationReadToggle = async (notification) => {
    setNotificationNotice("");

    try {
      if (notification?.read) {
        await markEmployeeNotificationUnread(auth, notification.id);
        setNotificationNotice("Notification marked as unread.");
      } else {
        await markEmployeeNotificationRead(auth, notification.id);
        setNotificationNotice("Notification marked as read.");
      }

      await loadNotifications({ silent: true });
    } catch (requestError) {
      setNotificationNotice(
        getApiErrorMessage(requestError, "Unable to update the notification."),
      );
    }
  };

  const handleReadAllNotifications = async () => {
    setNotificationNotice("");

    try {
      const response = await markAllEmployeeNotificationsRead(auth);
      setNotificationNotice(response?.message ?? "All notifications were marked as read.");
      await loadNotifications({ silent: true });
    } catch (requestError) {
      setNotificationNotice(
        getApiErrorMessage(requestError, "Unable to mark all notifications."),
      );
    }
  };

  const handleDeliveryProofUpload = async (event) => {
    event.preventDefault();

    if (!orderDetail?.id || employeeRole !== "SHIPPER") {
      return;
    }

    if (!deliveryProofFile) {
      setDetailError("Choose a delivery proof image before uploading.");
      return;
    }

    setDeliveryProofUploading(true);
    setTaskNotice("");
    setOrdersError("");
    setDetailError("");

    try {
      const response = await uploadEmployeeDeliveryProof(auth, orderDetail.id, {
        file: deliveryProofFile,
        capturedAt: toIsoDateTime(deliveryProofCapturedAt),
        note: deliveryProofNote.trim(),
      });

      setTaskNotice(response.message || "Delivery proof uploaded and the order is now completed.");
      setOrderDetail((current) => applyDeliveryProofToOrder(current, response));
      setDeliveryProofFile(null);
      setDeliveryProofNote(String(response.note ?? "").trim());
      setDeliveryProofCapturedAt(
        response.capturedAt ? formatDateTimeLocalInput(response.capturedAt) : "",
      );
      setDeliveryProofInputKey((value) => value + 1);

      await Promise.all([
        loadOrders({ silent: true }),
        loadOrderDetail(),
      ]);
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "Unable to upload delivery proof."));
    } finally {
      setDeliveryProofUploading(false);
    }
  };

  const detailAction = getEmployeeOrderAction(orderDetail, employeeRole, currentUserId);
  const canUploadDeliveryProof =
    employeeRole === "SHIPPER" &&
    Boolean(orderDetail?.id) &&
    normalizeRole(orderDetail?.status) === "OUT_FOR_DELIVERY";
  const deliveryProofPreviewUrl = resolveApiUrl(orderDetail?.deliveryProofImagePath);

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
              <p className={ui.eyebrow}>Employee workspace</p>
              <h1 className={ui.bannerTitle}>
                {employeeRole === "SHIPPER" ? "Shipper task board" : "Store support board"}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                {employeeRole === "SHIPPER"
                  ? "Track delivery jobs, pickup confirmations, and delivery-proof uploads from a single screen."
                  : "Store-side processing is now handled by the manager. Staff accounts only track related order details and notifications here."}
              </p>
          </div>

          <div className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 px-4 py-3 text-sm leading-7 text-stone-600">
            <strong className="block text-base text-tea-900">{auth.user?.fullName || "Employee"}</strong>
            <span className="block font-semibold uppercase tracking-[0.18em] text-matcha-700">
              {employeeRole || "EMPLOYEE"}
            </span>
            <span className="block">
              {auth.user?.workingStoreName || "No store assigned"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Available tasks", value: stats.availableCount },
            { label: "Assigned tasks", value: stats.myActiveCount },
            { label: "Unread notifications", value: unreadNotifications },
            { label: "Tong gia tri task", value: formatPrice(stats.totalRevenue) },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-[1.3rem] border border-matcha-900/10 bg-white/72 p-4"
            >
              <strong className="block text-2xl font-bold text-tea-900">{stat.value}</strong>
              <span className="mt-1 block text-sm text-stone-600">{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="grid gap-6">
          <article className={ui.panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Task inbox</p>
                <h2 className="text-2xl font-semibold text-tea-900">Employee notifications</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  `ORDER_TASK` notifications will take you directly to the order that needs action.
                </p>
              </div>

              <button className={ui.secondaryButton} type="button" onClick={handleReadAllNotifications}>
                Read all
              </button>
            </div>

            {notificationNotice ? (
              <div className="mt-4 rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                {notificationNotice}
              </div>
            ) : null}

            {notificationsError ? (
              <div className="mt-4 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                {notificationsError}
              </div>
            ) : null}

            {notificationsLoading ? (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Dang tai notifications...
              </div>
            ) : notifications.length ? (
              <div className="mt-4 grid gap-3">
                {notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={`rounded-[1.2rem] border p-4 ${
                      notification.read
                        ? "border-matcha-900/10 bg-white/72"
                        : "border-matcha-500/20 bg-matcha-500/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={ui.pill}>{notification.type || "ORDER_TASK"}</span>
                        {!notification.read ? <span className={ui.pill}>New</span> : null}
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-tea-900">
                        {notification.title || "Task notification"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {notification.message || "You have a new task."}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-500">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className={ui.primaryButton}
                        type="button"
                        onClick={() => handleNotificationOpen(notification)}
                      >
                        Open task
                      </button>
                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => handleNotificationReadToggle(notification)}
                      >
                        {notification.read ? "Mark as unread" : "Mark as read"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                No task notifications yet.
              </div>
            )}
          </article>

          <article className={ui.panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Task board</p>
                <h2 className="text-2xl font-semibold text-tea-900">Employee orders</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  {employeeRole === "SHIPPER"
                    ? "Accept the order in READY_FOR_SHIPPER, then upload delivery proof to move it to Completed."
                    : "In-store preparation is now handled by the manager. Staff no longer receive PREPARING tasks here."}
                </p>
              </div>
            </div>

            <form className="mt-6 grid gap-3 md:grid-cols-[180px_1fr_auto]" onSubmit={handleTaskSearch}>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  View
                </span>
                <select className={ui.input} value={taskMode} onChange={(event) => setTaskMode(event.target.value)}>
                  <option value="available">Available + current</option>
                  <option value="mine">My active tasks</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Search
                </span>
                <input
                  className={ui.input}
                  placeholder="Search by order code"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </label>

              <div className="flex items-end">
                <button className={ui.primaryButton} type="submit">
                  Search
                </button>
              </div>
            </form>

            {taskNotice ? (
              <div className="mt-4 rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                {taskNotice}
              </div>
            ) : null}

            {ordersError ? (
              <div className="mt-4 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                {ordersError}
              </div>
            ) : null}

            {ordersLoading ? (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Loading task orders...
              </div>
            ) : ordersFeed.items.length ? (
              <div className="mt-4 grid gap-4">
                {ordersFeed.items.map((order) => {
                      const taskAction = getEmployeeOrderAction(order, employeeRole, currentUserId);
                      const orderStatus = getOrderStatusMeta(order.status);
                      const invoicePreviewUrl = getOrderInvoicePreviewHref(order);
                      const canViewInvoice = canViewOrderInvoice(order);

                      return (
                        <article key={order.id} className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-tea-900">Order #{order.id}</h3>
                              <p className="mt-2 text-sm font-semibold text-matcha-700">{orderStatus.label}</p>
                            </div>

                            <div className="text-right">
                              <strong className="text-xl font-bold text-matcha-700">
                                {formatPrice(order.totalAmount)}
                              </strong>
                              <p className="mt-2 text-sm text-stone-500">{formatDateTime(order.createdAt)}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-sm leading-7 text-stone-600">
                            <span>Store: {order.storeName || auth.user?.workingStoreName || "N/A"}</span>
                            <span>Payment: {getPaymentStatusMeta(order.paymentStatus).label}</span>
                            <span>Customer: {order.deliveryFullName || "N/A"}</span>
                            <span>Deliver to: {order.deliveryAddress || "N/A"}</span>
                            <span>Delivery type: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                            {order.invoiceNumber ? <span>Invoice: {order.invoiceNumber}</span> : null}
                            {order.confirmedByUserName ? (
                              <span>
                                Confirmed by: {order.confirmedByUserName}
                                {order.confirmedAt ? ` | ${formatDateTime(order.confirmedAt)}` : ""}
                              </span>
                            ) : null}
                            {order.preparingStaffName ? (
                              <span>Store handler: {order.preparingStaffName}</span>
                            ) : null}
                            {order.deliveringShipperName ? <span>Shipper: {order.deliveringShipperName}</span> : null}
                            {order.deliveryProofUploadedAt ? (
                              <span>Delivery proof: {formatDateTime(order.deliveryProofUploadedAt)}</span>
                            ) : null}
                            <span>{order.statusSummary || orderStatus.description}</span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              className={ui.secondaryButton}
                              type="button"
                              onClick={() => handleOpenOrder(order.id)}
                            >
                              View details
                            </button>
                            {taskAction ? (
                              <button
                                className={ui.primaryButton}
                                type="button"
                                disabled={actionLoadingId === String(order.id)}
                                onClick={() => handleTaskAction(order)}
                              >
                                {actionLoadingId === String(order.id) ? "Processing..." : taskAction.label}
                              </button>
                            ) : null}
                            {canViewInvoice && invoicePreviewUrl ? (
                              <button
                                className={ui.secondaryButton}
                                type="button"
                                onClick={() => setInvoicePreviewOrder(order)}
                              >
                                Open invoice
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                No tasks match the current filter.
              </div>
            )}
          </article>
        </div>

        <div className="grid content-start gap-6">
          <article className={ui.panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Order detail</p>
                <h2 className="text-2xl font-semibold text-tea-900">Task details</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Open a task from the list or from a notification to review details and act quickly.
                </p>
              </div>

              <Link className={ui.secondaryButton} to="/employee">
                Back to task board
              </Link>
            </div>

            {detailError ? (
              <div className="mt-4 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                {detailError}
              </div>
            ) : null}

            {detailLoading ? (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Loading task details...
              </div>
            ) : orderDetail ? (
              <div className="mt-4 grid gap-4">
                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  {(() => {
                    const invoicePreviewUrl = getOrderInvoicePreviewHref(orderDetail);
                    const canViewInvoice = canViewOrderInvoice(orderDetail);

                    return (
                      <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-tea-900">Order #{orderDetail.id}</h3>
                      <p className="mt-2 text-sm font-semibold text-matcha-700">
                        {getOrderStatusMeta(orderDetail.status).label}
                      </p>
                    </div>

                    <strong className="text-xl font-bold text-matcha-700">
                      {formatPrice(orderDetail.totalAmount)}
                    </strong>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm leading-7 text-stone-600">
                    <span>Store: {orderDetail.storeName || auth.user?.workingStoreName || "N/A"}</span>
                    <span>Payment: {getPaymentStatusMeta(orderDetail.paymentStatus).label}</span>
                    <span>Created: {formatDateTime(orderDetail.createdAt)}</span>
                    {orderDetail.confirmedByUserName ? (
                      <span>
                        Confirmed by: {orderDetail.confirmedByUserName}
                        {orderDetail.confirmedAt ? ` | ${formatDateTime(orderDetail.confirmedAt)}` : ""}
                      </span>
                    ) : null}
                    {orderDetail.scheduledDeliveryAt ? (
                      <span>Scheduled for: {formatDateTime(orderDetail.scheduledDeliveryAt)}</span>
                    ) : null}
                    <span>Delivery type: {formatDeliveryTypeLabel(orderDetail.deliveryType)}</span>
                    <span>Customer: {orderDetail.deliveryFullName || "N/A"}</span>
                    <span>Phone: {orderDetail.deliveryPhoneNumber || "N/A"}</span>
                    <span>Address: {orderDetail.deliveryAddress || "N/A"}</span>
                    {orderDetail.invoiceAvailable ? <span>Invoice: Ready</span> : null}
                    {orderDetail.invoiceNumber ? <span>Invoice number: {orderDetail.invoiceNumber}</span> : null}
                    {orderDetail.invoiceIssuedAt ? (
                      <span>Issued at: {formatDateTime(orderDetail.invoiceIssuedAt)}</span>
                    ) : null}
                    {orderDetail.preparingStaffName ? (
                      <span>Store handler: {orderDetail.preparingStaffName}</span>
                    ) : null}
                    {orderDetail.deliveringShipperName ? (
                      <span>Delivering shipper: {orderDetail.deliveringShipperName}</span>
                    ) : null}
                    {orderDetail.deliveryProofUploadedAt ? (
                      <span>Proof uploaded at: {formatDateTime(orderDetail.deliveryProofUploadedAt)}</span>
                    ) : null}
                    <span>{orderDetail.statusSummary || getOrderStatusMeta(orderDetail.status).description}</span>
                  </div>

                  <div className="mt-5">
                    <OrderStatusTracker order={orderDetail} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {detailAction ? (
                      <button
                        className={ui.primaryButton}
                        type="button"
                        disabled={actionLoadingId === String(orderDetail.id)}
                        onClick={() => handleTaskAction(orderDetail)}
                      >
                        {actionLoadingId === String(orderDetail.id) ? "Processing..." : detailAction.label}
                      </button>
                    ) : null}
                    {canViewInvoice && invoicePreviewUrl ? (
                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => setInvoicePreviewOrder(orderDetail)}
                      >
                        Open invoice
                      </button>
                    ) : null}
                  </div>
                      </>
                    );
                  })()}
                </div>

                {canUploadDeliveryProof ? (
                  <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Delivery proof
                        </p>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          Upload delivery proof. The backend stores it on the order detail and
                          automatically moves the order to Completed.
                        </p>
                      </div>

                      {orderDetail.deliveryProofUploadedAt ? (
                        <span className={ui.pill}>
                          Uploaded {formatDateTime(orderDetail.deliveryProofUploadedAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div className="rounded-[1rem] border border-matcha-900/10 bg-white/78 p-4">
                        {deliveryProofPreviewUrl ? (
                          <img
                            className="h-64 w-full rounded-[1rem] object-cover"
                            src={deliveryProofPreviewUrl}
                            alt="Delivery proof"
                          />
                        ) : (
                          <div className="grid h-64 place-items-center rounded-[1rem] border border-dashed border-matcha-900/15 bg-[#f8f5ef] px-4 text-center text-sm leading-7 text-stone-500">
                            No delivery proof image has been uploaded for this order yet.
                          </div>
                        )}

                        {orderDetail.deliveryProofNote ? (
                          <p className="mt-3 text-sm leading-7 text-stone-600">
                            Note: {orderDetail.deliveryProofNote}
                          </p>
                        ) : null}

                        <div className="mt-3 grid gap-1 text-sm leading-7 text-stone-600">
                          {orderDetail.deliveryProofCapturedAt ? (
                            <span>Captured at: {formatDateTime(orderDetail.deliveryProofCapturedAt)}</span>
                          ) : null}
                          {orderDetail.deliveryProofUploadedAt ? (
                            <span>Uploaded at: {formatDateTime(orderDetail.deliveryProofUploadedAt)}</span>
                          ) : null}
                        </div>
                      </div>

                      <form className="grid gap-3" onSubmit={handleDeliveryProofUpload}>
                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                            Proof image
                          </span>
                          <input
                            key={deliveryProofInputKey}
                            accept="image/*"
                            className={ui.input}
                            type="file"
                            onChange={(event) => {
                              const nextFile = event.target.files?.[0] ?? null;
                              setDeliveryProofFile(nextFile);

                              if (nextFile && !deliveryProofCapturedAt) {
                                setDeliveryProofCapturedAt(
                                  formatDateTimeLocalInput(new Date().toISOString()),
                                );
                              }
                            }}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                            Captured at
                          </span>
                          <input
                            className={ui.input}
                            type="datetime-local"
                            value={deliveryProofCapturedAt}
                            onChange={(event) => setDeliveryProofCapturedAt(event.target.value)}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                            Note
                          </span>
                          <textarea
                            className={`${ui.input} min-h-[120px] resize-y`}
                            placeholder="Example: delivered in tower B lobby, customer confirmed receipt."
                            value={deliveryProofNote}
                            onChange={(event) => setDeliveryProofNote(event.target.value)}
                          />
                        </label>

                        <div className="flex flex-wrap gap-3">
                          <button
                            className={ui.primaryButton}
                            disabled={deliveryProofUploading}
                            type="submit"
                          >
                            {deliveryProofUploading ? "Uploading delivery proof..." : "Upload proof image"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Items in this order
                  </p>

                  {orderDetail.items?.length ? (
                    <div className="mt-4 grid gap-3">
                      {orderDetail.items.map((item) => (
                        <article
                          key={item.id || `${item.dishId}-${item.dishName}`}
                          className="rounded-[1rem] border border-matcha-900/10 bg-white/70 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-tea-900">
                                {item.dishName || "Dish"}
                              </h4>
                              <p className="mt-2 text-sm leading-6 text-stone-600">
                                Quantity: {item.quantity || 0}
                              </p>
                              {item.note ? (
                                <p className="mt-1 text-sm leading-6 text-stone-500">
                                  Note: {item.note}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right text-sm leading-6 text-stone-600">
                              <div>{formatPrice(item.unitPrice)}</div>
                              <strong className="text-base text-matcha-700">
                                {formatPrice(item.totalPrice || item.lineTotal)}
                              </strong>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                      This order does not have any items to display yet.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm leading-7 text-stone-600">
                Select a task from the left panel or open one from a notification to view details here.
              </div>
            )}
          </article>
        </div>
      </section>

      <InvoicePreviewModal
        open={Boolean(invoicePreviewOrder)}
        order={invoicePreviewOrder}
        onClose={() => setInvoicePreviewOrder(null)}
      />
    </main>
  );
}

