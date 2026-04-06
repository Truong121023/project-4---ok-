import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import OrderQrCard from "../components/OrderQrCard";
import OrderStatusTracker from "../components/OrderStatusTracker";
import { useAuth } from "../context/AuthContext";
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
  extractOrderQrToken,
  getOrderInvoicePreviewHref,
} from "../lib/orderWorkflow";
import {
  acceptEmployeeDelivery,
  acceptEmployeePreparing,
  completeEmployeeDelivery,
  fetchEmployeeNotifications,
  fetchEmployeeNotificationUnreadCount,
  fetchEmployeeOrderDetail,
  fetchEmployeeOrders,
  fetchMobileOrderQr,
  markAllEmployeeNotificationsRead,
  markEmployeeNotificationRead,
  markEmployeeNotificationUnread,
  markEmployeeOrderReady,
  uploadEmployeeDeliveryProof,
} from "../lib/siteApi";
import { ui } from "../ui";

function formatDateTime(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  return `${Number(value ?? 0).toLocaleString("vi-VN")}d`;
}

function normalizeRole(role) {
  return String(role ?? "").trim().toUpperCase();
}

function isMyPreparingTask(order, currentUserId) {
  return (
    String(order?.preparingStaffId ?? "") === String(currentUserId ?? "") &&
    ["PREPARING", "READY_FOR_SHIPPER"].includes(normalizeRole(order?.status))
  );
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

  if (normalizedRole === "STAFF") {
    if (normalizedStatus === "CONFIRMED") {
      return {
        label: "Nhan viec",
        successMessage: "Da nhan don va chuyen sang trang thai PREPARING.",
        run: acceptEmployeePreparing,
      };
    }

    if (
      normalizedStatus === "PREPARING" &&
      String(order?.preparingStaffId ?? "") === String(currentUserId ?? "")
    ) {
      return {
        label: "Hoan tat mon",
        successMessage: "Da danh dau don hang san sang cho shipper.",
        run: markEmployeeOrderReady,
      };
    }
  }

  if (normalizedRole === "SHIPPER") {
    if (normalizedStatus === "READY_FOR_SHIPPER") {
      return {
        label: "Nhan giao",
        successMessage: "Da nhan giao don hang.",
        run: acceptEmployeeDelivery,
      };
    }

    if (
      normalizedStatus === "OUT_FOR_DELIVERY" &&
      String(order?.deliveringShipperId ?? "") === String(currentUserId ?? "")
    ) {
      return {
        label: "Da giao xong",
        successMessage: "Da hoan tat giao hang thanh cong.",
        run: completeEmployeeDelivery,
      };
    }
  }

  return null;
}

const EMPLOYEE_ORDER_ACTION_CONFIG = {
  ACCEPT_PREPARING: {
    successMessage: "Da nhan don va chuyen sang trang thai PREPARING.",
    run: acceptEmployeePreparing,
  },
  MARK_READY: {
    successMessage: "Da danh dau don hang san sang cho shipper.",
    run: markEmployeeOrderReady,
  },
  ACCEPT_DELIVERY: {
    successMessage: "Da nhan giao don hang.",
    run: acceptEmployeeDelivery,
  },
  MARK_COMPLETED: {
    successMessage: "Da hoan tat giao hang thanh cong.",
    run: completeEmployeeDelivery,
  },
};

