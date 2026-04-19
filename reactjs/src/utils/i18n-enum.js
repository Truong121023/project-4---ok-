/**
 * i18n-enum.js
 * Key-builder helpers for translating backend enum values via the common namespace.
 * Usage: t(statusKey(order.status))  →  t('status.pending')
 */

export const statusKey = (s) => `status.${String(s ?? "").toLowerCase()}`;
export const roleKey = (r) => `role.${String(r ?? "").toLowerCase()}`;
export const paymentKey = (p) => `payment.${String(p ?? "").toLowerCase()}`;
