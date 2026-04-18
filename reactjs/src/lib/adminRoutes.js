export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_WORKSPACE_PATH = "/admin/workspace";
export const ADMIN_MEMBERSHIP_PATH = "/admin/membership";
export const ADMIN_REPORTS_PATH = "/admin/reports";
export const ADMIN_SECTION_ROUTE_MAP = {
  users: "/admin/user",
  stores: "/admin/store",
  events: "/admin/events",
  categories: "/admin/category",
  dishes: "/admin/menu",
  storeDishes: "/admin/store-dishes",
  news: "/admin/news",
  promotions: "/admin/promotion",
  userLevels: "/admin/user-levels",
  orders: "/admin/orders",
  reviews: "/admin/reviews",
  feedbacks: "/admin/feedbacks",
};

export function getAdminSectionPath(sectionKey = "") {
  const normalizedSectionKey = String(sectionKey ?? "").trim();
  return ADMIN_SECTION_ROUTE_MAP[normalizedSectionKey] ?? ADMIN_HOME_PATH;
}

export function buildAdminWorkspacePath({ sectionKey = "", recordId = "" } = {}) {
  const searchParams = new URLSearchParams();
  const normalizedSectionKey = String(sectionKey ?? "").trim();
  const normalizedRecordId = String(recordId ?? "").trim();

  if (normalizedRecordId) {
    searchParams.set("record", normalizedRecordId);
  }

  const queryString = searchParams.toString();
  const basePath = getAdminSectionPath(normalizedSectionKey);
  return queryString ? `${basePath}?${queryString}` : basePath;
}

export function buildAdminOrdersPath({ storeId = "" } = {}) {
  const normalizedStoreId = String(storeId ?? "").trim();

  if (!normalizedStoreId) {
    return ADMIN_SECTION_ROUTE_MAP.orders;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("storeId", normalizedStoreId);
  return `${ADMIN_SECTION_ROUTE_MAP.orders}?${searchParams.toString()}`;
}

export function buildAdminOrderPath(orderId) {
  const normalizedOrderId = String(orderId ?? "").trim();
  return normalizedOrderId
    ? `${ADMIN_SECTION_ROUTE_MAP.orders}/${encodeURIComponent(normalizedOrderId)}`
    : ADMIN_SECTION_ROUTE_MAP.orders;
}

export function hasAdminWorkspaceSearch(search = "") {
  const searchParams = new URLSearchParams(search);
  return Boolean(
    String(searchParams.get("section") ?? "").trim() ||
      String(searchParams.get("record") ?? "").trim(),
  );
}

export function resolveLegacyAdminWorkspacePath(search = "") {
  const searchParams = new URLSearchParams(search);
  const sectionKey = String(searchParams.get("section") ?? "").trim() || "stores";
  const recordId = String(searchParams.get("record") ?? "").trim();

  return buildAdminWorkspacePath({
    sectionKey,
    recordId,
  });
}
