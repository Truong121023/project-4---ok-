function resolveStoreKey(storeOrId) {
  if (storeOrId === undefined || storeOrId === null || storeOrId === "") {
    return "";
  }

  if (typeof storeOrId !== "object") {
    return String(storeOrId);
  }

  const slug = String(
    storeOrId.slug ?? storeOrId.storeSlug ?? storeOrId.targetSlug ?? "",
  ).trim();
  if (slug) {
    return slug;
  }

  const storeId = storeOrId.storeId ?? storeOrId.id ?? storeOrId.targetId;
  return storeId === undefined || storeId === null || storeId === "" ? "" : String(storeId);
}

export function buildStorePath(storeOrId) {
  const storeKey = resolveStoreKey(storeOrId);
  return storeKey ? `/stores/${storeKey}` : "/stores";
}

export function buildStoreEventsPath(storeOrId) {
  const storeKey = resolveStoreKey(storeOrId);
  return storeKey ? `/events?store=${encodeURIComponent(storeKey)}` : "/events";
}
