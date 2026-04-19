/**
 * useEmployeePageState — encapsulates all state, loaders, and event handlers
 * for EmployeePage, keeping the page component under 200 LoC.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "./useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import {
  fetchEmployeeNotifications,
  fetchEmployeeNotificationUnreadCount,
  fetchEmployeeOrderDetail,
  fetchEmployeeOrders,
  markAllEmployeeNotificationsRead,
  markEmployeeNotificationRead,
  markEmployeeNotificationUnread,
  uploadEmployeeDeliveryProof,
} from "../lib/siteApi";
import {
  applyDeliveryProofToOrder,
  buildNotificationTarget,
  formatDateTimeLocalInput,
  getEmployeeOrderAction,
  isMyDeliveryTask,
  normalizeRole,
  toIsoDateTime,
} from "../lib/employee-order-actions";

const EMPTY_FEED = {
  items: [], page: 0, size: 12,
  totalItems: 0, totalPages: 0,
  hasNext: false, hasPrevious: false,
};

export function useEmployeePageState() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const employeeRole = normalizeRole(auth.user?.role);
  const currentUserId = String(auth.user?.id ?? "");

  /* Orders */
  const [taskMode, setTaskMode] = useState("available");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ordersFeed, setOrdersFeed] = useState(EMPTY_FEED);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [taskNotice, setTaskNotice] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  /* Detail */
  const [orderDetail, setOrderDetail] = useState(null);
  const [invoicePreviewOrder, setInvoicePreviewOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  /* Notifications */
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");

  /* Delivery proof form */
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

  /* Loaders */
  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setOrdersLoading(true);
    setOrdersError("");
    try {
      setOrdersFeed(await fetchEmployeeOrders(auth, {
        page: 0, size: 12,
        mine: taskMode === "mine" ? true : undefined,
        search: searchQuery,
      }));
    } catch (err) {
      setOrdersError(getApiErrorMessage(err, "Unable to load the task list."));
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  }, [auth, searchQuery, taskMode]);

  const loadOrderDetail = useCallback(async () => {
    if (!orderId) { setOrderDetail(null); setDetailError(""); return; }
    setDetailLoading(true); setDetailError("");
    try {
      setOrderDetail(await fetchEmployeeOrderDetail(auth, orderId));
    } catch (err) {
      setDetailError(getApiErrorMessage(err, "Unable to load task details."));
    } finally { setDetailLoading(false); }
  }, [auth, orderId]);

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const [notifRes, unread] = await Promise.all([
        fetchEmployeeNotifications(auth, { page: 0, size: 8 }),
        fetchEmployeeNotificationUnreadCount(auth),
      ]);
      setNotifications(notifRes.items ?? []);
      setUnreadNotifications(unread);
    } catch (err) {
      setNotificationsError(getApiErrorMessage(err, "Unable to load notifications."));
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  }, [auth]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);
  useEffect(() => { void loadOrderDetail(); }, [loadOrderDetail]);
  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    setDeliveryProofFile(null);
    setDeliveryProofNote("");
    setDeliveryProofCapturedAt("");
    setDeliveryProofInputKey((v) => v + 1);
  }, [orderId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadOrders({ silent: true });
      void loadNotifications({ silent: true });
    }, 30000);
    return () => window.clearInterval(id);
  }, [loadNotifications, loadOrders]);

  /* Derived */
  const stats = useMemo(() => ({
    availableCount: ordersFeed.items.filter(
      (o) => Boolean(getEmployeeOrderAction(o, employeeRole))
    ).length,
    myActiveCount: ordersFeed.items.filter(
      (o) => employeeRole === "SHIPPER" && isMyDeliveryTask(o, currentUserId)
    ).length,
    totalRevenue: ordersFeed.items.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0),
  }), [currentUserId, employeeRole, ordersFeed.items]);

  /* Handlers */
  const handleTaskSearch = (e) => { e.preventDefault(); setSearchQuery(searchInput.trim()); };

  const handleOpenOrder = (targetOrderId) => {
    if (targetOrderId) navigate(`/employee/orders/${targetOrderId}`);
  };

  const handleTaskAction = async (order) => {
    const action = getEmployeeOrderAction(order, employeeRole);
    if (!action) return;
    setTaskNotice(""); setOrdersError(""); setDetailError("");
    setActionLoadingId(String(order.id));
    try {
      const updated = await action.run(auth, order.id);
      setTaskNotice(action.successMessage);
      if (String(orderId ?? "") === String(order.id)) setOrderDetail(updated);
      await Promise.all([
        loadOrders({ silent: true }),
        loadNotifications({ silent: true }),
        orderId ? loadOrderDetail() : Promise.resolve(),
      ]);
    } catch (err) {
      setTaskNotice(getApiErrorMessage(err, "Unable to update the task."));
    } finally { setActionLoadingId(""); }
  };

  const handleNotificationOpen = async (notification) => {
    setNotificationNotice("");
    try {
      if (!notification?.read) await markEmployeeNotificationRead(auth, notification.id);
      await loadNotifications({ silent: true });
      navigate(buildNotificationTarget(notification));
    } catch (err) {
      setNotificationNotice(getApiErrorMessage(err, "Unable to open the notification."));
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
    } catch (err) {
      setNotificationNotice(getApiErrorMessage(err, "Unable to update the notification."));
    }
  };

  const handleReadAllNotifications = async () => {
    setNotificationNotice("");
    try {
      const res = await markAllEmployeeNotificationsRead(auth);
      setNotificationNotice(res?.message ?? "All notifications marked as read.");
      await loadNotifications({ silent: true });
    } catch (err) {
      setNotificationNotice(getApiErrorMessage(err, "Unable to mark all notifications."));
    }
  };

  const handleDeliveryProofUpload = async (e) => {
    e.preventDefault();
    if (!orderDetail?.id || employeeRole !== "SHIPPER") return;
    if (!deliveryProofFile) { setDetailError("Choose a proof image before uploading."); return; }
    setDeliveryProofUploading(true);
    setTaskNotice(""); setOrdersError(""); setDetailError("");
    try {
      const res = await uploadEmployeeDeliveryProof(auth, orderDetail.id, {
        file: deliveryProofFile,
        capturedAt: toIsoDateTime(deliveryProofCapturedAt),
        note: deliveryProofNote.trim(),
      });
      setTaskNotice(res.message || "Delivery proof uploaded and order is now completed.");
      setOrderDetail((cur) => applyDeliveryProofToOrder(cur, res));
      setDeliveryProofFile(null);
      setDeliveryProofNote(String(res.note ?? "").trim());
      setDeliveryProofCapturedAt(res.capturedAt ? formatDateTimeLocalInput(res.capturedAt) : "");
      setDeliveryProofInputKey((v) => v + 1);
      await Promise.all([loadOrders({ silent: true }), loadOrderDetail()]);
    } catch (err) {
      setDetailError(getApiErrorMessage(err, "Unable to upload delivery proof."));
    } finally { setDeliveryProofUploading(false); }
  };

  const handleProofFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    setDeliveryProofFile(f);
    if (f && !deliveryProofCapturedAt) {
      setDeliveryProofCapturedAt(formatDateTimeLocalInput(new Date().toISOString()));
    }
  };

  return {
    /* identity */
    auth, employeeRole, currentUserId,
    /* orders */
    ordersFeed, ordersLoading, ordersError, taskNotice, actionLoadingId,
    taskMode, setTaskMode, searchInput, setSearchInput,
    handleTaskSearch, handleTaskAction, handleOpenOrder,
    /* detail */
    orderDetail, detailLoading, detailError,
    invoicePreviewOrder, setInvoicePreviewOrder,
    detailAction: getEmployeeOrderAction(orderDetail, employeeRole),
    canUploadDeliveryProof:
      employeeRole === "SHIPPER" &&
      Boolean(orderDetail?.id) &&
      normalizeRole(orderDetail?.status) === "OUT_FOR_DELIVERY",
    /* notifications */
    notifications, unreadNotifications, notificationsLoading, notificationsError,
    notificationNotice, handleNotificationOpen, handleNotificationReadToggle,
    handleReadAllNotifications,
    /* proof form */
    proofForm: {
      file: deliveryProofFile,
      note: deliveryProofNote,
      capturedAt: deliveryProofCapturedAt,
      uploading: deliveryProofUploading,
      inputKey: deliveryProofInputKey,
    },
    handleDeliveryProofUpload,
    handleProofFileChange,
    setDeliveryProofNote,
    setDeliveryProofCapturedAt,
    /* stats */
    stats,
  };
}
