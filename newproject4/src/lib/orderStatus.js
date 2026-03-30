const ORDER_STEPS = [
  { key: "PENDING", label: "Created" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY_FOR_SHIPPER", label: "Waiting for shipper" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "COMPLETED", label: "Completed" },
];

const ORDER_STATUS_META = {
  PENDING: {
    label: "Awaiting confirmation",
    description: "Your order has been created and is waiting for the store to process it.",
  },
  CONFIRMED: {
    label: "Confirmed",
    description: "The store has accepted your order and is ready to prepare it.",
  },
  PREPARING: {
    label: "Preparing",
    description: "The staff is making your drinks or preparing your order.",
  },
  READY_FOR_SHIPPER: {
    label: "Waiting for shipper",
    description: "Your order is ready and waiting for the delivery rider.",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for delivery",
    description: "Your rider is on the way to deliver the order.",
  },
  COMPLETED: {
    label: "Delivered",
    description: "Your order has been completed.",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "Your order has been cancelled.",
  },
};

const PAYMENT_STATUS_META = {
  PENDING: {
    label: "Awaiting payment",
    description: "Complete the payment so the store can continue processing the order.",
  },
  PAID: {
    label: "Paid",
    description: "Your payment has been confirmed successfully.",
  },
  CANCELLED: {
    label: "Payment cancelled",
    description: "The payment session was cancelled.",
  },
  FAILED: {
    label: "Payment failed",
    description: "Something went wrong while processing the payment.",
  },
};

const ORDER_STAGE_META = {
  UNPAID: {
    label: "Awaiting payment",
    description: "The order is waiting for a successful payment before the store can process it.",
  },
  PAID: {
    label: "Paid and waiting",
    description: "The customer has paid and the order is waiting for store confirmation.",
  },
  PREPARING: {
    label: "Preparing",
    description: "The store is preparing the order or getting it ready for the shipper.",
  },
  DELIVERING: {
    label: "Out for delivery",
    description: "The order has left the store and is currently being delivered.",
  },
  COMPLETED: {
    label: "Delivered",
    description: "The order has been delivered successfully.",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "The order or payment was cancelled, so processing has stopped.",
  },
};

const ORDER_ACTION_LABELS = {
  CONFIRM_ORDER: "Confirm order",
  CANCEL_ORDER: "Cancel order",
  MARK_PAID: "Mark paid",
  GENERATE_INVOICE: "Generate invoice",
  VIEW_INVOICE: "View invoice",
  ACCEPT_PREPARING: "Accept preparing",
  MARK_READY: "Mark ready for shipper",
  ACCEPT_DELIVERY: "Accept delivery",
  MARK_COMPLETED: "Mark completed",
  REFRESH_PAYMENT: "Create new PayOS payment",
};

export function formatDeliveryTypeLabel(value) {
  return String(value ?? "").toUpperCase() === "SCHEDULED" ? "Scheduled" : "Immediate";
}

export function getOrderStatusMeta(status) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  return (
    ORDER_STATUS_META[normalizedStatus] ?? {
      label: normalizedStatus || "No status yet",
      description: "The order status will update as the store processes it.",
    }
  );
}

export function getPaymentStatusMeta(status) {
  const normalizedStatus = String(status ?? "").toUpperCase();

  return (
    PAYMENT_STATUS_META[normalizedStatus] ?? {
      label: normalizedStatus || "No status yet",
      description: "Payment information will be updated shortly.",
    }
  );
}

export function canRetryPayment(order) {
  const normalizedStatus = String(order?.status ?? "").toUpperCase();
  const normalizedPaymentStatus = String(order?.paymentStatus ?? "").toUpperCase();

  if (["PAID", "CANCELLED"].includes(normalizedPaymentStatus)) {
    return false;
  }

  if (["CANCELLED", "COMPLETED"].includes(normalizedStatus)) {
    return false;
  }

  return true;
}

export function getOrderAllowedActions(order) {
  return Array.isArray(order?.allowedActions)
    ? order.allowedActions
        .map((action) => String(action ?? "").trim().toUpperCase())
        .filter(Boolean)
        .filter((action, index, array) => array.indexOf(action) === index)
    : [];
}

