export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatCurrencyVnd(value, fallback = "0 VND") {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return `${numericValue.toLocaleString("vi-VN")} VND`;
}

export function formatNumberVi(value, fallback = "0") {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return numericValue.toLocaleString("vi-VN");
}

export function formatDateTimeVn(value, fallback = "N/A") {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${formatted} GMT+7`;
}

export function formatShortDateTimeVn(value, fallback = "") {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatTimeVn(value, fallback = "") {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateOnlyVn(value, fallback = "--") {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
