import { resolveApiUrl } from "./api";
import { canRetryPayment, getOrderAllowedActions, hasOrderAllowedAction } from "./orderStatus";

export function hasServerDrivenOrderActions(order) {
  return getOrderAllowedActions(order).length > 0;
}

export function canRefreshOrderPayment(order) {
  if (hasServerDrivenOrderActions(order)) {
    return hasOrderAllowedAction(order, "REFRESH_PAYMENT");
  }

  return canRetryPayment(order);
}

export function canViewOrderInvoice(order) {
  if (hasServerDrivenOrderActions(order)) {
    return hasOrderAllowedAction(order, "VIEW_INVOICE");
  }

  return Boolean(order?.invoiceAvailable || order?.invoicePreviewUrl || order?.orderQrToken);
}

export function getOrderPublicQrHref(order) {
  const directUrl = resolveApiUrl(order?.invoicePreviewUrl);

  if (directUrl) {
    return directUrl;
  }

  const qrToken = String(order?.orderQrToken ?? "").trim();
  return qrToken ? resolveApiUrl(`/api/public/order-qr/${qrToken}`) : "";
}

export function getOrderInvoicePreviewHref(order) {
  return getOrderPublicQrHref(order);
}

export function getOrderInvoiceDownloadHref(order) {
  const directUrl = resolveApiUrl(order?.invoiceDownloadUrl);

  if (directUrl) {
    return directUrl;
  }

  const qrToken = String(order?.orderQrToken ?? "").trim();
  return qrToken ? resolveApiUrl(`/api/public/order-qr/${qrToken}?download=true`) : "";
}

export function extractOrderQrToken(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const extractFromPath = (path) => {
    const match = String(path ?? "").match(/\/api\/public\/order-qr\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  };

  try {
    const parsedUrl = new URL(rawValue);
    const tokenFromUrl = extractFromPath(parsedUrl.pathname);

    if (tokenFromUrl) {
      return tokenFromUrl;
    }
  } catch {
    // Keep the raw value if it is not a full URL.
  }

  const tokenFromPath = extractFromPath(rawValue);
  return tokenFromPath || rawValue;
}
