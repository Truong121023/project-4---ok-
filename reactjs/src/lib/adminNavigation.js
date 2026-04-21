import {
  ADMIN_HOME_PATH,
  ADMIN_MEMBERSHIP_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_SECTION_ROUTE_MAP,
  ADMIN_WORKSPACE_PATH,
} from "./adminRoutes";

const EXACT_MATCH_PATHS = new Set(["/", ADMIN_HOME_PATH]);

const primaryLinkMeta = [
  {
    key: "dashboard",
    label: "Workplace",
    adminHref: ADMIN_WORKSPACE_PATH,
    managerHref: ADMIN_WORKSPACE_PATH,
    matchers: [ADMIN_HOME_PATH, ADMIN_WORKSPACE_PATH],
  },
  {
    key: "operations",
    label: "Orders",
    adminHref: "",
    managerHref: "",
    matchers: [ADMIN_SECTION_ROUTE_MAP.orders, "/admin/orders/", "/admin/operations/"],
  },

  //   {
  //   key: "operations",
  //   label: "Operations",
  //   adminHref: ADMIN_SECTION_ROUTE_MAP.orders,
  //   managerHref:[ADMIN_SECTION_ROUTE_MAP.orders],
  //   matchers: [ADMIN_SECTION_ROUTE_MAP.orders],
  // },
  {
    key: "reports",
    label: "Report",
    adminHref: ADMIN_REPORTS_PATH,
    managerHref: ADMIN_REPORTS_PATH,
    matchers: [ADMIN_REPORTS_PATH],
  },
  {
    key: "stores",
    label: "Store",
    adminHref: ADMIN_SECTION_ROUTE_MAP.stores,
    managerHref: ADMIN_SECTION_ROUTE_MAP.stores,
    sectionKey: "stores",
    matchers: [ADMIN_SECTION_ROUTE_MAP.stores],
  },
  {
    key: "users",
    label: "User",
    adminHref: ADMIN_SECTION_ROUTE_MAP.users,
    managerHref: ADMIN_SECTION_ROUTE_MAP.users,
    sectionKey: "users",
    matchers: [ADMIN_SECTION_ROUTE_MAP.users],
  },
  {
    key: "dishes",
    label: "Menu",
    adminHref: ADMIN_SECTION_ROUTE_MAP.dishes,
    managerHref: ADMIN_SECTION_ROUTE_MAP.dishes,
    sectionKey: "dishes",
    workspaceSectionKeys: ["dishes", "storeDishes"],
    matchers: [ADMIN_SECTION_ROUTE_MAP.dishes, ADMIN_SECTION_ROUTE_MAP.storeDishes],
  },
  {
    key: "categories",
    label: "Category",
    adminHref: ADMIN_SECTION_ROUTE_MAP.categories,
    managerHref: ADMIN_SECTION_ROUTE_MAP.categories,
    sectionKey: "categories",
    matchers: [ADMIN_SECTION_ROUTE_MAP.categories],
  },
  {
    key: "news",
    label: "News",
    adminHref: ADMIN_SECTION_ROUTE_MAP.news,
    managerHref: ADMIN_SECTION_ROUTE_MAP.news,
    sectionKey: "news",
    matchers: [ADMIN_SECTION_ROUTE_MAP.news, "/admin/news/preview/"],
  },
  {
    key: "feedbacks",
    label: "Order feedback",
    adminHref: ADMIN_SECTION_ROUTE_MAP.feedbacks,
    managerHref: ADMIN_SECTION_ROUTE_MAP.feedbacks,
    sectionKey: "feedbacks",
    matchers: [ADMIN_SECTION_ROUTE_MAP.feedbacks],
  },
];

const secondaryLinkMeta = [
  {
    key: "promotions",
    label: "Promotion",
    adminHref: ADMIN_SECTION_ROUTE_MAP.promotions,
    managerHref: "",
    sectionKey: "promotions",
    matchers: [ADMIN_SECTION_ROUTE_MAP.promotions],
  },
  {
    key: "userLevels",
    label: "Membership",
    adminHref: ADMIN_MEMBERSHIP_PATH,
    managerHref: "",
    sectionKey: "userLevels",
    matchers: [ADMIN_MEMBERSHIP_PATH],
  },
];

export function isAdminNavigationPathActive(pathname, matchers = []) {
  return matchers.some((matcher) =>
    EXACT_MATCH_PATHS.has(matcher)
      ? pathname === matcher
      : pathname === matcher || pathname.startsWith(matcher),
  );
}

export function isAdminNavigationEntryActive(location, entry) {
  const activeSection = String(new URLSearchParams(location.search).get("section") ?? "").trim();
  const pathname = location.pathname;
  const isWorkspacePath = pathname === ADMIN_WORKSPACE_PATH;
  const workspaceSectionKeys = Array.isArray(entry.workspaceSectionKeys)
    ? entry.workspaceSectionKeys
    : entry.sectionKey
      ? [entry.sectionKey]
      : [];

  if (entry.key === "dashboard") {
    if (pathname === ADMIN_HOME_PATH) {
      return true;
    }

    if (isWorkspacePath) {
      return !activeSection;
    }
  }

  if (isWorkspacePath && workspaceSectionKeys.length) {
    return workspaceSectionKeys.includes(activeSection);
  }

  if (pathname.startsWith("/admin/workspace/orders/")) {
    return entry.sectionKey === "orders";
  }

  return isAdminNavigationPathActive(pathname, entry.matchers);
}

export function getAdminNavigation({
  isManagerMode = false,
  operationHref = ADMIN_HOME_PATH,
} = {}) {
  const primaryLinks = primaryLinkMeta
    .map((entry) => ({
      ...entry,
      href:
        entry.key === "operations"
          ? operationHref
          : isManagerMode
            ? entry.managerHref || ""
            : entry.adminHref,
      matchers: entry.matchers,
    }))
    .filter((entry) => entry.href);

  const secondaryLinks = secondaryLinkMeta
    .map((entry) => ({
      ...entry,
      href: isManagerMode ? entry.managerHref || "" : entry.adminHref,
      matchers: entry.matchers,
    }))
    .filter((entry) => entry.href);

  return {
    primaryLinks,
    secondaryLinks,
  };
}
