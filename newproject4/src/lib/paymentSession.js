const PENDING_PAYMENT_ORDER_KEY = "tea-matcha.pending-payment-order";

function resolvePrimaryOrderId(order) {
  if (order?.orders?.length) {
    return String(order.orders[0]?.id ?? "");
  }

  return order?.id ? String(order.id) : "";
}

export function savePendingPaymentOrder(order) {
  const primaryOrderId = resolvePrimaryOrderId(order);

  if (typeof window === "undefined" || !primaryOrderId) {
    return;
  }

  window.sessionStorage.setItem(
    PENDING_PAYMENT_ORDER_KEY,
    JSON.stringify({
      orderId: primaryOrderId,
      checkoutGroupId: order?.id ? String(order.id) : "",
      orderIds: Array.isArray(order?.orders)
        ? order.orders.map((entry) => String(entry?.id ?? "")).filter(Boolean)
        : [primaryOrderId],
      paymentCheckoutUrl: order.paymentCheckoutUrl ?? "",
      paymentExpiresAt: order.paymentExpiresAt ?? "",
      updatedAt: order.updatedAt ?? "",
    }),
  );
}

export function getPendingPaymentOrder() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingPaymentOrder() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_PAYMENT_ORDER_KEY);
}
