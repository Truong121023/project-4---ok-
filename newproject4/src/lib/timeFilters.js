function pad(value) {
  return String(value).padStart(2, "0");
}

function toValidDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value ?? "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeValue(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const parts = text.split(":").map((part) => Number(part));
  const [hours = 0, minutes = 0, seconds = 0] = parts;

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  return hours * 60 + minutes + seconds / 60;
}

function getMinutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function getCurrentTimeValue() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getCurrentDateTimeLocalValue() {
  const now = new Date();
  const shifted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

export function dateFromTimeValue(timeValue, referenceDate = new Date()) {
  const baseDate = toValidDate(referenceDate) ?? new Date();
  const parsedMinutes = parseTimeValue(timeValue);

  if (parsedMinutes === null) {
    return null;
  }

  const hours = Math.floor(parsedMinutes / 60);
  const minutes = Math.floor(parsedMinutes % 60);
  const seconds = Math.round((parsedMinutes - Math.floor(parsedMinutes)) * 60);
  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, seconds, 0);
  return nextDate;
}

export function isStoreOpenAt(store, dateValue = new Date()) {
  const date = toValidDate(dateValue);

  if (!date) {
    return true;
  }

  const openMinutes = parseTimeValue(store?.openTime);
  const closeMinutes = parseTimeValue(store?.closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return true;
  }

  const targetMinutes = getMinutesOfDay(date);

  if (closeMinutes === openMinutes) {
    return true;
  }

  if (closeMinutes > openMinutes) {
    return targetMinutes >= openMinutes && targetMinutes <= closeMinutes;
  }

  return targetMinutes >= openMinutes || targetMinutes <= closeMinutes;
}

export function isEventActiveAt(event, dateValue = new Date()) {
  const date = toValidDate(dateValue);

  if (!date) {
    return true;
  }

  const startsAt = toValidDate(event?.startsAt);
  const endsAt = toValidDate(event?.endsAt ?? event?.startsAt);

  if (startsAt && date.getTime() < startsAt.getTime()) {
    return false;
  }

  if (endsAt && date.getTime() > endsAt.getTime()) {
    return false;
  }

  return isStoreOpenAt(event?.store ?? event, date);
}
