/**
 * employee-order-actions.js
 * Pure helpers for determining which action an employee can take on an order.
 * No React deps — safe to import anywhere.
 */
import { acceptEmployeeDelivery } from "./siteApi";
import { getOrderActionLabel, getOrderAllowedActions } from "./orderStatus";

export function normalizeRole(role) {
  return String(role ?? "").trim().toUpperCase();
}

const ACTION_CONFIG = {
  ACCEPT_DELIVERY: {
    successMessage: "Pickup confirmed.",
    run: acceptEmployeeDelivery,
  },
};

function getLegacyAction(order, role) {
  if (
    normalizeRole(role) === "SHIPPER" &&
    normalizeRole(order?.status) === "READY_FOR_SHIPPER"
  ) {
    return {
      label: "Confirm pickup",
      successMessage: "Pickup confirmed.",
      run: acceptEmployeeDelivery,
    };
  }
  return null;
}

/**
 * Returns the single best action object for an employee on an order,
 * or null if no action is available.
 */
export function getEmployeeOrderAction(order, role) {
  const available = getOrderAllowedActions(order);
  if (!available.length) return getLegacyAction(order, role);

  const preferred = normalizeRole(role) === "SHIPPER" ? ["ACCEPT_DELIVERY"] : [];
  const key = preferred.find((a) => available.includes(a));
  if (!key || !ACTION_CONFIG[key]) return null;

  return { key, label: getOrderActionLabel(key), ...ACTION_CONFIG[key] };
}

export function isMyDeliveryTask(order, currentUserId) {
  return (
    String(order?.deliveringShipperId ?? "") === String(currentUserId ?? "") &&
    ["OUT_FOR_DELIVERY", "COMPLETED"].includes(normalizeRole(order?.status))
  );
}

export function buildNotificationTarget(notification) {
  return (
    String(notification?.actionUrl ?? "").trim() ||
    (notification?.relatedOrderId || notification?.orderId
      ? `/employee/orders/${notification.relatedOrderId || notification.orderId}`
      : "/employee")
  );
}

export function applyDeliveryProofToOrder(order, proof) {
  if (!order) return order;
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

export function formatDateTimeLocalInput(value) {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function toIsoDateTime(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";
  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
