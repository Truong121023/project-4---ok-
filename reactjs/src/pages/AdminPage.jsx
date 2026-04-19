import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import InvoicePreviewModal from "../components/InvoicePreviewModal";
import AdminFormField from "../components/admin/AdminFormField";
import SmartImage from "../components/SmartImage";
import {
  buildSectionConfigs,
  createEmptyDraft,
  hydrateSectionDraft,
  requiresWorkingStoreRole,
  sectionTabs,
  serializeSectionDraft,
  toIdString,
} from "../components/admin/adminSchema";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { apiRequest, getApiErrorMessage, uploadAdminImages } from "../lib/api";
import {
  ADMIN_HOME_PATH,
  buildAdminOrderPath,
  buildAdminOrdersPath,
  buildAdminWorkspacePath,
} from "../lib/adminRoutes";
import { getPrimaryImageUrl, normalizeImagePathList } from "../lib/images";
import { formatCurrencyVnd, formatDateOnlyVn, formatDateTimeVn } from "../lib/locale";
import {
  formatDeliveryTypeLabel,
  getOrderActionLabel,
  getOrderAllowedActions,
  getOrderStatusMeta,
  getPaymentStatusMeta,
  getOrderStageMeta,
  resolveOrderStage,
} from "../lib/orderStatus";
import {
  canViewOrderInvoice,
  getOrderInvoicePreviewHref,
} from "../lib/orderWorkflow";
import OrderStatusTracker from "../components/OrderStatusTracker";
import { ui } from "../ui";

const adminSectionKeys = [
  "users",
  "stores",
  "events",
  "categories",
  "dishes",
  "storeDishes",
  "news",
  "promotions",
  "userLevels",
  "orders",
  "reviews",
  "feedbacks",
];
const managerSectionKeys = [
  "stores",
  "users",
  "events",
  "categories",
  "dishes",
  "storeDishes",
  "news",
  "orders",
  "reviews",
  "feedbacks",
];
const adminListPaths = {
  users: "/api/admin/users",
  stores: "/api/admin/stores",
  events: "/api/admin/events",
  categories: "/api/admin/categories",
  dishes: "/api/admin/dishes",
  storeDishes: "/api/admin/store-dishes",
  news: "/api/admin/news",
  promotions: "/api/admin/promotions",
  userLevels: "/api/admin/user-levels",
  orders: "/api/admin/orders",
  reviews: "/api/admin/reviews",
  feedbacks: "/api/admin/feedbacks",
};
const orderStatusOptions = ["", "PENDING", "CONFIRMED", "PREPARING", "READY_FOR_SHIPPER", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];
const adminOrderActionConfig = {
  CONFIRM_ORDER: {
    path: (id) => `/api/admin/orders/${id}/confirm`,
    successKey: "orders.confirmSuccess",
  },
  CANCEL_ORDER: {
    path: (id) => `/api/admin/orders/${id}/cancel`,
    successKey: "orders.cancelSuccess",
  },
  MARK_PAID: {
    path: (id) => `/api/admin/orders/${id}/mark-paid`,
    successKey: "orders.markPaidSuccess",
  },
  GENERATE_INVOICE: {
    path: (id) => `/api/admin/orders/${id}/invoice/generate`,
    successKey: "orders.invoiceGeneratedSuccess",
  },
};
const adminAiFormTypes = {
  stores: "STORE",
  categories: "CATEGORY",
  dishes: "DISH",
  events: "EVENT",
  news: "NEWS",
  storeDishes: "STORE_DISH",
};
const adminAiFieldMap = {
  stores: {
    name: "name",
    slug: "slug",
    description: "description",
    address: "address",
    contactEmail: "contactEmail",
    phoneNumber: "phoneNumber",
    latitude: "latitude",
    longitude: "longitude",
    area: "area",
    positionLabel: "positionLabel",
    hoursText: "hoursText",
    hours: "hoursText",
    openTime: "openTime",
    closeTime: "closeTime",
    personality: "personality",
    designSignature: "designSignature",
    franchiseMood: "franchiseMood",
    specialty: "specialty",
    highlightSummary: "highlightSummary",
    highlightTags: "highlightTagsText",
    serviceTags: "serviceTagsText",
    imagePath: "imagePaths",
    imagePaths: "imagePaths",
    sections: "sections",
    active: "active",
  },
  categories: {
    storeId: "storeId",
    name: "name",
    description: "description",
    imagePath: "imagePaths",
    imagePaths: "imagePaths",
    sortOrder: "sortOrder",
    active: "active",
  },
  dishes: {
    categoryId: "categoryId",
    name: "name",
    description: "description",
    note: "note",
    price: "price",
    status: "status",
    available: "available",
    franchiseRequired: "franchiseRequired",
    franchiseNote: "franchiseNote",
    highlightSummary: "highlightSummary",
    highlightTags: "highlightTagsText",
    imagePath: "imagePaths",
    imagePaths: "imagePaths",
    sections: "sections",
    active: "active",
  },
  events: {
    storeId: "storeId",
    name: "name",
    slug: "slug",
    description: "description",
    location: "location",
    scheduleText: "scheduleText",
    schedule: "scheduleText",
    highlightSummary: "highlightSummary",
    highlightTags: "highlightTagsText",
    capacity: "capacity",
    bookedCount: "bookedCount",
    featuredDishIds: "featuredDishIdsText",
    imagePath: "imagePaths",
    imagePaths: "imagePaths",
    sections: "sections",
    startsAt: "startsAt",
    endsAt: "endsAt",
    active: "active",
  },
  news: {
    title: "title",
    slug: "slug",
    summary: "summary",
    content: "content",
    relatedStoreId: "relatedStoreId",
    tags: "tagsText",
    imagePath: "imagePaths",
    imagePaths: "imagePaths",
    sections: "sections",
    featured: "featured",
    published: "published",
    publishedAt: "publishedAt",
  },
  storeDishes: {
    storeId: "storeId",
    dishId: "dishId",
    quantity: "quantity",
    available: "available",
    priceOverride: "priceOverride",
  },
};

const sectionStatusToggleConfig = {
  users: {
    field: "enabled",
    activeLabel: "activated",
    inactiveLabel: "deactivated",
    buttonActiveLabel: "Deactivate user",
    buttonInactiveLabel: "Activate user",
    confirmActiveLabel: "deactivate this user",
    confirmInactiveLabel: "activate this user",
  },
  stores: {
    field: "active",
    activeLabel: "activated",
    inactiveLabel: "deactivated",
    buttonActiveLabel: "Deactivate",
    buttonInactiveLabel: "Activate",
    confirmActiveLabel: "deactivate this store",
    confirmInactiveLabel: "activate this store",
  },
  events: {
    field: "active",
    activeLabel: "activated",
    inactiveLabel: "deactivated",
    buttonActiveLabel: "Deactivate",
    buttonInactiveLabel: "Activate",
    confirmActiveLabel: "deactivate this event",
    confirmInactiveLabel: "activate this event",
  },
  categories: {
    field: "active",
    activeLabel: "activated",
    inactiveLabel: "deactivated",
    buttonActiveLabel: "Deactivate",
    buttonInactiveLabel: "Activate",
    confirmActiveLabel: "deactivate this category",
    confirmInactiveLabel: "activate this category",
  },
  dishes: {
    field: "active",
    activeLabel: "activated",
    inactiveLabel: "deactivated",
    buttonActiveLabel: "Deactivate",
    buttonInactiveLabel: "Activate",
    confirmActiveLabel: "deactivate this menu item",
    confirmInactiveLabel: "activate this menu item",
  },
  news: {
    field: "published",
    activeLabel: "published",
    inactiveLabel: "unpublished",
    buttonActiveLabel: "Deactivate",
    buttonInactiveLabel: "Activate",
    confirmActiveLabel: "deactivate this news item",
    confirmInactiveLabel: "activate this news item",
  },
};

const recentAdminRefreshTimestamps = new Map();
const recentAdminDetailLoadTimestamps = new Map();

function shouldSkipRapidAdminRefresh(refreshKey, windowMs = 1200) {
  const normalizedKey = String(refreshKey ?? "").trim();

  if (!normalizedKey) {
    return false;
  }

  const now = Date.now();
  const previousTimestamp = recentAdminRefreshTimestamps.get(normalizedKey) ?? 0;
  recentAdminRefreshTimestamps.set(normalizedKey, now);

  return now - previousTimestamp < windowMs;
}

function shouldSkipRapidAdminDetailLoad(detailKey, windowMs = 800) {
  const normalizedKey = String(detailKey ?? "").trim();

  if (!normalizedKey) {
    return false;
  }

  const now = Date.now();
  const previousTimestamp = recentAdminDetailLoadTimestamps.get(normalizedKey) ?? 0;
  recentAdminDetailLoadTimestamps.set(normalizedKey, now);

  return now - previousTimestamp < windowMs;
}

function createEmptyAdminAiState() {
  return {
    prompt: "",
    loading: false,
    warnings: [],
    missingFieldNames: [],
    scopeStoreId: "",
    scopeStoreName: "",
    model: "",
  };
}

function hasOwnField(target, key) {
  return Boolean(target) && Object.prototype.hasOwnProperty.call(target, key);
}

function normalizeTextList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item, index, array) => item && array.indexOf(item) === index);
  }

  const normalized = String(value ?? "").trim();
  return normalized ? [normalized] : [];
}

function mapAdminAiField(sectionKey, rawFieldName) {
  const normalizedField = String(rawFieldName ?? "").trim();

  if (!normalizedField) {
    return "";
  }

  if (normalizedField.startsWith("sections")) {
    return "sections";
  }

  if (normalizedField.startsWith("imagePath")) {
    return "imagePaths";
  }

  const fieldMap = adminAiFieldMap[sectionKey] ?? {};
  return fieldMap[normalizedField] ?? normalizedField;
}

function normalizeAdminAiMissingFields(sectionKey, missingFields) {
  return normalizeTextList(missingFields)
    .map((fieldName) => mapAdminAiField(sectionKey, fieldName))
    .filter((fieldName, index, array) => fieldName && array.indexOf(fieldName) === index);
}

function mergeAdminAiDraft(sectionKey, currentDraft, draftPayload) {
  if (!draftPayload || typeof draftPayload !== "object" || Array.isArray(draftPayload)) {
    return currentDraft;
  }

  const hydratedDraft = hydrateSectionDraft(sectionKey, draftPayload);
  const fieldMap = adminAiFieldMap[sectionKey] ?? {};
  const patchKeys = new Set();

  Object.keys(draftPayload).forEach((rawKey) => {
    const mappedKey = fieldMap[rawKey] ?? mapAdminAiField(sectionKey, rawKey);

    if (mappedKey) {
      patchKeys.add(mappedKey);
    }
  });

  if (!patchKeys.size) {
    return currentDraft;
  }

  const nextDraft = {
    ...currentDraft,
  };

  patchKeys.forEach((fieldKey) => {
    if (hasOwnField(hydratedDraft, fieldKey)) {
      nextDraft[fieldKey] = hydratedDraft[fieldKey];
    }
  });

  return nextDraft;
}

function pruneAdminAiPayload(value) {
  if (Array.isArray(value)) {
    const nextItems = value
      .map((item) => pruneAdminAiPayload(item))
      .filter((item) => item !== undefined);

    return nextItems.length ? nextItems : undefined;
  }

  if (value && typeof value === "object") {
    const nextObject = Object.entries(value).reduce((result, [key, item]) => {
      const nextValue = pruneAdminAiPayload(item);

      if (nextValue !== undefined) {
        result[key] = nextValue;
      }

      return result;
    }, {});

    return Object.keys(nextObject).length ? nextObject : undefined;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" && !value.trim()) {
    return undefined;
  }

  return value;
}

function buildOrderStatusFallbackPayload(order, actionKey) {
  const normalizedAction = String(actionKey ?? "").trim().toUpperCase();

  switch (normalizedAction) {
    case "CONFIRM_ORDER":
      return {
        status: "CONFIRMED",
        paymentStatus: order?.paymentStatus ?? undefined,
      };
    case "CANCEL_ORDER":
      return {
        status: "CANCELLED",
        paymentStatus:
          String(order?.paymentStatus ?? "").trim().toUpperCase() === "PAID"
            ? order?.paymentStatus
            : "CANCELLED",
      };
    case "MARK_PAID":
      return {
        status: order?.status ?? undefined,
        paymentStatus: "PAID",
      };
    default:
      return null;
  }
}

function emptyCollections() {
  return {
    users: [],
    stores: [],
    events: [],
    categories: [],
    dishes: [],
    storeDishes: [],
    news: [],
    promotions: [],
    userLevels: [],
    orders: [],
    reviews: [],
    feedbacks: [],
  };
}

function createEmptyListQuery() {
  return {
    page: 0,
    size: 10,
    search: "",
    status: "",
    paymentStatus: "",
    stage: "",
  };
}

function emptyListQueries() {
  return adminSectionKeys.reduce((result, sectionKey) => {
    result[sectionKey] = createEmptyListQuery();
    return result;
  }, {});
}

function createEmptyListCollection() {
  return {
    items: [],
    page: 0,
    size: 10,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  };
}

function emptyListCollections() {
  return adminSectionKeys.reduce((result, sectionKey) => {
    result[sectionKey] = createEmptyListCollection();
    return result;
  }, {});
}

function normalizeListResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizePaginatedListResponse(payload, fallbackQuery) {
  const items = normalizeListResponse(payload);
  const page = Number(payload?.page ?? fallbackQuery?.page ?? 0);
  const size = Number(payload?.size ?? fallbackQuery?.size ?? items.length ?? 10);
  const totalItems = Number(payload?.totalItems ?? items.length);
  const totalPages =
    Number(payload?.totalPages ?? 0) ||
    (size > 0 ? Math.ceil(totalItems / size) : totalItems > 0 ? 1 : 0);

  return {
    items,
    page: Number.isFinite(page) ? page : 0,
    size: Number.isFinite(size) && size > 0 ? size : 10,
    totalItems: Number.isFinite(totalItems) ? totalItems : items.length,
    totalPages: Number.isFinite(totalPages) ? totalPages : 0,
    hasNext:
      typeof payload?.hasNext === "boolean"
        ? payload.hasNext
        : (Number.isFinite(page) ? page : 0) + 1 < (Number.isFinite(totalPages) ? totalPages : 0),
    hasPrevious:
      typeof payload?.hasPrevious === "boolean"
        ? payload.hasPrevious
        : (Number.isFinite(page) ? page : 0) > 0,
  };
}

function normalizeDashboardResponse(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const countEntries = (value) => {
    if (Array.isArray(value)) {
      return value.length;
    }

    if (Array.isArray(value?.content)) {
      return value.content.length;
    }

    if (Array.isArray(value?.items)) {
      return value.items.length;
    }

    if (Array.isArray(value?.data)) {
      return value.data.length;
    }

    const normalizedNumber = Number(value ?? 0);
    return Number.isFinite(normalizedNumber) ? normalizedNumber : 0;
  };

  const normalizeRevenue = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const toAmount = (input) => {
      const normalizedNumber = Number(input ?? 0);
      return Number.isFinite(normalizedNumber) ? normalizedNumber : 0;
    };

    return {
      scopeStoreId: toIdString(value.scopeStoreId),
      scopeStoreName: String(value.scopeStoreName ?? "").trim(),
      todayRevenue: toAmount(value.todayRevenue),
      weekRevenue: toAmount(value.weekRevenue),
      monthRevenue: toAmount(value.monthRevenue),
      yearRevenue: toAmount(value.yearRevenue),
    };
  };

  const normalizeTopSellingDish = (value) => ({
    storeId: toIdString(value?.storeId),
    storeName: String(value?.storeName ?? "").trim(),
    dishId: toIdString(value?.dishId),
    dishName: String(value?.dishName ?? "").trim(),
    imagePaths: normalizeImagePathList(value?.imagePaths),
    quantitySold: countEntries(value?.quantitySold),
    orderCount: countEntries(value?.orderCount),
    revenue: countEntries(value?.revenue),
  });

  return {
    users: countEntries(payload.users),
    stores: countEntries(payload.stores),
    events: countEntries(payload.events),
    categories: countEntries(payload.categories),
    dishes: countEntries(payload.dishes),
    storeDishes: countEntries(payload.storeDishes),
    news: countEntries(payload.news),
    promotions: countEntries(payload.promotions),
    userLevels: countEntries(payload.userLevels),
    orders: countEntries(payload.orders),
    reviews: countEntries(payload.reviews),
    feedbacks: countEntries(payload.feedbacks),
    revenue: normalizeRevenue(payload.revenue ?? payload.revenueSummary),
    topSellingDishes: normalizeListResponse(payload.topSellingDishes).map(normalizeTopSellingDish),
  };
}

function normalizeSummaryResponse(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const toCount = (value) => {
    const normalizedNumber = Number(value ?? 0);
    return Number.isFinite(normalizedNumber) ? normalizedNumber : 0;
  };

  const normalizeRevenue = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return {
      scopeStoreId: toIdString(value.scopeStoreId),
      scopeStoreName: String(value.scopeStoreName ?? "").trim(),
      todayRevenue: toCount(value.todayRevenue),
      weekRevenue: toCount(value.weekRevenue),
      monthRevenue: toCount(value.monthRevenue),
      yearRevenue: toCount(value.yearRevenue),
    };
  };

  return {
    users: toCount(payload.userCount),
    stores: toCount(payload.storeCount),
    events: toCount(payload.eventCount),
    categories: toCount(payload.categoryCount),
    dishes: toCount(payload.dishCount),
    storeDishes:
      payload.storeDishCount === undefined ? undefined : toCount(payload.storeDishCount),
    news: payload.newsCount === undefined ? undefined : toCount(payload.newsCount),
    promotions:
      payload.promotionCount === undefined ? undefined : toCount(payload.promotionCount),
    userLevels:
      payload.userLevelDefinitionCount === undefined && payload.userLevelCount === undefined
        ? undefined
        : toCount(payload.userLevelDefinitionCount ?? payload.userLevelCount),
    orders: payload.orderCount === undefined ? undefined : toCount(payload.orderCount),
    reviews: toCount(payload.reviewCount),
    feedbacks:
      payload.feedbackCount === undefined && payload.feedbacksCount === undefined
        ? undefined
        : toCount(payload.feedbackCount ?? payload.feedbacksCount),
    revenue: normalizeRevenue(payload.revenue ?? payload.revenueSummary),
  };
}

function normalizeDetailResponse(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      return payload.data;
    }

    return payload;
  }

  return null;
}

function formatDateTime(value) {
  return formatDateTimeVn(value, "Not available");
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === "") {
    return "No price";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  return formatCurrencyVnd(amount, String(value));
}

function formatCompactMetric(value) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: amount >= 100 ? 0 : 1,
  }).format(amount);
}

function formatDurationMinutes(value) {
  const totalMinutes = Math.round(Number(value ?? 0));

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "No data";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatShortDayLabel(value) {
  return formatDateOnlyVn(value, "").replace(/\/(\d{4})$/, "");
}

function resolveSectionToggleValue(sectionKey, item) {
  const statusField = sectionStatusToggleConfig[sectionKey]?.field;

  if (!statusField) {
    return null;
  }

  return Boolean(item?.[statusField]);
}

function resolveDishStoreId(dish, categoriesById) {
  if (dish?.storeId !== undefined && dish?.storeId !== null) {
    return toIdString(dish.storeId);
  }

  return toIdString(categoriesById.get(toIdString(dish?.categoryId))?.storeId);
}

function isSupportedReviewTargetType(targetType) {
  return ["STORE", "EVENT", "DISH"].includes(String(targetType ?? "").trim().toUpperCase());
}

function resolveReviewStoreId(review, { eventsById, dishesById }) {
  switch (review?.targetType) {
    case "STORE":
      return toIdString(review.targetId);
    case "EVENT":
      return toIdString(eventsById.get(toIdString(review.targetId))?.storeId);
    case "DISH":
      return toIdString(dishesById.get(toIdString(review.targetId))?.storeId);
    default:
      return "";
  }
}

function resolveFeedbackStoreId(feedback) {
  return toIdString(feedback?.relatedStoreId);
}

function resolveUserStoreId(user) {
  return toIdString(user?.workingStoreId);
}

function feedbackReplyFieldsPresent(feedback) {
  if (!feedback || typeof feedback !== "object") {
    return false;
  }

  return [
    "replyMessage",
    "repliedAt",
    "repliedByUserId",
    "repliedByUserName",
    "repliedByUserRole",
  ].some((fieldName) => fieldName in feedback);
}

function hasFeedbackReply(feedback) {
  return Boolean(String(feedback?.replyMessage ?? "").trim());
}

function formatFeedbackReplier(feedback) {
  return [feedback?.repliedByUserName, feedback?.repliedByUserRole].filter(Boolean).join(" | ");
}

function resolveOrderStoreIds(order) {
  if (order?.storeId !== undefined && order?.storeId !== null && order?.storeId !== "") {
    return [toIdString(order.storeId)];
  }

  if (Array.isArray(order?.items)) {
    return order.items
      .map((item) => toIdString(item?.storeId))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  return [];
}

function filterCollectionsByStore(collections, selectedStoreId) {
  if (!selectedStoreId || selectedStoreId === "all") {
    return collections;
  }

  const scopeId = toIdString(selectedStoreId);
  const categoriesById = new Map(
    normalizeListResponse(collections.categories).map((category) => [
      toIdString(category.id),
      category,
    ]),
  );
  const eventsById = new Map(
    normalizeListResponse(collections.events).map((event) => [toIdString(event.id), event]),
  );
  const dishesWithStore = normalizeListResponse(collections.dishes).map((dish) => ({
    ...dish,
    storeId: resolveDishStoreId(dish, categoriesById),
  }));
  const dishesById = new Map(dishesWithStore.map((dish) => [toIdString(dish.id), dish]));

  return {
    users: normalizeListResponse(collections.users).filter(
      (user) => resolveUserStoreId(user) === scopeId,
    ),
    stores: normalizeListResponse(collections.stores).filter(
      (store) => toIdString(store.id) === scopeId,
    ),
    events: normalizeListResponse(collections.events).filter(
      (event) => toIdString(event.storeId) === scopeId,
    ),
    categories: normalizeListResponse(collections.categories).filter(
      (category) => toIdString(category.storeId) === scopeId,
    ),
    dishes: dishesWithStore.filter((dish) => toIdString(dish.storeId) === scopeId),
    storeDishes: normalizeListResponse(collections.storeDishes).filter(
      (storeDish) => toIdString(storeDish.storeId) === scopeId,
    ),
    news: normalizeListResponse(collections.news).filter(
      (newsItem) => toIdString(newsItem.relatedStoreId) === scopeId,
    ),
    promotions: normalizeListResponse(collections.promotions),
    userLevels: normalizeListResponse(collections.userLevels),
    orders: normalizeListResponse(collections.orders).filter((order) =>
      resolveOrderStoreIds(order).includes(scopeId),
    ),
    reviews: normalizeListResponse(collections.reviews).filter(
      (review) =>
        resolveReviewStoreId(review, {
          eventsById,
          dishesById,
        }) === scopeId,
    ),
    feedbacks: normalizeListResponse(collections.feedbacks).filter(
      (feedback) => resolveFeedbackStoreId(feedback) === scopeId,
    ),
  };
}

function draftCollectionsFor(sectionKey, allCollections, scopedCollections) {
  return ["users", "stores", "promotions"].includes(sectionKey)
    ? allCollections
    : scopedCollections;
}

function statCard(label, value) {
  return { label, value };
}

function buildListPath(path, query = {}) {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 10));

  if (query.search?.trim()) {
    params.set("search", query.search.trim());
  }

  ["status", "paymentStatus", "stage", "storeId"].forEach((key) => {
    if (query[key]?.trim()) {
      params.set(key, query[key].trim());
    }
  });

  return `${path}?${params.toString()}`;
}

