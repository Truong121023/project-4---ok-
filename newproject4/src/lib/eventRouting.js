function resolveEventKey(eventOrId) {
  if (eventOrId === undefined || eventOrId === null || eventOrId === "") {
    return "";
  }

  if (typeof eventOrId !== "object") {
    return String(eventOrId).trim();
  }

  const slug = String(
    eventOrId.slug ??
      eventOrId.eventSlug ??
      eventOrId.eventKey ??
      eventOrId.targetSlug ??
      "",
  ).trim();

  if (slug) {
    return slug;
  }

  const eventId = eventOrId.eventId ?? eventOrId.id ?? eventOrId.targetId;
  return eventId === undefined || eventId === null || eventId === "" ? "" : String(eventId);
}

export function buildEventPath(eventOrId) {
  const eventKey = resolveEventKey(eventOrId);
  return eventKey ? `/events/${encodeURIComponent(eventKey)}` : "/events";
}
