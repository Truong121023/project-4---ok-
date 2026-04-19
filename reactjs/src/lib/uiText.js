export function translateUiText(value) {
  const rawValue = String(value ?? "");

  if (!rawValue.trim()) {
    return rawValue;
  }

  return rawValue;
}

const DISABLED_REASON_LABELS = {
  OUTSIDE_OPEN_HOURS: "Closed now",
  STORE_INACTIVE: "Temporarily closed",
  EVENT_NOT_FOUND: "Event unavailable",
  EVENT_INACTIVE: "Event unavailable",
  EVENT_ENDED: "Event ended",
  EVENT_FULL: "Fully booked",
  EVENT_NOT_STARTED: "Not started yet",
};

export function translateDisabledReason(reason, fallback = "Temporarily unavailable") {
  if (!reason) return fallback;
  const key = String(reason).trim().toUpperCase();
  return DISABLED_REASON_LABELS[key] || fallback;
}