function buildSectionListPath(sectionKey, query = {}, selectedStoreId = "all") {
  return buildListPath(adminListPaths[sectionKey], {
    ...query,
    storeId: sectionKey === "orders" && selectedStoreId !== "all" ? selectedStoreId : "",
  });
}

function getWorkspaceSectionFetchKeys(sectionKey = "") {
  switch (sectionKey) {
    case "users":
      return { reference: ["users", "stores"], list: ["users"] };
    case "stores":
      return { reference: ["stores"], list: ["stores"] };
    case "events":
      return { reference: ["events", "stores", "dishes"], list: ["events"] };
    case "categories":
      return { reference: ["categories", "stores"], list: ["categories"] };
    case "dishes":
      return { reference: ["dishes", "categories", "stores"], list: ["dishes"] };
    case "storeDishes":
      return { reference: ["storeDishes", "stores", "dishes"], list: ["storeDishes"] };
    case "news":
      return { reference: ["news", "stores"], list: ["news"] };
    case "promotions":
      return { reference: ["promotions", "stores", "dishes"], list: ["promotions"] };
    case "userLevels":
      return { reference: ["userLevels", "stores"], list: ["userLevels"] };
    case "orders":
      return { reference: ["orders", "users", "stores"], list: ["orders"] };
    case "reviews":
      return { reference: ["reviews", "users", "stores", "dishes", "events"], list: ["reviews"] };
    case "feedbacks":
      return { reference: ["feedbacks", "stores"], list: ["feedbacks"] };
    default:
      return { reference: adminSectionKeys, list: adminSectionKeys };
  }
}

function buildAnalyticsPath(path, selectedStoreId = "all", allowStoreScope = false) {
  if (!allowStoreScope || !selectedStoreId || selectedStoreId === "all") {
    return path;
  }

  const params = new URLSearchParams();
  params.set("storeId", String(selectedStoreId));

  return `${path}?${params.toString()}`;
}

function resolveOrdersStoreScope({ isManagerMode = false, managerStoreId = "", search = "" } = {}) {
  if (isManagerMode && managerStoreId) {
    return managerStoreId;
  }

  const searchParams = new URLSearchParams(search);
  const requestedStoreId = toIdString(searchParams.get("storeId"));
  return requestedStoreId || "all";
}

const sectionPageMeta = {
  stores: {
    eyebrow: "Store Management",
   title: "Store network workspace",
   description: "Browse, update, activate, and manage operating data for each branch.",
  },
  users: {
    eyebrow: "User Management",
   title: "System accounts",
    description: "Manage account scope, role assignment, and working store ownership.",
  },
  events: {
    eyebrow: "Promotions Management",
   title: "Store promotions",
    description: "Create Promotion for store.",
  },
  categories: {
    eyebrow: "Category Management",
   title: "Browse and edit categories",
   description: "Keep menu structure clean by store scope and storefront grouping.",
  },
  dishes: {
    eyebrow: "Menu Management",
   title: "Browse and edit items",
   description: "Manage core dish metadata, pricing, and menu positioning.",
  },
  storeDishes: {
    eyebrow: "Store Management",
   title: "Store-specific availability",
   description: "Adjust stock and local overrides for dishes inside each branch scope.",
  },
  news: {
    eyebrow: "News Management",
   title: "News management",
   description: "Draft store news, attach imagery, and publish editorial updates.",
  },
  promotions: {
    eyebrow: "Promotion Management",
   title: "Promotion management",
   description: "Create conversion campaigns, discount codes, and schedule windows.",
  },
  userLevels: {
    eyebrow: "User Levels",
   title: "Membership levels",
   description: "Maintain loyalty-tier definitions used across customer journeys.",
  },
  orders: {
    eyebrow: "Order Operations",
   title: "Order workflow",
   description: "Inspect live order records, QR lookups, invoice state, and fulfillment steps.",
  },
  reviews: {
    eyebrow: "Review Management",
   title: "Review moderation",
   description: "Inspect, moderate, and remove reviews inside the current access scope.",
  },
  feedbacks: {
    eyebrow: "Feedback Management",
   title: "Customer feedback",
   description: "Reply to support tickets and manage store feedback threads.",
  },
};