export function hasOrderAllowedAction(order, action) {
  const normalizedAction = String(action ?? "").trim().toUpperCase();

  if (!normalizedAction) {
    return false;
  }

  return getOrderAllowedActions(order).includes(normalizedAction);
}

export function getOrderActionLabel(action) {
  const normalizedAction = String(action ?? "").trim().toUpperCase();
  return ORDER_ACTION_LABELS[normalizedAction] ?? normalizedAction;
}

export function isPaymentExpired(order) {
  if (!canRetryPayment(order)) {
    return false;
  }

  const expiresAt = new Date(order?.paymentExpiresAt ?? "");

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() <= Date.now();
}

function parseOrderPaymentTime(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function preferFreshPaymentOrder(primaryOrder, fallbackOrder) {
  if (!fallbackOrder?.id) {
    return primaryOrder;
  }

  if (!primaryOrder?.id) {
    return fallbackOrder;
  }

  const primaryCheckoutUrl = String(primaryOrder.paymentCheckoutUrl ?? "").trim();
  const fallbackCheckoutUrl = String(fallbackOrder.paymentCheckoutUrl ?? "").trim();
  const primaryPayosOrderCode = String(primaryOrder.payosOrderCode ?? "").trim();
  const fallbackPayosOrderCode = String(fallbackOrder.payosOrderCode ?? "").trim();
  const primaryExpiry = parseOrderPaymentTime(primaryOrder.paymentExpiresAt);
  const fallbackExpiry = parseOrderPaymentTime(fallbackOrder.paymentExpiresAt);

  const primaryLooksFresher =
    (primaryCheckoutUrl && primaryCheckoutUrl !== fallbackCheckoutUrl) ||
    (primaryPayosOrderCode && primaryPayosOrderCode !== fallbackPayosOrderCode) ||
    (primaryExpiry !== null && (fallbackExpiry === null || primaryExpiry > fallbackExpiry));

  return primaryLooksFresher ? primaryOrder : fallbackOrder;
}

export function resolveOrderStage(order) {
  const normalizedStatus = String(order?.status ?? "").toUpperCase();
  const normalizedPaymentStatus = String(order?.paymentStatus ?? "").toUpperCase();

  if (normalizedStatus === "CANCELLED" || normalizedPaymentStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (
    ["PENDING", "FAILED"].includes(normalizedPaymentStatus) &&
    normalizedStatus !== "CANCELLED"
  ) {
    return "UNPAID";
  }

  if (
    normalizedPaymentStatus === "PAID" &&
    ["PENDING", "CONFIRMED"].includes(normalizedStatus)
  ) {
    return "PAID";
  }

  if (["PREPARING", "READY_FOR_SHIPPER"].includes(normalizedStatus)) {
    return "PREPARING";
  }

  if (normalizedStatus === "OUT_FOR_DELIVERY") {
    return "DELIVERING";
  }

  if (normalizedStatus === "COMPLETED") {
    return "COMPLETED";
  }

  return "";
}

export function getOrderStageMeta(stage) {
  const normalizedStage = String(stage ?? "").toUpperCase();

  return (
    ORDER_STAGE_META[normalizedStage] ?? {
      label: normalizedStage || "No stage yet",
      description: "The order stage will be derived from the payment and order status.",
    }
  );
}

export function getOrderProgress(order) {
  const normalizedStatus = String(order?.status ?? "").toUpperCase();
  const currentIndex = ORDER_STEPS.findIndex((step) => step.key === normalizedStatus);

  return ORDER_STEPS.map((step, index) => {
    const state =
      normalizedStatus === "CANCELLED"
        ? index === 0
          ? "completed"
          : "pending"
        : currentIndex === -1
          ? "pending"
          : index < currentIndex
            ? "completed"
            : index === currentIndex
              ? "current"
              : "pending";

    return {
      ...step,
      state,
    };
  });
}

export function summarizeOrderStatus(order) {
  if (order?.statusSummary) {
    return order.statusSummary;
  }

  return getOrderStatusMeta(order?.status).description;
}
