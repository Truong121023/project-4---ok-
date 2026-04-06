import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import { getPrimaryImageUrl, normalizeImagePathList } from "../lib/images";
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
  extractOrderQrToken,
  getOrderInvoicePreviewHref,
} from "../lib/orderWorkflow";
import OrderStatusTracker from "../components/OrderStatusTracker";
import { ui } from "../ui";
import { fetchMobileOrderQr } from "../lib/siteApi";

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
    successMessage: "Order confirmed successfully.",
  },
  CANCEL_ORDER: {
    path: (id) => `/api/admin/orders/${id}/cancel`,
    successMessage: "Order cancelled successfully.",
  },
  MARK_PAID: {
    path: (id) => `/api/admin/orders/${id}/mark-paid`,
    successMessage: "Order marked as paid successfully.",
  },
  GENERATE_INVOICE: {
    path: (id) => `/api/admin/orders/${id}/invoice/generate`,
    successMessage: "Invoice generated successfully.",
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
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === "") {
    return "No price";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
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
    userLevels: normalizeListResponse(collections.userLevels).filter(
      (level) => toIdString(level.storeId) === scopeId,
    ),
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

function buildAnalyticsPath(path, selectedStoreId = "all", allowStoreScope = false) {
  if (!allowStoreScope || !selectedStoreId || selectedStoreId === "all") {
    return path;
  }

  const params = new URLSearchParams();
  params.set("storeId", String(selectedStoreId));

  return `${path}?${params.toString()}`;
}

export default function AdminPage() {
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
  const [activeSection, setActiveSection] = useState("stores");
  const [selectedStoreId, setSelectedStoreId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
  const [qrLookupInput, setQrLookupInput] = useState("");
  const [qrLookupLoading, setQrLookupLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState("");
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
  const [uploadState, setUploadState] = useState({
    sectionKey: "",
    fieldName: "",
    sectionIndex: null,
    loading: false,
    message: "",
    error: "",
  });
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
    title: "Khong the xu ly",
  });
  useToastMessage(notice, {
    type: "success",
    title: "Da cap nhat",
  });
  useToastMessage(orderScanError, {
    type: "error",
    title: "Lich su quet QR",
  });

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
    () => filterCollectionsByStore(safeCollections, selectedStoreId),
    [safeCollections, selectedStoreId],
  );
  const scopedDisplayCollections = useMemo(
    () => filterCollectionsByStore(displayCollections, selectedStoreId),
    [displayCollections, selectedStoreId],
  );
  const visibleTabs = useMemo(
    () =>
      isManagerMode
        ? sectionTabs.filter((tab) => accessibleSectionKeys.includes(tab.key))
        : sectionTabs,
    [accessibleSectionKeys, isManagerMode],
  );

  const selectedStore = useMemo(
    () =>
      selectedStoreId === "all"
        ? null
        : safeCollections.stores.find((store) => toIdString(store.id) === toIdString(selectedStoreId)) ??
          null,
    [safeCollections.stores, selectedStoreId],
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

  const sectionConfigs = buildSectionConfigs({
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
  });

  const activeConfig = sectionConfigs[activeSection];
  const activeDraft = drafts[activeSection];
  const activeEditingId = editingIds[activeSection];
  const activeAiFormType = adminAiFormTypes[activeSection] ?? "";
  const isAiAssistSupported = Boolean(activeAiFormType);
  const visibleFormFields =
    activeConfig?.fields?.filter(
      (field) => !(activeSection === "users" && activeEditingId && field.name === "password"),
    ) ?? [];
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
    activeSection === "users" && activeEditingId
      ? displayCollections.users.find((item) => String(item.id) === String(activeEditingId)) ??
        safeCollections.users.find((item) => String(item.id) === String(activeEditingId)) ??
        null
      : null;
  const activeCollectionMeta = collections[activeSection] ?? createEmptyListCollection();
  const activeListQuery = listQueries[activeSection];
  const activeSearchDraft = searchDrafts[activeSection]?.search ?? "";
  const activeItems =
    isAdmin && (activeSection === "users" || activeSection === "stores" || activeSection === "promotions")
      ? displayCollections[activeSection] ?? []
      : scopedDisplayCollections[activeSection] ?? [];
  const isDetailSection = ["reviews", "feedbacks"].includes(activeSection);
  const isFeedbackSection = activeSection === "feedbacks";
  const selectedOrderRecord =
    activeSection === "orders"
      ? (() => {
          const orderFromList =
            activeItems.find((item) => String(item.id) === String(activeEditingId ?? "")) ?? null;

          if (
            orderDetailRecord &&
            String(orderDetailRecord.id ?? "") === String(activeEditingId ?? "")
          ) {
            return orderDetailRecord;
          }

          return orderFromList;
        })()
      : null;
  const selectedOrderActions = getOrderAllowedActions(selectedOrderRecord);
  const selectedOrderInvoicePreviewUrl = getOrderInvoicePreviewHref(selectedOrderRecord);
  const canViewSelectedOrderInvoice = canViewOrderInvoice(selectedOrderRecord);
  const selectedStoreImages = normalizeImagePathList(selectedStore?.imagePaths ?? selectedStore?.imagePath);
  const dashboardLabel = isManagerMode ? "Manager panel" : "Admin dashboard";
  const dashboardHeading = isManagerMode
    ? "Store-scoped operations"
    : "Store-scoped data administration";
  const dashboardCopy = isManagerMode
    ? "Ban dang quan ly trong pham vi cua hang duoc giao. Moi du lieu va thao tac se duoc gioi han trong chi nhanh nay."
    : "Quan ly toan bo van hanh he thong: cua hang, nhan su, danh muc, mon, don hang, hoa don va phan hoi khach hang.";
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
  const currentUserId = toIdString(auth.user?.id);

  const canChangeUserPassword = useCallback(
    (user) => {
      if (!user?.id) {
        return false;
      }

      if (isAdmin) {
        return true;
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
          if (activeEditingId) {
            const editingStoreId = Number(activeEditingId);
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
    [activeEditingId, isManagerMode, managerStoreId, safeCollections.categories, selectedStoreId],
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
    setLoading(true);
    setError("");

    try {
      if (isManagerMode) {
        const requests = [];

        if (refreshLookups) {
          requests.push(authorizedRequest("/api/admin/summary"));
          requests.push(authorizedRequest("/api/admin/dashboard"));
          accessibleSectionKeys.forEach((sectionKey) => {
            requests.push(
              authorizedRequest(
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
          accessibleSectionKeys.forEach((sectionKey) => {
            requests.push(
              authorizedRequest(
                buildSectionListPath(sectionKey, nextQueries[sectionKey], storeScopeId),
              ),
            );
          });
        }

        const responses = await Promise.all(requests);
        let pointer = 0;
        let nextReferenceCollections = emptyCollections();

        if (refreshLookups) {
          const summaryData = responses[pointer++];
          const dashboardData = responses[pointer++];

          accessibleSectionKeys.forEach((sectionKey) => {
            nextReferenceCollections[sectionKey] = normalizeListResponse(responses[pointer++]);
          });

          setSummary(normalizeSummaryResponse(summaryData));
          setDashboard(normalizeDashboardResponse(dashboardData));
          setReferenceCollections(nextReferenceCollections);
          setSearchDrafts((current) => {
            const nextDrafts = { ...current };

            accessibleSectionKeys.forEach((sectionKey) => {
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
          const nextListCollections = emptyListCollections();

          accessibleSectionKeys.forEach((sectionKey) => {
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
              [sectionKey]: editingIds[sectionKey]
                ? current[sectionKey]
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

      if (refreshLookups) {
        requests.push(
          authorizedRequest(buildAnalyticsPath("/api/admin/summary", storeScopeId, isAdmin)),
        );
        requests.push(
          authorizedRequest(buildAnalyticsPath("/api/admin/dashboard", storeScopeId, isAdmin)),
        );
        adminSectionKeys.forEach((sectionKey) => {
          requests.push(
            authorizedRequest(
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
        adminSectionKeys.forEach((sectionKey) => {
          requests.push(
            authorizedRequest(buildSectionListPath(sectionKey, nextQueries[sectionKey], storeScopeId)),
          );
        });
      }

      const responses = await Promise.all(requests);
      let pointer = 0;
      let nextReferenceCollections = safeCollections;

      if (refreshLookups) {
        const summaryData = responses[pointer++];
        const dashboardData = responses[pointer++];
        const fetchedReferences = {};

        adminSectionKeys.forEach((sectionKey) => {
          fetchedReferences[sectionKey] = normalizeListResponse(responses[pointer++]);
        });

        nextReferenceCollections = fetchedReferences;
        setSummary(normalizeSummaryResponse(summaryData));
        setDashboard(normalizeDashboardResponse(dashboardData));
        setReferenceCollections(fetchedReferences);
        setSearchDrafts((current) => {
          const nextDrafts = { ...current };
          adminSectionKeys.forEach((sectionKey) => {
            nextDrafts[sectionKey] = {
              ...nextDrafts[sectionKey],
              search: nextQueries[sectionKey]?.search ?? "",
            };
          });
          return nextDrafts;
        });
      }

      if (refreshLists) {
        const nextListCollections = {};

        adminSectionKeys.forEach((sectionKey) => {
          nextListCollections[sectionKey] = normalizePaginatedListResponse(
            responses[pointer++],
            nextQueries[sectionKey],
          );
        });

        setCollections(nextListCollections);
      }

      const nextScopedCollections = filterCollectionsByStore(nextReferenceCollections, storeScopeId);
      setDrafts((current) => ({
        users: editingIds.users
          ? current.users
          : createDraftForSection("users", nextReferenceCollections, nextScopedCollections),
        stores: editingIds.stores
          ? current.stores
          : createDraftForSection("stores", nextReferenceCollections, nextScopedCollections),
        events: editingIds.events
          ? current.events
          : createDraftForSection("events", nextReferenceCollections, nextScopedCollections),
        categories: editingIds.categories
          ? current.categories
          : createDraftForSection("categories", nextReferenceCollections, nextScopedCollections),
        dishes: editingIds.dishes
          ? current.dishes
          : createDraftForSection("dishes", nextReferenceCollections, nextScopedCollections),
        storeDishes: editingIds.storeDishes
          ? current.storeDishes
          : createDraftForSection("storeDishes", nextReferenceCollections, nextScopedCollections),
        news: editingIds.news
          ? current.news
          : createDraftForSection("news", nextReferenceCollections, nextScopedCollections),
        promotions: editingIds.promotions
          ? current.promotions
          : createDraftForSection("promotions", nextReferenceCollections, nextScopedCollections),
        userLevels: editingIds.userLevels
          ? current.userLevels
          : createDraftForSection("userLevels", nextReferenceCollections, nextScopedCollections),
        orders: editingIds.orders
          ? current.orders
          : createDraftForSection("orders", nextReferenceCollections, nextScopedCollections),
        reviews: editingIds.reviews
          ? current.reviews
          : createDraftForSection("reviews", nextReferenceCollections, nextScopedCollections),
        feedbacks: editingIds.feedbacks
          ? current.feedbacks
          : createDraftForSection("feedbacks", nextReferenceCollections, nextScopedCollections),
      }));
    } catch (requestError) {
      handleApiFailure(requestError, "Unable to load admin data.");
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
          handleApiFailure(requestError, "Unable to load order scan history.");
        } else {
          setOrderScanError(getApiErrorMessage(requestError, "Unable to load order scan history."));
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
        setNotice(response?.message ?? actionConfig.successMessage);

        await Promise.all([
          refreshAll({
            refreshLookups: false,
            refreshLists: true,
            nextQueries: listQueries,
          }),
          loadOrderScanHistory(nextOrder.id, { silent: true }),
        ]);
      } catch (requestError) {
        handleApiFailure(requestError, "Unable to update the order workflow.");
      } finally {
        setOrderActionLoading("");
      }
    },
    [
      authorizedRequest,
      handleApiFailure,
      listQueries,
      loadOrderScanHistory,
      refreshAll,
      selectedOrderRecord,
    ],
  );

  useEffect(() => {
    if (!auth.isAuthenticated || !canModerateReviews) {
      return;
    }

    refreshAll({ refreshLookups: true, refreshLists: true, nextQueries: listQueries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.token, auth.tokenType, auth.user?.role, canModerateReviews]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeSection)) {
      setActiveSection("stores");
    }
  }, [activeSection, visibleTabs]);

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
    if (activeSection !== "orders" || activeEditingId || activeItems.length === 0) {
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
  }, [activeEditingId, activeItems, activeSection]);

  useEffect(() => {
    if (activeSection !== "orders" || !activeEditingId) {
      setOrderScanHistory([]);
      setOrderScanError("");
      setOrderScanLoading(false);
      return;
    }

    if (!selectedOrderRecord?.id) {
      return;
    }

    void loadOrderScanHistory(selectedOrderRecord.id);
  }, [activeEditingId, activeSection, loadOrderScanHistory, selectedOrderRecord?.id]);

  useEffect(() => {
    if (!isManagerMode) {
      return;
    }

    if (managerStoreId && selectedStoreId !== managerStoreId) {
      setSelectedStoreId(managerStoreId);
    }
  }, [isManagerMode, managerStoreId, selectedStoreId]);

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
        if (!["PREPARING", "READY_FOR_SHIPPER", "OUT_FOR_DELIVERY"].includes(value)) {
          nextDraft.preparingStaffId = "";
          nextDraft.deliveringShipperId = "";
        } else if (["PREPARING", "READY_FOR_SHIPPER"].includes(value)) {
          nextDraft.deliveringShipperId = "";
        }
      }

      if (activeSection === "orders" && fieldName === "paymentStatus" && value === "PENDING") {
        nextDraft.status = "PENDING";
        nextDraft.preparingStaffId = "";
        nextDraft.deliveringShipperId = "";
      }

      if (activeSection === "promotions" && fieldName === "scope" && value === "ORDER") {
        nextDraft.applicableDishIdsText = "";
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
    const detail = normalizeDetailResponse(detailResponse);

    if (!detail) {
      throw new Error("The feedback detail API did not return valid data.");
    }

    setActiveSection("feedbacks");
    setReviewDetail(detail);
    setEditingIds((current) => ({
      ...current,
      feedbacks: feedbackId,
    }));

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

  const handleEdit = async (sectionKey, itemId) => {
    setSaving(true);
    setError("");
    setNotice("");
    clearAiAssistFeedback({ preservePrompt: false });

    const fallbackEntity =
      (sectionKey === "users" || sectionKey === "stores" || sectionKey === "promotions"
        ? displayCollections[sectionKey]
        : scopedDisplayCollections[sectionKey]
      )?.find((item) => String(item.id) === String(itemId)) ?? null;

    try {
      if (sectionKey !== "reviews" && sectionKey !== "feedbacks" && fallbackEntity) {
        setActiveSection(sectionKey);
        setDrafts((current) => ({
          ...current,
          [sectionKey]: hydrateSectionDraft(sectionKey, fallbackEntity),
        }));
        setEditingIds((current) => ({
          ...current,
          [sectionKey]: itemId,
        }));
        if (sectionKey === "orders") {
          setOrderDetailRecord(fallbackEntity);
        }
      }

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
        setReviewDetail(detail);
        setEditingIds((current) => ({
          ...current,
          [sectionKey]: itemId,
        }));
        return;
      }

      setActiveSection(sectionKey);
      setDrafts((current) => ({
        ...current,
        [sectionKey]: hydrateSectionDraft(sectionKey, detail),
      }));
      setEditingIds((current) => ({
        ...current,
        [sectionKey]: itemId,
      }));
      if (sectionKey === "orders") {
        setOrderDetailRecord(detail);
      }
    } catch (requestError) {
      if (fallbackEntity && sectionKey === "orders") {
        setOrderDetailRecord(fallbackEntity);
        setNotice("Unable to load order details, using list data for the order workspace instead.");
      } else {
        handleApiFailure(requestError, "Unable to load record details.");
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sectionKey = String(searchParams.get("section") ?? "").trim();
    const recordId = toIdString(searchParams.get("record"));

    if (!sectionKey) {
      return;
    }

    if (!accessibleSectionKeys.includes(sectionKey)) {
      return;
    }

    if (activeSection !== sectionKey) {
      setActiveSection(sectionKey);
    }

    if (recordId) {
      if (
        activeSection === sectionKey &&
        toIdString(activeEditingId) === recordId &&
        (String(selectedOrderRecord?.id ?? "") === recordId || sectionKey !== "orders")
      ) {
        return;
      }

      void handleEdit(sectionKey, recordId);
      return;
    }

    if (activeSection === sectionKey && !activeEditingId) {
      return;
    }

    resetSection(sectionKey);
    setNotice("AI opened this admin section for you.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleOrderQrLookup = async (event) => {
    event.preventDefault();

    const qrToken = extractOrderQrToken(qrLookupInput);

    if (!qrToken) {
      setNotice("");
      setError("Nhap QR token hoac URL QR cong khai hop le truoc khi mo don hang.");
      return;
    }

    setQrLookupLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetchMobileOrderQr(auth, qrToken);
      const targetOrderId = toIdString(response?.order?.id);

      if (!targetOrderId) {
        throw new Error(response?.message || "Backend chua tra ve don hang cho QR nay.");
      }

      setQrLookupInput("");
      setActiveSection("orders");
      navigate(`/admin/orders/${targetOrderId}`);
      setNotice(response?.message || `Da mo don hang #${targetOrderId} tu QR.`);
    } catch (requestError) {
      handleApiFailure(requestError, "Khong the mo don hang tu QR nay.");
    } finally {
      setQrLookupLoading(false);
    }
  };

  useEffect(() => {
    const normalizedRouteOrderId = toIdString(routeOrderId);

    if (!normalizedRouteOrderId) {
      return;
    }

    if (activeSection !== "orders") {
      setActiveSection("orders");
    }

    if (toIdString(activeEditingId) === normalizedRouteOrderId && selectedOrderRecord?.id) {
      return;
    }

    void handleEdit("orders", normalizedRouteOrderId);
  }, [activeEditingId, activeSection, routeOrderId, selectedOrderRecord?.id]);

  const openPasswordModal = (user) => {
    if (!canChangeUserPassword(user)) {
      setNotice("");
      setError("Ban khong co quyen doi mat khau cho tai khoan nay.");
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
      setError("Chon tai khoan can doi mat khau truoc.");
      return;
    }

    const nextPassword = String(passwordModal.password ?? "").trim();
    const confirmPassword = String(passwordModal.confirmPassword ?? "").trim();

    if (!nextPassword) {
      setPasswordModal((current) => ({
        ...current,
        error: "Nhap mat khau moi truoc khi luu.",
      }));
      setNotice("");
      setError("Nhap mat khau moi truoc khi luu.");
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordModal((current) => ({
        ...current,
        error: "Mat khau moi can co it nhat 8 ky tu.",
      }));
      setNotice("");
      setError("Mat khau moi can co it nhat 8 ky tu.");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordModal((current) => ({
        ...current,
        error: "Mat khau xac nhan chua khop.",
      }));
      setNotice("");
      setError("Mat khau xac nhan chua khop.");
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
        throw new Error("Khong the tai du lieu tai khoan de doi mat khau.");
      }

      if (!canChangeUserPassword(userDetail)) {
        throw new Error("Ban khong co quyen doi mat khau cho tai khoan nay.");
      }

      const payload = serializeSectionDraft("users", {
        ...hydrateSectionDraft("users", userDetail),
        password: nextPassword,
      });

      const response = await authorizedRequest(sectionConfigs.users.updatePath(passwordModal.userId), {
        method: "PUT",
        body: payload,
      });

      setNotice(response?.message ?? "Da cap nhat mat khau tai khoan.");
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
        error: getApiErrorMessage(requestError, "Khong the doi mat khau tai khoan."),
      }));
      handleApiFailure(requestError, "Khong the doi mat khau tai khoan.");
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

      if (isManagerMode && activeSection === "stores" && !activeEditingId) {
        throw new Error("MANAGER can only update the current store and cannot create a new branch.");
      }

      if (activeSection === "orders" && !activeEditingId) {
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

      if (activeSection === "orders" && activeDraft.status === "PREPARING" && !activeDraft.preparingStaffId) {
        throw new Error("PREPARING status requires a preparing staff ID.");
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
        activeDraft.status === "OUT_FOR_DELIVERY" &&
        !activeDraft.deliveringShipperId
      ) {
        throw new Error("OUT_FOR_DELIVERY status requires a delivery shipper ID.");
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

      const payload = serializeSectionDraft(activeSection, activeDraft);

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
      const path = activeEditingId
        ? activeConfig.updatePath(activeEditingId)
        : activeConfig.createPath;
      const method = activeEditingId ? "PUT" : "POST";
      const response = await authorizedRequest(path, { method, body: payload });

      setNotice(response?.message ?? "Changes saved successfully.");
      resetSection(activeSection);
      await refreshAll({
        refreshLookups: true,
        refreshLists: true,
        nextQueries: listQueries,
      });
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
              Edit
            </button>
            {canChangeUserPassword(item) ? (
              <button
                className={ui.secondaryButton}
                type="button"
                onClick={() => openPasswordModal(item)}
              >
                Doi mat khau
              </button>
            ) : null}
            {canDeleteSectionRecord(sectionKey) ? (
              <button
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
                type="button"
                onClick={() => handleDelete(sectionKey, item.id)}
              >
                Delete
              </button>
            ) : null}
          </div>
        </article>
      );
    }

    const imagePaths = getEntityImagePaths(sectionKey, item);
    const imageUrl = getPrimaryImageUrl(imagePaths[0] ?? "");
    let title = item.name ?? item.title ?? item.targetLabel ?? "Ban ghi";
    let summary = item.description ?? item.comment ?? "";
    let details = [];
    let pills = [];

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
        item.slug ? `Slug: ${item.slug}` : "",
        item.publishedAt ? `Published at: ${formatDateTime(item.publishedAt)}` : "",
      ];
      pills = [
        item.featured ? "Featured" : "",
        item.published === false ? "Draft" : "Published",
        ...(Array.isArray(item.tags) ? item.tags.slice(0, 3) : []),
        imagePaths.length ? `${imagePaths.length} images` : "",
      ];
    } else if (sectionKey === "promotions") {
      title = item.name ?? item.code ?? "Promotion";
      summary = item.description ?? "";
      details = [
        item.code ? `Code: ${item.code}` : "",
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
        item.minStoreBillAmount !== undefined && item.minStoreBillAmount !== null
          ? `Minimum store bill: ${formatCurrency(item.minStoreBillAmount)}`
          : "",
        item.minCrossStoreBillAmount !== undefined && item.minCrossStoreBillAmount !== null
          ? `Minimum cross-store bill: ${formatCurrency(item.minCrossStoreBillAmount)}`
          : "",
        Array.isArray(item.applicableDishIds) && item.applicableDishIds.length
          ? `Applicable dish IDs: ${item.applicableDishIds.join(", ")}`
          : Array.isArray(item.promotionDishIds) && item.promotionDishIds.length
            ? `Promotion dish IDs: ${item.promotionDishIds.join(", ")}`
          : item.scope === "DISH"
            ? "Applicable dish IDs: none yet"
            : "",
        Array.isArray(item.eligibleStoreIds) && item.eligibleStoreIds.length
          ? `Eligible store IDs: ${item.eligibleStoreIds.join(", ")}`
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

      title = item.storeName ? `Order #${item.id} | ${item.storeName}` : `Order #${item.id}`;
      summary = `${item.items?.length ?? 0} line items`;
      details = [
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
        item.preparingStaffName ? `Preparing staff: ${item.preparingStaffName}` : "",
        item.deliveringShipperName ? `Delivery shipper: ${item.deliveringShipperName}` : "",
        item.deliveryFullName ? `Recipient: ${item.deliveryFullName}` : "",
      ];
      pills = [
        orderStageMeta.label,
        item.status ?? "No status yet",
        item.paymentStatus ?? "",
        item.deliveryType ?? "",
        `${item.items?.reduce((sum, orderItem) => sum + Number(orderItem.quantity ?? 0), 0) ?? 0} products`,
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
        className="rounded-[1.75rem] border border-matcha-900/10 bg-white/70 p-5 shadow-[0_18px_44px_rgba(79,70,45,0.08)]"
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

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-semibold text-tea-900">{title}</h3>
                {summary ? (
                  <p className="mt-3 text-sm leading-7 text-stone-600">{summary}</p>
                ) : null}
                {renderPills(pills)}
              </div>

              <div className="grid gap-1 text-right text-sm text-stone-500">
                <span>Created: {formatDateTime(item.createdAt)}</span>
                <span>Updated: {formatDateTime(item.updatedAt)}</span>
              </div>
            </div>

            {details.filter(Boolean).length ? (
              <div className="mt-4 grid gap-2 text-sm text-stone-600">
                {details.filter(Boolean).map((detail) => (
                  <span key={detail}>{detail}</span>
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
                    : "Edit"}
              </button>
              {canDeleteSectionRecord(sectionKey) ? (
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
    const actionableOrderActions = selectedOrderActions.filter((action) =>
      ["CONFIRM_ORDER", "CANCEL_ORDER", "MARK_PAID", "GENERATE_INVOICE"].includes(action),
    );
    const orderStatusMeta = getOrderStatusMeta(selectedOrderRecord?.status);
    const paymentStatusMeta = getPaymentStatusMeta(selectedOrderRecord?.paymentStatus);
    const orderStageMeta = getOrderStageMeta(resolveOrderStage(selectedOrderRecord));

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
                Theo doi thao tac hop le cua don hang, xem hoa don va kiem tra lich su quet QR tai
                cung mot noi.
              </p>
            </div>

            {activeEditingId ? (
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

          <form
            className="mt-5 grid gap-3 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-4"
            onSubmit={handleOrderQrLookup}
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Open order by QR
              </p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Dan QR token hoac full URL invoice QR. Backend se tra ve order detail theo dung role
                hien tai, frontend chi doc `allowedActions` va mo workspace phu hop.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className={`${ui.input} flex-1`}
                placeholder="qr_tok_abc hoac https://domain/api/public/order-qr/qr_tok_abc"
                value={qrLookupInput}
                onChange={(event) => setQrLookupInput(event.target.value)}
              />
              <button className={ui.secondaryButton} disabled={qrLookupLoading} type="submit">
                {qrLookupLoading ? "Dang mo..." : "Mo bang QR"}
              </button>
            </div>
          </form>

          {!selectedOrderRecord ? (
            <div className="mt-6 rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm leading-7 text-stone-600">
              Choose an order on the left to inspect its server-driven actions, invoice links, QR
              token, and scan history.
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
                        : "Theo doi trang thai don, tien thanh toan va thong tin giao nhan."}
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
                        : "Chua thanh toan"}
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
                        : "Giao ngay"}
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
                      Delivery details
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {selectedOrderRecord.deliveryFullName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Recipient</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveryFullName}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.deliveryPhoneNumber ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Phone</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveryPhoneNumber}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.deliveryAddress ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3 sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Address</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveryAddress}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.preparingStaffName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Preparing staff</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.preparingStaffName}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.confirmedByUserName ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Confirmed by</p>
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
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Delivery shipper</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {selectedOrderRecord.deliveringShipperName}
                          </strong>
                        </div>
                      ) : null}
                      {selectedOrderRecord.scheduledDeliveryAt ? (
                        <div className="rounded-[1rem] border border-matcha-900/10 bg-white/82 p-3 sm:col-span-2">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Scheduled for</p>
                          <strong className="mt-2 block text-base text-tea-900">
                            {formatDateTime(selectedOrderRecord.scheduledDeliveryAt)}
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <OrderStatusTracker order={selectedOrderRecord} />
                </div>

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
                      Xuat hoa don
                    </button>
                  ) : null}
                </div>

                {!actionableOrderActions.length && !canViewSelectedOrderInvoice ? (
                  <div className="mt-5 rounded-[1.25rem] border border-dashed border-matcha-900/15 bg-white/55 p-4 text-sm leading-7 text-stone-600">
                    Don hang nay hien khong co thao tac quan tri bo sung.
                  </div>
                ) : null}
              </div>

              <InvoicePreviewModal
                open={invoiceModalOpen}
                order={selectedOrderRecord}
                onClose={() => setInvoiceModalOpen(false)}
              />

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
                    Chua co lich su quet QR cho don hang nay.
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
              <p className={ui.eyebrow}>Doi mat khau</p>
              <h2 className="text-3xl font-bold tracking-tight text-tea-900">
                {isSelfPassword ? "Cap nhat mat khau tai khoan hien tai" : "Cap nhat mat khau tai khoan"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {passwordModal.fullName || "Tai khoan chua dat ten"}{" "}
                {passwordModal.email ? `| ${passwordModal.email}` : ""}
              </p>
            </div>

            <button
              className={ui.secondaryButton}
              type="button"
              onClick={() => closePasswordModal()}
              disabled={passwordModal.loading}
            >
              Dong
            </button>
          </div>

          <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 p-5 text-sm leading-7 text-stone-700 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Role</p>
              <p className="mt-1 font-semibold text-tea-900">{passwordModal.role || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Store scope</p>
              <p className="mt-1 font-semibold text-tea-900">
                {passwordModal.workingStoreName || "Khong gan voi cua hang cu the"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">Mat khau moi</span>
              <input
                className={ui.input}
                type="password"
                autoComplete="new-password"
                placeholder="Nhap mat khau moi"
                value={passwordModal.password}
                onChange={(event) => handlePasswordModalChange("password", event.target.value)}
                disabled={passwordModal.loading}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">Xac nhan mat khau moi</span>
              <input
                className={ui.input}
                type="password"
                autoComplete="new-password"
                placeholder="Nhap lai mat khau moi"
                value={passwordModal.confirmPassword}
                onChange={(event) =>
                  handlePasswordModalChange("confirmPassword", event.target.value)
                }
                disabled={passwordModal.loading}
              />
            </label>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
            Dung luong nay de doi mat khau nhanh cho tai khoan dang quan ly. Backend se giu nguyen
            cac truong thong tin con lai cua user va chi cap nhat password moi.
          </div>

          {passwordModal.error ? (
            <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              {passwordModal.error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button className={ui.primaryButton} type="submit" disabled={passwordModal.loading}>
              {passwordModal.loading ? "Dang cap nhat..." : "Luu mat khau moi"}
            </button>
            <button
              className={ui.secondaryButton}
              type="button"
              onClick={() => closePasswordModal()}
              disabled={passwordModal.loading}
            >
              Huy
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
              Dong
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
                    <p className={ui.eyebrow}>Top selling dishes</p>
                    <h3 className="mt-2 text-xl font-semibold text-tea-900">
                      {revenueSummary?.scopeStoreName
                        ? `Best sellers in ${revenueSummary.scopeStoreName}`
                        : "Best sellers from the current analytics scope"}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      Backend returns this ranking from `topSellingDishes`, sorted by quantity sold first and revenue second.
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
                              <span>Quantity sold: {dish.quantitySold}</span>
                              <span>Order count: {dish.orderCount}</span>
                              <span>Revenue: {formatCurrency(dish.revenue)}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-matcha-900/15 bg-[#fbfaf6] p-4 text-sm leading-7 text-stone-600">
                    Chua co du lieu top-selling dishes cho scope hien tai.
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
                      ? "Cua hang nay hien chua co anh dai dien."
                      : "Dang o che do xem toan he thong. Hay chon mot cua hang neu ban muon thu hep scope."}
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
                      Khung gio mo cua: {selectedStore.openTime ?? "??"} - {selectedStore.closeTime ?? "??"}
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
                    <span>Dang xem toan he thong.</span>
                    <span>
                      Khi chon cua hang, danh sach su kien, danh muc, mon, don hang, review va
                      feedback se duoc loc tuong ung de thao tac nhanh hon.
                    </span>
                    <span>
                      Moi module se tu dong an khop theo pham vi cua hang dang chon.
                    </span>
                    <span>
                      Khi chon don hang, khu vuc order workspace se hien thao tac hoa don va lich su
                      quet QR theo scope nay.
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

  return (
    <main className={ui.page}>
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
            <button className={ui.secondaryButton} type="button" onClick={refreshAll}>
              {loading ? "Loading..." : "Reload data"}
            </button>
            <button className={ui.primaryButton} type="button" onClick={() => resetSection(activeSection)}>
              {isDetailSection
                ? isFeedbackSection
                  ? "Clear feedback selection"
                  : "Clear review selection"
                : isManagerMode && activeSection === "stores"
                  ? "Reset panel"
                : activeSection === "orders"
                  ? "Clear order selection"
                  : "Create new form"}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mt-6 rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isAdmin ? (
          <>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-8">
              {globalStats.map((stat) => (
                <article key={stat.label} className="rounded-3xl bg-white/60 p-4">
                  <p className="text-sm text-stone-600">{stat.label}</p>
                  <strong className="mt-2 block text-2xl text-tea-900">{stat.value}</strong>
                </article>
              ))}
            </div>

            <p className="mt-4 text-sm leading-7 text-stone-500">
              Tong quan hien tai giup ban theo doi nhanh quy mo van hanh va tinh hinh du lieu tren he thong.
            </p>
          </>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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
        )}
      </section>

      {canModerateReviews ? (
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
            <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/60 p-4 text-sm leading-7 text-stone-600">
              <strong className="block text-tea-900">
                {auth.user?.workingStoreName || "No working store"}
              </strong>
              <span className="mt-2 block">
                {auth.user?.workingStoreAddress || "Manager chi thao tac trong cua hang duoc giao."}
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

      <section className={`${ui.panel} flex flex-col gap-5`}>
        <div className="flex flex-wrap gap-3">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              className={
                tab.key === activeSection
                  ? "rounded-full bg-matcha-500 px-4 py-2.5 text-sm font-semibold text-foam"
                  : "rounded-full border border-matcha-900/10 bg-white/65 px-4 py-2.5 text-sm font-semibold text-tea-900"
              }
              type="button"
              onClick={() => {
                if (tab.key !== activeSection) {
                  setReviewDetail(null);
                }
                setActiveSection(tab.key);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`grid items-start gap-6 ${activeSection === "orders" ? "xl:grid-cols-[1fr_0.95fr]" : "xl:grid-cols-[1.2fr_0.8fr]"}`}>
          <div className="grid content-start self-start gap-4">
            <div className="rounded-[1.75rem] border border-matcha-900/10 bg-white/60 p-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                  {activeConfig.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-stone-600">{activeConfig.description}</p>
                <p className="mt-2 text-sm leading-7 text-stone-500">
                  Dung bo loc ben duoi de tim nhanh ban ghi, doi trang va thu hep theo pham vi hien tai.
                </p>
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
                    ? "Danh sach hien tai dang duoc loc theo cua hang da chon."
                    : "Manager chi nhin thay du lieu cua cua hang minh dang phu trach."}
                </p>
              ) : null}
            </div>

            {loading ? (
              <article className="rounded-[1.75rem] border border-dashed border-matcha-900/15 bg-white/45 p-8 text-sm text-stone-600">
                Loading admin data...
              </article>
            ) : (
              <div className="grid gap-4">
                {activeItems.map((item) => renderEntityCard(activeSection, item))}

                {activeItems.length === 0 ? (
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
            <section className="grid gap-4">
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
                      {isFeedbackSection ? "Clear feedback selection" : "Clear review selection"}
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
                            <span className={ui.pill}>Admin reply</span>
                            {hasFeedbackReply(reviewDetail) ? (
                              <span className={ui.pill}>Visible to user</span>
                            ) : (
                              <span className={ui.pill}>Not sent yet</span>
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
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className={`${ui.card} sticky top-6`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-tea-700">
                      {activeEditingId ? "Update record" : "Create new record"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-tea-900">
                      {activeConfig.title}
                    </h2>
                    {activeSection === "orders" && activeEditingId ? (
                      <p className="mt-2 text-sm leading-7 text-stone-600">
                        Updating order <strong>#{activeEditingId}</strong>.
                      </p>
                    ) : null}
                  </div>

                  {activeEditingId ? (
                    <div className="flex flex-wrap justify-end gap-3">
                      {activeSection === "users" && activeUserRecord && canChangeUserPassword(activeUserRecord) ? (
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => openPasswordModal(activeUserRecord)}
                        >
                          Doi mat khau
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
                    Vai tro nay can duoc gan voi cua hang, nhung hien chua co cua hang nao de chon.
                    Hay tao cua hang truoc khi them tai khoan nhan su.
                  </div>
                ) : null}

                {isManagerMode && activeSection === "users" ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-matcha-500/10 px-4 py-4 text-sm leading-7 text-stone-700">
                    MANAGER can only manage <strong>STAFF</strong> and <strong>SHIPPER</strong> in
                    the current working store. Role va cua hang ap dung se duoc gioi han theo chi
                    nhanh hien tai.
                  </div>
                ) : null}

                {activeSection === "users" && activeEditingId ? (
                  <div className="mt-5 rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-4 py-4 text-sm leading-7 text-stone-700">
                    Mat khau cua tai khoan hien co duoc doi bang nut <strong>Doi mat khau</strong> de
                    tranh sua nham cac truong thong tin khac.
                  </div>
                ) : null}

                {isManagerMode && activeSection === "stores" && !activeEditingId ? (
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

                {activeSection === "userLevels" && storeOptions.length === 0 ? (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    There is no valid store in the current scope to attach to the user level definition.
                  </div>
                ) : null}

                {activeSection === "orders" && !activeEditingId ? (
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
                      (uploadState.loading && uploadState.sectionKey === activeSection) ||
                      (activeSection === "orders" && !activeEditingId) ||
                      (!canCreateRecord(activeSection) && !activeEditingId)
                    }
                    type="submit"
                  >
                    {saving
                      ? "Processing..."
                      : activeSection === "orders" && !activeEditingId
                        ? "Choose an order"
                      : !canCreateRecord(activeSection) && !activeEditingId
                        ? "Choose a record"
                      : activeEditingId
                        ? "Save changes"
                        : "Create"}
                  </button>
                  <button
                    className={ui.secondaryButton}
                    type="button"
                    onClick={() => resetSection(activeSection)}
                  >
                    Reset form
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