export default function AdminPage({ forcedSection = "" }) {
  const { t } = useTranslation("admin");
  const auth = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId: routeOrderId = "" } = useParams();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const managerStoreId = isManagerMode ? toIdString(auth.user?.workingStoreId) : "";
  const allowedUserRoles = isManagerMode
    ? ["STAFF", "SHIPPER"]
    : ["ADMIN", "MANAGER", "SHIPPER", "STAFF", "USER"];
  const canModerateReviews = auth.hasRole("ADMIN", "MANAGER");
  const accessibleSectionKeys = isManagerMode ? managerSectionKeys : adminSectionKeys;
  const [activeSection, setActiveSection] = useState(forcedSection || "stores");
  const [selectedStoreId, setSelectedStoreId] = useState(() =>
    resolveOrdersStoreScope({
      isManagerMode,
      managerStoreId,
      search: location.search,
    }),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (forcedSection && forcedSection !== activeSection) {
      setActiveSection(forcedSection);
    }
  }, [forcedSection, activeSection]);

  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [collections, setCollections] = useState(emptyListCollections);
  const [referenceCollections, setReferenceCollections] = useState(emptyCollections);
  const [listQueries, setListQueries] = useState(emptyListQueries);
  const [searchDrafts, setSearchDrafts] = useState(emptyListQueries);
  const [reviewDetail, setReviewDetail] = useState(null);
  const [orderDetailRecord, setOrderDetailRecord] = useState(null);
  const [orderScanHistory, setOrderScanHistory] = useState([]);
  const [orderScanLoading, setOrderScanLoading] = useState(false);
  const [orderScanError, setOrderScanError] = useState("");
  const [orderActionLoading, setOrderActionLoading] = useState("");
  const [managerAssignedShipperId, setManagerAssignedShipperId] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [infoModalKey, setInfoModalKey] = useState("");
  const [feedbackReplyDraft, setFeedbackReplyDraft] = useState("");
  const [aiAssistState, setAiAssistState] = useState(createEmptyAdminAiState);
  const [drafts, setDrafts] = useState({
    users: createEmptyDraft("users", emptyCollections()),
    stores: createEmptyDraft("stores", emptyCollections()),
    events: createEmptyDraft("events", emptyCollections()),
    categories: createEmptyDraft("categories", emptyCollections()),
    dishes: createEmptyDraft("dishes", emptyCollections()),
    storeDishes: createEmptyDraft("storeDishes", emptyCollections()),
    news: createEmptyDraft("news", emptyCollections()),
    promotions: createEmptyDraft("promotions", emptyCollections()),
    userLevels: createEmptyDraft("userLevels", emptyCollections()),
    orders: createEmptyDraft("orders", emptyCollections()),
    reviews: createEmptyDraft("reviews", emptyCollections()),
    feedbacks: createEmptyDraft("feedbacks", emptyCollections()),
  });
  const [editingIds, setEditingIds] = useState({
    users: null,
    stores: null,
    events: null,
    categories: null,
    dishes: null,
    storeDishes: null,
    news: null,
    promotions: null,
    userLevels: null,
    orders: null,
    reviews: null,
    feedbacks: null,
  });
  const [editingRecords, setEditingRecords] = useState({
    users: null,
    stores: null,
    events: null,
    categories: null,
    dishes: null,
    storeDishes: null,
    news: null,
    promotions: null,
    userLevels: null,
    orders: null,
    reviews: null,
    feedbacks: null,
  });
  const [editingDetailLoading, setEditingDetailLoading] = useState({
    users: false,
    stores: false,
    events: false,
    categories: false,
    dishes: false,
    storeDishes: false,
    news: false,
    promotions: false,
    userLevels: false,
    orders: false,
    reviews: false,
    feedbacks: false,
  });
  const [uploadState, setUploadState] = useState({
    sectionKey: "",
    fieldName: "",
    sectionIndex: null,
    loading: false,
    message: "",
    error: "",
  });
  const attemptedRouteRecordRef = useRef("");
  const [passwordModal, setPasswordModal] = useState({
    open: false,
    userId: "",
    fullName: "",
    email: "",
    role: "",
    workingStoreName: "",
    password: "",
    confirmPassword: "",
    loading: false,
    error: "",
  });

  useToastMessage(error, {
    type: "error",
    title: "Unable to process",
  });
  useToastMessage(notice, {
    type: "success",
    title: "Updated",
  });
  useToastMessage(orderScanError, {
    type: "error",
    title: "QR scan history",
  });

  const isWorkspaceOnly = Boolean(forcedSection);
  const isOrdersWorkspaceOnly = forcedSection === "orders";
  const routeSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeSectionKey = String(forcedSection || routeSearchParams.get("section") || "").trim();
  const routeRecordId = toIdString(routeSearchParams.get("record"));
  const routeStoreScopeId = toIdString(routeSearchParams.get("storeId"));
  const shouldSyncRecordInUrl = !forcedSection;
  useEffect(() => {
    if (!forcedSection || !routeRecordId) {
      return;
    }

    navigate(buildAdminWorkspacePath({ sectionKey: forcedSection }), { replace: true });
  }, [forcedSection, navigate, routeRecordId]);
  const hasSectionEditTarget = useCallback(
    (sectionKey) =>
      Boolean(
        toIdString(editingIds[sectionKey]) ||
          (sectionKey === routeSectionKey && routeRecordId),
      ),
    [editingIds, routeRecordId, routeSectionKey],
  );
  const hasLoadedSectionRecord = useCallback(
    (sectionKey, recordId = "") => {
      const normalizedRecordId = toIdString(recordId);

      if (!normalizedRecordId) {
        return false;
      }

      const currentEditingId = toIdString(editingIds[sectionKey]);
      const currentRecord = editingRecords[sectionKey];

      if (!currentRecord) {
        return false;
      }

      const loadedRecordId = toIdString(
        currentRecord.__adminRecordId ?? currentRecord.id ?? currentEditingId,
      );

      return (
        currentEditingId === normalizedRecordId &&
        loadedRecordId === normalizedRecordId
      );
    },
    [editingIds, editingRecords],
  );

  const safeCollections = useMemo(
    () => ({
      users: normalizeListResponse(referenceCollections.users),
      stores: normalizeListResponse(referenceCollections.stores),
      events: normalizeListResponse(referenceCollections.events),
      categories: normalizeListResponse(referenceCollections.categories),
      dishes: normalizeListResponse(referenceCollections.dishes),
      storeDishes: normalizeListResponse(referenceCollections.storeDishes),
      news: normalizeListResponse(referenceCollections.news),
      promotions: normalizeListResponse(referenceCollections.promotions),
      userLevels: normalizeListResponse(referenceCollections.userLevels),
      orders: normalizeListResponse(referenceCollections.orders),
      reviews: normalizeListResponse(referenceCollections.reviews).filter((review) =>
        isSupportedReviewTargetType(review?.targetType),
      ),
      feedbacks: normalizeListResponse(referenceCollections.feedbacks),
    }),
    [referenceCollections],
  );

  const displayCollections = useMemo(
    () => ({
      users: normalizeListResponse(collections.users),
      stores: normalizeListResponse(collections.stores),
      events: normalizeListResponse(collections.events),
      categories: normalizeListResponse(collections.categories),
      dishes: normalizeListResponse(collections.dishes),
      storeDishes: normalizeListResponse(collections.storeDishes),
      news: normalizeListResponse(collections.news),
      promotions: normalizeListResponse(collections.promotions),
      userLevels: normalizeListResponse(collections.userLevels),
      orders: normalizeListResponse(collections.orders),
      reviews: normalizeListResponse(collections.reviews).filter((review) =>
        isSupportedReviewTargetType(review?.targetType),
      ),
      feedbacks: normalizeListResponse(collections.feedbacks),
    }),
    [collections],
  );

  const scopedCollections = useMemo(
    () =>
      isOrdersWorkspaceOnly
        ? safeCollections
        : filterCollectionsByStore(safeCollections, selectedStoreId),
    [isOrdersWorkspaceOnly, safeCollections, selectedStoreId],
  );
  const scopedDisplayCollections = useMemo(
    () =>
      isOrdersWorkspaceOnly
        ? displayCollections
        : filterCollectionsByStore(displayCollections, selectedStoreId),
    [displayCollections, isOrdersWorkspaceOnly, selectedStoreId],
  );
  const visibleTabs = useMemo(
    () =>
      isManagerMode
        ? sectionTabs.filter((tab) => accessibleSectionKeys.includes(tab.key))
        : sectionTabs,
    [accessibleSectionKeys, isManagerMode],
  );
  useEffect(() => {
    if (!forcedSection && activeSection !== "stores") {
      setActiveSection("stores");
    }
  }, [activeSection, forcedSection]);

  const selectedStore = useMemo(
    () => {
      if (selectedStoreId === "all") {
        return null;
      }

      const matchedStore =
        safeCollections.stores.find((store) => toIdString(store.id) === toIdString(selectedStoreId)) ??
        null;

      if (matchedStore) {
        return matchedStore;
      }

      if (
        isOrdersWorkspaceOnly &&
        isManagerMode &&
        managerStoreId &&
        toIdString(managerStoreId) === toIdString(selectedStoreId)
      ) {
        return {
          id: managerStoreId,
          name: auth.user?.workingStoreName ?? "Assigned store",
          address: auth.user?.workingStoreAddress ?? "",
        };
      }

      return null;
    },
    [
      auth.user?.workingStoreAddress,
      auth.user?.workingStoreName,
      isManagerMode,
      isOrdersWorkspaceOnly,
      managerStoreId,
      safeCollections.stores,
      selectedStoreId,
    ],
  );

  const createDraftForSection = useCallback(
    (sectionKey, allCollectionsArg, scopedCollectionsArg) => {
      const draft = createEmptyDraft(
        sectionKey,
        draftCollectionsFor(sectionKey, allCollectionsArg, scopedCollectionsArg),
      );

      if (!isManagerMode) {
        return draft;
      }

      switch (sectionKey) {
        case "users":
          return {
            ...draft,
            role: allowedUserRoles.includes(draft.role) ? draft.role : "STAFF",
            workingStoreId: managerStoreId || draft.workingStoreId,
          };
        case "events":
        case "categories":
        case "storeDishes":
          return {
            ...draft,
            storeId: managerStoreId || draft.storeId,
          };
        case "news":
          return {
            ...draft,
            relatedStoreId: managerStoreId || draft.relatedStoreId,
          };
        default:
          return draft;
      }
    },
    [allowedUserRoles, isManagerMode, managerStoreId],
  );

  const scopeOptions = useMemo(
    () =>
      isManagerMode
        ? safeCollections.stores
            .filter((store) => toIdString(store.id) === managerStoreId)
            .map((store) => ({
              value: toIdString(store.id),
              label: store.name,
            }))
        : [
            { value: "all", label: "All stores" },
            ...safeCollections.stores.map((store) => ({
              value: toIdString(store.id),
              label: store.name,
            })),
          ],
    [isManagerMode, managerStoreId, safeCollections.stores],
  );

  const storeOptions = useMemo(
    () =>
      scopedCollections.stores.map((store) => ({
        value: toIdString(store.id),
        label: store.name,
      })),
    [scopedCollections.stores],
  );
  const workingStoreOptions = useMemo(
    () =>
      safeCollections.stores.map((store) => ({
        value: toIdString(store.id),
        label: `${store.name}${store.address ? ` | ${store.address}` : ""}`,
      })),
    [safeCollections.stores],
  );
  const categoryOptions = useMemo(
    () =>
      scopedCollections.categories.map((category) => ({
        value: toIdString(category.id),
        label: `${category.name}${category.storeName ? ` | ${category.storeName}` : ""}`,
      })),
    [scopedCollections.categories],
  );
  const dishOptions = useMemo(
    () =>
      safeCollections.dishes.map((dish) => ({
        value: toIdString(dish.id),
        label: `${dish.name}${dish.categoryName ? ` | ${dish.categoryName}` : ""}`,
      })),
    [safeCollections.dishes],
  );
  const userOptions = useMemo(
    () =>
      safeCollections.users.map((user) => ({
        value: toIdString(user.id),
        label: `${user.fullName} | ${user.role}`,
      })),
    [safeCollections.users],
  );
  const reviewUserOptions = useMemo(
    () =>
      safeCollections.users
        .filter((user) => user.role === "USER")
        .map((user) => ({
          value: toIdString(user.id),
          label: `${user.fullName} | ${user.email}`,
        })),
    [safeCollections.users],
  );
  const reviewTargetOptions = useMemo(
    () => ({
      STORE: scopedCollections.stores.map((entry) => ({
        value: toIdString(entry.id),
        label: entry.name,
      })),
      EVENT: scopedCollections.events.map((entry) => ({
        value: toIdString(entry.id),
        label: entry.name,
      })),
      DISH: scopedCollections.dishes.map((entry) => ({
        value: toIdString(entry.id),
        label: entry.name,
      })),
    }),
    [
      scopedCollections.categories,
      scopedCollections.dishes,
      scopedCollections.events,
      scopedCollections.stores,
    ],
  );

  const sectionConfigs = useMemo(
    () =>
      isOrdersWorkspaceOnly
        ? {
            orders: {
             // title: "Order management",
              detailPath: (id) => `/api/admin/orders/${id}`,
              updatePath: (id) => `/api/admin/orders/${id}/status`,
              fields: [],
            },
          }
        : buildSectionConfigs({
            storeOptions,
            categoryOptions,
            dishOptions,
            reviewUserOptions,
            workingStoreOptions,
            reviewTargetOptions,
            activeUserRole: drafts.users.role,
            activeReviewTargetType: drafts.reviews.targetType ?? "STORE",
            isEditingUser: Boolean(editingIds.users),
            availableUserRoles: allowedUserRoles,
            lockWorkingStoreId: isManagerMode ? managerStoreId : "",
          }),
    [
      allowedUserRoles,
      categoryOptions,
      dishOptions,
      drafts.reviews.targetType,
      drafts.users.role,
      editingIds.users,
      isManagerMode,
      isOrdersWorkspaceOnly,
      managerStoreId,
      reviewTargetOptions,
      reviewUserOptions,
      storeOptions,
      workingStoreOptions,
    ],
  );

  const activeConfig = sectionConfigs[activeSection];
  const activeDraft = drafts[activeSection];
  const activeEditingId = editingIds[activeSection];
  const isActiveEditLoading = Boolean(editingDetailLoading[activeSection]);
  const resolvedEditingId =
    toIdString(activeEditingId) ||
    (!forcedSection && activeSection === routeSectionKey && routeRecordId ? routeRecordId : "");
  const hasActiveEditingId = Boolean(resolvedEditingId);
  const activeAiFormType = adminAiFormTypes[activeSection] ?? "";
  const isAiAssistSupported = Boolean(activeAiFormType);
  const isAdminRoleOnlyUserEdit =
    isAdmin && activeSection === "users" && hasActiveEditingId;
  const visibleFormFields =
    activeConfig?.fields?.filter((field) => {
      if (activeSection === "users" && hasActiveEditingId && field.name === "password") {
        return false;
      }

      if (isAdminRoleOnlyUserEdit) {
        return ["role", "workingStoreId"].includes(field.name);
      }

      return true;
    }) ?? [];
  const fieldLabelMap = useMemo(
    () =>
      Object.fromEntries(
        (activeConfig?.fields ?? []).map((field) => [field.name, field.label]),
      ),
    [activeConfig?.fields],
  );
  const missingFieldSet = useMemo(
    () => new Set(aiAssistState.missingFieldNames),
    [aiAssistState.missingFieldNames],
  );
  const missingFieldLabels = useMemo(
    () =>
      aiAssistState.missingFieldNames.map(
        (fieldName) =>
          fieldLabelMap[fieldName] ??
          String(fieldName)
            .replace(/([A-Z])/g, " $1")
            .replace(/\s+/g, " ")
            .trim(),
      ),
    [aiAssistState.missingFieldNames, fieldLabelMap],
  );
  const activeUserRecord =
    activeSection === "users" && hasActiveEditingId
      ? displayCollections.users.find((item) => String(item.id) === String(resolvedEditingId)) ??
        safeCollections.users.find((item) => String(item.id) === String(resolvedEditingId)) ??
        null
      : null;
  const activeAssignedStoreLabel = useMemo(() => {
    if (!activeDraft?.workingStoreId) {
      return "Not assigned";
    }

    return (
      workingStoreOptions.find(
        (option) => String(option.value) === String(activeDraft.workingStoreId),
      )?.label ||
      activeUserRecord?.workingStoreName ||
      `Store #${activeDraft.workingStoreId}`
    );
  }, [activeDraft?.workingStoreId, activeUserRecord?.workingStoreName, workingStoreOptions]);
  const adminRoleEditPreview = useMemo(
    () =>
      isAdminRoleOnlyUserEdit
        ? {
            fullName: String(activeDraft?.fullName || activeUserRecord?.fullName || "").trim(),
            email: String(activeDraft?.email || activeUserRecord?.email || "").trim(),
            currentRole: String(activeUserRecord?.role || activeDraft?.role || "").trim(),
            assignedStore: activeAssignedStoreLabel,
          }
        : null,
    [
      activeAssignedStoreLabel,
      activeDraft?.email,
      activeDraft?.fullName,
      activeDraft?.role,
      activeUserRecord?.email,
      activeUserRecord?.fullName,
      activeUserRecord?.role,
      isAdminRoleOnlyUserEdit,
    ],
  );
  const activeCollectionMeta = collections[activeSection] ?? createEmptyListCollection();
  const activeListQuery = listQueries[activeSection];
  const activeSearchDraft = searchDrafts[activeSection]?.search ?? "";
  const activeItems =
    isOrdersWorkspaceOnly
      ? displayCollections.orders ?? []
      : isAdmin && (activeSection === "users" || activeSection === "stores" || activeSection === "promotions")
      ? displayCollections[activeSection] ?? []
      : scopedDisplayCollections[activeSection] ?? [];
  const isDetailSection = ["reviews", "feedbacks"].includes(activeSection);
  const isFeedbackSection = activeSection === "feedbacks";
  const selectedOrderRecord =
    activeSection === "orders"
      ? (() => {
          const orderFromList =
            activeItems.find((item) => String(item.id) === String(resolvedEditingId ?? "")) ?? null;

          if (
            orderDetailRecord &&
            String(orderDetailRecord.id ?? "") === String(resolvedEditingId ?? "")
          ) {
            return orderDetailRecord;
          }

          return orderFromList;
        })()
      : null;
  const selectedOrderActions = getOrderAllowedActions(selectedOrderRecord);
  const selectedOrderInvoicePreviewUrl = getOrderInvoicePreviewHref(selectedOrderRecord);
  const canViewSelectedOrderInvoice = canViewOrderInvoice(selectedOrderRecord);
  const selectedOrderStoreId = toIdString(
    selectedOrderRecord?.storeId ?? selectedStoreId ?? managerStoreId,
  );
  const managerShipperOptions = useMemo(
    () =>
      safeCollections.users
        .filter((user) => {
          if (String(user?.role ?? "").trim().toUpperCase() !== "SHIPPER") {
            return false;
          }

          if (!selectedOrderStoreId || selectedOrderStoreId === "all") {
            return true;
          }

          return toIdString(user?.workingStoreId) === selectedOrderStoreId;
        })
        .map((user) => ({
          value: toIdString(user.id),
          label: `${user.fullName}${user.email ? ` | ${user.email}` : ""}`,
        })),
    [safeCollections.users, selectedOrderStoreId],
  );
  useEffect(() => {
    if (!selectedOrderRecord?.id) {
      setManagerAssignedShipperId("");
      return;
    }

    const assignedShipperId = toIdString(selectedOrderRecord.deliveringShipperId);

    if (assignedShipperId) {
      setManagerAssignedShipperId(assignedShipperId);
      return;
    }

    setManagerAssignedShipperId((current) => {
      if (current && managerShipperOptions.some((option) => option.value === current)) {
        return current;
      }

      return managerShipperOptions[0]?.value ?? "";
    });
  }, [
    managerShipperOptions,
    selectedOrderRecord?.deliveringShipperId,
    selectedOrderRecord?.id,
  ]);
  const renderedActiveItems = useMemo(() => {
    if (!(isOrdersWorkspaceOnly && activeSection === "orders" && hasActiveEditingId)) {
      return activeItems;
    }

    const matchedListOrder =
      activeItems.find((item) => String(item.id) === String(resolvedEditingId)) ?? null;

    if (matchedListOrder) {
      return [matchedListOrder];
    }

    if (selectedOrderRecord?.id && String(selectedOrderRecord.id) === String(resolvedEditingId)) {
      return [selectedOrderRecord];
    }

    return [];
  }, [activeItems, activeSection, hasActiveEditingId, isOrdersWorkspaceOnly, resolvedEditingId, selectedOrderRecord]);
  const selectedStoreImages = normalizeImagePathList(selectedStore?.imagePaths ?? selectedStore?.imagePath);
  const dashboardLabel = isManagerMode ? "Manager panel" : "Admin dashboard";
  const dashboardHeading = isManagerMode
    ? "Store-scoped operations"
    : "Store-scoped data administration";
  const workspacePageMeta = sectionPageMeta[activeSection] ?? null;
  const dashboardCopy = isManagerMode
    ? "You are managing within your assigned store scope. All data and actions are limited to that branch."
    : "Manage full system operations: stores, staff, categories, menu items, orders, invoices, and customer feedback.";
  const storeScopeHeading = selectedStore
    ? selectedStore.name
    : isManagerMode
      ? "Store scope is not assigned"
      : "Viewing the whole system";
  const storeScopeCopy = isManagerMode
    ? "Manager mode always stays inside your own working store. All list data, forms, moderation, and support inbox routing should stay in this branch scope."
    : "Choose a store so the form and the lists below automatically filter related events, categories, dishes, and reviews. If `All stores` is selected, admin sees the whole system.";

  const scopedWorkingUsersCount = useMemo(() => {
    if (selectedStoreId === "all") {
      return safeCollections.users.length;
    }

    const scopeId = toIdString(selectedStoreId);
    return safeCollections.users.filter(
      (user) => toIdString(user.workingStoreId) === scopeId,
    ).length;
  }, [safeCollections.users, selectedStoreId]);
  const availableShippersCount = useMemo(() => {
    const scopedStoreId = toIdString(selectedStoreId);
    const scopedShippers = safeCollections.users.filter((user) => {
      const normalizedRole = String(user?.role ?? "").trim().toUpperCase();

      if (normalizedRole !== "SHIPPER") {
        return false;
      }

      if (selectedStoreId === "all") {
        return true;
      }

      return toIdString(user?.workingStoreId) === scopedStoreId;
    });

    const busyShipperIds = new Set(
      scopedCollections.orders
        .filter((order) => String(order?.status ?? "").trim().toUpperCase() === "OUT_FOR_DELIVERY")
        .map((order) => toIdString(order?.deliveringShipperId))
        .filter(Boolean),
    );

    return scopedShippers.filter((shipper) => !busyShipperIds.has(toIdString(shipper?.id))).length;
  }, [safeCollections.users, scopedCollections.orders, selectedStoreId]);

  const revenueSummary = summary?.revenue ?? dashboard?.revenue ?? null;
  const topSellingDishes = Array.isArray(dashboard?.topSellingDishes)
    ? dashboard.topSellingDishes
    : [];
  const revenueStatCards = revenueSummary
    ? [
        statCard("Revenue today", formatCurrency(revenueSummary.todayRevenue)),
        statCard("Revenue week", formatCurrency(revenueSummary.weekRevenue)),
        statCard("Revenue month", formatCurrency(revenueSummary.monthRevenue)),
        statCard("Revenue year", formatCurrency(revenueSummary.yearRevenue)),
      ]
    : [];

  const globalStats = [
    statCard("User", summary?.users ?? safeCollections.users.length),
    statCard("Store", summary?.stores ?? safeCollections.stores.length),
    statCard("Event", summary?.events ?? safeCollections.events.length),
    statCard("Category", summary?.categories ?? safeCollections.categories.length),
    statCard("Core dishes", summary?.dishes ?? safeCollections.dishes.length),
    statCard("Store dishes", summary?.storeDishes ?? safeCollections.storeDishes.length),
    statCard("News", summary?.news ?? safeCollections.news.length),
    statCard("Promotions", summary?.promotions ?? safeCollections.promotions.length),
    statCard("User levels", summary?.userLevels ?? safeCollections.userLevels.length),
    statCard("Orders", summary?.orders ?? safeCollections.orders.length),
    statCard("Review", summary?.reviews ?? safeCollections.reviews.length),
    statCard("Feedback", summary?.feedbacks ?? dashboard?.feedbacks ?? safeCollections.feedbacks.length),
    ...revenueStatCards,
  ];

  const storeScopeStats = [
    statCard("Related staff", scopedWorkingUsersCount),
    statCard("Available shippers", availableShippersCount),
    statCard("Stores in scope", scopedCollections.stores.length),
    statCard("Related events", scopedCollections.events.length),
    statCard("Related categories", scopedCollections.categories.length),
    statCard("Related core dishes", scopedCollections.dishes.length),
    statCard("Store dishes", scopedCollections.storeDishes.length),
    statCard("News", scopedCollections.news.length),
    statCard("User levels", scopedCollections.userLevels.length),
    statCard("Orders", scopedCollections.orders.length),
    statCard("Related reviews", scopedCollections.reviews.length),
    statCard(
      "Related feedback",
      summary?.feedbacks ?? dashboard?.feedbacks ?? scopedCollections.feedbacks.length,
    ),
    ...revenueStatCards,
  ];
  const storeWorkspaceAnalytics = useMemo(() => {
    if (activeSection !== "stores") {
      return null;
    }

    const ordersInScope = Array.isArray(scopedCollections.orders) ? scopedCollections.orders : [];
    const paidOrders = ordersInScope.filter(
      (order) => String(order?.paymentStatus ?? "").trim().toUpperCase() === "PAID",
    );
    const now = new Date();
    const recentDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));

      return {
        key: date.toISOString().slice(0, 10),
        label: formatShortDayLabel(date),
        revenue: 0,
        orders: 0,
      };
    });
    const recentDayMap = new Map(recentDays.map((day) => [day.key, day]));

    paidOrders.forEach((order) => {
      const orderDate = new Date(order?.paidAt || order?.createdAt || "");

      if (Number.isNaN(orderDate.getTime())) {
        return;
      }

      orderDate.setHours(0, 0, 0, 0);
      const bucket = recentDayMap.get(orderDate.toISOString().slice(0, 10));

      if (!bucket) {
        return;
      }

      bucket.revenue += Number(order?.totalAmount ?? 0) || 0;
      bucket.orders += 1;
    });

    const revenuePeak = Math.max(...recentDays.map((day) => day.revenue), 1);
    const bestSellerMap = new Map();

    paidOrders.forEach((order) => {
      (Array.isArray(order?.items) ? order.items : []).forEach((item) => {
        const dishKey = String(item?.dishId ?? item?.dishName ?? item?.name ?? "").trim();

        if (!dishKey) {
          return;
        }

        const quantity = Number(item?.quantity ?? 0) || 0;
        const revenue =
          Number(item?.totalPrice ?? item?.lineTotal ?? (Number(item?.unitPrice ?? 0) || 0) * quantity) || 0;
        const currentDish = bestSellerMap.get(dishKey) ?? {
          label: String(item?.dishName ?? item?.name ?? "Menu item").trim(),
          quantity: 0,
          revenue: 0,
        };

        currentDish.quantity += quantity;
        currentDish.revenue += revenue;
        bestSellerMap.set(dishKey, currentDish);
      });
    });

    const bestSellerMenu = [...bestSellerMap.values()]
      .sort((left, right) => {
        if (right.quantity !== left.quantity) {
          return right.quantity - left.quantity;
        }

        return right.revenue - left.revenue;
      })
      .slice(0, 5);
    const bestSellerPeak = Math.max(...bestSellerMenu.map((item) => item.quantity), 1);
    const paymentDurations = paidOrders
      .map((order) => {
        const createdAt = new Date(order?.createdAt || "");
        const paidAt = new Date(order?.paidAt || "");

        if (Number.isNaN(createdAt.getTime()) || Number.isNaN(paidAt.getTime())) {
          return null;
        }

        const diffMinutes = (paidAt.getTime() - createdAt.getTime()) / 60000;
        return diffMinutes > 0 ? diffMinutes : null;
      })
      .filter((value) => value !== null);
    const averagePaymentMinutes = paymentDurations.length
      ? paymentDurations.reduce((sum, value) => sum + value, 0) / paymentDurations.length
      : null;
    const averageOrderValue = paidOrders.length
      ? paidOrders.reduce((sum, order) => sum + (Number(order?.totalAmount ?? 0) || 0), 0) / paidOrders.length
      : 0;
    const paymentConversion = ordersInScope.length ? (paidOrders.length / ordersInScope.length) * 100 : 0;
    const pipeline = [
      {
        label: "New",
        count: ordersInScope.filter((order) =>
          ["PENDING", "CONFIRMED"].includes(String(order?.status ?? "").trim().toUpperCase()),
        ).length,
      },
      {
        label: "Kitchen",
        count: ordersInScope.filter((order) =>
          ["PREPARING", "READY_FOR_SHIPPER"].includes(String(order?.status ?? "").trim().toUpperCase()),
        ).length,
      },
      {
        label: "Delivery",
        count: ordersInScope.filter(
          (order) => String(order?.status ?? "").trim().toUpperCase() === "OUT_FOR_DELIVERY",
        ).length,
      },
      {
        label: "Completed",
        count: ordersInScope.filter(
          (order) => String(order?.status ?? "").trim().toUpperCase() === "COMPLETED",
        ).length,
      },
      {
        label: "Cancelled",
        count: ordersInScope.filter(
          (order) => String(order?.status ?? "").trim().toUpperCase() === "CANCELLED",
        ).length,
      },
    ];
    const pipelinePeak = Math.max(...pipeline.map((item) => item.count), 1);

    return {
      scopeLabel: selectedStore?.name || (isManagerMode ? auth.user?.workingStoreName || "Manager scope" : "All stores"),
      recentDays,
      revenuePeak,
      bestSellerMenu,
      bestSellerPeak,
      averagePaymentMinutes,
      averageOrderValue,
      paidOrders: paidOrders.length,
      paymentConversion,
      pipeline,
      pipelinePeak,
    };
  }, [activeSection, auth.user?.workingStoreName, isManagerMode, scopedCollections.orders, selectedStore?.name]);
  const currentUserId = toIdString(auth.user?.id);

  const canChangeUserPassword = useCallback(
    (user) => {
      if (!user?.id) {
        return false;
      }

      if (isAdmin) {
        return false;
      }

      if (!isManagerMode) {
        return false;
      }

      const userId = toIdString(user.id);
      const userRole = String(user.role ?? "").trim().toUpperCase();

      if (userId && userId === currentUserId) {
        return true;
      }

      return (
        ["STAFF", "SHIPPER"].includes(userRole) &&
        toIdString(user.workingStoreId) === managerStoreId
      );
    },
    [currentUserId, isAdmin, isManagerMode, managerStoreId],
  );

  const authorizedRequest = useCallback(
    (path, options = {}) =>
      apiRequest(path, {
        ...options,
        token: auth.token,
        tokenType: auth.tokenType,
      }),
    [auth.token, auth.tokenType],
  );

  const handleApiFailure = useCallback(
    (requestError, fallbackMessage) => {
      setNotice("");
      setError(getApiErrorMessage(requestError, fallbackMessage));

      if (requestError?.status === 401) {
        auth.clearSession();
        navigate("/login", {
          replace: true,
          state: { message: "Your session has expired. Please sign in again." },
        });
      }

      if (requestError?.status === 403) {
        navigate("/unauthorized", { replace: true });
      }
    },
    [auth, navigate],
  );

  const buildAiCurrentFormPayload = useCallback((sectionKey, draft) => {
    if (!adminAiFormTypes[sectionKey]) {
      return undefined;
    }

    const payload = serializeSectionDraft(sectionKey, draft);

    switch (sectionKey) {
      case "events":
      case "categories":
        if (!String(draft.storeId ?? "").trim()) {
          delete payload.storeId;
        }
        break;
      case "dishes":
        if (!String(draft.categoryId ?? "").trim()) {
          delete payload.categoryId;
        }
        if (!String(draft.price ?? "").trim()) {
          delete payload.price;
        }
        break;
      case "storeDishes":
        if (!String(draft.storeId ?? "").trim()) {
          delete payload.storeId;
        }
        if (!String(draft.dishId ?? "").trim()) {
          delete payload.dishId;
        }
        if (!String(draft.quantity ?? "").trim()) {
          delete payload.quantity;
        }
        break;
      case "news":
        if (!String(draft.relatedStoreId ?? "").trim()) {
          delete payload.relatedStoreId;
        }
        break;
      default:
        break;
    }

    return pruneAdminAiPayload(payload);
  }, []);

  const resolveAiContextStoreId = useCallback(
    (sectionKey, draft) => {
      if (isManagerMode && managerStoreId) {
        const scopedStoreId = Number(managerStoreId);
        return Number.isFinite(scopedStoreId) ? scopedStoreId : null;
      }

      const scopedSelectionId =
        selectedStoreId && selectedStoreId !== "all" ? Number(selectedStoreId) : null;

      switch (sectionKey) {
        case "stores":
          if (hasActiveEditingId) {
            const editingStoreId = Number(resolvedEditingId);
            return Number.isFinite(editingStoreId) ? editingStoreId : scopedSelectionId;
          }
          return Number.isFinite(scopedSelectionId) ? scopedSelectionId : null;
        case "events":
        case "categories":
        case "storeDishes": {
          const directStoreId = Number(draft.storeId);
          return Number.isFinite(directStoreId) && draft.storeId !== ""
            ? directStoreId
            : Number.isFinite(scopedSelectionId)
              ? scopedSelectionId
              : null;
        }
        case "dishes": {
          const categoryId = toIdString(draft.categoryId);
          const matchedCategory = safeCollections.categories.find(
            (category) => toIdString(category.id) === categoryId,
          );
          const categoryStoreId = Number(matchedCategory?.storeId);
          return Number.isFinite(categoryStoreId)
            ? categoryStoreId
            : Number.isFinite(scopedSelectionId)
              ? scopedSelectionId
              : null;
        }
        case "news": {
          const relatedStoreId = Number(draft.relatedStoreId);
          return Number.isFinite(relatedStoreId) && draft.relatedStoreId !== ""
            ? relatedStoreId
            : Number.isFinite(scopedSelectionId)
              ? scopedSelectionId
              : null;
        }
        default:
          return Number.isFinite(scopedSelectionId) ? scopedSelectionId : null;
      }
    },
    [hasActiveEditingId, isManagerMode, managerStoreId, resolvedEditingId, safeCollections.categories, selectedStoreId],
  );

  const handleAiPromptChange = useCallback((value) => {
    setAiAssistState((current) => ({
      ...current,
      prompt: value,
    }));
  }, []);

  const clearAiAssistFeedback = useCallback(({ preservePrompt = true } = {}) => {
    setAiAssistState((current) => ({
      ...createEmptyAdminAiState(),
      prompt: preservePrompt ? current.prompt : "",
    }));
  }, []);

  const handleGenerateAiDraft = useCallback(async () => {
    if (!activeAiFormType) {
      return;
    }

    const prompt = String(aiAssistState.prompt ?? "").trim();

    if (!prompt) {
      toast.warning("Write a short instruction before asking AI to fill this form.", {
        title: "AI draft",
      });
      return;
    }

    setAiAssistState((current) => ({
      ...current,
      loading: true,
    }));
    setError("");
    setNotice("");

    try {
      const requestBody = {
        prompt,
      };
      const scopedStoreId = resolveAiContextStoreId(activeSection, activeDraft);
      const currentFormPayload = buildAiCurrentFormPayload(activeSection, activeDraft);

      if (Number.isFinite(scopedStoreId) && scopedStoreId > 0) {
        requestBody.storeId = scopedStoreId;
      }

      if (currentFormPayload && Object.keys(currentFormPayload).length > 0) {
        requestBody.currentForm = currentFormPayload;
      }

      const response = await authorizedRequest(
        `/api/admin/ai/form-drafts/${activeAiFormType}`,
        {
          method: "POST",
          body: requestBody,
        },
      );

      const normalizedDraft =
        response?.draft && typeof response.draft === "object" && !Array.isArray(response.draft)
          ? response.draft
          : {};
      const nextDraft = mergeAdminAiDraft(activeSection, activeDraft, normalizedDraft);
      const warnings = normalizeTextList(response?.warnings);
      const missingFieldNames = normalizeAdminAiMissingFields(
        activeSection,
        response?.missingFields,
      );
      const scopeStoreId = toIdString(response?.scopeStoreId);
      const scopeStoreName = String(response?.scopeStoreName ?? "").trim();
      const model = String(response?.model ?? "").trim();

      setDrafts((current) => ({
        ...current,
        [activeSection]: nextDraft,
      }));
      setAiAssistState((current) => ({
        ...current,
        loading: false,
        warnings,
        missingFieldNames,
        scopeStoreId,
        scopeStoreName,
        model,
      }));

      if (warnings.length) {
        toast.warning(warnings[0], {
          title: "AI adjusted draft",
          dedupeKey: `admin-ai-warning:${activeSection}:${warnings.join("|")}`,
        });
      } else {
        toast.success("AI suggestions have been merged into the form.", {
          title: "AI draft ready",
        });
      }

      if (missingFieldNames.length) {
        toast.info(`${missingFieldNames.length} field(s) still need manual input.`, {
          title: "Review required",
          dedupeKey: `admin-ai-missing:${activeSection}:${missingFieldNames.join("|")}`,
        });
      }
    } catch (requestError) {
      setAiAssistState((current) => ({
        ...current,
        loading: false,
      }));
      handleApiFailure(requestError, "Unable to generate an AI form draft.");
    }
  }, [
    activeAiFormType,
    activeDraft,
    activeSection,
    aiAssistState.prompt,
    authorizedRequest,
    buildAiCurrentFormPayload,
    handleApiFailure,
    resolveAiContextStoreId,
    toast,
  ]);

  useEffect(() => {
    if (!passwordModal.open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !passwordModal.loading) {
        setPasswordModal((current) => ({
          ...current,
          open: false,
          error: "",
          password: "",
          confirmPassword: "",
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [passwordModal.loading, passwordModal.open]);

  const refreshAll = async ({
    refreshLookups = true,
    refreshLists = true,
    nextQueries = listQueries,
    storeScopeId = selectedStoreId,
  } = {}) => {
    const requestOrNull = async (path) => {
      try {
        return await authorizedRequest(path);
      } catch (requestError) {
        if (requestError?.status === 401 || requestError?.status === 403) {
          throw requestError;
        }

        return null;
      }
    };
    const workspaceFetchKeys = forcedSection
      ? getWorkspaceSectionFetchKeys(forcedSection)
      : { reference: adminSectionKeys, list: adminSectionKeys };
    const referenceSectionKeys = isOrdersWorkspaceOnly
      ? isManagerMode
        ? ["users", "stores"]
        : ["stores"]
      : isManagerMode
        ? workspaceFetchKeys.reference.filter((key) => accessibleSectionKeys.includes(key))
        : workspaceFetchKeys.reference;
    const listSectionKeys = isOrdersWorkspaceOnly
      ? ["orders"]
      : isManagerMode
        ? workspaceFetchKeys.list.filter((key) => accessibleSectionKeys.includes(key))
        : workspaceFetchKeys.list;
    const shouldFetchOverview = refreshLookups && !isOrdersWorkspaceOnly && !forcedSection;

    setLoading(true);
    setError("");

    try {
      if (isManagerMode) {
        const requests = [];

        if (shouldFetchOverview) {
          requests.push(requestOrNull("/api/admin/summary"));
          requests.push(requestOrNull("/api/admin/dashboard"));
        }

        if (refreshLookups) {
          referenceSectionKeys.forEach((sectionKey) => {
            requests.push(
              requestOrNull(
                buildSectionListPath(
                  sectionKey,
                  {
                    page: 0,
                    size: 100,
                    search: "",
                  },
                  storeScopeId,
                ),
              ),
            );
          });
        }

        if (refreshLists) {
          listSectionKeys.forEach((sectionKey) => {
            requests.push(
              requestOrNull(
                buildSectionListPath(sectionKey, nextQueries[sectionKey], storeScopeId),
              ),
            );
          });
        }

        const responses = await Promise.all(requests);
        let pointer = 0;
        let nextReferenceCollections = safeCollections;

        if (refreshLookups) {
          const fetchedReferences = isOrdersWorkspaceOnly
            ? {
                ...safeCollections,
              }
            : emptyCollections();

          if (shouldFetchOverview) {
            const summaryData = responses[pointer++];
            const dashboardData = responses[pointer++];

            setSummary(normalizeSummaryResponse(summaryData));
            setDashboard(normalizeDashboardResponse(dashboardData));
          } else {
            setSummary(null);
            setDashboard(null);
          }

          referenceSectionKeys.forEach((sectionKey) => {
            fetchedReferences[sectionKey] = normalizeListResponse(responses[pointer++]);
          });

          nextReferenceCollections = fetchedReferences;
          setReferenceCollections(fetchedReferences);
          setSearchDrafts((current) => {
            const nextDrafts = { ...current };

            listSectionKeys.forEach((sectionKey) => {
              nextDrafts[sectionKey] = {
                ...nextDrafts[sectionKey],
                search: nextQueries[sectionKey]?.search ?? "",
              };
            });

            return nextDrafts;
          });
        } else {
          nextReferenceCollections = safeCollections;
        }

        if (refreshLists) {
          const nextListCollections = {
            ...collections,
          };

          listSectionKeys.forEach((sectionKey) => {
            nextListCollections[sectionKey] = normalizePaginatedListResponse(
              responses[pointer++],
              nextQueries[sectionKey],
            );
          });

          setCollections(nextListCollections);
        }

        const nextScopedCollections = filterCollectionsByStore(
          nextReferenceCollections,
          storeScopeId,
        );

        setDrafts((current) =>
          accessibleSectionKeys.reduce(
            (result, sectionKey) => ({
              ...result,
              [sectionKey]: hasSectionEditTarget(sectionKey)
                ? editingRecords[sectionKey]
                  ? hydrateSectionDraft(sectionKey, editingRecords[sectionKey])
                  : current[sectionKey]
                : createDraftForSection(
                    sectionKey,
                    nextReferenceCollections,
                    nextScopedCollections,
                  ),
            }),
            { ...current },
          ),
        );

        return;
      }

      const requests = [];

      if (shouldFetchOverview) {
        requests.push(
          requestOrNull(buildAnalyticsPath("/api/admin/summary", storeScopeId, isAdmin)),
        );
        requests.push(
          requestOrNull(buildAnalyticsPath("/api/admin/dashboard", storeScopeId, isAdmin)),
        );
      }

      if (refreshLookups) {
        referenceSectionKeys.forEach((sectionKey) => {
          requests.push(
            requestOrNull(
              buildSectionListPath(sectionKey, {
                page: 0,
                size: 100,
                search: "",
              }, storeScopeId),
            ),
          );
        });
      }

      if (refreshLists) {
        listSectionKeys.forEach((sectionKey) => {
          requests.push(
            requestOrNull(buildSectionListPath(sectionKey, nextQueries[sectionKey], storeScopeId)),
          );
        });
      }

      const responses = await Promise.all(requests);
      let pointer = 0;
      let nextReferenceCollections = safeCollections;

      if (refreshLookups) {
        const fetchedReferences = isOrdersWorkspaceOnly
          ? {
              ...safeCollections,
            }
          : emptyCollections();

        if (shouldFetchOverview) {
          const summaryData = responses[pointer++];
          const dashboardData = responses[pointer++];

          setSummary(normalizeSummaryResponse(summaryData));
          setDashboard(normalizeDashboardResponse(dashboardData));
        } else {
          setSummary(null);
          setDashboard(null);
        }

        referenceSectionKeys.forEach((sectionKey) => {
          fetchedReferences[sectionKey] = normalizeListResponse(responses[pointer++]);
        });

        nextReferenceCollections = fetchedReferences;
        setReferenceCollections(fetchedReferences);
        setSearchDrafts((current) => {
          const nextDrafts = { ...current };
          listSectionKeys.forEach((sectionKey) => {
            nextDrafts[sectionKey] = {
              ...nextDrafts[sectionKey],
              search: nextQueries[sectionKey]?.search ?? "",
            };
          });
          return nextDrafts;
        });
      }

      if (refreshLists) {
        const nextListCollections = {
          ...collections,
        };

        listSectionKeys.forEach((sectionKey) => {
          nextListCollections[sectionKey] = normalizePaginatedListResponse(
            responses[pointer++],
            nextQueries[sectionKey],
          );
        });

        setCollections(nextListCollections);
      }

      const nextScopedCollections = filterCollectionsByStore(nextReferenceCollections, storeScopeId);
      setDrafts((current) => ({
        users: hasSectionEditTarget("users")
          ? editingRecords.users
            ? hydrateSectionDraft("users", editingRecords.users)
            : current.users
          : createDraftForSection("users", nextReferenceCollections, nextScopedCollections),
        stores: hasSectionEditTarget("stores")
          ? editingRecords.stores
            ? hydrateSectionDraft("stores", editingRecords.stores)
            : current.stores
          : createDraftForSection("stores", nextReferenceCollections, nextScopedCollections),
        events: hasSectionEditTarget("events")
          ? editingRecords.events
            ? hydrateSectionDraft("events", editingRecords.events)
            : current.events
          : createDraftForSection("events", nextReferenceCollections, nextScopedCollections),
        categories: hasSectionEditTarget("categories")
          ? editingRecords.categories
            ? hydrateSectionDraft("categories", editingRecords.categories)
            : current.categories
          : createDraftForSection("categories", nextReferenceCollections, nextScopedCollections),
        dishes: hasSectionEditTarget("dishes")
          ? editingRecords.dishes
            ? hydrateSectionDraft("dishes", editingRecords.dishes)
            : current.dishes
          : createDraftForSection("dishes", nextReferenceCollections, nextScopedCollections),
        storeDishes: hasSectionEditTarget("storeDishes")
          ? editingRecords.storeDishes
            ? hydrateSectionDraft("storeDishes", editingRecords.storeDishes)
            : current.storeDishes
          : createDraftForSection("storeDishes", nextReferenceCollections, nextScopedCollections),
        news: hasSectionEditTarget("news")
          ? editingRecords.news
            ? hydrateSectionDraft("news", editingRecords.news)
            : current.news
          : createDraftForSection("news", nextReferenceCollections, nextScopedCollections),
        promotions: hasSectionEditTarget("promotions")
          ? editingRecords.promotions
            ? hydrateSectionDraft("promotions", editingRecords.promotions)
            : current.promotions
          : createDraftForSection("promotions", nextReferenceCollections, nextScopedCollections),
        userLevels: hasSectionEditTarget("userLevels")
          ? editingRecords.userLevels
            ? hydrateSectionDraft("userLevels", editingRecords.userLevels)
            : current.userLevels
          : createDraftForSection("userLevels", nextReferenceCollections, nextScopedCollections),
        orders: hasSectionEditTarget("orders")
          ? editingRecords.orders
            ? hydrateSectionDraft("orders", editingRecords.orders)
            : current.orders
          : createDraftForSection("orders", nextReferenceCollections, nextScopedCollections),
        reviews: hasSectionEditTarget("reviews")
          ? editingRecords.reviews
            ? hydrateSectionDraft("reviews", editingRecords.reviews)
            : current.reviews
          : createDraftForSection("reviews", nextReferenceCollections, nextScopedCollections),
        feedbacks: hasSectionEditTarget("feedbacks")
          ? editingRecords.feedbacks
            ? hydrateSectionDraft("feedbacks", editingRecords.feedbacks)
            : current.feedbacks
          : createDraftForSection("feedbacks", nextReferenceCollections, nextScopedCollections),
      }));
    } catch (requestError) {
      handleApiFailure(requestError, t("orders.loadAdminError"));
    } finally {
      setLoading(false);
    }
  };

  const loadOrderScanHistory = useCallback(
    async (targetOrderId, { silent = false } = {}) => {
      if (!targetOrderId) {
        setOrderScanHistory([]);
        setOrderScanError("");
        return [];
      }

      if (!silent) {
        setOrderScanLoading(true);
      }
      setOrderScanError("");

      try {
        const response = await authorizedRequest(`/api/admin/orders/${targetOrderId}/scan-history`);
        const nextHistory = normalizeListResponse(response);
        setOrderScanHistory(nextHistory);
        return nextHistory;
      } catch (requestError) {
        if (requestError?.status === 401 || requestError?.status === 403) {
          handleApiFailure(requestError, t("orders.loadScanError"));
        } else {
          setOrderScanError(getApiErrorMessage(requestError, t("orders.loadScanError")));
        }

        return [];
      } finally {
        if (!silent) {
          setOrderScanLoading(false);
        }
      }
    },
    [authorizedRequest, handleApiFailure],
  );

  const handleOrderWorkflowAction = useCallback(
    async (actionKey) => {
      if (!isManagerMode) {
        setNotice("");
        setError("Only a store MANAGER can process order workflows.");
        return;
      }

      const actionConfig = adminOrderActionConfig[actionKey];

      if (!actionConfig || !selectedOrderRecord?.id) {
        return;
      }

      setOrderActionLoading(actionKey);
      setNotice("");
      setError("");

      try {
        let response;

        try {
          response = await authorizedRequest(actionConfig.path(selectedOrderRecord.id), {
            method: "POST",
          });
        } catch (requestError) {
          const fallbackPayload = buildOrderStatusFallbackPayload(selectedOrderRecord, actionKey);

          if (!fallbackPayload || ![404, 405].includes(Number(requestError?.status))) {
            throw requestError;
          }

          response = await authorizedRequest(`/api/admin/orders/${selectedOrderRecord.id}/status`, {
            method: "PUT",
            body: fallbackPayload,
          });
        }

        const nextOrder =
          response && typeof response === "object" && !Array.isArray(response) && response.id
            ? response
            : selectedOrderRecord;

        setOrderDetailRecord(nextOrder);
        setDrafts((current) => ({
          ...current,
          orders: hydrateSectionDraft("orders", nextOrder),
        }));
        setNotice(response?.message ?? t(actionConfig.successKey));

        await Promise.all([
          refreshAll({
            refreshLookups: false,
            refreshLists: true,
            nextQueries: listQueries,
          }),
          loadOrderScanHistory(nextOrder.id, { silent: true }),
        ]);
      } catch (requestError) {
        handleApiFailure(requestError, t("orders.updateWorkflowError"));
      } finally {
        setOrderActionLoading("");
      }
    },
    [
      authorizedRequest,
      handleApiFailure,
      isManagerMode,
      listQueries,
      loadOrderScanHistory,
      refreshAll,
      selectedOrderRecord,
    ],
  );

  const handleManagerAssignShipper = useCallback(
    async () => {
      if (!isManagerMode) {
        setNotice("");
        setError("Only a store MANAGER can assign a shipper to the order.");
        return;
      }

      if (!selectedOrderRecord?.id) {
        return;
      }

      const normalizedStatus = String(selectedOrderRecord.status ?? "").trim().toUpperCase();
      const normalizedPaymentStatus = String(selectedOrderRecord.paymentStatus ?? "")
        .trim()
        .toUpperCase();
      const selectedShipperId = Number(managerAssignedShipperId);

      if (!["PREPARING", "READY_FOR_SHIPPER"].includes(normalizedStatus)) {
        setNotice("");
        setError("A shipper can only be assigned while the order is in PREPARING or READY_FOR_SHIPPER.");
        return;
      }

      if (normalizedPaymentStatus !== "PAID") {
        setNotice("");
        setError("The order must be PAID before a shipper can be assigned.");
        return;
      }

      if (!Number.isFinite(selectedShipperId) || selectedShipperId <= 0) {
        setNotice("");
        setError("Choose a shipper before clicking Next.");
        return;
      }

      setOrderActionLoading("MANAGER_ASSIGN_SHIPPER");
      setNotice("");
      setError("");

      try {
        const response = await authorizedRequest(`/api/admin/orders/${selectedOrderRecord.id}/status`, {
          method: "PUT",
          body: {
            status: "READY_FOR_SHIPPER",
            deliveringShipperId: selectedShipperId,
          },
        });

        const nextOrder =
          response && typeof response === "object" && !Array.isArray(response) && response.id
            ? response
            : selectedOrderRecord;

        setOrderDetailRecord(nextOrder);
        setDrafts((current) => ({
          ...current,
          orders: hydrateSectionDraft("orders", nextOrder),
        }));
        setNotice(
          response?.message ??
            (normalizedStatus === "READY_FOR_SHIPPER"
              ? "The shipper assignment was updated."
              : "The order moved to Waiting for shipper and the shipper was assigned."),
        );

        await Promise.all([
          refreshAll({
            refreshLookups: false,
            refreshLists: true,
            nextQueries: listQueries,
          }),
          loadOrderScanHistory(nextOrder.id, { silent: true }),
        ]);
      } catch (requestError) {
        handleApiFailure(requestError, "Unable to assign a shipper to this order right now.");
      } finally {
        setOrderActionLoading("");
      }
    },
    [
      authorizedRequest,
      handleApiFailure,
      isManagerMode,
      listQueries,
      loadOrderScanHistory,
      managerAssignedShipperId,
      refreshAll,
      selectedOrderRecord,
    ],
  );

  useEffect(() => {
    if (!auth.isAuthenticated || !canModerateReviews) {
      return;
    }

    const refreshKey = [
      auth.user?.id ?? "",
      auth.user?.role ?? "",
      forcedSection,
      location.pathname,
      activeSection === "orders" ? routeStoreScopeId : selectedStoreId,
    ].join("|");

    if (shouldSkipRapidAdminRefresh(refreshKey)) {
      return;
    }

    refreshAll({ refreshLookups: true, refreshLists: true, nextQueries: listQueries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeSection,
    auth.isAuthenticated,
    auth.token,
    auth.tokenType,
    auth.user?.id,
    auth.user?.role,
    canModerateReviews,
    forcedSection,
    location.pathname,
    routeStoreScopeId,
    selectedStoreId,
  ]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeSection)) {
      const fallbackSection = visibleTabs[0]?.key || "stores";
      setActiveSection(fallbackSection);
      navigate(buildAdminWorkspacePath({ sectionKey: fallbackSection }), { replace: true });
    }
  }, [activeSection, forcedSection, navigate, visibleTabs]);

  useEffect(() => {
    if (!["reviews", "feedbacks"].includes(activeSection) && reviewDetail) {
      setReviewDetail(null);
    }
  }, [activeSection, reviewDetail]);

  useEffect(() => {
    setAiAssistState(createEmptyAdminAiState());
  }, [activeEditingId, activeSection, selectedStoreId]);

  useEffect(() => {
    if (!isFeedbackSection || !reviewDetail) {
      setFeedbackReplyDraft("");
      return;
    }

    setFeedbackReplyDraft(String(reviewDetail.replyMessage ?? ""));
  }, [isFeedbackSection, reviewDetail]);

  useEffect(() => {
    if (
      activeSection !== "orders" ||
      hasActiveEditingId ||
      activeItems.length === 0 ||
      isOrdersWorkspaceOnly
    ) {
      return;
    }

    const firstOrder = activeItems[0];

    setDrafts((current) => ({
      ...current,
      orders: hydrateSectionDraft("orders", firstOrder),
    }));
    setEditingIds((current) => ({
      ...current,
      orders: firstOrder.id,
    }));
    setOrderDetailRecord(firstOrder);
  }, [activeItems, activeSection, hasActiveEditingId, isOrdersWorkspaceOnly]);

  useEffect(() => {
    if (activeSection !== "orders" || !hasActiveEditingId) {
      setOrderScanHistory([]);
      setOrderScanError("");
      setOrderScanLoading(false);
      return;
    }

    if (!selectedOrderRecord?.id) {
      return;
    }

    if (isOrdersWorkspaceOnly) {
      setOrderScanHistory([]);
      setOrderScanError("");
      setOrderScanLoading(false);
      return;
    }

    void loadOrderScanHistory(selectedOrderRecord.id);
  }, [activeSection, hasActiveEditingId, isOrdersWorkspaceOnly, loadOrderScanHistory, selectedOrderRecord?.id]);

  useEffect(() => {
    if (!isManagerMode) {
      return;
    }

    if (managerStoreId && selectedStoreId !== managerStoreId) {
      setSelectedStoreId(managerStoreId);
    }
  }, [isManagerMode, managerStoreId, selectedStoreId]);

  useEffect(() => {
    if (activeSection !== "orders") {
      return;
    }

    const nextStoreScopeId = resolveOrdersStoreScope({
      isManagerMode,
      managerStoreId,
      search: location.search,
    });

    if (nextStoreScopeId === selectedStoreId) {
      return;
    }

    setSelectedStoreId(nextStoreScopeId);
  }, [activeSection, isManagerMode, location.search, managerStoreId, selectedStoreId]);

  useEffect(() => {
    if (
      selectedStoreId !== "all" &&
      !safeCollections.stores.some((store) => toIdString(store.id) === toIdString(selectedStoreId))
    ) {
      setSelectedStoreId(isManagerMode && managerStoreId ? managerStoreId : "all");
    }
  }, [isManagerMode, managerStoreId, safeCollections.stores, selectedStoreId]);

  useEffect(() => {
    if (!infoModalKey) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setInfoModalKey("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [infoModalKey]);

  const resetSection = (sectionKey) => {
    if (["reviews", "feedbacks"].includes(sectionKey)) {
      setReviewDetail(null);
    }

    setEditingRecords((current) => ({
      ...current,
      [sectionKey]: null,
    }));
    setEditingDetailLoading((current) => ({
      ...current,
      [sectionKey]: false,
    }));

    if (sectionKey === "orders") {
      setOrderDetailRecord(null);
      setOrderScanHistory([]);
      setOrderScanError("");
      setOrderActionLoading("");
      setInvoiceModalOpen(false);
    }

    setDrafts((current) => ({
      ...current,
      [sectionKey]: createDraftForSection(sectionKey, safeCollections, scopedCollections),
    }));
    setEditingIds((current) => ({
      ...current,
      [sectionKey]: null,
    }));
    setUploadState((current) =>
      current.sectionKey === sectionKey
        ? {
            sectionKey: "",
            fieldName: "",
            sectionIndex: null,
            loading: false,
            message: "",
            error: "",
          }
        : current,
    );
    clearAiAssistFeedback({ preservePrompt: false });

    if (shouldSyncRecordInUrl && routeSectionKey === sectionKey && routeRecordId) {
      const nextPath =
        sectionKey === "orders"
          ? buildAdminOrdersPath({ storeId: routeStoreScopeId })
          : buildAdminWorkspacePath({ sectionKey });
      navigate(nextPath, { replace: true });
    }
  };

  const applyStoreScope = (nextStoreId) => {
    if (isManagerMode) {
      return;
    }

    const nextScopedCollections = filterCollectionsByStore(safeCollections, nextStoreId);
    setSelectedStoreId(nextStoreId);
    setReviewDetail(null);
    setOrderDetailRecord(null);
    setOrderScanHistory([]);
    setOrderScanError("");
    setOrderActionLoading("");
    setEditingIds((current) => ({
      ...current,
      events: null,
      categories: null,
      dishes: null,
      storeDishes: null,
      news: null,
      userLevels: null,
      orders: null,
      reviews: null,
      feedbacks: null,
    }));
    setDrafts((current) => ({
      ...current,
      events: createDraftForSection("events", safeCollections, nextScopedCollections),
      categories: createDraftForSection("categories", safeCollections, nextScopedCollections),
      dishes: createDraftForSection("dishes", safeCollections, nextScopedCollections),
      storeDishes: createDraftForSection("storeDishes", safeCollections, nextScopedCollections),
      news: createDraftForSection("news", safeCollections, nextScopedCollections),
      userLevels: createDraftForSection("userLevels", safeCollections, nextScopedCollections),
      orders: createDraftForSection("orders", safeCollections, nextScopedCollections),
      reviews: createDraftForSection("reviews", safeCollections, nextScopedCollections),
      feedbacks: createDraftForSection("feedbacks", safeCollections, nextScopedCollections),
    }));
    setUploadState({
      sectionKey: "",
      fieldName: "",
      sectionIndex: null,
      loading: false,
      message: "",
      error: "",
    });
    void refreshAll({
      refreshLookups: true,
      refreshLists: true,
      nextQueries: listQueries,
      storeScopeId: nextStoreId,
    });
  };

  const updateListQuery = (sectionKey, patch) => {
    const nextQueries = {
      ...listQueries,
      [sectionKey]: {
        ...listQueries[sectionKey],
        ...patch,
      },
    };

    setListQueries(nextQueries);
    void refreshAll({
      refreshLookups: false,
      refreshLists: true,
      nextQueries,
    });
  };

  const handleSearchDraftChange = (sectionKey, value) => {
    setSearchDrafts((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        search: value,
      },
    }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateListQuery(activeSection, {
      page: 0,
      search: activeSearchDraft,
    });
  };

  const handleSearchReset = () => {
    setSearchDrafts((current) => ({
      ...current,
      [activeSection]: {
        ...current[activeSection],
        search: "",
      },
    }));
    updateListQuery(activeSection, {
      page: 0,
      search: "",
      ...(activeSection === "orders"
        ? {
            status: "",
            paymentStatus: "",
            stage: "",
          }
        : {}),
    });
  };

  const handleDraftChange = (fieldName, value) => {
    setDrafts((current) => {
      const nextDraft = {
        ...current[activeSection],
        [fieldName]: value,
      };

      if (activeSection === "users" && fieldName === "role") {
        nextDraft.workingStoreId = requiresWorkingStoreRole(value)
          ? isManagerMode
            ? managerStoreId || workingStoreOptions[0]?.value || ""
            : current.users.workingStoreId || workingStoreOptions[0]?.value || ""
          : "";
      }

      if (activeSection === "reviews" && fieldName === "targetType") {
        nextDraft.targetId = reviewTargetOptions[value]?.[0]?.value ?? "";
      }

      if (activeSection === "reviews" && fieldName === "userId") {
        nextDraft.userId = value;
      }

      if (activeSection === "orders" && fieldName === "status") {
        if (!["PREPARING", "READY_FOR_SHIPPER"].includes(value)) {
          nextDraft.deliveringShipperId = "";
        } else if (value === "PREPARING") {
          nextDraft.deliveringShipperId = "";
        }
      }

      if (activeSection === "orders" && fieldName === "paymentStatus" && value === "PENDING") {
        nextDraft.status = "PENDING";
        nextDraft.deliveringShipperId = "";
      }

      return {
        ...current,
        [activeSection]: nextDraft,
      };
    });

    setAiAssistState((current) =>
      current.missingFieldNames.includes(fieldName)
        ? {
            ...current,
            missingFieldNames: current.missingFieldNames.filter(
              (currentFieldName) => currentFieldName !== fieldName,
            ),
          }
        : current,
    );
  };

  const handleImageUpload = async (fieldName, files, uploadFolder, options = {}) => {
    if (!files?.length) {
      return;
    }

    const sectionKey = activeSection;
    const normalizedFiles = Array.isArray(files) ? files : Array.from(files);
    const rawSectionIndex = Number(options?.sectionIndex);
    const sectionIndex = Number.isInteger(rawSectionIndex) ? rawSectionIndex : null;
    const isSectionUpload = options?.mode === "section-image" && sectionIndex !== null;

    if (normalizedFiles.some((file) => !file.type.startsWith("image/"))) {
      setUploadState({
        sectionKey,
        fieldName,
        sectionIndex,
        loading: false,
        message: "",
        error: "Only image files are supported.",
      });
      return;
    }

    setUploadState({
      sectionKey,
      fieldName,
      sectionIndex,
      loading: true,
      message: "",
      error: "",
    });

    try {
      const response = await uploadAdminImages(normalizedFiles, uploadFolder ?? sectionKey, {
        token: auth.token,
        tokenType: auth.tokenType,
      });
      const uploadedPaths = normalizeImagePathList(response.paths);

      setDrafts((current) => {
        if (isSectionUpload) {
          const currentSections = Array.isArray(current[sectionKey][fieldName])
            ? current[sectionKey][fieldName]
            : [];

          return {
            ...current,
            [sectionKey]: {
              ...current[sectionKey],
              [fieldName]: currentSections.map((section, index) =>
                index === sectionIndex
                  ? (() => {
                      const currentImagePaths = normalizeImagePathList(
                        section?.imagePaths ?? section?.imagePath,
                      );
                      const nextImagePaths = [...currentImagePaths, ...uploadedPaths].filter(
                        (path, pathIndex, array) => path && array.indexOf(path) === pathIndex,
                      );

                      return {
                        ...section,
                        imagePath: nextImagePaths[0] ?? "",
                        imagePaths: nextImagePaths,
                      };
                    })()
                  : section,
              ),
            },
          };
        }

        return {
          ...current,
          [sectionKey]: {
            ...current[sectionKey],
            [fieldName]: [
              ...(Array.isArray(current[sectionKey][fieldName]) ? current[sectionKey][fieldName] : []),
              ...uploadedPaths,
            ].filter((path, index, array) => path && array.indexOf(path) === index),
          },
        };
      });
      setUploadState({
        sectionKey,
        fieldName,
        sectionIndex,
        loading: false,
        message:
          response?.message ??
          (isSectionUpload
            ? `Uploaded ${uploadedPaths.length} section image(s) successfully.`
            : `Uploaded ${uploadedPaths.length} image(s) successfully.`),
        error: "",
      });
      setAiAssistState((current) =>
        current.missingFieldNames.includes(fieldName)
          ? {
              ...current,
              missingFieldNames: current.missingFieldNames.filter(
                (currentFieldName) => currentFieldName !== fieldName,
              ),
            }
          : current,
      );
    } catch (uploadError) {
      setUploadState({
        sectionKey,
        fieldName,
        sectionIndex,
        loading: false,
        message: "",
        error: getApiErrorMessage(uploadError, "Image upload failed."),
      });
    }
  };

  const loadFeedbackDetail = async (feedbackId) => {
    const detailResponse = await authorizedRequest(sectionConfigs.feedbacks.detailPath(feedbackId));
    const rawDetail = normalizeDetailResponse(detailResponse);
    const detail = rawDetail
      ? {
          ...rawDetail,
          id: rawDetail.id ?? feedbackId,
          __adminRecordId: toIdString(feedbackId),
        }
      : null;

    if (!detail) {
      throw new Error("The feedback detail API did not return valid data.");
    }

    setActiveSection("feedbacks");
    setReviewDetail(detail);
    setEditingRecords((current) => ({
      ...current,
      feedbacks: detail,
    }));
    setEditingIds((current) => ({
      ...current,
      feedbacks: feedbackId,
    }));
    if (shouldSyncRecordInUrl) {
      navigate(
        buildAdminWorkspacePath({
          sectionKey: "feedbacks",
          recordId: feedbackId,
        }),
        { replace: true },
      );
    }

    return detail;
  };

  const handleSaveFeedbackReply = async () => {
    if (!reviewDetail?.id) {
      setNotice("");
      setError("Choose a feedback record before replying.");
      return;
    }

    const replyMessage = String(feedbackReplyDraft ?? "").trim();

    if (!replyMessage) {
      setNotice("");
      setError("Reply message cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await authorizedRequest(`/api/admin/feedbacks/${reviewDetail.id}/reply`, {
        method: "PUT",
        body: { replyMessage },
      });
      await loadFeedbackDetail(reviewDetail.id);
      await refreshAll({
        refreshLookups: false,
        refreshLists: true,
        nextQueries: listQueries,
      });
      setNotice(response?.message ?? "Feedback reply saved.");
    } catch (requestError) {
      handleApiFailure(requestError, "Unable to save the feedback reply.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeedbackReply = async () => {
    if (!reviewDetail?.id) {
      setNotice("");
      setError("Choose a feedback record before deleting its reply.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this feedback reply?")) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await authorizedRequest(`/api/admin/feedbacks/${reviewDetail.id}/reply`, {
        method: "DELETE",
      });
      await loadFeedbackDetail(reviewDetail.id);
      await refreshAll({
        refreshLookups: false,
        refreshLists: true,
        nextQueries: listQueries,
      });
      setNotice(response?.message ?? "Feedback reply deleted.");
    } catch (requestError) {
      handleApiFailure(requestError, "Unable to delete the feedback reply.");
    } finally {
      setSaving(false);
    }
  };

  const syncLoadedSectionRecord = (sectionKey, itemId, detail) => {
    if (!detail) {
      return;
    }

    const normalizedDetail = {
      ...detail,
      id: detail.id ?? itemId,
      __adminRecordId: toIdString(itemId),
    };

    if (sectionKey === "reviews" || sectionKey === "feedbacks") {
      setReviewDetail(normalizedDetail);
      setEditingRecords((current) => ({
        ...current,
        [sectionKey]: normalizedDetail,
      }));
      setEditingIds((current) => ({
        ...current,
        [sectionKey]: itemId,
      }));
      return;
    }

    setDrafts((current) => ({
      ...current,
      [sectionKey]: hydrateSectionDraft(sectionKey, normalizedDetail),
    }));
    setEditingRecords((current) => ({
      ...current,
      [sectionKey]: normalizedDetail,
    }));
    setEditingIds((current) => ({
      ...current,
      [sectionKey]: itemId,
    }));

    if (sectionKey === "orders") {
      setOrderDetailRecord(normalizedDetail);
    }
  };

  const handleEdit = async (sectionKey, itemId) => {
    attemptedRouteRecordRef.current = `${sectionKey}:${toIdString(itemId)}`;
    setSaving(true);
    setError("");
    setNotice("");
    clearAiAssistFeedback({ preservePrompt: false });
    setEditingDetailLoading((current) => ({
      ...current,
      [sectionKey]: true,
    }));
    setActiveSection(sectionKey);
    setEditingIds((current) => ({
      ...current,
      [sectionKey]: itemId,
    }));
    if (shouldSyncRecordInUrl) {
      navigate(
        buildAdminWorkspacePath({
          sectionKey,
          recordId: itemId,
        }),
        { replace: true },
      );
    }

    try {
      if (sectionKey === "feedbacks") {
        await loadFeedbackDetail(itemId);
        return;
      }

      const detailResponse = await authorizedRequest(sectionConfigs[sectionKey].detailPath(itemId));
      const detail = normalizeDetailResponse(detailResponse);

      if (!detail) {
        throw new Error("The detail API did not return valid data.");
      }

      if (sectionKey === "reviews" || sectionKey === "feedbacks") {
        setActiveSection(sectionKey);
        syncLoadedSectionRecord(sectionKey, itemId, detail);
        if (shouldSyncRecordInUrl) {
          navigate(
            buildAdminWorkspacePath({
              sectionKey,
              recordId: itemId,
            }),
            { replace: true },
          );
        }
        return;
      }

      syncLoadedSectionRecord(sectionKey, itemId, detail);
      if (shouldSyncRecordInUrl) {
        navigate(
          buildAdminWorkspacePath({
            sectionKey,
            recordId: itemId,
          }),
          { replace: true },
        );
      }
    } catch (requestError) {
      handleApiFailure(requestError, t("orders.loadDetailError"));
    } finally {
      setEditingDetailLoading((current) => ({
        ...current,
        [sectionKey]: false,
      }));
      setSaving(false);
    }
  };

  useEffect(() => {
    if (forcedSection) {
      return;
    }

    if (!routeRecordId) {
      attemptedRouteRecordRef.current = "";
      return;
    }

    if (!routeSectionKey) {
      return;
    }

    if (!accessibleSectionKeys.includes(routeSectionKey)) {
      return;
    }

    if (activeSection !== routeSectionKey) {
      setActiveSection(routeSectionKey);
    }

    if (routeRecordId) {
      const routeRequestKey = `${routeSectionKey}:${routeRecordId}`;

      if (
        activeSection === routeSectionKey &&
        hasLoadedSectionRecord(routeSectionKey, routeRecordId) &&
        (String(selectedOrderRecord?.id ?? "") === routeRecordId || routeSectionKey !== "orders")
      ) {
        attemptedRouteRecordRef.current = routeRequestKey;
        return;
      }

      if (editingDetailLoading[routeSectionKey]) {
        return;
      }

      if (attemptedRouteRecordRef.current === routeRequestKey) {
        return;
      }

      attemptedRouteRecordRef.current = routeRequestKey;
      void handleEdit(routeSectionKey, routeRecordId);
      return;
    }
  }, [
    accessibleSectionKeys,
    activeSection,
    hasActiveEditingId,
    hasLoadedSectionRecord,
    editingDetailLoading,
    forcedSection,
    resolvedEditingId,
    routeRecordId,
    routeSectionKey,
    selectedOrderRecord?.id,
  ]);

  useEffect(() => {
    const normalizedRouteOrderId = toIdString(routeOrderId);

    if (!normalizedRouteOrderId) {
      return;
    }

    if (activeSection !== "orders") {
      setActiveSection("orders");
    }

    if (resolvedEditingId === normalizedRouteOrderId && selectedOrderRecord?.id) {
      return;
    }

    void handleEdit("orders", normalizedRouteOrderId);
  }, [activeSection, resolvedEditingId, routeOrderId, selectedOrderRecord?.id]);

  const openPasswordModal = (user) => {
    if (!canChangeUserPassword(user)) {
      setNotice("");
      setError("You do not have permission to change this account password.");
      return;
    }

    setPasswordModal({
      open: true,
      userId: toIdString(user.id),
      fullName: user.fullName ?? "",
      email: user.email ?? "",
      role: user.role ?? "",
      workingStoreName: user.workingStoreName ?? "",
      password: "",
      confirmPassword: "",
      loading: false,
      error: "",
    });
  };

  const closePasswordModal = (force = false) => {
    if (passwordModal.loading && !force) {
      return;
    }

    setPasswordModal({
      open: false,
      userId: "",
      fullName: "",
      email: "",
      role: "",
      workingStoreName: "",
      password: "",
      confirmPassword: "",
      loading: false,
      error: "",
    });
  };

  const handlePasswordModalChange = (fieldName, value) => {
    setPasswordModal((current) => ({
      ...current,
      [fieldName]: value,
      error: "",
    }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordModal.userId) {
      setNotice("");
      setError("Choose the account before changing the password.");
      return;
    }

    const nextPassword = String(passwordModal.password ?? "").trim();
    const confirmPassword = String(passwordModal.confirmPassword ?? "").trim();

    if (!nextPassword) {
      setPasswordModal((current) => ({
        ...current,
        error: "Enter the new password before saving.",
      }));
      setNotice("");
      setError("Enter the new password before saving.");
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordModal((current) => ({
        ...current,
        error: "The new password must be at least 8 characters.",
      }));
      setNotice("");
      setError("The new password must be at least 8 characters.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordModal((current) => ({
        ...current,
        error: "The confirmation password does not match.",
      }));
      setNotice("");
      setError("The confirmation password does not match.");
      return;
    }

    setPasswordModal((current) => ({
      ...current,
      loading: true,
      error: "",
    }));
    setNotice("");
    setError("");

    try {
      const detailResponse = await authorizedRequest(sectionConfigs.users.detailPath(passwordModal.userId));
      const userDetail = normalizeDetailResponse(detailResponse);

      if (!userDetail) {
        throw new Error(t("orders.loadAccountError"));
      }

      if (!canChangeUserPassword(userDetail)) {
        throw new Error("You do not have permission to change this account password.");
      }

      const payload = serializeSectionDraft("users", {
        ...hydrateSectionDraft("users", userDetail),
        password: nextPassword,
      });

      const response = await authorizedRequest(sectionConfigs.users.updatePath(passwordModal.userId), {
        method: "PUT",
        body: payload,
      });

      setNotice(response?.message ?? "Account password updated.");
      closePasswordModal(true);
      await refreshAll({
        refreshLookups: true,
        refreshLists: true,
        nextQueries: listQueries,
      });
    } catch (requestError) {
      setPasswordModal((current) => ({
        ...current,
        loading: false,
        error: getApiErrorMessage(requestError, "Unable to change the account password."),
      }));
      handleApiFailure(requestError, "Unable to change the account password.");
      return;
    }

    setPasswordModal((current) => ({
      ...current,
      loading: false,
    }));
  };

  const handleDelete = async (sectionKey, itemId) => {
    if (!sectionConfigs[sectionKey]?.deletePath) {
      setNotice("");
      setError("This section does not support deleting records.");
      return;
    }

    if (!canDeleteSectionRecord(sectionKey)) {
      setNotice("");
      setError("Your current role cannot delete records in this section.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await authorizedRequest(sectionConfigs[sectionKey].deletePath(itemId), {
        method: "DELETE",
      });
      setNotice(response?.message ?? "Record deleted.");
      if (editingIds[sectionKey] === itemId) {
        resetSection(sectionKey);
      }
      if (["reviews", "feedbacks"].includes(sectionKey) && editingIds[sectionKey] === itemId) {
        setReviewDetail(null);
      }
      await refreshAll({
        refreshLookups: true,
        refreshLists: true,
        nextQueries: listQueries,
      });
    } catch (requestError) {
      handleApiFailure(requestError, "Unable to delete the record.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSectionState = async (sectionKey, item) => {
    const toggleConfig = sectionStatusToggleConfig[sectionKey];
    const sectionConfig = sectionConfigs[sectionKey];

    if (!toggleConfig || !sectionConfig?.detailPath || !sectionConfig?.updatePath) {
      setNotice("");
      setError("This section does not support activation changes.");
      return;
    }

    if (!canToggleSectionRecord(sectionKey)) {
      setNotice("");
      setError("Your current role cannot update activation in this section.");
      return;
    }

    const isCurrentlyActive = resolveSectionToggleValue(sectionKey, item);
    const confirmLabel = isCurrentlyActive
      ? toggleConfig.confirmActiveLabel
      : toggleConfig.confirmInactiveLabel;

    if (!window.confirm(`Are you sure you want to ${confirmLabel}?`)) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const detailResponse = await authorizedRequest(sectionConfig.detailPath(item.id));
      const detailRecord = normalizeDetailResponse(detailResponse);

      if (!detailRecord) {
        throw new Error(t("orders.loadRecordError"));
      }

      const toggleField = toggleConfig.field;
      const nextDraft = hydrateSectionDraft(sectionKey, detailRecord);
      nextDraft[toggleField] = isCurrentlyActive ? "false" : "true";

      const payload = serializeSectionDraft(sectionKey, nextDraft);
      const response = await authorizedRequest(sectionConfig.updatePath(item.id), {
        method: "PUT",
        body: payload,
      });

      const successStateLabel = isCurrentlyActive
        ? toggleConfig.inactiveLabel
        : toggleConfig.activeLabel;
      setNotice(response?.message ?? `Record ${successStateLabel} successfully.`);

      if (editingIds[sectionKey] === item.id) {
        await handleEdit(sectionKey, item.id);
      }

      await refreshAll({
        refreshLookups: true,
        refreshLists: true,
        nextQueries: listQueries,
      });
    } catch (requestError) {
      handleApiFailure(requestError, "Unable to update activation.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (["reviews", "feedbacks"].includes(activeSection)) {
        throw new Error("This admin page no longer supports creating or updating detail-only data.");
      }

      if (isManagerMode && !managerStoreId) {
        throw new Error("MANAGER account does not have a valid working store.");
      }

      if (isManagerMode && activeSection === "stores" && !hasActiveEditingId) {
        throw new Error("MANAGER can only update the current store and cannot create a new branch.");
      }

      if (activeSection === "orders" && !hasActiveEditingId) {
        throw new Error("Choose an order from the list before updating its status.");
      }

      if (activeSection === "users" && requiresWorkingStoreRole(activeDraft.role) && !activeDraft.workingStoreId) {
        throw new Error("This role requires an assigned working store.");
      }

      if (isManagerMode && activeSection === "users") {
        if (!allowedUserRoles.includes(activeDraft.role)) {
          throw new Error("MANAGER can only create or update STAFF and SHIPPER accounts.");
        }

        if (toIdString(activeDraft.workingStoreId) !== managerStoreId) {
          throw new Error("MANAGER can only assign employees to the current working store.");
        }
      }

      if (
        activeSection === "orders" &&
        ["PREPARING", "READY_FOR_SHIPPER", "OUT_FOR_DELIVERY", "COMPLETED"].includes(
          activeDraft.status,
        ) &&
        activeDraft.paymentStatus !== "PAID"
      ) {
        throw new Error("The order must be in PAID payment status before moving to a processing step.");
      }

      if (
        activeSection === "orders" &&
        activeDraft.status === "READY_FOR_SHIPPER" &&
        !activeDraft.deliveringShipperId
      ) {
        throw new Error("READY_FOR_SHIPPER status requires a delivery shipper ID.");
      }

      if (
        activeSection === "promotions" &&
        activeDraft.scope === "DISH" &&
        !String(activeDraft.applicableDishIdsText ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean).length
      ) {
        throw new Error("A DISH-scoped promotion requires at least one valid dishId.");
      }

      let payload = serializeSectionDraft(activeSection, activeDraft);

      if (isAdminRoleOnlyUserEdit) {
        const detailResponse = await authorizedRequest(sectionConfigs.users.detailPath(resolvedEditingId));
        const userDetail = normalizeDetailResponse(detailResponse);

        if (!userDetail) {
          throw new Error(t("orders.loadUserRoleError"));
        }

        payload = {
          fullName: String(userDetail.fullName ?? activeDraft.fullName ?? "").trim(),
          email: String(userDetail.email ?? activeDraft.email ?? "").trim(),
          role: activeDraft.role,
          workingStoreId: requiresWorkingStoreRole(activeDraft.role)
            ? Number(activeDraft.workingStoreId)
            : null,
          enabled: Boolean(userDetail.enabled),
        };

        if (requiresWorkingStoreRole(activeDraft.role) && !payload.workingStoreId) {
          throw new Error(
            "This role requires an assigned working store.",
          );
        }
      }

      if (isManagerMode) {
        if (activeSection === "users") {
          payload.workingStoreId = managerStoreId ? Number(managerStoreId) : null;
        }

        if (["events", "categories", "storeDishes"].includes(activeSection)) {
          payload.storeId = Number(managerStoreId);
        }

        if (activeSection === "news") {
          payload.relatedStoreId = managerStoreId ? Number(managerStoreId) : null;
        }
      }

      if (activeSection === "orders" && Object.keys(payload).length === 0) {
        throw new Error("Change at least one field before saving.");
      }
      const path = hasActiveEditingId
        ? activeConfig.updatePath(resolvedEditingId)
        : activeConfig.createPath;
      const method = hasActiveEditingId ? "PUT" : "POST";
      const response = await authorizedRequest(path, { method, body: payload });
      const responseDetail = normalizeDetailResponse(response);
      const targetRecordId = hasActiveEditingId
        ? toIdString(resolvedEditingId)
        : toIdString(responseDetail?.id ?? response?.id ?? response?.data?.id);
      let persistedDetail =
        responseDetail && toIdString(responseDetail.id ?? "") === targetRecordId
          ? responseDetail
          : null;

      if (!persistedDetail && targetRecordId && activeConfig?.detailPath) {
        try {
          const detailResponse = await authorizedRequest(activeConfig.detailPath(targetRecordId));
          persistedDetail = normalizeDetailResponse(detailResponse);
        } catch (detailError) {
          persistedDetail = null;
        }
      }

      setNotice(response?.message ?? "Changes saved successfully.");
      await refreshAll({
        refreshLookups: true,
        refreshLists: true,
        nextQueries: listQueries,
      });

      if (targetRecordId && persistedDetail) {
        syncLoadedSectionRecord(activeSection, targetRecordId, persistedDetail);
        if (shouldSyncRecordInUrl) {
          navigate(
            buildAdminWorkspacePath({
              sectionKey: activeSection,
              recordId: targetRecordId,
            }),
            { replace: true },
          );
        }
      } else if (!hasActiveEditingId) {
        resetSection(activeSection);
      }
    } catch (requestError) {
      handleApiFailure(requestError, "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const canDeleteSectionRecord = (sectionKey) => {
    if (!sectionConfigs[sectionKey]?.deletePath) {
      return false;
    }

    if (isManagerMode && sectionKey === "stores") {
      return false;
    }

    return true;
  };

  const canToggleSectionRecord = (sectionKey) => {
    if (!sectionStatusToggleConfig[sectionKey]) {
      return false;
    }

    if (!sectionConfigs[sectionKey]?.detailPath || !sectionConfigs[sectionKey]?.updatePath) {
      return false;
    }

    return true;
  };

  const canCreateRecord = (sectionKey) => {
    if (!sectionConfigs[sectionKey]?.createPath) {
      return false;
    }

    if (isManagerMode && sectionKey === "stores") {
      return false;
    }

    return true;
  };

  const renderPills = (items) => {
    const normalizedItems = Array.from(
      new Set(
        items
          .filter(Boolean)
          .map((item) => String(item).trim())
          .filter(Boolean),
      ),
    );

    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {normalizedItems.map((item, index) => (
          <span key={`${item}-${index}`} className={ui.pill}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  const getEntityImagePaths = (sectionKey, item) =>
    normalizeImagePathList(
      sectionKey === "reviews"
        ? item.targetImagePaths ?? item.targetImagePath
        : sectionKey === "orders"
          ? item.items?.[0]?.imagePaths
        : item.imagePaths ?? item.imagePath,
    );

  const renderEntityCard = (sectionKey, item) => {
    if (sectionKey === "users") {
      return (
        <article
          key={item.id}
          className="rounded-[1.75rem] border border-matcha-900/10 bg-white/70 p-5 shadow-[0_18px_44px_rgba(79,70,45,0.08)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-tea-900">{item.fullName ?? "No name yet"}</h3>
              <p className="mt-2 text-sm text-stone-600">{item.email ?? "No email yet"}</p>
              {renderPills([
                item.role ?? "Unknown role",
                item.enabled ? "Enabled" : "Disabled",
                item.verifiedAt ? "Verified" : "Not verified",
                item.workingStoreName ? `Store: ${item.workingStoreName}` : "",
              ])}
            </div>

            <div className="grid gap-1 text-right text-sm text-stone-500">
              <span>Created: {formatDateTime(item.createdAt)}</span>
              <span>Updated: {formatDateTime(item.updatedAt)}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-stone-600">
            <span>
              Assigned store:{" "}
              {item.workingStoreName
                ? item.workingStoreName
                : requiresWorkingStoreRole(item.role)
                  ? "Not assigned yet"
                  : "Not applicable"}
            </span>
            {item.workingStoreAddress ? (
              <span>Store address: {item.workingStoreAddress}</span>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-matcha-500 px-4 py-2 text-sm font-semibold text-foam"
              type="button"
              onClick={() => handleEdit(sectionKey, item.id)}
            >
              {isAdmin && sectionKey === "users" ? "Change role" : "Edit"}
            </button>
            {canChangeUserPassword(item) ? (
              <button
                className={ui.secondaryButton}
                type="button"
                onClick={() => openPasswordModal(item)}
              >
                Change password
              </button>
            ) : null}
            {canToggleSectionRecord(sectionKey) ? (
              <button
                className={
                  resolveSectionToggleValue(sectionKey, item)
                    ? "rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
                    : "rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                }
                type="button"
                onClick={() => handleToggleSectionState(sectionKey, item)}
              >
                {resolveSectionToggleValue(sectionKey, item)
                  ? sectionStatusToggleConfig[sectionKey]?.buttonActiveLabel ?? "Deactivate"
                  : sectionStatusToggleConfig[sectionKey]?.buttonInactiveLabel ?? "Activate"}
              </button>
            ) : null}
          </div>
        </article>
      );
    }

    const imagePaths = getEntityImagePaths(sectionKey, item);
    const imageUrl = getPrimaryImageUrl(imagePaths[0] ?? "");
    let title = item.name ?? item.title ?? item.targetLabel ?? "Note";
    let summary = item.description ?? item.comment ?? "";
    let details = [];
    let pills = [];
    let highlightedCode = "";

    if (sectionKey === "stores") {
      details = [
        item.address,
        item.area ? `Area: ${item.area}` : "",
        item.positionLabel ? `Position: ${item.positionLabel}` : "",
        item.hoursText ? `Hours: ${item.hoursText}` : "",
        item.contactEmail,
        item.phoneNumber,
        item.specialty ? `Featured item: ${item.specialty}` : "",
        item.personality ? `Personality: ${item.personality}` : "",
        item.highlightSummary ? `Highlight: ${item.highlightSummary}` : "",
      ];
      pills = [
        item.active ? "Active" : "Inactive",
        item.slug ? `slug: ${item.slug}` : "",
        item.openTime && item.closeTime ? `${item.openTime} - ${item.closeTime}` : "",
        ...(Array.isArray(item.serviceTags) ? item.serviceTags.slice(0, 3) : []),
        ...(Array.isArray(item.highlightTags) ? item.highlightTags.slice(0, 3) : []),
        imagePaths.length ? `${imagePaths.length} images` : "",
      ];
    } else if (sectionKey === "events") {
      details = [
        item.storeName ? `Store: ${item.storeName}` : "",
        item.slug ? `Slug: ${item.slug}` : "",
        item.location ? `Location: ${item.location}` : "",
        item.scheduleText ? `Schedule text: ${item.scheduleText}` : "",
        `From ${formatDateTime(item.startsAt)} to ${formatDateTime(item.endsAt)}`,
        item.capacity !== undefined && item.capacity !== null ? `Capacity: ${item.capacity}` : "",
        item.bookedCount !== undefined && item.bookedCount !== null ? `Booked: ${item.bookedCount}` : "",
        item.highlightSummary ? `Highlight: ${item.highlightSummary}` : "",
      ];
      pills = [
        item.active ? "Active" : "Inactive",
        item.storeName,
        item.slug ? `slug: ${item.slug}` : "",
        "Event",
        ...(Array.isArray(item.highlightTags) ? item.highlightTags.slice(0, 2) : []),
        imagePaths.length ? `${imagePaths.length} images` : "",
      ];
    } else if (sectionKey === "categories") {
      details = [
        item.storeName ? `Store: ${item.storeName}` : "",
        item.sortOrder !== undefined && item.sortOrder !== null ? `Order: ${item.sortOrder}` : "",
      ];
      pills = [
        item.active ? "Active" : "Inactive",
        item.storeName,
        "Category",
        imagePaths.length ? `${imagePaths.length} images` : "",
      ];
    } else if (sectionKey === "dishes") {
      details = [
        item.storeName ? `Store: ${item.storeName}` : "",
        item.categoryName ? `Category: ${item.categoryName}` : "",
        item.note ? `Note: ${item.note}` : "",
        item.status ? `Status: ${item.status}` : "",
        item.franchiseRequired ? "Can franchise" : "",
        item.franchiseNote ? `Franchise note: ${item.franchiseNote}` : "",
        item.highlightSummary ? `Highlight: ${item.highlightSummary}` : "",
      ];
      pills = [
        item.available ? "Available" : "Unavailable",
        formatCurrency(item.price),
        ...(Array.isArray(item.highlightTags) ? item.highlightTags.slice(0, 2) : []),
        imagePaths.length ? `${imagePaths.length} images` : "",
      ];
    } else if (sectionKey === "storeDishes") {
      title = item.dishName ?? item.name ?? "Store dish";
      summary = "";
      details = [
        item.storeName ? `Store: ${item.storeName}` : "",
        item.categoryName ? `Category: ${item.categoryName}` : "",
        `Base price: ${formatCurrency(item.basePrice)}`,
        item.priceOverride !== undefined && item.priceOverride !== null
          ? `Store price: ${formatCurrency(item.priceOverride)}`
          : "Store price: using the base price",
      ];
      pills = [
        item.available ? "Available" : "Unavailable",
        `Stock: ${item.quantity ?? 0}`,
        `Selling at: ${formatCurrency(item.effectivePrice)}`,
      ];
    } else if (sectionKey === "news") {
      title = item.title ?? "News";
      summary = item.summary ?? "";
      details = [
        item.relatedStoreName ? `Related store: ${item.relatedStoreName}` : "",
        item.publishedAt ? `Published at: ${formatDateTime(item.publishedAt)}` : "",
      ];
      pills = [
        item.published === false ? "Draft" : "Published",
        item.featured ? "Featured" : "",
        item.relatedStoreName ? `Store: ${item.relatedStoreName}` : "",
        imagePaths.length ? `${imagePaths.length} images` : "",
      ];
    } else if (sectionKey === "promotions") {
      title = item.name ?? item.code ?? "Promotion";
      summary = item.description ?? "";
      highlightedCode = String(item.code ?? "").trim();
      details = [
        `Scope: ${item.scope ?? "ORDER"}`,
        `Discount type: ${item.discountType ?? "Not set"}`,
        item.discountType === "PERCENT"
          ? `Discount value: ${item.discountValue ?? 0}%`
          : `Discount value: ${formatCurrency(item.discountValue)}`,
        item.minOrderAmount ?? item.minimumOrderAmount
          ? `Minimum order: ${formatCurrency(
              item.minOrderAmount ?? item.minimumOrderAmount,
            )}`
          : item.minOrderAmount === 0 || item.minimumOrderAmount === 0
          ? `Minimum order: ${formatCurrency(
              item.minOrderAmount ?? item.minimumOrderAmount,
            )}`
          : "",
        item.maxDiscountAmount ?? item.maximumDiscountAmount
          ? `Maximum discount: ${formatCurrency(
              item.maxDiscountAmount ?? item.maximumDiscountAmount,
            )}`
          : item.maxDiscountAmount === 0 || item.maximumDiscountAmount === 0
          ? `Maximum discount: ${formatCurrency(
              item.maxDiscountAmount ?? item.maximumDiscountAmount,
            )}`
          : "",
        item.usageLimit !== undefined && item.usageLimit !== null
          ? `Usage limit: ${item.usageLimit}`
          : "",
        item.discountTarget ? `Discount target: ${item.discountTarget}` : "",
        item.scope ? "Applies to signature items across all stores" : "",
        Array.isArray(item.applicableDishIds) && item.applicableDishIds.length
          ? `Applicable signature dish IDs: ${item.applicableDishIds.join(", ")}`
          : Array.isArray(item.promotionDishIds) && item.promotionDishIds.length
            ? `Promotion dish IDs: ${item.promotionDishIds.join(", ")}`
          : item.scope === "DISH"
            ? "Applicable signature dish IDs: none yet"
          : "",
        Array.isArray(item.eligibleUserLevelIds) && item.eligibleUserLevelIds.length
          ? `Eligible user level IDs: ${item.eligibleUserLevelIds.join(", ")}`
          : "",
        item.startsAt ? `Starts at: ${formatDateTime(item.startsAt)}` : "",
        item.endsAt ? `Ends at: ${formatDateTime(item.endsAt)}` : "",
      ];
      pills = [
        item.active ? "Active" : "Inactive",
        item.scope ?? "",
        item.discountType ?? "",
      ];
    } else if (sectionKey === "userLevels") {
      title = item.name ?? item.code ?? "User level";
      summary = item.storeName ? `Store: ${item.storeName}` : "";
      details = [
        item.code ? `Code: ${item.code}` : "",
        item.storeName ? `Store: ${item.storeName}` : "",
        item.storeSlug ? `Store slug: ${item.storeSlug}` : "",
        item.minPaidAmount !== undefined && item.minPaidAmount !== null
          ? `Minimum paid amount: ${formatCurrency(item.minPaidAmount)}`
          : "",
      ];
      pills = [
        item.active ? "Active" : "Inactive",
        item.code ?? "",
        item.storeId ? `storeId: ${item.storeId}` : "",
      ];
    } else if (sectionKey === "orders") {
      const orderStage = resolveOrderStage(item);
      const orderStageMeta = getOrderStageMeta(orderStage);
      const isCompactOrderCard = isOrdersWorkspaceOnly;

      title = item.storeName ? `Order #${item.id} | ${item.storeName}` : `Order #${item.id}`;
      summary = isCompactOrderCard
        ? [
            `${item.items?.length ?? 0} line items`,
            item.deliveryFullName ? `Recipient: ${item.deliveryFullName}` : "",
            item.deliveryType ? formatDeliveryTypeLabel(item.deliveryType) : "",
          ]
            .filter(Boolean)
            .join(" | ")
        : `${item.items?.length ?? 0} line items`;
      details = isCompactOrderCard
        ? [
            `Total amount: ${formatCurrency(item.totalAmount)}`,
            orderStage ? `Stage: ${orderStageMeta.label}` : "",
            `Status: ${item.status ?? "Not set"}`,
            item.paymentStatus ? `Payment: ${item.paymentStatus}` : "",
            item.scheduledDeliveryAt ? `Scheduled for: ${formatDateTime(item.scheduledDeliveryAt)}` : "",
          ]
        : [
            `Total amount: ${formatCurrency(item.totalAmount)}`,
            orderStage ? `Stage: ${orderStageMeta.label}` : "",
            `Status: ${item.status ?? "Not set"}`,
            item.paymentStatus ? `Payment: ${item.paymentStatus}` : "",
            item.storeName ? `Store: ${item.storeName}` : "",
            item.promotionCode ? `Promotion: ${item.promotionCode}` : "",
            item.promotionScope ? `Promotion scope: ${item.promotionScope}` : "",
            item.promotionEligibleAmount
              ? `Eligible amount: ${formatCurrency(item.promotionEligibleAmount)}`
              : "",
            Array.isArray(item.promotionDishIds) && item.promotionDishIds.length
              ? `Promotion dish IDs: ${item.promotionDishIds.join(", ")}`
              : "",
            item.deliveryType ? `Delivery type: ${item.deliveryType}` : "",
            item.scheduledDeliveryAt ? `Scheduled for: ${formatDateTime(item.scheduledDeliveryAt)}` : "",
            item.statusSummary ? `Progress: ${item.statusSummary}` : "",
            item.confirmedByUserName
              ? `Confirmed by: ${item.confirmedByUserName}${item.confirmedAt ? ` | ${formatDateTime(item.confirmedAt)}` : ""}`
              : item.confirmedAt
                ? `Confirmed at: ${formatDateTime(item.confirmedAt)}`
                : "",
            item.preparingStaffName ? `Store operator: ${item.preparingStaffName}` : "",
            item.deliveringShipperName ? `Delivery shipper: ${item.deliveringShipperName}` : "",
            item.deliveryFullName ? `Recipient: ${item.deliveryFullName}` : "",
          ];
      pills = [
        orderStageMeta.label,
        item.status ?? "No status yet",
        item.paymentStatus ?? "",
        item.deliveryType ?? "",
        isCompactOrderCard
          ? ""
          : `${item.items?.reduce((sum, orderItem) => sum + Number(orderItem.quantity ?? 0), 0) ?? 0} products`,
      ];
    } else if (sectionKey === "reviews") {
      title = item.title || item.targetLabel || "Review";
      summary = item.comment ?? "";
      details = [
        item.userName ? `User: ${item.userName}` : item.userEmail ? `User: ${item.userEmail}` : "",
        item.targetLabel ? `Target: ${item.targetLabel}` : "",
      ];
      pills = [
        item.targetType,
        `${item.rating ?? "?"}/5`,
        item.approved === false ? "Hidden" : "Visible",
        imagePaths.length ? `${imagePaths.length} target images` : "",
      ];
    } else if (sectionKey === "feedbacks") {
      title = item.subject || item.relatedStoreName || "Feedback";
      summary = item.message ?? "";
      details = [
        item.userName ? `User: ${item.userName}` : item.userEmail ? `User: ${item.userEmail}` : "",
        item.category ? `Category: ${item.category}` : "",
        item.relatedStoreName ? `Store: ${item.relatedStoreName}` : "",
        item.relatedStoreAddress ? `Address: ${item.relatedStoreAddress}` : "",
        hasFeedbackReply(item) ? `Reply sent: ${formatDateTime(item.repliedAt)}` : "",
      ];
      pills = [
        feedbackReplyFieldsPresent(item) ? (hasFeedbackReply(item) ? "Replied" : "Awaiting reply") : "",
        item.category ?? "",
        item.repliedByUserRole ? `reply by ${item.repliedByUserRole}` : "",
        item.relatedStoreSlug ? `slug: ${item.relatedStoreSlug}` : "",
        item.relatedStoreId ? `storeId: ${item.relatedStoreId}` : "",
      ];
    }

    return (
      <article
        key={item.id}
        className="min-w-0 overflow-hidden rounded-[1.75rem] border border-matcha-900/10 bg-white/70 p-5 shadow-[0_18px_44px_rgba(79,70,45,0.08)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          {imageUrl ? (
            <div className="h-36 overflow-hidden rounded-[1.5rem] border border-matcha-900/10 bg-stone-100 sm:w-44">
              <SmartImage
                className="h-full w-full object-cover"
                src={imageUrl}
                alt={title}
                loading="lazy"
                fallbackClassName="grid h-full w-full place-items-center bg-stone-100 text-xs text-stone-500"
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 overflow-hidden">
                <h3 className="max-w-full truncate text-xl font-semibold text-tea-900">{title}</h3>
                {summary ? (
                  <p
                    className={`mt-3 text-sm text-stone-600 ${
                      sectionKey === "news" ? "max-w-full truncate leading-6" : "leading-7"
                    }`}
                    title={summary}
                  >
                    {summary}
                  </p>
                ) : null}
                {highlightedCode ? (
                  <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-3 rounded-[1.2rem] border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-[0_10px_24px_rgba(194,142,55,0.12)]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                      Promo code
                    </span>
                    <code className="max-w-full truncate rounded-full bg-white px-3 py-1 font-mono text-sm font-bold tracking-[0.22em] text-amber-950">
                      {highlightedCode}
                    </code>
                  </div>
                ) : null}
                {renderPills(pills)}
              </div>

              <div className="grid shrink-0 gap-1 text-right text-sm text-stone-500">
                <span>Created: {formatDateTime(item.createdAt)}</span>
                <span>Updated: {formatDateTime(item.updatedAt)}</span>
              </div>
            </div>

            {details.filter(Boolean).length ? (
              <div className="mt-4 grid gap-2 text-sm text-stone-600">
                {details.filter(Boolean).map((detail) => (
                  <span key={detail} className={sectionKey === "news" ? "truncate" : ""} title={detail}>
                    {detail}
                  </span>
                ))}
              </div>
            ) : null}

            {imagePaths.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {imagePaths.slice(1, 5).map((extraImagePath) => (
                  <div
                    key={extraImagePath}
                    className="h-14 w-14 overflow-hidden rounded-2xl border border-matcha-900/10 bg-stone-100"
                  >
                    <SmartImage
                      className="h-full w-full object-cover"
                      src={extraImagePath}
                      alt={title}
                      loading="lazy"
                      fallbackClassName="grid h-full w-full place-items-center bg-stone-100 text-[10px] text-stone-500"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-matcha-500 px-4 py-2 text-sm font-semibold text-foam"
                type="button"
                onClick={() => handleEdit(sectionKey, item.id)}
              >
                {sectionKey === "reviews" || sectionKey === "feedbacks"
                  ? "Details"
                  : sectionKey === "orders"
                    ? "Manage"
                    : isAdmin && sectionKey === "users"
                      ? "Change role"
                    : "Edit"}
              </button>
              {canToggleSectionRecord(sectionKey) ? (
                <button
                  className={
                    resolveSectionToggleValue(sectionKey, item)
                      ? "rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
                      : "rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                  }
                  type="button"
                  onClick={() => handleToggleSectionState(sectionKey, item)}
                >
                  {resolveSectionToggleValue(sectionKey, item)
                    ? sectionStatusToggleConfig[sectionKey]?.buttonActiveLabel ?? "Deactivate"
                    : sectionStatusToggleConfig[sectionKey]?.buttonInactiveLabel ?? "Activate"}
                </button>
              ) : canDeleteSectionRecord(sectionKey) ? (
                <button
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                  type="button"
                  onClick={() => handleDelete(sectionKey, item.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderOrderWorkspace = () => {
    const actionableOrderActions = (isManagerMode ? selectedOrderActions : []).filter((action) =>
      ["CONFIRM_ORDER", "CANCEL_ORDER", "MARK_PAID", "GENERATE_INVOICE"].includes(action),
    );
    const orderStatusMeta = getOrderStatusMeta(selectedOrderRecord?.status);
    const paymentStatusMeta = getPaymentStatusMeta(selectedOrderRecord?.paymentStatus);
    const orderStageMeta = getOrderStageMeta(resolveOrderStage(selectedOrderRecord));
    const normalizedSelectedOrderStatus = String(selectedOrderRecord?.status ?? "")
      .trim()
      .toUpperCase();
    const normalizedSelectedPaymentStatus = String(selectedOrderRecord?.paymentStatus ?? "")
      .trim()
      .toUpperCase();
    const canAssignShipper =
      isManagerMode &&
      normalizedSelectedPaymentStatus === "PAID" &&
      ["PREPARING", "READY_FOR_SHIPPER"].includes(normalizedSelectedOrderStatus);
    const hasWorkflowActions = actionableOrderActions.length > 0 || canAssignShipper;
    const hasViewerActions =
      hasWorkflowActions || Boolean(canViewSelectedOrderInvoice && selectedOrderInvoicePreviewUrl);

    return (
      <section className="grid content-start self-start gap-4">
        <div className={`${ui.card} sticky top-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                Order workflow
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                {selectedOrderRecord ? `Order #${selectedOrderRecord.id}` : "Choose an order"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Review available order actions, invoice links, and QR scan history in one place.
              </p>
            </div>

            {hasActiveEditingId ? (
              <button
                className="rounded-full border border-matcha-900/10 px-4 py-2 text-sm font-semibold text-tea-900"
                type="button"
                onClick={() => resetSection("orders")}
              >
                Clear order selection
              </button>
            ) : null}
          </div>

          {selectedStore ? (
            <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
              This order workspace is scoped to store <strong>{selectedStore.name}</strong>.
            </div>
          ) : null}

          {orderScanError ? (
            <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50/80 px-4 py-4 text-sm leading-7 text-red-700">
              {orderScanError}
            </div>
          ) : null}

          <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              QR confirmation stays on mobile
            </p>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Use the order list on the left for website review, and use the mobile app for
              scan-based pickup confirmation.
            </p>
          </div>

          {!selectedOrderRecord ? (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm leading-7 text-stone-600">
              Choose an order on the left to inspect its server-driven actions, invoice details,
              and scan history.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Order overview
                    </p>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      {selectedOrderRecord.storeName
                        ? `Store: ${selectedOrderRecord.storeName}`
                        : "Track the order status, payment amount, and delivery details."}
                    </p>
                  </div>

                  <div className="grid gap-1 text-right text-sm text-stone-500">
                    <span>Created: {formatDateTime(selectedOrderRecord.createdAt)}</span>
                    <span>Updated: {formatDateTime(selectedOrderRecord.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(242,247,235,0.92),rgba(255,255,255,0.92))] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Order status
                    </p>
                    <strong className="mt-2 block text-lg text-tea-900">{orderStatusMeta.label}</strong>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{orderStageMeta.label}</p>
                  </article>

                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(242,247,235,0.92),rgba(255,255,255,0.92))] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Payment
                    </p>
                    <strong className="mt-2 block text-lg text-tea-900">{paymentStatusMeta.label}</strong>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {selectedOrderRecord.paidAt
                        ? formatDateTime(selectedOrderRecord.paidAt)
                        : "Not paid yet"}
                    </p>
                  </article>

                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(242,247,235,0.92),rgba(255,255,255,0.92))] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Total amount
                    </p>
                    <strong className="mt-2 block text-lg text-tea-900">
                      {formatCurrency(selectedOrderRecord.totalAmount)}
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Subtotal {formatCurrency(selectedOrderRecord.subtotalAmount)}
                    </p>
                  </article>

                  <article className="rounded-[1.2rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(242,247,235,0.92),rgba(255,255,255,0.92))] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Delivery
                    </p>
                    <strong className="mt-2 block text-lg text-tea-900">
                      {formatDeliveryTypeLabel(selectedOrderRecord.deliveryType)}
                    </strong>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {selectedOrderRecord.scheduledDeliveryAt
                        ? formatDateTime(selectedOrderRecord.scheduledDeliveryAt)
                        : "Delivery"}
                    </p>
                  </article>
                </div>

                <div className="mt-4 grid gap-4">
                  {selectedOrderRecord.statusSummary ? (
                    <div className="rounded-[1.15rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-3 text-sm leading-7 text-stone-700">
                      {selectedOrderRecord.statusSummary}
                    </div>
                  ) : null}

                  <div className="rounded-[1.25rem] border border-matcha-900/10 bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {t("orderDetail.deliveryDetails")}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selectedOrderRecord.deliveryFullName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.recipient")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveryFullName}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.deliveryPhoneNumber ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.phone")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveryPhoneNumber}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.deliveryAddress ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3 sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.address")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveryAddress}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.preparingStaffName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.storeProcessor")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.preparingStaffName}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.confirmedByUserName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.confirmedBy")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.confirmedByUserName}
                          </strong>
                          {selectedOrderRecord.confirmedAt ? (
                            <p className="mt-2 text-sm text-stone-600">
                              {formatDateTime(selectedOrderRecord.confirmedAt)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {selectedOrderRecord.deliveringShipperName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.deliveryShipper")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveringShipperName}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.scheduledDeliveryAt ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3 sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{t("orderDetail.scheduledFor")}</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {formatDateTime(selectedOrderRecord.scheduledDeliveryAt)}
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <OrderStatusTracker order={selectedOrderRecord} compact={isOrdersWorkspaceOnly} />
                </div>

                {isManagerMode ? (
                  <>
                    {canAssignShipper ? (
                      <div className="mt-5 rounded-[1.25rem] border border-matcha-900/10 bg-white/78 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                              {t("orderDetail.assignShipper")}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-stone-600">
                              {normalizedSelectedOrderStatus === "READY_FOR_SHIPPER"
                                ? t("orderDetail.assignShipperUpdateHint")
                                : t("orderDetail.assignShipperChooseHint")}
                            </p>
                          </div>
                          {selectedOrderRecord.deliveringShipperName ? (
                            <span className={ui.pill}>
                              {t("orderDetail.currentlyAssigned", { name: selectedOrderRecord.deliveringShipperName })}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                          <select
                            className={ui.input}
                            value={managerAssignedShipperId}
                            onChange={(event) => setManagerAssignedShipperId(event.target.value)}
                          >
                            <option value="">{t("orderDetail.selectShipper")}</option>
                            {managerShipperOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <button
                            className={ui.primaryButton}
                            disabled={
                              orderActionLoading === "MANAGER_ASSIGN_SHIPPER" ||
                              !managerAssignedShipperId ||
                              !managerShipperOptions.length
                            }
                            type="button"
                            onClick={() => void handleManagerAssignShipper()}
                          >
                            {orderActionLoading === "MANAGER_ASSIGN_SHIPPER"
                              ? t("workspace.processing")
                              : normalizedSelectedOrderStatus === "READY_FOR_SHIPPER"
                                ? t("orderDetail.updateShipper")
                                : t("orderDetail.nextStep")}
                          </button>
                        </div>

                        {!managerShipperOptions.length ? (
                          <p className="mt-3 text-sm leading-7 text-amber-800">
                            {t("orderDetail.noShipperAvailable")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {hasViewerActions ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {actionableOrderActions.map((actionKey) => (
                          <button
                            key={actionKey}
                            className={ui.primaryButton}
                            disabled={orderActionLoading === actionKey}
                            type="button"
                            onClick={() => void handleOrderWorkflowAction(actionKey)}
                          >
                            {orderActionLoading === actionKey
                              ? "Processing..."
                              : getOrderActionLabel(actionKey)}
                          </button>
                        ))}

                        {canViewSelectedOrderInvoice && selectedOrderInvoicePreviewUrl ? (
                          <button
                            className={ui.secondaryButton}
                            type="button"
                            onClick={() => setInvoiceModalOpen(true)}
                          >
                            View invoice
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {!hasViewerActions ? (
                      <div className="mt-5 rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm leading-7 text-stone-600">
                        There are no additional workflow actions available for this order.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {canViewSelectedOrderInvoice && selectedOrderInvoicePreviewUrl ? (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => setInvoiceModalOpen(true)}
                        >
                          View invoice
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-5 rounded-[1.25rem] border border-matcha-500/20 bg-matcha-50 px-4 py-3 text-sm text-matcha-700">
                      ADMIN can only view orders. Only the store MANAGER can confirm orders,
                      assign a shipper, update payment, or create an invoice.
                    </div>
                  </>
                )}

                <InvoicePreviewModal
                  open={invoiceModalOpen}
                  order={selectedOrderRecord}
                  onClose={() => setInvoiceModalOpen(false)}
                />
              </div>

              <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Order items
                </p>

                {selectedOrderRecord.items?.length ? (
                  <div className="mt-4 grid gap-3">
                    {selectedOrderRecord.items.map((item) => (
                      <article
                        key={item.id || `${item.dishId}-${item.dishName}`}
                        className="rounded-[1rem] border border-matcha-900/10 bg-white/70 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold text-tea-900">
                              {item.dishName || "Dish"}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                              Quantity: {item.quantity || 0}
                            </p>
                            {item.storeName ? (
                              <p className="mt-1 text-sm leading-6 text-stone-500">{item.storeName}</p>
                            ) : null}
                          </div>

                          <div className="text-right text-sm leading-6 text-stone-600">
                            <div>{formatCurrency(item.unitPrice)}</div>
                            <strong className="text-base text-matcha-700">
                              {formatCurrency(item.totalPrice || item.lineTotal)}
                            </strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm leading-7 text-stone-600">
                    This order does not include line-item details yet.
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    QR scan history
                  </p>
                  <button
                    className={ui.secondaryButton}
                    disabled={orderScanLoading}
                    type="button"
                    onClick={() => void loadOrderScanHistory(selectedOrderRecord.id)}
                  >
                    {orderScanLoading ? "Refreshing..." : "Refresh scan history"}
                  </button>
                </div>

                {orderScanLoading ? (
                  <div className="mt-4 rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm leading-7 text-stone-600">
                    Loading QR scan history...
                  </div>
                ) : orderScanHistory.length ? (
                  <div className="mt-4 grid gap-3">
                    {orderScanHistory.map((entry) => (
                      <article
                        key={entry.id || `${entry.scannedAt}-${entry.action}-${entry.scannedByUserId}`}
                        className="rounded-[1rem] border border-matcha-900/10 bg-white/70 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold text-tea-900">
                              {entry.action || "SCAN"}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                              {entry.scannedByUserName || "Unknown user"} | {entry.role || "Unknown role"}
                            </p>
                          </div>

                          <div className="text-right text-sm text-stone-500">
                            <div>{entry.success ? "Success" : "Failed"}</div>
                            <div>{formatDateTime(entry.scannedAt)}</div>
                          </div>
                        </div>

                        {entry.failureReason ? (
                          <p className="mt-3 text-sm leading-7 text-red-700">{entry.failureReason}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm leading-7 text-stone-600">
                    There is no QR scan history for this order yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderPasswordModal = () => {
    if (!passwordModal.open) {
      return null;
    }

    const isSelfPassword = toIdString(passwordModal.userId) === currentUserId;

    return (
      <div
        className="fixed inset-0 z-[116] flex items-center justify-center bg-[rgba(36,29,20,0.44)] px-4 py-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={() => closePasswordModal()}
      >
        <form
          className="w-full max-w-2xl rounded-[2rem] border border-matcha-900/10 bg-[#f8f4ec] p-6 shadow-[0_28px_80px_rgba(39,30,19,0.28)] sm:p-7"
          onClick={(event) => event.stopPropagation()}
          onSubmit={handlePasswordSubmit}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={ui.eyebrow}>{t("passwordModal.eyebrow")}</p>
              <h2 className="text-3xl font-bold tracking-tight text-tea-900">
                {isSelfPassword ? t("passwordModal.titleSelf") : t("passwordModal.titleOther")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {passwordModal.fullName || t("passwordModal.unnamedAccount")}{" "}
                {passwordModal.email ? `| ${passwordModal.email}` : ""}
              </p>
            </div>

            <button
              className={ui.secondaryButton}
              type="button"
              onClick={() => closePasswordModal()}
              disabled={passwordModal.loading}
            >
              {t("passwordModal.close")}
            </button>
          </div>

          <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-5 text-sm leading-7 text-stone-700 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{t("passwordModal.roleLabel")}</p>
              <p className="mt-1 font-semibold text-tea-900">{passwordModal.role || t("passwordModal.unknownRole")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{t("passwordModal.storeScope")}</p>
              <p className="mt-1 font-semibold text-tea-900">
                {passwordModal.workingStoreName || t("passwordModal.noStoreAssigned")}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">{t("passwordModal.newPassword")}</span>
              <input
                className={ui.input}
                type="password"
                autoComplete="new-password"
                placeholder={t("passwordModal.newPasswordPlaceholder")}
                value={passwordModal.password}
                onChange={(event) => handlePasswordModalChange("password", event.target.value)}
                disabled={passwordModal.loading}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">{t("passwordModal.confirmNewPassword")}</span>
              <input
                className={ui.input}
                type="password"
                autoComplete="new-password"
                placeholder={t("passwordModal.confirmNewPasswordPlaceholder")}
                value={passwordModal.confirmPassword}
                onChange={(event) =>
                  handlePasswordModalChange("confirmPassword", event.target.value)
                }
                disabled={passwordModal.loading}
              />
            </label>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
            {t("passwordModal.hint")}
          </div>

          {passwordModal.error ? (
            <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {passwordModal.error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button className={ui.primaryButton} type="submit" disabled={passwordModal.loading}>
              {passwordModal.loading ? t("passwordModal.updating") : t("passwordModal.saveNewPassword")}
            </button>
            <button
              className={ui.secondaryButton}
              type="button"
              onClick={() => closePasswordModal()}
              disabled={passwordModal.loading}
            >
              {t("passwordModal.cancel")}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderInfoModal = () => {
    if (!infoModalKey) {
      return null;
    }

    const isDashboardModal = infoModalKey === "dashboard";

    return (
      <div
        className="fixed inset-0 z-[115] flex items-center justify-center bg-[rgba(36,29,20,0.44)] px-4 py-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={() => setInfoModalKey("")}
      >
        <div
          className="w-full max-w-5xl rounded-[2rem] border border-matcha-900/10 bg-[#f8f4ec] p-6 shadow-[0_28px_80px_rgba(39,30,19,0.28)] sm:p-7"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={ui.eyebrow}>
                {isDashboardModal ? dashboardLabel : "Store scope"}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-tea-900">
                {isDashboardModal ? dashboardHeading : storeScopeHeading}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                {isDashboardModal ? dashboardCopy : storeScopeCopy}
              </p>
            </div>

            <button
              className={ui.secondaryButton}
              type="button"
              onClick={() => setInfoModalKey("")}
            >
              Close
            </button>
          </div>

          {isDashboardModal ? (
            <div className="mt-6 grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {(isAdmin ? globalStats : storeScopeStats).map((stat) => (
                  <article
                    key={`modal-${stat.label}`}
                    className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{stat.label}</p>
                    <strong className="mt-2 block text-2xl text-tea-900">{stat.value}</strong>
                  </article>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-matcha-900/10 bg-white/72 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={ui.eyebrow}>{t("storeAnalytics.topSellingDishes")}</p>
                    <h3 className="mt-2 text-xl font-semibold text-tea-900">
                      {revenueSummary?.scopeStoreName
                        ? t("storeAnalytics.bestSellersInStore", { name: revenueSummary.scopeStoreName })
                        : t("storeAnalytics.bestSellersCurrentScope")}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      {t("storeAnalytics.topSellingBackendNote")}
                    </p>
                  </div>
                </div>

                {topSellingDishes.length ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {topSellingDishes.map((dish, index) => {
                      const dishImage = getPrimaryImageUrl(dish.imagePaths?.[0] ?? "");

                      return (
                        <article
                          key={`top-selling-${dish.storeId}-${dish.dishId}-${index}`}
                          className="grid gap-4 rounded-[1.5rem] border border-matcha-900/10 bg-[#fbfaf6] p-4 sm:grid-cols-[6rem_1fr]"
                        >
                          <div className="overflow-hidden rounded-[1.25rem] border border-matcha-900/10 bg-stone-100">
                            {dishImage ? (
                              <SmartImage
                                className="h-24 w-full object-cover"
                                src={dishImage}
                                alt={dish.dishName || "Top selling dish"}
                                loading="lazy"
                                fallbackClassName="grid h-24 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                              />
                            ) : (
                              <div className="grid h-24 w-full place-items-center bg-stone-100 text-xs text-stone-500">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="grid gap-2">
                            <div>
                              <p className="text-sm font-semibold text-tea-900">
                                {dish.dishName || "Dish"}
                              </p>
                              <p className="text-sm text-stone-600">
                                {dish.storeName || "All stores"}
                              </p>
                            </div>
                            <div className="grid gap-1 text-sm text-stone-600">
                              <span>{t("storeAnalytics.quantitySold", { count: dish.quantitySold })}</span>
                              <span>{t("storeAnalytics.orderCount", { count: dish.orderCount })}</span>
                              <span>{t("storeAnalytics.revenueLabel", { value: formatCurrency(dish.revenue) })}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-matcha-900/15 bg-[#fbfaf6] p-4 text-sm leading-7 text-stone-600">
                    {t("storeAnalytics.noTopSellingData")}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4">
                {selectedStoreImages.length ? (
                  <div className="overflow-hidden rounded-[1.75rem] border border-matcha-900/10 bg-stone-100">
                    <SmartImage
                      className="h-64 w-full object-cover"
                      src={selectedStoreImages[0]}
                      alt={selectedStore?.name || "Store scope"}
                      loading="lazy"
                      fallbackClassName="grid h-64 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                    />
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/68 p-5 text-sm leading-7 text-stone-600">
                    {selectedStore
                      ? t("storeAnalytics.noStoreImage")
                      : t("storeAnalytics.fullSystemView")}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {storeScopeStats.map((stat) => (
                    <article
                      key={`scope-${stat.label}`}
                      className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{stat.label}</p>
                      <strong className="mt-2 block text-2xl text-tea-900">{stat.value}</strong>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 text-sm leading-7 text-stone-600">
                {selectedStore ? (
                  <>
                    <span>Store: {selectedStore.name}</span>
                    <span>Address: {selectedStore.address ?? "Not available"}</span>
                    <span>Slug: {selectedStore.slug ?? "Not available"}</span>
                    <span>Area: {selectedStore.area ?? "Not available"}</span>
                    <span>Position label: {selectedStore.positionLabel ?? "Not available"}</span>
                    <span>Hours: {selectedStore.hoursText ?? "Not available"}</span>
                    <span>
                      Opening hours: {selectedStore.openTime ?? "??"} - {selectedStore.closeTime ?? "??"}
                    </span>
                    <span>Personality: {selectedStore.personality ?? "Not available"}</span>
                    <span>Design signature: {selectedStore.designSignature ?? "Not available"}</span>
                    <span>Franchise atmosphere: {selectedStore.franchiseMood ?? "Not available"}</span>
                    <span>Featured item: {selectedStore.specialty ?? "Not available"}</span>
                    {selectedStore.serviceTags?.length ? (
                      <span>Service tags: {selectedStore.serviceTags.join(", ")}</span>
                    ) : null}
                    <span>Email: {selectedStore.contactEmail ?? "Not available"}</span>
                    <span>Phone number: {selectedStore.phoneNumber ?? "Not available"}</span>
                    <span>Status: {selectedStore.active ? "Active" : "Inactive"}</span>
                    <span>{selectedStore.description || "No store description yet."}</span>
                  </>
                ) : (
                  <>
                    <span>Viewing the entire system.</span>
                    <span>
                      When you select a store, events, categories, dishes, orders, reviews, and
                      feedback are filtered accordingly for faster operations.
                    </span>
                    <span>
                      Each module automatically aligns with the currently selected store scope.
                    </span>
                    <span>
                      When you select an order, the order workspace shows invoice actions and QR
                      scan history for this same scope.
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStoreAnalyticsPanel = () => {
    if (!storeWorkspaceAnalytics) {
      return null;
    }

    return (
      <section className="rounded-[1.75rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,242,233,0.9))] p-5 shadow-[0_18px_38px_rgba(88,72,41,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
              Store analytics
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-tea-900">
              Revenue, best sellers, and payment flow
            </h3>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              Scope: <strong>{storeWorkspaceAnalytics.scopeLabel}</strong>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/82 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Avg payment time
              </p>
              <strong className="mt-2 block text-2xl text-tea-900">
                {formatDurationMinutes(storeWorkspaceAnalytics.averagePaymentMinutes)}
              </strong>
            </article>
            <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/82 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Avg order value
              </p>
              <strong className="mt-2 block text-2xl text-tea-900">
                {formatCurrency(storeWorkspaceAnalytics.averageOrderValue)}
              </strong>
            </article>
            <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/82 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Paid orders
              </p>
              <strong className="mt-2 block text-2xl text-tea-900">
                {formatCompactMetric(storeWorkspaceAnalytics.paidOrders)}
              </strong>
            </article>
            <article className="rounded-[1.35rem] border border-matcha-900/10 bg-white/82 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Payment conversion
              </p>
              <strong className="mt-2 block text-2xl text-tea-900">
                {storeWorkspaceAnalytics.paymentConversion.toFixed(0)}%
              </strong>
            </article>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/78 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Revenue trend
                </p>
                <h4 className="mt-2 text-lg font-semibold text-tea-900">
                  Paid revenue in the last 7 days
                </h4>
              </div>
              <span className="rounded-full bg-matcha-500/10 px-3 py-1 text-xs font-semibold text-matcha-700">
                7-day live window
              </span>
            </div>

            <div className="mt-5 grid grid-cols-7 items-end gap-3">
              {storeWorkspaceAnalytics.recentDays.map((day) => (
                <div key={day.key} className="flex flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end rounded-[1rem] bg-[#f4efe4] px-2 py-2">
                    <div
                      className="w-full rounded-[0.85rem] bg-gradient-to-t from-matcha-600 to-matcha-400"
                      style={{
                        height: `${Math.max(
                          (day.revenue / storeWorkspaceAnalytics.revenuePeak) * 100,
                          day.revenue > 0 ? 12 : 6,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-tea-900">{day.label}</p>
                    <p className="text-[11px] text-stone-500">{formatCompactMetric(day.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/78 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Order pipeline
            </p>
            <h4 className="mt-2 text-lg font-semibold text-tea-900">
              Current fulfillment mix
            </h4>

            <div className="mt-5 grid gap-3">
              {storeWorkspaceAnalytics.pipeline.map((item) => (
                <div key={item.label} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-tea-900">{item.label}</span>
                    <strong className="text-tea-900">{item.count}</strong>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#efe8d7]">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-[#8ea66b] to-[#4c6b52]"
                      style={{
                        width: `${Math.max(
                          (item.count / storeWorkspaceAnalytics.pipelinePeak) * 100,
                          item.count > 0 ? 10 : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/78 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Best seller menu
                </p>
                <h4 className="mt-2 text-lg font-semibold text-tea-900">
                  Top dishes by sold quantity
                </h4>
              </div>
            </div>

            {storeWorkspaceAnalytics.bestSellerMenu.length ? (
              <div className="mt-5 grid gap-4">
                {storeWorkspaceAnalytics.bestSellerMenu.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-tea-900">
                          {item.label}
                        </p>
                        <p className="text-xs text-stone-500">
                          {t("storeAnalytics.revenueLabel", { value: formatCurrency(item.revenue) })}
                        </p>
                      </div>
                      <strong className="shrink-0 text-base text-matcha-700">
                        {item.quantity}
                      </strong>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#efe8d7]">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-[#c8a25e] to-[#7f9a5a]"
                        style={{
                          width: `${Math.max(
                            (item.quantity / storeWorkspaceAnalytics.bestSellerPeak) * 100,
                            item.quantity > 0 ? 12 : 0,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.3rem] border border-dashed border-matcha-900/15 bg-[#fcfaf4] p-4 text-sm text-stone-600">
                {t("storeAnalytics.noBestSellerData")}
              </div>
            )}
          </article>

          <article className="rounded-[1.5rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(36,56,46,0.98),rgba(53,80,60,0.96))] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              {t("storeAnalytics.revenueControl")}
            </p>
            <h4 className="mt-2 text-lg font-semibold">
              {t("storeAnalytics.watchThisWeek")}
            </h4>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  {t("storeAnalytics.revenueWeek")}
                </p>
                <strong className="mt-2 block text-2xl">
                  {formatCurrency(revenueSummary?.weekRevenue)}
                </strong>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                  {t("storeAnalytics.revenueMonth")}
                </p>
                <strong className="mt-2 block text-2xl">
                  {formatCurrency(revenueSummary?.monthRevenue)}
                </strong>
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm leading-7 text-white/72">
              <span>{t("storeAnalytics.watchPaymentSpeed")}</span>
              <span>{t("storeAnalytics.watchBestSeller")}</span>
              <span>{t("storeAnalytics.watchPipeline")}</span>
            </div>
          </article>
        </div>
      </section>
    );
  };

  if (!isWorkspaceOnly) {
    return (
      <main className={ui.page}>
        <section className={ui.panel}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className={ui.eyebrow}>{t("storeAnalytics.eyebrow")}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tea-900">
                  {t("storeAnalytics.title")}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                  {isManagerMode
                    ? t("storeAnalytics.subtitleManager")
                    : t("storeAnalytics.subtitleAdmin")}
                </p>
              </div>

              {isAdmin ? (
                <label className="grid gap-2 xl:min-w-[19rem]">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {t("storeAnalytics.storeScopeLabel")}
                  </span>
                  <select
                    className={ui.input}
                    value={selectedStoreId}
                    onChange={(event) => applyStoreScope(event.target.value)}
                  >
                    {scopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-5 py-4 text-sm leading-7 text-stone-600 xl:max-w-sm">
                  <strong className="block text-tea-900">
                    {auth.user?.workingStoreName || "No working store"}
                  </strong>
                  <span className="mt-2 block">
                    {auth.user?.workingStoreAddress || "Managers can only operate inside their assigned store."}
                  </span>
                </div>
              )}
            </div>

            {notice ? (
              <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {loading && !storeWorkspaceAnalytics ? (
              <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
                Loading analytics...
              </article>
            ) : (
              renderStoreAnalyticsPanel() ?? (
                <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
                  No analytics data is available for the current scope.
                </article>
              )
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={ui.page}>
      {isWorkspaceOnly ? (
        <section className={ui.panel}>
          <p className={ui.eyebrow}>{workspacePageMeta?.eyebrow || activeConfig.title}</p>

          {notice ? (
            <div className="mt-4 rounded-lg border border-matcha-200 bg-matcha-50 px-3 py-2.5 text-sm text-matcha-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          ) : null}
        </section>
      ) : (
        <section className={ui.panel}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <button
                className="text-left transition hover:-translate-y-0.5"
                type="button"
                onClick={() => setInfoModalKey("dashboard")}
              >
                <p className={ui.eyebrow}>{dashboardLabel}</p>
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className={ui.secondaryButton} to={ADMIN_HOME_PATH}>
                {t("workspace.backToHome")}
              </Link>
              <button className={ui.secondaryButton} type="button" onClick={refreshAll}>
                {loading ? t("workspace.loadingAction") : t("workspace.reloadData")}
              </button>
              <button className={ui.primaryButton} type="button" onClick={() => resetSection(activeSection)}>
                {isDetailSection
                  ? isFeedbackSection
                    ? t("workspace.clearFeedbackSelection")
                    : t("workspace.clearReviewSelection")
                  : isManagerMode && activeSection === "stores"
                    ? t("workspace.resetPanel")
                  : activeSection === "orders"
                    ? t("workspace.clearOrderSelection")
                    : t("workspace.createNewForm")}
              </button>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 rounded-lg border border-matcha-200 bg-matcha-50 px-3 py-2.5 text-sm text-matcha-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {isAdmin ? (
            <>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
                {globalStats.map((stat) => (
                  <article key={stat.label} className="rounded-lg border border-ink-900/8 bg-cream-50 p-3 shadow-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{stat.label}</p>
                    <strong className="mt-1.5 block font-mono text-lg font-semibold text-ink-900">{stat.value}</strong>
                  </article>
                ))}
              </div>

              <p className="mt-4 text-sm leading-7 text-stone-500">
                {t("workspace.overviewNote")}
              </p>
            </>
          ) : (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {storeScopeStats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-lg border border-ink-900/8 bg-cream-50 p-3 shadow-soft"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">{stat.label}</p>
                  <strong className="mt-1.5 block font-mono text-lg font-semibold text-ink-900">{stat.value}</strong>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!isWorkspaceOnly && canModerateReviews ? (
      <section className={`${ui.panel} grid gap-6`}>
        <div className="grid gap-5">
          <div>
            <button
              className="text-left transition hover:-translate-y-0.5"
              type="button"
              onClick={() => setInfoModalKey("storeScope")}
            >
              <p className={ui.eyebrow}>Store scope</p>
            </button>
          </div>

          {isAdmin ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">Store scope filter</span>
              <select
                className={ui.input}
                value={selectedStoreId}
                onChange={(event) => applyStoreScope(event.target.value)}
              >
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-lg border border-ink-900/8 bg-cream-100 p-3 text-xs leading-5 text-ink-600">
              <strong className="block text-ink-900">
                {auth.user?.workingStoreName || "No working store"}
              </strong>
              <span className="mt-1 block">
                {auth.user?.workingStoreAddress || "Managers can only operate inside their assigned store."}
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
            {storeScopeStats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-[1.5rem] border border-matcha-900/10 bg-white/60 p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{stat.label}</p>
                <strong className="mt-2 block text-2xl text-tea-900">{stat.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      <section className={ui.panel}>
        <div
          className={`grid items-start gap-6 ${
            activeSection === "orders"
              ? "xl:grid-cols-[1fr_0.95fr]"
              : "xl:grid-cols-[1.08fr_0.92fr]"
          }`}
        >
          <div className="grid min-w-0 content-start self-start gap-4">
            <div className="rounded-lg border border-ink-900/8 bg-cream-100 p-3">
              <div>
                {!isWorkspaceOnly ? (
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                    {activeConfig.title}
                  </p>
                ) : null}

                {/* <p className="mt-2 text-sm leading-7 text-stone-600">{activeConfig.description}</p> */}
                {/* <p className="mt-2 text-sm leading-7 text-stone-500">
                  Use the filters below to find records quickly, change pages, and narrow the current scope.
                </p> */}
                {selectedStore && activeSection !== "users" ? (
                  <p className="mt-2 text-sm leading-7 text-matcha-700">
                    Showing data related to store: <strong>{selectedStore.name}</strong>
                  </p>
                ) : null}
              </div>

              <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSearchSubmit}>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Search
                  </span>
                  <input
                    className={ui.input}
                    type="text"
                    placeholder="Search by name, email, role, target, store..."
                    value={activeSearchDraft}
                    onChange={(event) => handleSearchDraftChange(activeSection, event.target.value)}
                  />
                </label>

                {activeSection === "orders" ? (
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Status
                    </span>
                    <select
                      className={ui.input}
                      value={activeListQuery.status ?? ""}
                      onChange={(event) =>
                        updateListQuery(activeSection, {
                          page: 0,
                          status: event.target.value,
                        })
                      }
                    >
                      {orderStatusOptions.map((option) => (
                        <option key={option || "all"} value={option}>
                          {option || "All statuses"}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Page size
                  </span>
                  <select
                    className={ui.input}
                    value={String(activeListQuery.size)}
                    onChange={(event) =>
                      updateListQuery(activeSection, {
                        page: 0,
                        size: Number(event.target.value),
                      })
                    }
                  >
                    {[10, 20, 50, 100].map((sizeOption) => (
                      <option key={sizeOption} value={sizeOption}>
                        {sizeOption} items
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap items-end gap-3 xl:col-span-2">
                  <button className={ui.primaryButton} type="submit">
                    Search
                  </button>
                  <button className={ui.secondaryButton} type="button" onClick={handleSearchReset}>
                    Clear filters
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
                <span>
                  Total records: <strong>{activeCollectionMeta.totalItems}</strong>
                  {" | "}Page <strong>{activeCollectionMeta.totalPages === 0 ? 0 : activeCollectionMeta.page + 1}</strong>
                  / <strong>{activeCollectionMeta.totalPages}</strong>
                </span>

                <div className="flex flex-wrap gap-3">
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    disabled={loading || !activeCollectionMeta.hasPrevious}
                    onClick={() =>
                      updateListQuery(activeSection, {
                        page: Math.max(0, activeCollectionMeta.page - 1),
                      })
                    }
                  >
                    Previous page
                  </button>
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    disabled={loading || !activeCollectionMeta.hasNext}
                    onClick={() =>
                      updateListQuery(activeSection, {
                        page: activeCollectionMeta.page + 1,
                      })
                    }
                  >
                    Next page
                  </button>
                </div>
              </div>

              {selectedStore && !["users", "stores"].includes(activeSection) ? (
                <p className="mt-3 text-xs leading-6 text-stone-500">
                  {isAdmin
                    ? "The current list is filtered by the selected store."
                    : "Managers only see data for the store they are responsible for."}
                </p>
              ) : null}
            </div>

            {loading ? (
              <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
                Loading admin data...
              </article>
            ) : (
              <div className="grid gap-4">
                {renderedActiveItems.map((item) => renderEntityCard(activeSection, item))}

                {renderedActiveItems.length === 0 ? (
                  <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
                    No data is available in this section for the current scope.
                  </article>
                ) : null}
              </div>
            )}
          </div>

          {activeSection === "orders" ? (
            renderOrderWorkspace()
          ) : isDetailSection ? (
            <section className="grid min-w-0 gap-4">
              <div className={`${ui.card} sticky top-6`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                      {isFeedbackSection ? "Feedback" : "Review"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                      {isFeedbackSection
                        ? "View feedback, manage reply, and delete"
                        : "View details and delete reviews"}
                    </h2>
                  </div>

                  {reviewDetail ? (
                    <button
                      className="rounded-full border border-matcha-900/10 px-4 py-2 text-sm font-semibold text-tea-900"
                      type="button"
                      onClick={() => resetSection(activeSection)}
                    >
                      {isFeedbackSection ? t("workspace.clearFeedbackSelection") : t("workspace.clearReviewSelection")}
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                  {isFeedbackSection
                    ? "Feedback is submitted by users. ADMIN and MANAGER can open the detail, write or update the reply, remove the reply, and delete the whole feedback when needed inside the store scope the backend allows."
                    : "Reviews are created by users and shown as soon as the backend approves them. Here, `ADMIN` and `MANAGER` can open details and delete reviews when needed."}
                </div>

                {reviewDetail ? (
                  <div className="mt-6 grid gap-4">
                    {isFeedbackSection ? (
                      <>
                        <div className="grid gap-2 text-sm leading-7 text-stone-600">
                          <span>Subject: {reviewDetail.subject ?? "Not available"}</span>
                          <span>
                            User: {reviewDetail.userName ?? reviewDetail.userEmail ?? "Not available"}
                          </span>
                          <span>Category: {reviewDetail.category ?? "Not available"}</span>
                          <span>Store: {reviewDetail.relatedStoreName ?? "Not available"}</span>
                          <span>Address: {reviewDetail.relatedStoreAddress ?? "Not available"}</span>
                          <span>Created at: {formatDateTime(reviewDetail.createdAt)}</span>
                          <span>Updated at: {formatDateTime(reviewDetail.updatedAt)}</span>
                          <span>
                            Reply status: {hasFeedbackReply(reviewDetail) ? "Replied" : "Awaiting reply"}
                          </span>
                          {reviewDetail.repliedAt ? (
                            <span>Replied at: {formatDateTime(reviewDetail.repliedAt)}</span>
                          ) : null}
                          {formatFeedbackReplier(reviewDetail) ? (
                            <span>Replied by: {formatFeedbackReplier(reviewDetail)}</span>
                          ) : null}
                        </div>

                        <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4 text-sm leading-7 text-stone-700">
                          {reviewDetail.message ?? "This feedback does not include detailed content yet."}
                        </div>

                        <div className="grid gap-3 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={ui.pill}>{t("feedbackDetail.adminReply")}</span>
                            {hasFeedbackReply(reviewDetail) ? (
                              <span className={ui.pill}>{t("feedbackDetail.visibleToUser")}</span>
                            ) : (
                              <span className={ui.pill}>{t("feedbackDetail.notSentYet")}</span>
                            )}
                          </div>

                          {hasFeedbackReply(reviewDetail) ? (
                            <div className="rounded-[1.25rem] border border-matcha-900/10 bg-matcha-500/10 p-4 text-sm leading-7 text-stone-700">
                              {reviewDetail.replyMessage}
                            </div>
                          ) : (
                            <div className="rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/45 p-4 text-sm leading-7 text-stone-600">
                              This feedback does not have an admin reply yet.
                            </div>
                          )}

                          <label className="grid gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                              Reply message
                            </span>
                            <textarea
                              className={ui.input}
                              rows={5}
                              placeholder="Thank you for sharing this feedback. We have recorded it and will handle it in the next shift."
                              value={feedbackReplyDraft}
                              onChange={(event) => setFeedbackReplyDraft(event.target.value)}
                            />
                          </label>

                          <p className="text-xs leading-6 text-stone-500">
                            `PUT /api/admin/feedbacks/{reviewDetail.id}/reply` creates or updates the
                            reply, and `DELETE /api/admin/feedbacks/{reviewDetail.id}/reply` removes it.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            className={ui.primaryButton}
                            type="button"
                            disabled={saving || !feedbackReplyDraft.trim()}
                            onClick={handleSaveFeedbackReply}
                          >
                            {hasFeedbackReply(reviewDetail) ? "Update reply" : "Send reply"}
                          </button>
                          {hasFeedbackReply(reviewDetail) ? (
                            <button
                              className={ui.secondaryButton}
                              type="button"
                              disabled={saving}
                              onClick={handleDeleteFeedbackReply}
                            >
                              Delete reply
                            </button>
                          ) : null}
                          <button
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                            type="button"
                            onClick={() => handleDelete("feedbacks", reviewDetail.id)}
                          >
                            Delete feedback
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {normalizeImagePathList(
                          reviewDetail.targetImagePaths ?? reviewDetail.targetImagePath,
                        ).length ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {normalizeImagePathList(
                              reviewDetail.targetImagePaths ?? reviewDetail.targetImagePath,
                            )
                              .slice(0, 4)
                              .map((imagePath) => (
                                <div
                                  key={imagePath}
                                  className="overflow-hidden rounded-[1.25rem] border border-matcha-900/10 bg-stone-100"
                                >
                                  <SmartImage
                                    className="h-36 w-full object-cover"
                                    src={imagePath}
                                    alt={reviewDetail.targetLabel ?? reviewDetail.title ?? "Review"}
                                    loading="lazy"
                                    fallbackClassName="grid h-36 w-full place-items-center bg-stone-100 text-xs text-stone-500"
                                  />
                                </div>
                              ))}
                          </div>
                        ) : null}

                        <div className="grid gap-2 text-sm leading-7 text-stone-600">
                          <span>Title: {reviewDetail.title ?? "Not available"}</span>
                          <span>
                            User: {reviewDetail.userName ?? reviewDetail.userEmail ?? "Not available"}
                          </span>
                          <span>Target: {reviewDetail.targetLabel ?? "Not available"}</span>
                          <span>Target type: {reviewDetail.targetType ?? "Not available"}</span>
                          <span>Rating: {reviewDetail.rating ?? "?"}/5</span>
                          <span>
                            Display status: {reviewDetail.approved === false ? "Hidden" : "Visible"}
                          </span>
                          <span>Created at: {formatDateTime(reviewDetail.createdAt)}</span>
                          <span>Updated at: {formatDateTime(reviewDetail.updatedAt)}</span>
                        </div>

                        <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4 text-sm leading-7 text-stone-700">
                          {reviewDetail.comment ?? "This review does not include detailed content yet."}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                            type="button"
                            onClick={() => handleDelete("reviews", reviewDetail.id)}
                          >
                            Delete review
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm leading-7 text-stone-600">
                    {isFeedbackSection
                      ? "Choose feedback from the list on the left to view its details."
                      : "Choose a review from the list on the left to view its details."}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <form className="grid min-w-0 gap-4" onSubmit={handleSubmit}>
              <div className={`${ui.card} sticky top-6`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                      {isAdminRoleOnlyUserEdit
                        ? "Change role"
                        : hasActiveEditingId
                          ? "Update record"
                          : "Create new record"}
                    </p>
                    {!isWorkspaceOnly ? (
                      <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                        {isAdminRoleOnlyUserEdit ? "Change role" : activeConfig.title}
                      </h2>
                    ) : null}
                    {activeSection === "orders" && hasActiveEditingId ? (
                      <p className="mt-2 text-sm leading-7 text-stone-600">
                        Updating order <strong>#{resolvedEditingId}</strong>.
                      </p>
                    ) : null}
                  </div>

                  {hasActiveEditingId ? (
                    <div className="flex flex-wrap justify-end gap-3">
                      {activeSection === "users" &&
                      activeUserRecord &&
                      canChangeUserPassword(activeUserRecord) &&
                      !isAdminRoleOnlyUserEdit ? (
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => openPasswordModal(activeUserRecord)}
                        >
                          Change password
                        </button>
                      ) : null}
                      <button
                        className="rounded-full border border-matcha-900/10 px-4 py-2 text-sm font-semibold text-tea-900"
                        type="button"
                        onClick={() => resetSection(activeSection)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>

                {adminRoleEditPreview ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <article className="rounded-[1.25rem] border border-matcha-900/10 bg-[#f8f5ef] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Selected user
                        </p>
                        <strong className="mt-3 block text-lg font-semibold text-tea-900">
                          {adminRoleEditPreview.fullName || "Unknown user"}
                        </strong>
                        <p className="mt-2 break-all text-sm text-stone-600">
                          {adminRoleEditPreview.email || "No email available"}
                        </p>
                      </article>

                      <article className="rounded-[1.25rem] border border-matcha-900/10 bg-[#f8f5ef] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Current assignment
                        </p>
                        <p className="mt-3 text-sm text-stone-600">
                          Current role:{" "}
                          <strong className="text-tea-900">
                            {adminRoleEditPreview.currentRole || "Unknown"}
                          </strong>
                        </p>
                        <p className="mt-2 text-sm text-stone-600">
                          Assigned store:{" "}
                          <strong className="text-tea-900">
                            {adminRoleEditPreview.assignedStore}
                          </strong>
                        </p>
                      </article>
                    </div>
                  </div>
                ) : null}

                {hasActiveEditingId && isActiveEditLoading ? (
                  <div className="mt-5 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/55 px-4 py-4 text-sm leading-7 text-stone-600">
                    Loading current record details for <strong>#{resolvedEditingId}</strong>...
                  </div>
                ) : null}

                {selectedStore &&
                ["events", "categories", "dishes", "storeDishes", "news", "userLevels", "orders"].includes(
                  activeSection,
                ) ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                    This form is currently locked to store scope <strong>{selectedStore.name}</strong>.
                    Related options will only show objects from this store.
                  </div>
                ) : null}

                {activeSection === "dishes" && categoryOptions.length === 0 ? (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    There is no valid category in the current scope. Create a category before adding a dish.
                  </div>
                ) : null}

                {activeSection === "users" &&
                requiresWorkingStoreRole(activeDraft.role) &&
                workingStoreOptions.length === 0 ? (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    This role must be assigned to a store, but there is no store available to
                    choose yet. Create a store before adding a staff account.
                  </div>
                ) : null}

                {isManagerMode && activeSection === "users" ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                    MANAGER can only manage <strong>STAFF</strong> and <strong>SHIPPER</strong> in
                    the current working store. Role and store assignments are limited to the
                    current branch.
                  </div>
                ) : null}

                {isAdminRoleOnlyUserEdit ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-4 py-4 text-sm leading-7 text-stone-700">
                    Admin mode for existing users is limited to <strong>role and working store assignment</strong>.
                    Password, email, name, and activation are managed outside this edit form.
                  </div>
                ) : activeSection === "users" && hasActiveEditingId ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-4 py-4 text-sm leading-7 text-stone-700">
                    Existing account passwords should be changed with the <strong>Change
                    password</strong> button to avoid accidentally editing other fields.
                  </div>
                ) : null}

                {isManagerMode && activeSection === "stores" && !hasActiveEditingId ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                    MANAGER cannot create or delete branches. Choose the current store from the list
                    on the left, then update its information here.
                  </div>
                ) : null}

                {activeSection === "storeDishes" && (storeOptions.length === 0 || dishOptions.length === 0) ? (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    You need at least one store and one core dish before creating `store_dishes`.
                  </div>
                ) : null}

                {activeSection === "news" && storeOptions.length === 0 ? (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    There is no valid store in the current scope to attach to the news entry.
                  </div>
                ) : null}

                {activeSection === "userLevels" ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                    Membership levels are global in the current backend, so this section should
                    stay available even when the selected scope does not have a matching store.
                  </div>
                ) : null}

                {activeSection === "orders" && !hasActiveEditingId ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-4 py-4 text-sm leading-7 text-stone-700">
                    Choose an order on the left to view details and update the status.
                  </div>
                ) : null}

                {isAiAssistSupported ? (
                  <div className="mt-5 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 p-4 shadow-[0_18px_42px_rgba(79,70,45,0.08)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                          AI draft assist
                        </p>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          Ask AI to fill the current admin form. The backend returns a validated
                          draft only; nothing is auto-saved.
                        </p>
                      </div>

                      {(aiAssistState.warnings.length ||
                        aiAssistState.missingFieldNames.length ||
                        aiAssistState.scopeStoreName) ? (
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => clearAiAssistFeedback({ preservePrompt: true })}
                        >
                          Clear AI notes
                        </button>
                      ) : null}
                    </div>

                    <label className="mt-4 grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Prompt
                      </span>
                      <textarea
                        className={`${ui.input} min-h-28 resize-y`}
                        rows={5}
                        placeholder="Describe the kind of draft you want AI to prepare for this form."
                        value={aiAssistState.prompt}
                        disabled={aiAssistState.loading}
                        onChange={(event) => handleAiPromptChange(event.target.value)}
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className={ui.primaryButton}
                        type="button"
                        disabled={aiAssistState.loading}
                        onClick={() => void handleGenerateAiDraft()}
                      >
                        {aiAssistState.loading ? "Generating draft..." : "Fill with AI"}
                      </button>
                    </div>

                    {aiAssistState.scopeStoreName ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {aiAssistState.scopeStoreName ? (
                          <span className={ui.pill}>
                            Scope: {aiAssistState.scopeStoreName}
                            {aiAssistState.scopeStoreId
                              ? ` (#${aiAssistState.scopeStoreId})`
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {aiAssistState.warnings.length ? (
                      <div className="mt-4 rounded-[1.35rem] border border-amber-200 bg-amber-50/85 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                          Backend warnings
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {aiAssistState.warnings.map((warning, index) => (
                            <span
                              key={`${warning}-${index}`}
                              className="rounded-full bg-white/80 px-3 py-2 text-sm leading-6 text-amber-950 shadow-[0_8px_18px_rgba(194,142,55,0.12)]"
                            >
                              {warning}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {missingFieldLabels.length ? (
                      <div className="mt-4 rounded-[1.35rem] border border-matcha-900/10 bg-matcha-500/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tea-700">
                          Still needs manual input
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {missingFieldLabels.map((fieldLabel, index) => (
                            <span
                              key={`${fieldLabel}-${index}`}
                              className="rounded-full bg-white/82 px-3 py-2 text-sm font-medium text-stone-700 shadow-[0_8px_18px_rgba(79,70,45,0.08)]"
                            >
                              {fieldLabel}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4">
                  {visibleFormFields.map((field) => (
                    <AdminFormField
                      key={field.name}
                      field={field}
                      value={activeDraft[field.name] ?? ""}
                      onChange={handleDraftChange}
                      onUploadFiles={
                        field.type === "image-gallery" || field.type === "content-sections"
                          ? handleImageUpload
                          : undefined
                      }
                      uploadState={
                        uploadState.sectionKey === activeSection && uploadState.fieldName === field.name
                          ? uploadState
                          : null
                      }
                      highlight={missingFieldSet.has(field.name)}
                      highlightMessage={
                        missingFieldSet.has(field.name)
                          ? "Backend marked this field as still needing manual input."
                          : ""
                      }
                    />
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className={ui.primaryButton}
                    disabled={
                      saving ||
                      isActiveEditLoading ||
                      (uploadState.loading && uploadState.sectionKey === activeSection) ||
                      (activeSection === "orders" && !hasActiveEditingId) ||
                      (!canCreateRecord(activeSection) && !hasActiveEditingId)
                    }
                    type="submit"
                  >
                    {saving
                      ? t("workspace.processing")
                      : isActiveEditLoading
                        ? t("workspace.loadingRecord")
                      : activeSection === "orders" && !hasActiveEditingId
                        ? t("workspace.chooseOrder")
                      : !canCreateRecord(activeSection) && !hasActiveEditingId
                        ? t("workspace.chooseRecord")
                      : isAdminRoleOnlyUserEdit
                        ? t("workspace.updateRole")
                      : hasActiveEditingId
                        ? t("workspace.saveChanges")
                        : t("workspace.createRecord")}
                  </button>
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    onClick={() => resetSection(activeSection)}
                  >
                    {t("workspace.resetForm")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {renderPasswordModal()}
      {renderInfoModal()}
    </main>
  );
}