function getEmployeeOrderAction(order, role, currentUserId) {
  const availableActions = getOrderAllowedActions(order);

  if (!availableActions.length) {
    return getLegacyEmployeeOrderAction(order, role, currentUserId);
  }

  const preferredActions =
    normalizeRole(role) === "SHIPPER"
      ? ["ACCEPT_DELIVERY", "MARK_COMPLETED"]
      : ["ACCEPT_PREPARING", "MARK_READY"];
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
  const [scanQrToken, setScanQrToken] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [invoicePreviewOrder, setInvoicePreviewOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [deliveryProofFile, setDeliveryProofFile] = useState(null);
  const [deliveryProofNote, setDeliveryProofNote] = useState("");
  const [deliveryProofCapturedAt, setDeliveryProofCapturedAt] = useState("");
  const [deliveryProofUploading, setDeliveryProofUploading] = useState(false);
  const [deliveryProofInputKey, setDeliveryProofInputKey] = useState(0);

  useToastMessage(ordersError, { type: "error", title: "Task" });
  useToastMessage(detailError, { type: "error", title: "Chi tiet task" });
  useToastMessage(taskNotice, { type: "info", title: "Task" });
  useToastMessage(notificationsError, { type: "error", title: "Thong bao" });
  useToastMessage(notificationNotice, { type: "info", title: "Thong bao" });

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
        setOrdersError(getApiErrorMessage(requestError, "Khong the tai danh sach task."));
      } finally {
        if (!silent) {
          setOrdersLoading(false);
        }
      }
    },
    [auth, searchQuery, taskMode],
  );

  const loadOrderDetail = useCallback(async () => {
    if (!orderId) {
      setOrderDetail(null);
      setDetailError("");
      return;
    }

    setDetailLoading(true);
    setDetailError("");

    try {
      const response = await fetchEmployeeOrderDetail(auth, orderId);
      setOrderDetail(response);
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "Khong the tai chi tiet task."));
    } finally {
      setDetailLoading(false);
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
        setNotificationsError(getApiErrorMessage(requestError, "Khong the tai task notifications."));
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
    const intervalId = window.setInterval(() => {
      void loadOrders({ silent: true });
      void loadNotifications({ silent: true });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications, loadOrders]);

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

    if (
      employeeRole === "SHIPPER" &&
      taskAction.key === "MARK_COMPLETED" &&
      !String(order?.deliveryProofImagePath ?? "").trim()
    ) {
      setOrdersError("Tai anh bang chung giao hang truoc khi danh dau hoan tat don.");
      setTaskNotice("");

      if (order?.id && String(orderId ?? "") !== String(order.id)) {
        navigate(`/employee/orders/${order.id}`);
      }

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
      setTaskNotice(getApiErrorMessage(requestError, "Khong the cap nhat task luc nay."));
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
        getApiErrorMessage(requestError, "Khong the mo task notification."),
      );
    }
  };

  const handleNotificationReadToggle = async (notification) => {
    setNotificationNotice("");

    try {
      if (notification?.read) {
        await markEmployeeNotificationUnread(auth, notification.id);
        setNotificationNotice("Da danh dau notification la chua doc.");
      } else {
        await markEmployeeNotificationRead(auth, notification.id);
        setNotificationNotice("Da danh dau notification la da doc.");
      }

      await loadNotifications({ silent: true });
    } catch (requestError) {
      setNotificationNotice(
        getApiErrorMessage(requestError, "Khong the cap nhat notification."),
      );
    }
  };

  const handleReadAllNotifications = async () => {
    setNotificationNotice("");

    try {
      const response = await markAllEmployeeNotificationsRead(auth);
      setNotificationNotice(response?.message ?? "Da danh dau tat ca la da doc.");
      await loadNotifications({ silent: true });
    } catch (requestError) {
      setNotificationNotice(
        getApiErrorMessage(requestError, "Khong the danh dau tat ca notification."),
      );
    }
  };

  const handleScanSubmit = async (event) => {
    event.preventDefault();

    const qrToken = extractOrderQrToken(scanQrToken);

    if (!qrToken) {
      setOrdersError("Vui long nhap QR token hoac URL QR cong khai.");
      return;
    }

    setScanLoading(true);
    setTaskNotice("");
    setOrdersError("");
    setDetailError("");

    try {
      const response = await fetchMobileOrderQr(auth, qrToken);
      const scannedOrder = response.order;

      if (!scannedOrder?.id) {
        setOrdersError(response.message || "Backend chua tra ve don hang hop le tu QR nay.");
        return;
      }

      setOrderDetail(scannedOrder);
      setScanQrToken("");
      setTaskNotice(
        response.message ||
          (employeeRole === "SHIPPER"
            ? "Da mo task giao hang tu QR."
            : "Da mo task chuan bi tu QR."),
      );
      navigate(`/employee/orders/${scannedOrder.id}`);

      await Promise.all([
        loadOrders({ silent: true }),
        loadNotifications({ silent: true }),
      ]);
    } catch (requestError) {
      setOrdersError(getApiErrorMessage(requestError, "Khong the quet QR luc nay."));
    } finally {
      setScanLoading(false);
    }
  };

  const handleDeliveryProofUpload = async (event) => {
    event.preventDefault();

    if (!orderDetail?.id || employeeRole !== "SHIPPER") {
      return;
    }

    if (!deliveryProofFile) {
      setDetailError("Chon anh bang chung giao hang truoc khi tai len.");
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

      setTaskNotice(response.message || "Da tai anh bang chung giao hang.");
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
      setDetailError(getApiErrorMessage(requestError, "Khong the tai bang chung giao hang."));
    } finally {
      setDeliveryProofUploading(false);
    }
  };

  const detailAction = getEmployeeOrderAction(orderDetail, employeeRole, currentUserId);
  const canUploadDeliveryProof =
    employeeRole === "SHIPPER" &&
    Boolean(orderDetail?.id) &&
    ["OUT_FOR_DELIVERY", "COMPLETED"].includes(normalizeRole(orderDetail?.status));
  const deliveryProofPreviewUrl = resolveApiUrl(orderDetail?.deliveryProofImagePath);

  return (
    <main className={ui.page}>
      <section className={ui.panel}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={ui.eyebrow}>Employee workspace</p>
            <h1 className={ui.bannerTitle}>
              {employeeRole === "SHIPPER" ? "Shipper task board" : "Staff task board"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
              Theo doi don hang duoc giao va task notifications trong cung mot man hinh.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-matcha-900/10 bg-white/72 px-4 py-3 text-sm leading-7 text-stone-600">
            <strong className="block text-base text-tea-900">{auth.user?.fullName || "Employee"}</strong>
            <span className="block font-semibold uppercase tracking-[0.18em] text-matcha-700">
              {employeeRole || "EMPLOYEE"}
            </span>
            <span className="block">
              {auth.user?.workingStoreName || "Chua gan cua hang"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Task co the nhan", value: stats.availableCount },
            { label: "Task dang phu trach", value: stats.myActiveCount },
            { label: "Notification chua doc", value: unreadNotifications },
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
                  Notification `ORDER_TASK` se dua ban den dung don hang can xu ly.
                </p>
              </div>

              <button className={ui.secondaryButton} type="button" onClick={handleReadAllNotifications}>
                Doc tat ca
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
                        {!notification.read ? <span className={ui.pill}>Moi</span> : null}
                      </div>

                      <h3 className="mt-3 text-base font-semibold text-tea-900">
                        {notification.title || "Task notification"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {notification.message || "Ban co mot task moi."}
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
                        Mo task
                      </button>
                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => handleNotificationReadToggle(notification)}
                      >
                        {notification.read ? "Danh dau chua doc" : "Danh dau da doc"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Chua co task notification nao.
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
                    ? "Nhan giao o trang thai READY_FOR_SHIPPER, sau do xac nhan giao xong."
                    : "Nhan don o trang thai CONFIRMED, sau do danh dau san sang cho shipper."}
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
                  placeholder="Tim theo ma don hang"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </label>

              <div className="flex items-end">
                <button className={ui.primaryButton} type="submit">
                  Loc task
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

            <div className="mt-4">
              <form
                className="grid gap-3 rounded-[1.2rem] border border-matcha-900/10 bg-[#f8f5ef] p-4"
                onSubmit={handleScanSubmit}
              >
                <div>
                  <p className="text-sm font-semibold text-tea-900">Nhan task bang QR</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    Dan QR token hoac full URL tu hoa don. Backend se tu quyet luong xu ly theo
                    role hien tai, frontend chi mo task va doc `allowedActions`.
                  </p>
                </div>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    QR token
                  </span>
                  <input
                    className={ui.input}
                    placeholder="qr_tok_abc hoac /api/public/order-qr/qr_tok_abc"
                    value={scanQrToken}
                    onChange={(event) => setScanQrToken(event.target.value)}
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button className={ui.primaryButton} disabled={scanLoading} type="submit">
                    {scanLoading ? "Dang xu ly QR..." : "Mo task bang QR"}
                  </button>
                </div>
              </form>
            </div>

            {ordersLoading ? (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Dang tai task orders...
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
                            <span>Khach hang: {order.deliveryFullName || "N/A"}</span>
                            <span>Giao den: {order.deliveryAddress || "N/A"}</span>
                            <span>Loai giao: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                            {order.invoiceNumber ? <span>Hoa don: {order.invoiceNumber}</span> : null}
                            {order.confirmedByUserName ? (
                              <span>
                                Xac nhan boi: {order.confirmedByUserName}
                                {order.confirmedAt ? ` | ${formatDateTime(order.confirmedAt)}` : ""}
                              </span>
                            ) : null}
                            {order.preparingStaffName ? <span>Staff: {order.preparingStaffName}</span> : null}
                            {order.deliveringShipperName ? <span>Shipper: {order.deliveringShipperName}</span> : null}
                            {order.deliveryProofUploadedAt ? (
                              <span>Bang chung giao hang: {formatDateTime(order.deliveryProofUploadedAt)}</span>
                            ) : null}
                            <span>{order.statusSummary || orderStatus.description}</span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              className={ui.secondaryButton}
                              type="button"
                              onClick={() => handleOpenOrder(order.id)}
                            >
                              Xem chi tiet
                            </button>
                            {taskAction ? (
                              <button
                                className={ui.primaryButton}
                                type="button"
                                disabled={actionLoadingId === String(order.id)}
                                onClick={() => handleTaskAction(order)}
                              >
                                {actionLoadingId === String(order.id) ? "Dang xu ly..." : taskAction.label}
                              </button>
                            ) : null}
                            {canViewInvoice && invoicePreviewUrl ? (
                              <button
                                className={ui.secondaryButton}
                                type="button"
                                onClick={() => setInvoicePreviewOrder(order)}
                              >
                                Xuat hoa don
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Khong co task nao phu hop voi bo loc hien tai.
              </div>
            )}
          </article>
        </div>

        <div className="grid content-start gap-6">
          <article className={ui.panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={ui.eyebrow}>Order detail</p>
                <h2 className="text-2xl font-semibold text-tea-900">Chi tiet task</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">
                  Mo task tu danh sach hoac tu notification de xem chi tiet va thao tac nhanh.
                </p>
              </div>

              <Link className={ui.secondaryButton} to="/employee">
                Ve bang task
              </Link>
            </div>

            {detailError ? (
              <div className="mt-4 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                {detailError}
              </div>
            ) : null}

            {detailLoading ? (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Dang tai chi tiet task...
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
                        Xac nhan boi: {orderDetail.confirmedByUserName}
                        {orderDetail.confirmedAt ? ` | ${formatDateTime(orderDetail.confirmedAt)}` : ""}
                      </span>
                    ) : null}
                    {orderDetail.scheduledDeliveryAt ? (
                      <span>Hen giao: {formatDateTime(orderDetail.scheduledDeliveryAt)}</span>
                    ) : null}
                    <span>Loai giao: {formatDeliveryTypeLabel(orderDetail.deliveryType)}</span>
                    <span>Khach hang: {orderDetail.deliveryFullName || "N/A"}</span>
                    <span>So dien thoai: {orderDetail.deliveryPhoneNumber || "N/A"}</span>
                    <span>Dia chi: {orderDetail.deliveryAddress || "N/A"}</span>
                    {orderDetail.invoiceAvailable ? <span>Hoa don: San sang</span> : null}
                    {orderDetail.invoiceNumber ? <span>So hoa don: {orderDetail.invoiceNumber}</span> : null}
                    {orderDetail.invoiceIssuedAt ? (
                      <span>Phat hanh luc: {formatDateTime(orderDetail.invoiceIssuedAt)}</span>
                    ) : null}
                    {orderDetail.orderQrToken ? <span>QR token: {orderDetail.orderQrToken}</span> : null}
                    {orderDetail.preparingStaffName ? (
                      <span>Staff xu ly: {orderDetail.preparingStaffName}</span>
                    ) : null}
                    {orderDetail.deliveringShipperName ? (
                      <span>Shipper giao: {orderDetail.deliveringShipperName}</span>
                    ) : null}
                    {orderDetail.deliveryProofUploadedAt ? (
                      <span>Bang chung tai len: {formatDateTime(orderDetail.deliveryProofUploadedAt)}</span>
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
                        {actionLoadingId === String(orderDetail.id) ? "Dang xu ly..." : detailAction.label}
                      </button>
                    ) : null}
                    {canViewInvoice && invoicePreviewUrl ? (
                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => setInvoicePreviewOrder(orderDetail)}
                      >
                        Xuat hoa don
                      </button>
                    ) : null}
                  </div>
                      </>
                    );
                  })()}
                </div>

                <OrderQrCard
                  order={orderDetail}
                  title="Order QR"
                  subtitle="Staff quet ma nay de nhan khau chuan bi. Shipper quet hoac tai bang chung giao hang truoc khi danh dau hoan tat."
                />

                {canUploadDeliveryProof ? (
                  <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Delivery proof
                        </p>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          Tai anh bang chung giao hang truoc khi bam hoan tat don. Anh nay se duoc
                          backend luu vao order detail.
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
                            Chua co anh bang chung giao hang cho don nay.
                          </div>
                        )}

                        {orderDetail.deliveryProofNote ? (
                          <p className="mt-3 text-sm leading-7 text-stone-600">
                            Ghi chu: {orderDetail.deliveryProofNote}
                          </p>
                        ) : null}

                        <div className="mt-3 grid gap-1 text-sm leading-7 text-stone-600">
                          {orderDetail.deliveryProofCapturedAt ? (
                            <span>Anh chup luc: {formatDateTime(orderDetail.deliveryProofCapturedAt)}</span>
                          ) : null}
                          {orderDetail.deliveryProofUploadedAt ? (
                            <span>Tai len luc: {formatDateTime(orderDetail.deliveryProofUploadedAt)}</span>
                          ) : null}
                        </div>
                      </div>

                      <form className="grid gap-3" onSubmit={handleDeliveryProofUpload}>
                        <label className="grid gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                            Anh bang chung
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
                            Thoi diem chup
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
                            Ghi chu
                          </span>
                          <textarea
                            className={`${ui.input} min-h-[120px] resize-y`}
                            placeholder="Vi du: giao tai sanh block B, khach da nhan."
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
                            {deliveryProofUploading ? "Dang tai bang chung..." : "Tai bang chung"}
                          </button>
                          {detailAction?.key === "MARK_COMPLETED" && !orderDetail.deliveryProofImagePath ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                              Can tai bang chung truoc khi hoan tat.
                            </span>
                          ) : null}
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.2rem] border border-matcha-900/10 bg-white/72 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Mon trong don
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
                                So luong: {item.quantity || 0}
                              </p>
                              {item.note ? (
                                <p className="mt-1 text-sm leading-6 text-stone-500">
                                  Ghi chu: {item.note}
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
                      Don hang nay chua co danh sach mon de hien thi.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm leading-7 text-stone-600">
                Chon mot task trong bang ben trai hoac mo tu notification de xem chi tiet tai day.
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
