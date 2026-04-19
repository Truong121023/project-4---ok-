import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import UserFeedbackForm from "../components/UserFeedbackForm";
import AccountLayout from "../components/templates/account-layout";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import { useToastMessage } from "../hooks/useToastMessage";

import { getApiErrorMessage } from "../lib/api";
import {
  getAdminNavigation,
  isAdminNavigationEntryActive,
} from "../lib/adminNavigation";
import { buildEventPath } from "../lib/eventRouting";
import { getFeedbackCategoryLabel } from "../lib/feedbackCategories";
import { formatCurrencyVnd, formatDateTimeVn } from "../lib/locale";
import { formatDeliveryTypeLabel, getOrderStatusMeta, getPaymentStatusMeta } from "../lib/orderStatus";
import {
  fetchMyReviews,
  fetchPublicStores,
  fetchUserCurrentLevels,
  fetchUserLevelDefinitions,
  fetchUserFavorites,
  fetchUserOrders,
  normalizeTargetType,
} from "../lib/siteApi";
import { geocodeAddress } from "../lib/locationLookup";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  return formatDateTimeVn(value);
}

function targetTypeLabel(targetType) {
  const labels = {
    store: "Store",
    dish: "Menu item",
    event: "Event",
  };

  return labels[normalizeTargetType(targetType)] ?? "Content";
}

function reviewSortQuery(sortKey) {
  const mapping = {
    "date-desc": "date_desc",
    "date-asc": "date_asc",
    "rating-desc": "rating_desc",
    "rating-asc": "rating_asc",
  };

  return mapping[sortKey] ?? "date_desc";
}

function reviewTargetQuery(targetFilter) {
  const mapping = {
    store: "STORE",
    dish: "DISH",
    event: "EVENT",
  };

  return mapping[targetFilter] ?? undefined;
}

function isSupportedReviewTargetType(targetType) {
  return ["store", "dish", "event"].includes(normalizeTargetType(targetType));
}

function favoriteFilterQuery(filterKey) {
  switch (filterKey) {
    case "store":
      return { targetType: "STORE" };
    case "dish":
      return { targetType: "DISH" };
    case "event":
      return { targetType: "EVENT" };
    case "purchased-dish":
      return { targetType: "DISH", purchasedOnly: true };
    default:
      return {};
  }
}

function buildStoreReferenceMap(stores) {
  return Object.fromEntries(
    stores
      .map((store) => {
        const id = String(store?.id ?? "").trim();
        const slug = String(store?.slug ?? "").trim();
        const name = String(store?.name ?? "").trim();

        if (!id) {
          return null;
        }

        return [id, { slug, name }];
      })
      .filter(Boolean),
  );
}

function hydrateStoreTarget(item, storeReferenceMap) {
  if (normalizeTargetType(item?.targetType) !== "store") {
    return item;
  }

  const storeReference = storeReferenceMap[String(item?.targetId ?? "").trim()];

  if (!storeReference) {
    return item;
  }

  return {
    ...item,
    targetSlug: item?.targetSlug || storeReference.slug,
    targetLabel: item?.targetLabel || storeReference.name,
  };
}

function filterFavoriteItems(items, filterKey) {
  switch (filterKey) {
    case "store":
      return items.filter((item) => normalizeTargetType(item.targetType) === "store");
    case "dish":
      return items.filter((item) => normalizeTargetType(item.targetType) === "dish");
    case "event":
      return items.filter((item) => normalizeTargetType(item.targetType) === "event");
    case "purchased-dish":
      return items.filter(
        (item) => normalizeTargetType(item.targetType) === "dish" && Boolean(item.purchased),
      );
    default:
      return items;
  }
}

function favoriteLink(item) {
  const targetType = normalizeTargetType(item.targetType);

  if (targetType === "store") {
    return buildStorePath(item);
  }

  if (targetType === "dish") {
    return `/menu/${item.targetId}`;
  }

  if (targetType === "event") {
    return buildEventPath(item);
  }

  return "/";
}

function reviewLink(review) {
  const targetType = normalizeTargetType(review.targetType);

  if (targetType === "store") {
    return buildStorePath(review);
  }

  if (targetType === "dish") {
    return `/menu/${review.targetId}`;
  }

  if (targetType === "event") {
    return buildEventPath(review);
  }

  return "/";
}

function hydrateFeedbackStoreTarget(item, storeReferenceMap) {
  const storeReference = storeReferenceMap[String(item?.relatedStoreId ?? "").trim()];

  if (!storeReference) {
    return item;
  }

  return {
    ...item,
    relatedStoreSlug: item?.relatedStoreSlug || storeReference.slug,
    relatedStoreName: item?.relatedStoreName || storeReference.name,
  };
}

function feedbackLink(feedback) {
  return buildStorePath({
    slug: feedback?.relatedStoreSlug,
    id: feedback?.relatedStoreId,
  });
}

function hasFeedbackReply(feedback) {
  return Boolean(String(feedback?.replyMessage ?? "").trim());
}

function formatFeedbackResponder(feedback) {
  return [feedback?.repliedByUserName, feedback?.repliedByUserRole].filter(Boolean).join(" | ");
}

function createDeliveryAddressDraft(user = null) {
  return {
    fullName: user?.fullName ?? "",
    phoneNumber: "",
    deliveryAddress: "",
    latitude: null,
    longitude: null,
    normalizedAddress: "",
    primary: false,
  };
}

function toNullableCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function formatPrice(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatCount(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function formatQuarterLabel(year, quarter) {
  if (!year || !quarter) {
    return "N/A";
  }

  return `Q${quarter}/${year}`;
}

function MenuIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function BellIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M15 17H9m8-5a5 5 0 10-10 0c0 1.7-.47 3.36-1.36 4.8L5 18h14l-.64-1.2A9.9 9.9 0 0117 12z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  );
}

function resolveMembershipThreshold(level) {
  return Number(
    level?.minMembershipPoints ??
      level?.levelMinMembershipPoints ??
      level?.minPaidAmount ??
      level?.levelMinPaidAmount ??
      0,
  );
}

function sortMembershipDefinitions(levels) {
  return [...levels].sort((left, right) => {
    const thresholdDiff = resolveMembershipThreshold(left) - resolveMembershipThreshold(right);

    if (thresholdDiff !== 0) {
      return thresholdDiff;
    }

    return String(left.code ?? left.levelCode ?? "").localeCompare(
      String(right.code ?? right.levelCode ?? ""),
      "vi",
    );
  });
}

function calculateMembershipProgress(currentPoints, currentThreshold, nextThreshold) {
  const normalizedPoints = Number(currentPoints ?? 0);
  const start = Number(currentThreshold ?? 0);
  const end = Number(nextThreshold ?? start);

  if (end <= start) {
    return 100;
  }

  return Math.max(0, Math.min(100, ((normalizedPoints - start) / (end - start)) * 100));
}

export default function AccountPage() {
  const { t } = useTranslation("account");
  const auth = useAuth();
  const location = useLocation();
  const {
    feedbacks,
    deliveryAddresses,
    userDataLoading,
    saveDeliveryAddress,
    saveFeedback,
    removeDeliveryAddress,
    setPrimaryDeliveryAddress,
    removeFeedback,
    deleteReview,
    toggleFavorite,
  } = useSiteData();
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [sortKey, setSortKey] = useState("date-desc");
  const [targetFilter, setTargetFilter] = useState("all");
  const [favoriteFilter, setFavoriteFilter] = useState("all");
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewHistoryLoading, setReviewHistoryLoading] = useState(false);
  const [reviewHistoryError, setReviewHistoryError] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewDeletingId, setReviewDeletingId] = useState("");
  const [storeReferenceMap, setStoreReferenceMap] = useState({});
  const [memberLevels, setMemberLevels] = useState([]);
  const [memberLevelDefinitions, setMemberLevelDefinitions] = useState([]);
  const [memberLevelsLoading, setMemberLevelsLoading] = useState(false);
  const [memberLevelsError, setMemberLevelsError] = useState("");
  const [deliveryAddressDraft, setDeliveryAddressDraft] = useState(() =>
    createDeliveryAddressDraft(auth.user),
  );
  const [editingDeliveryAddressId, setEditingDeliveryAddressId] = useState("");
  const [deliveryAddressLoading, setDeliveryAddressLoading] = useState(false);
  const [deliveryAddressNotice, setDeliveryAddressNotice] = useState("");
  const [deliveryAddressError, setDeliveryAddressError] = useState("");
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [passwordResetForm, setPasswordResetForm] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordResetNotice, setPasswordResetNotice] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");
  const [passwordOtpExpiresAt, setPasswordOtpExpiresAt] = useState("");
  const [passwordOtpSending, setPasswordOtpSending] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useToastMessage(feedbackError, { type: "error", title: t("feedback.eyebrow") });
  useToastMessage(feedbackNotice, { type: "success", title: t("feedback.eyebrow") });
  useToastMessage(favoritesError, { type: "error", title: t("favorites.eyebrow") });
  useToastMessage(favoriteNotice, { type: "success", title: t("favorites.eyebrow") });
  useToastMessage(reviewHistoryError, { type: "error", title: t("reviews.eyebrow") });
  useToastMessage(reviewNotice, { type: "success", title: t("reviews.eyebrow") });
  useToastMessage(memberLevelsError, { type: "error", title: t("membership.eyebrow") });
  useToastMessage(deliveryAddressError, { type: "error", title: t("addresses.eyebrow") });
  useToastMessage(deliveryAddressNotice, { type: "success", title: t("addresses.eyebrow") });
  useToastMessage(ordersError, { type: "error", title: t("nav.orders") });
  useToastMessage(passwordResetError, { type: "error", title: t("security.eyebrow") });
  useToastMessage(passwordResetNotice, { type: "success", title: t("security.eyebrow") });

  const isUser = auth.hasRole("USER");
  const isPrivilegedAccount = auth.hasRole("ADMIN", "MANAGER");
  const operationHref = useAdminOperationHref();
  const adminNavigation = useMemo(
    () =>
      getAdminNavigation({
        isManagerMode: auth.hasRole("MANAGER") && !auth.hasRole("ADMIN"),
        operationHref,
      }),
    [auth, operationHref],
  );
  const activeAccountSection = useMemo(() => {
    const normalizedPath = location.pathname.replace(/\/+$/, "");

    if (normalizedPath.endsWith("/orders")) {
      return "orders";
    }

    if (normalizedPath.endsWith("/favorites")) {
      return "favorites";
    }

    if (normalizedPath.endsWith("/levels")) {
      return "levels";
    }

    if (normalizedPath.endsWith("/addresses")) {
      return "addresses";
    }

    if (normalizedPath.endsWith("/reviews")) {
      return "reviews";
    }

    if (normalizedPath.endsWith("/feedbacks")) {
      return "feedbacks";
    }

    return "overview";
  }, [location.pathname]);
  const currentStoreName = String(auth.user?.workingStoreName ?? "").trim();
  const currentStoreId = String(auth.user?.workingStoreId ?? "").trim();

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (editingDeliveryAddressId) {
      return;
    }

    setDeliveryAddressDraft((current) =>
      current.fullName ? current : createDeliveryAddressDraft(auth.user),
    );
  }, [auth.user, editingDeliveryAddressId]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoreReferences() {
      if (!isUser) {
        setStoreReferenceMap({});
        return;
      }

      try {
        const response = await fetchPublicStores({
          page: 0,
          size: 200,
          sort: "name_asc",
        });

        if (!cancelled) {
          setStoreReferenceMap(buildStoreReferenceMap(response.items ?? []));
        }
      } catch {
        if (!cancelled) {
          setStoreReferenceMap({});
        }
      }
    }

    void loadStoreReferences();

    return () => {
      cancelled = true;
    };
  }, [isUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemberLevels() {
      if (!isUser || !["overview", "levels"].includes(activeAccountSection)) {
        return;
      }

      setMemberLevelsLoading(true);
      setMemberLevelsError("");

      try {
        const [nextLevels, nextDefinitions] = await Promise.all([
          fetchUserCurrentLevels(auth),
          fetchUserLevelDefinitions(auth),
        ]);

        if (!cancelled) {
          setMemberLevels(nextLevels);
          setMemberLevelDefinitions(sortMembershipDefinitions(nextDefinitions));
        }
      } catch (requestError) {
        if (!cancelled) {
          setMemberLevelsError(
            requestError?.status === 404
              ? "Current backend has not exposed membership levels yet."
              : requestError.message || "Unable to load membership levels.",
          );
          setMemberLevels([]);
          setMemberLevelDefinitions([]);
        }
      } finally {
        if (!cancelled) {
          setMemberLevelsLoading(false);
        }
      }
    }

    void loadMemberLevels();

    return () => {
      cancelled = true;
    };
  }, [activeAccountSection, auth, isUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentOrders() {
      if (!isUser) {
        setRecentOrders([]);
        setOrdersError("");
        return;
      }

      setOrdersLoading(true);
      setOrdersError("");

      try {
        const response = await fetchUserOrders(auth, { page: 0, size: 5 });

        if (!cancelled) {
          setRecentOrders(response.items ?? []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setOrdersError(requestError.message || "Unable to load recent order status.");
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    }

    void loadRecentOrders();

    return () => {
      cancelled = true;
    };
  }, [auth, isUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!isUser || activeAccountSection !== "favorites") {
        return;
      }

      setFavoritesLoading(true);
      setFavoritesError("");

      try {
        const nextItems = await fetchUserFavorites(auth, favoriteFilterQuery(favoriteFilter));
        const hydratedItems = nextItems.map((item) => hydrateStoreTarget(item, storeReferenceMap));

        if (!cancelled) {
          setFavoriteItems(filterFavoriteItems(hydratedItems, favoriteFilter));
        }
      } catch (requestError) {
        if (!cancelled) {
          setFavoritesError(requestError.message || "Unable to load favorites.");
        }
      } finally {
        if (!cancelled) {
          setFavoritesLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [activeAccountSection, auth, favoriteFilter, isUser, storeReferenceMap]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviewHistory() {
      if (!isUser || activeAccountSection !== "reviews") {
        return;
      }

      setReviewHistoryLoading(true);
      setReviewHistoryError("");

      try {
        const nextItems = await fetchMyReviews(auth, {
          page: 0,
          size: 100,
          targetType: reviewTargetQuery(targetFilter),
          sort: reviewSortQuery(sortKey),
        });
        const hydratedItems = nextItems
          .filter((item) => isSupportedReviewTargetType(item?.targetType))
          .map((item) => hydrateStoreTarget(item, storeReferenceMap));

        if (!cancelled) {
          setReviewItems(hydratedItems);
        }
      } catch (requestError) {
        if (!cancelled) {
          setReviewHistoryError(requestError.message || "Unable to load review history.");
        }
      } finally {
        if (!cancelled) {
          setReviewHistoryLoading(false);
        }
      }
    }

    void loadReviewHistory();

    return () => {
      cancelled = true;
    };
  }, [activeAccountSection, auth, isUser, sortKey, storeReferenceMap, targetFilter]);

  const sortedDeliveryAddresses = useMemo(
    () =>
      [...deliveryAddresses].sort((left, right) => {
        if (Boolean(left.primary) !== Boolean(right.primary)) {
          return left.primary ? -1 : 1;
        }

        const leftTime = Math.max(
          new Date(left.lastUsedAt || "").getTime() || 0,
          new Date(left.verifiedAt || "").getTime() || 0,
          new Date(left.updatedAt || left.createdAt || "").getTime() || 0,
        );
        const rightTime = Math.max(
          new Date(right.lastUsedAt || "").getTime() || 0,
          new Date(right.verifiedAt || "").getTime() || 0,
          new Date(right.updatedAt || right.createdAt || "").getTime() || 0,
        );

        return (
          rightTime - leftTime ||
          String(left.fullName || "").localeCompare(String(right.fullName || ""), "vi")
        );
      }),
    [deliveryAddresses],
  );

  const storeOptions = useMemo(
    () =>
      Object.entries(storeReferenceMap)
        .map(([id, store]) => ({
          value: String(id),
          label: store.name || `Store #${id}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "vi")),
    [storeReferenceMap],
  );

  const hydratedFeedbacks = useMemo(
    () =>
      [...feedbacks]
        .map((feedback) => hydrateFeedbackStoreTarget(feedback, storeReferenceMap))
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || left.createdAt || "").getTime() || 0;
          const rightTime = new Date(right.updatedAt || right.createdAt || "").getTime() || 0;
          return rightTime - leftTime;
        }),
    [feedbacks, storeReferenceMap],
  );

  const featuredLevel = useMemo(() => memberLevels[0] ?? null, [memberLevels]);
  const membershipPoints = Number(
    featuredLevel?.membershipPoints ?? auth.user?.membershipPoints ?? 0,
  );
  const currentMembershipThreshold = Number(
    featuredLevel?.levelMinMembershipPoints ??
      featuredLevel?.levelMinPaidAmount ??
      0,
  );
  const nextMembershipThreshold = Number(
    featuredLevel?.nextLevelMinMembershipPoints ??
      currentMembershipThreshold,
  );
  const membershipProgress = calculateMembershipProgress(
    membershipPoints,
    currentMembershipThreshold,
    nextMembershipThreshold,
  );

  const resetDeliveryAddressForm = () => {
    setEditingDeliveryAddressId("");
    setDeliveryAddressDraft(createDeliveryAddressDraft(auth.user));
  };

  const handleRemoveFavorite = async (favoriteItem) => {
    setFavoriteNotice("");
    setFavoritesError("");

    const result = await toggleFavorite(favoriteItem.targetType, favoriteItem.targetId);

    if (result.ok) {
      setFavoriteItems((currentItems) =>
        currentItems.filter(
          (item) =>
            !(
              normalizeTargetType(item.targetType) === normalizeTargetType(favoriteItem.targetType) &&
              String(item.targetId) === String(favoriteItem.targetId)
            ),
        ),
      );
    }

    setFavoriteNotice(result.message);
  };

  const handleDeliveryAddressChange = (field, value) => {
    setDeliveryAddressDraft((current) => {
      if (field !== "deliveryAddress") {
        return {
          ...current,
          [field]: value,
        };
      }

      const nextValue = String(value ?? "");
      const normalizedSnapshot = String(current.normalizedAddress ?? "").trim();
      const preserveMappedCoordinates = nextValue.trim() === normalizedSnapshot;

      return {
        ...current,
        deliveryAddress: nextValue,
        latitude: preserveMappedCoordinates ? current.latitude : null,
        longitude: preserveMappedCoordinates ? current.longitude : null,
        normalizedAddress: preserveMappedCoordinates ? normalizedSnapshot : "",
      };
    });
  };

  const handleSubmitDeliveryAddress = async () => {
    setDeliveryAddressNotice("");
    setDeliveryAddressError("");

    const trimmedAddress = deliveryAddressDraft.deliveryAddress.trim();
    if (
      !deliveryAddressDraft.fullName.trim() ||
      !deliveryAddressDraft.phoneNumber.trim() ||
      !trimmedAddress
    ) {
      setDeliveryAddressError("Please enter the full name, phone number, and delivery address.");
      return;
    }

    setDeliveryAddressLoading(true);

    try {
      let latitude = toNullableCoordinate(deliveryAddressDraft.latitude);
      let longitude = toNullableCoordinate(deliveryAddressDraft.longitude);
      let normalizedAddress = String(deliveryAddressDraft.normalizedAddress ?? "").trim();

      if (
        latitude === null ||
        longitude === null ||
        normalizedAddress !== trimmedAddress
      ) {
        try {
          const geocodedLocation = await geocodeAddress(trimmedAddress);
          latitude = geocodedLocation.latitude;
          longitude = geocodedLocation.longitude;
          normalizedAddress = geocodedLocation.normalizedAddress || trimmedAddress;

          setDeliveryAddressDraft((current) => ({
            ...current,
            deliveryAddress: normalizedAddress,
            latitude,
            longitude,
            normalizedAddress,
          }));
        } catch (error) {
          setDeliveryAddressError(
            getApiErrorMessage(
              error,
              "We could not validate this address. Add the ward, district, or city and try again.",
            ),
          );
          return;
        }
      }

      const result = await saveDeliveryAddress(
        {
          ...deliveryAddressDraft,
          deliveryAddress: normalizedAddress,
          latitude,
          longitude,
        },
        editingDeliveryAddressId,
      );

      if (result.ok) {
        setDeliveryAddressNotice(result.message);
        resetDeliveryAddressForm();
      } else {
        setDeliveryAddressError(result.message);
      }
    } finally {
      setDeliveryAddressLoading(false);
    }
  };

  const handleEditDeliveryAddress = (address) => {
    setDeliveryAddressNotice("");
    setDeliveryAddressError("");
    setEditingDeliveryAddressId(String(address.id));
    setDeliveryAddressDraft({
      fullName: address.fullName ?? "",
      phoneNumber: address.phoneNumber ?? "",
      deliveryAddress: address.deliveryAddress ?? "",
      latitude: toNullableCoordinate(address.latitude),
      longitude: toNullableCoordinate(address.longitude),
      normalizedAddress: String(address.deliveryAddress ?? "").trim(),
      primary: Boolean(address.primary),
    });
  };

  const handleDeleteDeliveryAddress = async (addressId) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Are you sure you want to delete this delivery address?")
    ) {
      return;
    }

    setDeliveryAddressNotice("");
    setDeliveryAddressError("");
    setDeliveryAddressLoading(true);

    try {
      const result = await removeDeliveryAddress(addressId);

      if (result.ok) {
        setDeliveryAddressNotice(result.message);

        if (String(editingDeliveryAddressId) === String(addressId)) {
          resetDeliveryAddressForm();
        }
      } else {
        setDeliveryAddressError(result.message);
      }
    } finally {
      setDeliveryAddressLoading(false);
    }
  };

  const handleSetPrimaryDeliveryAddress = async (addressId) => {
    setDeliveryAddressNotice("");
    setDeliveryAddressError("");
    setDeliveryAddressLoading(true);

    try {
      const result = await setPrimaryDeliveryAddress(addressId);

      if (result.ok) {
        setDeliveryAddressNotice(result.message);

        if (String(editingDeliveryAddressId) === String(addressId)) {
          setDeliveryAddressDraft((current) => ({
            ...current,
            primary: true,
          }));
        }
      } else {
        setDeliveryAddressError(result.message);
      }
    } finally {
      setDeliveryAddressLoading(false);
    }
  };

  const handleSubmitFeedback = async (payload) => {
    setFeedbackNotice("");
    setFeedbackError("");

    try {
      return await saveFeedback(payload);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Unable to send feedback.");
      setFeedbackError(message);
      return { ok: false, message };
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Are you sure you want to delete this feedback?")
    ) {
      return;
    }

    setFeedbackNotice("");
    setFeedbackError("");
    setFeedbackLoading(true);

    try {
      const result = await removeFeedback(feedbackId);

      if (result.ok) {
        setFeedbackNotice(result.message);
      } else {
        setFeedbackError(result.message);
      }
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Are you sure you want to delete this review?")
    ) {
      return;
    }

    setReviewNotice("");
    setReviewHistoryError("");
    setReviewDeletingId(String(reviewId));

    try {
      const result = await deleteReview(reviewId);

      if (result.ok) {
        setReviewItems((currentItems) =>
          currentItems.filter((review) => String(review.id) !== String(reviewId)),
        );
        setReviewNotice(result.message);
      } else {
        setReviewHistoryError(result.message);
      }
    } finally {
      setReviewDeletingId("");
    }
  };

  const handlePasswordResetFormChange = (field, value) => {
    setPasswordResetForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRequestPasswordResetOtp = async () => {
    if (!auth.user?.email) {
      setPasswordResetError("Current account email is not available.");
      return;
    }

    setPasswordResetNotice("");
    setPasswordResetError("");
    setPasswordOtpSending(true);

    try {
      const response = await auth.requestResetOtp({
        email: auth.user.email,
      });

      setPasswordOtpExpiresAt(response?.otpExpiresAt ?? "");
      setPasswordResetNotice(response?.message ?? "Reset OTP sent successfully.");
    } catch (requestError) {
      setPasswordResetError(getApiErrorMessage(requestError, "Unable to send the reset OTP."));
    } finally {
      setPasswordOtpSending(false);
    }
  };

  const handleResetPasswordInProfile = async () => {
    if (!auth.user?.email) {
      setPasswordResetError("Current account email is not available.");
      return;
    }

    setPasswordResetNotice("");
    setPasswordResetError("");

    if (!passwordResetForm.otp.trim()) {
      setPasswordResetError("Please enter the OTP sent to your email.");
      return;
    }

    if (!passwordResetForm.newPassword.trim()) {
      setPasswordResetError("Please enter the new password.");
      return;
    }

    if (passwordResetForm.newPassword !== passwordResetForm.confirmPassword) {
      setPasswordResetError("Password confirmation does not match.");
      return;
    }

    setPasswordResetLoading(true);

    try {
      const response = await auth.resetPassword({
        email: auth.user.email,
        otp: passwordResetForm.otp,
        newPassword: passwordResetForm.newPassword,
      });

      setPasswordResetNotice(
        response?.message ?? "Password reset successful. Your account password has been updated.",
      );
      setPasswordResetForm({
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (requestError) {
      setPasswordResetError(getApiErrorMessage(requestError, "Unable to reset the password."));
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleAccountMenuClose = () => {
    setAccountMenuOpen(false);
  };

  const handleAccountMenuOpen = () => {
    setAccountMenuOpen(true);
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await auth.logout();
    } finally {
      setLoggingOut(false);
      setAccountMenuOpen(false);
    }
  };

  /* ---------- Profile rail ---------- */
  const profileRail = (
    <div className="grid gap-4">
      {/* Avatar + name */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 text-xl font-bold text-cream-50">
          {String(auth.user?.fullName ?? "U").charAt(0).toUpperCase()}
        </div>
        <p className="mt-3 font-display text-base font-semibold text-ink-900">
          {auth.user?.fullName || "Account"}
        </p>
        <p className="mt-1 text-xs text-ink-500 break-all">{auth.user?.email || ""}</p>
      </div>

      {/* Tier badge */}
      {isUser && (
        <div className="rounded-lg border border-matcha-200 bg-matcha-50/60 px-4 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-matcha-700">
            {featuredLevel?.levelName || featuredLevel?.levelCode || "Member"}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {formatCount(auth.user?.membershipPoints ?? 0)} pts
          </p>
        </div>
      )}

      {/* Role badge */}
      <div className="rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-2 text-center">
        <span className={ui.pill}>{auth.user?.role || "User"}</span>
      </div>

      {/* Quick credit */}
      {isUser && (
        <div className="rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3 text-center">
          <p className="text-xs text-ink-500">{t("overview.creditPoints")}</p>
          <strong className="block text-lg font-semibold text-ink-900">
            {formatCount(auth.user?.creditPoints ?? 0)}
          </strong>
        </div>
      )}

      {/* Nav links */}
      <nav aria-label="Account sections" className="grid gap-1">
        {[
          { href: "/account", label: t("nav.overview"), key: "overview" },
          ...(isUser
            ? [
                { href: "/account/orders", label: t("nav.orders"), key: "orders" },
                { href: "/account/levels", label: t("nav.membership"), key: "levels" },
                { href: "/account/favorites", label: t("nav.favorites"), key: "favorites" },
                { href: "/account/addresses", label: t("nav.addresses"), key: "addresses" },
                { href: "/account/reviews", label: t("reviews.eyebrow"), key: "reviews" },
                { href: "/account/feedbacks", label: t("feedback.eyebrow"), key: "feedbacks" },
              ]
            : []),
        ].map((link) => (
          <Link
            key={link.key}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeAccountSection === link.key
                ? "bg-matcha-500/10 text-matcha-800 font-semibold"
                : "text-ink-700 hover:bg-cream-100"
            }`}
            to={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <button
        className={ui.secondaryButton}
        type="button"
        disabled={loggingOut}
        onClick={handleLogout}
      >
        {loggingOut ? t("signOut.signingOut") : t("signOut.signOut")}
      </button>
    </div>
  );

  return (
    <main className={ui.page}>
      {/* Admin privileged nav bar (unchanged) */}
      {isPrivilegedAccount ? (
        <section className={`${ui.panel} !gap-0 !px-5 !py-5`}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-matcha-900/10 pb-4">
            <Link className="flex min-w-0 items-center gap-3" to="/admin">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-matcha-500 to-matcha-700 text-xs font-extrabold uppercase tracking-[0.18em] text-foam">
                KM
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm uppercase tracking-[0.22em] text-tea-900">
                  Kamatcha
                </strong>
                <span className="block pt-0.5 text-xs text-stone-500">Modern tea spaces</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                aria-label="Open admin dashboard"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                to="/admin"
              >
                <BellIcon />
              </Link>
              <Link
                aria-label="Open admin menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                to="#"
                onClick={(event) => {
                  event.preventDefault();
                  handleAccountMenuOpen();
                }}
              >
                <MenuIcon />
              </Link>
            </div>
          </div>

          <nav
            aria-label="Account admin navigation"
            className="mt-4 flex flex-wrap gap-3"
          >
            {adminNavigation.primaryLinks.map((entry) => (
              <Link
                key={entry.key}
                className={`inline-flex items-center rounded-full px-4 py-3 text-sm font-semibold transition ${
                  isAdminNavigationEntryActive(location, entry)
                    ? "bg-matcha-500/16 text-matcha-800 shadow-[inset_0_0_0_1px_rgba(108,128,72,0.16)]"
                    : "bg-white/85 text-tea-900 shadow-[inset_0_0_0_1px_rgba(45,67,53,0.08)] hover:-translate-y-0.5 hover:bg-white"
                }`}
                to={entry.href}
              >
                {entry.label}
              </Link>
            ))}
          </nav>
        </section>
      ) : null}

      {isPrivilegedAccount ? (
        <div
          className={`fixed inset-0 z-40 transition ${
            accountMenuOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!accountMenuOpen}
        >
          <button
            className={`absolute inset-0 bg-tea-950/28 backdrop-blur-[2px] transition-opacity duration-300 ${
              accountMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            type="button"
            onClick={handleAccountMenuClose}
          />

          <aside
            className={`absolute right-0 top-0 flex h-full w-full max-w-[24rem] flex-col bg-[#f8f5ef] px-5 py-7 shadow-[-18px_0_50px_rgba(39,64,45,0.18)] transition-transform duration-300 ${
              accountMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
          >
            <div className="mx-auto flex w-full max-w-[19.5rem] flex-1 flex-col">
              <div className="rounded-[2rem] border border-matcha-900/10 bg-white/80 p-5 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-stone-500">
                  Signed in
                </p>
                <h2 className="mt-5 text-[2rem] font-semibold leading-none tracking-tight text-tea-900">
                  {auth.user?.fullName || "User"}
                </h2>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.28em] text-stone-500">
                  {auth.user?.role || "Account"}
                </p>
                <p className="mt-6 break-all text-base text-stone-700">
                  {auth.user?.email || "No email available."}
                </p>
              </div>

              <div className="mt-7 grid gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/88 px-4 py-4 text-base font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                  to="/account"
                  onClick={handleAccountMenuClose}
                >
                  {t("overview.title")}
                </Link>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-4 py-4 text-base font-semibold text-foam shadow-[0_16px_30px_rgba(89,108,61,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
                  disabled={loggingOut}
                  type="button"
                  onClick={handleLogout}
                >
                  {loggingOut ? t("signOut.signingOut") : t("signOut.signOut")}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <AccountLayout profile={profileRail}>
      {activeAccountSection === "overview" ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
          <section className={`${ui.panel} grid gap-5`}>
            <div>
              <p className={ui.eyebrow}>{t("overview.currentUser")}</p>
              <p className="text-3xl font-bold tracking-tight text-tea-900">
                {auth.user?.fullName}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                <p className="text-sm text-stone-600">{t("overview.email")}</p>
                <strong className="mt-2 block break-all text-base text-tea-900">
                  {auth.user?.email ?? "N/A"}
                </strong>
              </article>
              <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                <p className="text-sm text-stone-600">{t("overview.role")}</p>
                <strong className="mt-2 block text-base text-tea-900">
                  {auth.user?.role ?? "Unknown"}
                </strong>
              </article>
              <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                <p className="text-sm text-stone-600">{t("overview.createdAt")}</p>
                <strong className="mt-2 block text-base text-tea-900">
                  {formatDateTime(auth.user?.createdAt)}
                </strong>
              </article>
              <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                <p className="text-sm text-stone-600">{t("overview.store")}</p>
                <strong className="mt-2 block text-base text-tea-900">
                  {currentStoreName || t("overview.manageAllStores")}
                </strong>
                <p className="mt-2 text-sm text-stone-600">
                  {currentStoreId ? t("overview.storeNumber", { id: currentStoreId }) : t("overview.manageAllStores")}
                </p>
              </article>
              {isUser ? (
                <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5 sm:col-span-2">
                  <p className="text-sm text-stone-600">{t("overview.creditPoints")}</p>
                  <strong className="mt-2 block text-2xl text-tea-900">
                    {formatCount(auth.user?.creditPoints)}
                  </strong>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    {t("overview.creditPointsSubcopy")}
                  </p>
                </article>
              ) : null}

              {isUser ? (
                <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5 sm:col-span-2">
                  <p className="text-sm text-stone-600">{t("overview.membershipPoints")}</p>
                  <strong className="mt-2 block text-2xl text-tea-900">
                    {formatCount(auth.user?.membershipPoints)}
                  </strong>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    {t("overview.membershipPointsSubcopy")}
                  </p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="grid gap-5">

          <div className="grid gap-5 rounded-[1.75rem] border border-matcha-900/10 bg-white/55 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={ui.eyebrow}>{t("security.eyebrow")}</p>
                <h2 className="text-2xl font-semibold text-tea-900">{t("security.resetPasswordTitle")}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                  {t("security.resetPasswordSubcopy", { email: auth.user?.email ?? "" })}
                </p>
              </div>

              <button
                className={ui.secondaryButton}
                type="button"
                onClick={handleRequestPasswordResetOtp}
              >
                {passwordOtpSending ? t("security.sendingOtp") : t("security.sendOtp")}
              </button>
            </div>

            {passwordResetNotice ? (
              <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                {passwordResetNotice}
              </div>
            ) : null}

            {passwordResetError ? (
              <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                {passwordResetError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {t("security.accountEmail")}
                </span>
                <input className={ui.input} type="email" value={auth.user?.email ?? ""} disabled />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {t("security.otpExpiresAt")}
                </span>
                <input
                  className={ui.input}
                  type="text"
                  value={passwordOtpExpiresAt || t("security.otpExpiresPlaceholder")}
                  disabled
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {t("security.otpLabel")}
                </span>
                <input
                  className={ui.input}
                  type="text"
                  value={passwordResetForm.otp}
                  onChange={(event) => handlePasswordResetFormChange("otp", event.target.value)}
                  placeholder={t("security.otpPlaceholder")}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {t("security.newPasswordLabel")}
                </span>
                <input
                  className={ui.input}
                  type="password"
                  value={passwordResetForm.newPassword}
                  onChange={(event) =>
                    handlePasswordResetFormChange("newPassword", event.target.value)
                  }
                  placeholder={t("security.newPasswordPlaceholder")}
                  autoComplete="new-password"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {t("security.confirmPasswordLabel")}
                </span>
                <input
                  className={ui.input}
                  type="password"
                  value={passwordResetForm.confirmPassword}
                  onChange={(event) =>
                    handlePasswordResetFormChange("confirmPassword", event.target.value)
                  }
                  placeholder={t("security.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className={ui.primaryButton}
                type="button"
                onClick={handleResetPasswordInProfile}
              >
                {passwordResetLoading ? t("security.resettingPassword") : t("security.resetPasswordButton")}
              </button>
            </div>
          </div>

          {isUser ? (
            <div className="grid gap-5 rounded-[1.75rem] border border-matcha-900/10 bg-white/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={ui.eyebrow}>{t("membershipSnapshot.eyebrow")}</p>
                  <h2 className="text-2xl font-semibold text-tea-900">{t("membershipSnapshot.title")}</h2>
                </div>

                <Link className={ui.secondaryButton} to="/account/levels">
                  {t("membershipSnapshot.openMembership")}
                </Link>
              </div>

              {memberLevelsError ? (
                <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                  {memberLevelsError}
                </div>
              ) : null}

              {memberLevelsLoading ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  {t("membershipSnapshot.loadingLevels")}
                </div>
              ) : featuredLevel ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                    <p className="text-sm text-stone-600">{t("membershipSnapshot.currentTier")}</p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {featuredLevel.levelName || featuredLevel.levelCode || t("membershipSnapshot.memberFallback")}
                    </strong>
                    <p className="mt-2 text-sm font-semibold text-matcha-700">
                      {featuredLevel.levelCode || t("membershipSnapshot.activeFallback")}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                    <p className="text-sm text-stone-600">{t("membershipSnapshot.membershipPoints")}</p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {formatCount(membershipPoints)}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600">
                      {t("membershipSnapshot.pointRate")}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                    <p className="text-sm text-stone-600">{t("membershipSnapshot.nextTier")}</p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {featuredLevel.nextLevelName || t("membershipSnapshot.topTierReached")}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600">
                      {featuredLevel.nextLevelName
                        ? t("membershipSnapshot.morePointsNeeded", {
                            count: formatCount(Math.max(0, nextMembershipThreshold - membershipPoints)),
                          })
                        : t("membershipSnapshot.highestTierReached")}
                    </p>
                  </article>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  {t("membershipSnapshot.noTierData")}
                </div>
              )}
            </div>
          ) : null}
        </section>
      </section>
      ) : null}

      {isUser && activeAccountSection === "levels" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>{t("membershipSnapshot.levelsEyebrow")}</p>
              <h2 className={ui.sectionTitle}>{t("membershipSnapshot.levelsTitle")}</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                {t("membershipSnapshot.levelsSubcopy")}
              </p>
            </div>

            <span className={ui.pill}>{t("membershipSnapshot.activeTiers", { count: memberLevelDefinitions.length })}</span>
          </div>

          {memberLevelsError ? (
            <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 text-sm leading-7 text-red-700">
              {memberLevelsError}
            </div>
          ) : null}

          {memberLevelsLoading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              {t("membershipSnapshot.loadingLevels")}
            </div>
          ) : null}

          {!memberLevelsLoading && featuredLevel ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <p className="text-sm text-stone-600">{t("membershipSnapshot.currentTier")}</p>
                <strong className="mt-2 block text-2xl text-tea-900">
                  {featuredLevel.levelName || featuredLevel.levelCode || t("membershipSnapshot.memberFallback")}
                </strong>
                <p className="mt-2 text-sm text-stone-600">
                  {t("membershipSnapshot.currentPoints", { count: formatCount(membershipPoints) })}
                </p>
              </article>

              <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <p className="text-sm text-stone-600">{t("membershipSnapshot.currentThreshold")}</p>
                <strong className="mt-2 block text-2xl text-tea-900">
                  {formatCount(currentMembershipThreshold)}
                </strong>
                <p className="mt-2 text-sm text-stone-600">{t("membershipSnapshot.minPointsForTier")}</p>
              </article>

              <article className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5">
                <p className="text-sm text-stone-600">{t("membershipSnapshot.nextTierProgress")}</p>
                <strong className="mt-2 block text-2xl text-tea-900">
                  {featuredLevel.nextLevelName || t("membershipSnapshot.topTierFallback")}
                </strong>
                <p className="mt-2 text-sm text-stone-600">
                  {featuredLevel.nextLevelName
                    ? t("membershipSnapshot.morePointsNeeded", {
                        count: formatCount(Math.max(0, nextMembershipThreshold - membershipPoints)),
                      })
                    : t("membershipSnapshot.noHigherTier")}
                </p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-matcha-500/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-matcha-500 to-matcha-700"
                    style={{ width: `${membershipProgress}%` }}
                  />
                </div>
              </article>
            </div>
          ) : null}

          {!memberLevelsLoading && memberLevelDefinitions.length ? (
            <div className="mt-6 grid gap-4">
              {memberLevelDefinitions.map((level, index) => {
                const threshold = resolveMembershipThreshold(level);
                const nextThreshold = resolveMembershipThreshold(memberLevelDefinitions[index + 1]);
                const isCurrentLevel =
                  String(level.id ?? "") === String(featuredLevel?.levelId ?? "") ||
                  String(level.code ?? "").toUpperCase() ===
                    String(featuredLevel?.levelCode ?? "").toUpperCase();
                const isNextLevel =
                  !isCurrentLevel &&
                  (String(level.id ?? "") === String(featuredLevel?.nextLevelId ?? "") ||
                    String(level.code ?? "").toUpperCase() ===
                      String(featuredLevel?.nextLevelCode ?? "").toUpperCase());
                const pointsNeeded = Math.max(0, threshold - membershipPoints);
                const progress =
                  isCurrentLevel || isNextLevel
                    ? calculateMembershipProgress(
                        membershipPoints,
                        threshold,
                        nextThreshold || threshold,
                      )
                    : membershipPoints >= threshold
                      ? 100
                      : 0;

                return (
                  <article
                    key={level.id || level.code || index}
                    className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={ui.pill}>{level.code || "LEVEL"}</span>
                          {isCurrentLevel ? <span className={ui.pill}>{t("membershipSnapshot.currentTierBadge")}</span> : null}
                          {isNextLevel ? <span className={ui.pill}>{t("membershipSnapshot.nextTierBadge")}</span> : null}
                        </div>

                        <h3 className="mt-3 text-xl font-semibold text-tea-900">
                          {level.name || level.code || t("membershipSnapshot.membershipLevel")}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-matcha-700">
                          {level.storeName || t("membershipSnapshot.globalMembership")}
                        </p>
                      </div>

                      <div className="grid gap-1 text-right text-sm text-stone-500">
                        <span>{t("membershipSnapshot.tierThreshold", { count: formatCount(threshold) })}</span>
                        <span>{t("membershipSnapshot.tierStatus", { status: level.active ? t("membershipSnapshot.tierStatusActive") : t("membershipSnapshot.tierStatusInactive") })}</span>
                      </div>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-matcha-500/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-matcha-500 to-matcha-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm leading-7 text-stone-600 sm:grid-cols-3">
                      <span>{t("membershipSnapshot.tierCurrentPoints", { count: formatCount(membershipPoints) })}</span>
                      <span>{t("membershipSnapshot.tierThresholdSpend", { value: formatPrice(threshold * 1000) })}</span>
                      <span>
                        {membershipPoints >= threshold
                          ? t("membershipSnapshot.tierReached")
                          : t("membershipSnapshot.tierNeedMore", { count: formatCount(pointsNeeded) })}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!memberLevelsLoading && !memberLevelDefinitions.length && !memberLevelsError ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              {t("membershipSnapshot.noLevelData")}
            </div>
          ) : null}
        </section>
      ) : null}

      {isUser && activeAccountSection === "favorites" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>Favorites</p>
              <h2 className={ui.sectionTitle}>Saved places and items</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                Quickly filter by stores, menu items, events, or only items you have purchased.
              </p>
            </div>

            <span className={ui.pill}>{favoriteItems.length} items</span>
          </div>

          <div className="mt-6 max-w-sm">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Favorite filter
              </span>
              <select
                className={ui.input}
                value={favoriteFilter}
                onChange={(event) => setFavoriteFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="store">Stores</option>
                <option value="dish">Menu items</option>
                <option value="event">Events</option>
                <option value="purchased-dish">Purchased items</option>
              </select>
            </label>
          </div>

          {favoriteNotice ? (
            <div className="mt-4 rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {favoriteNotice}
            </div>
          ) : null}

          {favoritesError ? (
            <div className="mt-4 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {favoritesError}
            </div>
          ) : null}

          {favoritesLoading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              Loading favorites...
            </div>
          ) : null}

          {!favoritesLoading && favoriteItems.length ? (
            <div className="mt-6 grid gap-4">
              {favoriteItems.map((item) => (
                <article
                  key={`${item.targetType}-${item.targetId}`}
                  className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={ui.pill}>{targetTypeLabel(item.targetType)}</span>
                        {item.purchased ? <span className={ui.pill}>Purchased</span> : null}
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-tea-900">
                        {item.targetLabel || "Saved item"}
                      </h3>
                      <p className="mt-2 text-sm text-stone-500">
                        Saved at {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className={ui.primaryButton} to={favoriteLink(item)}>
                      View details
                    </Link>
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => handleRemoveFavorite(item)}
                    >
                      Remove favorite
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!favoritesLoading && !favoriteItems.length ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              No matching favorites found.
            </div>
          ) : null}
        </section>
      ) : null}

      {isUser && activeAccountSection === "orders" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>My orders</p>
              <h2 className={ui.sectionTitle}>Recent order status</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                Follow payment, processing, and delivery progress directly from your account.
              </p>
            </div>

            <Link className={ui.secondaryButton} to="/orders">
              View all orders
            </Link>
          </div>

          {ordersError ? (
            <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 text-sm leading-7 text-red-700">
              {ordersError}
            </div>
          ) : null}

          {ordersLoading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              Loading recent orders...
            </div>
          ) : null}

          {!ordersLoading && recentOrders.length ? (
            <div className="mt-6 grid gap-4">
              {recentOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-tea-900">Order #{order.id}</h3>
                      <p className="mt-2 text-sm text-stone-600">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={ui.pill}>{getOrderStatusMeta(order.status).label}</span>
                      <span className={ui.pill}>{getPaymentStatusMeta(order.paymentStatus).label}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm leading-7 text-stone-600 sm:grid-cols-2">
                    <span>Delivery type: {formatDeliveryTypeLabel(order.deliveryType)}</span>
                      <span>Total: {formatCurrencyVnd(order.totalAmount)}</span>
                    {order.statusSummary ? <span className="sm:col-span-2">{order.statusSummary}</span> : null}
                    {order.preparingStaffName ? <span>Preparing staff: {order.preparingStaffName}</span> : null}
                    {order.deliveringShipperName ? <span>Shipper: {order.deliveringShipperName}</span> : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className={ui.primaryButton} to={`/orders/${order.id}`}>
                      Track order
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!ordersLoading && !recentOrders.length && !ordersError ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              You do not have any orders yet.
            </div>
          ) : null}
        </section>
      ) : null}

      {isUser && activeAccountSection === "addresses" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>Delivery addresses</p>
              <h2 className={ui.sectionTitle}>Your address book</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                Save addresses for yourself or your family, then reuse them for future orders.
              </p>
            </div>

            <span className={ui.pill}>{sortedDeliveryAddresses.length} addresses</span>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className={`${ui.card} grid gap-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-tea-900">
                    {editingDeliveryAddressId ? "Update address" : "Add a new address"}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-stone-600">
                    Recipient name, phone number, and delivery address.
                  </p>
                </div>

                {editingDeliveryAddressId ? (
                  <button className={ui.secondaryButton} type="button" onClick={resetDeliveryAddressForm}>
                    Cancel editing
                  </button>
                ) : null}
              </div>

              {deliveryAddressNotice ? (
                <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                  {deliveryAddressNotice}
                </div>
              ) : null}

              {deliveryAddressError ? (
                <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                  {deliveryAddressError}
                </div>
              ) : null}

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Recipient name
                </span>
                <input
                  className={ui.input}
                  type="text"
                  value={deliveryAddressDraft.fullName}
                  onChange={(event) => handleDeliveryAddressChange("fullName", event.target.value)}
                  placeholder={t("addresses.fullNamePlaceholder")}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Phone number
                </span>
                <input
                  className={ui.input}
                  type="text"
                  value={deliveryAddressDraft.phoneNumber}
                  onChange={(event) => handleDeliveryAddressChange("phoneNumber", event.target.value)}
                  placeholder={t("addresses.phoneNumberPlaceholder")}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  Delivery address
                </span>
                <textarea
                  className={`${ui.input} min-h-[8rem] resize-y`}
                  value={deliveryAddressDraft.deliveryAddress}
                  onChange={(event) => handleDeliveryAddressChange("deliveryAddress", event.target.value)}
                  placeholder={t("addresses.addressPlaceholder")}
                />
              </label>

              <label className="flex items-center gap-3 rounded-[1.25rem] border border-matcha-900/10 bg-white/70 px-4 py-3 text-sm text-tea-900">
                <input
                  checked={Boolean(deliveryAddressDraft.primary)}
                  className="h-4 w-4 accent-matcha-600"
                  type="checkbox"
                  onChange={(event) => handleDeliveryAddressChange("primary", event.target.checked)}
                />
                <span className="font-semibold">Set as primary delivery address</span>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  className={ui.primaryButton}
                  type="button"
                  onClick={handleSubmitDeliveryAddress}
                >
                  {deliveryAddressLoading
                    ? "Saving..."
                    : editingDeliveryAddressId
                      ? "Update address"
                      : "Save address"}
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {userDataLoading ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  Loading address book...
                </div>
              ) : null}

              {!userDataLoading && sortedDeliveryAddresses.length ? (
                sortedDeliveryAddresses.map((address) => (
                  <article
                    key={address.id}
                    className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-tea-900">{address.fullName}</h3>
                        <p className="mt-2 text-sm font-semibold text-matcha-700">
                          {address.phoneNumber}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {address.primary ? <span className={ui.pill}>Primary</span> : null}
                        {address.verifiedAt ? <span className={ui.pill}>Verified</span> : null}
                        <span className={ui.pill}>{formatDateTime(address.updatedAt || address.createdAt)}</span>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-stone-600">
                      {address.deliveryAddress}
                    </p>

                    {address.verifiedAt || address.lastUsedAt ? (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
                        {address.verifiedAt ? <span>Verified: {formatDateTime(address.verifiedAt)}</span> : null}
                        {address.lastUsedAt ? <span>Last used: {formatDateTime(address.lastUsedAt)}</span> : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {!address.primary ? (
                        <button
                          className={ui.secondaryButton}
                          type="button"
                          onClick={() => handleSetPrimaryDeliveryAddress(address.id)}
                        >
                          Set primary
                        </button>
                      ) : null}

                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => handleEditDeliveryAddress(address)}
                      >
                        Edit
                      </button>

                      <button
                        className={ui.secondaryButton}
                        type="button"
                        onClick={() => handleDeleteDeliveryAddress(address.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : null}

              {!userDataLoading && !sortedDeliveryAddresses.length ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  You have not saved any delivery addresses yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {isUser && activeAccountSection === "reviews" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>My reviews</p>
              <h2 className={ui.sectionTitle}>Review history</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                Filter by store, menu item, or event and sort by time or rating.
              </p>
            </div>

            <span className={ui.pill}>{reviewItems.length} reviews</span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[220px_220px]">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Sort
              </span>
              <select
                className={ui.input}
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value)}
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="rating-desc">Highest rating</option>
                <option value="rating-asc">Lowest rating</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Review type
              </span>
              <select
                className={ui.input}
                value={targetFilter}
                onChange={(event) => setTargetFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="store">Store</option>
                <option value="dish">Menu item</option>
                <option value="event">Event</option>
              </select>
            </label>
          </div>

          {reviewNotice ? (
            <div className="mt-6 rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {reviewNotice}
            </div>
          ) : null}

          {reviewHistoryError ? (
            <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 text-sm leading-7 text-red-700">
              {reviewHistoryError}
            </div>
          ) : null}

          {reviewHistoryLoading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              Loading review history...
            </div>
          ) : null}

          {!reviewHistoryLoading && reviewItems.length ? (
            <div className="mt-6 grid gap-4">
              {reviewItems.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={ui.pill}>{targetTypeLabel(review.targetType)}</span>
                        <span className="text-sm text-stone-500">
                          {formatDateTime(review.updatedAt || review.createdAt)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-tea-900">
                        {review.title || "Untitled review"}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-matcha-700">
                        {review.targetLabel || "Reviewed content"}
                      </p>
                    </div>

                    <span className={ui.pill}>{Number(review.rating).toFixed(1)} stars</span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-stone-600">
                    {review.comment || "You did not leave a detailed comment."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link className={ui.secondaryButton} to={reviewLink(review)}>
                      View again
                    </Link>
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      disabled={reviewDeletingId === String(review.id)}
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      {reviewDeletingId === String(review.id) ? "Deleting..." : "Delete review"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!reviewHistoryLoading && !reviewItems.length && !reviewHistoryError ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              No matching reviews found.
            </div>
          ) : null}
        </section>
      ) : null}

      {isUser && activeAccountSection === "feedbacks" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>My feedback</p>
              <h2 className={ui.sectionTitle}>Feedback history</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                Send feedback about service, products, or your experience and review it all in one
                place.
              </p>
            </div>

            <span className={ui.pill}>{hydratedFeedbacks.length} feedback items</span>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <UserFeedbackForm
              title="Send new feedback"
              canSubmit={auth.hasRole("USER")}
              storeOptions={storeOptions}
              onSubmit={handleSubmitFeedback}
            />

            <div className="grid gap-4 content-start">
              {feedbackNotice ? (
                <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                  {feedbackNotice}
                </div>
              ) : null}

              {feedbackError ? (
                <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                  {feedbackError}
                </div>
              ) : null}

              {userDataLoading ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  Loading feedback list...
                </div>
              ) : null}

              {feedbackLoading ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  Processing feedback...
                </div>
              ) : null}

              {!userDataLoading && !feedbackLoading && hydratedFeedbacks.length ? (
                hydratedFeedbacks.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={ui.pill}>{getFeedbackCategoryLabel(item.category)}</span>
                          <span className={ui.pill}>
                            {formatDateTime(item.updatedAt || item.createdAt)}
                          </span>
                          <span className={ui.pill}>
                            {hasFeedbackReply(item) ? "Replied" : "Awaiting reply"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-semibold text-tea-900">
                          {item.subject || "Untitled feedback"}
                        </h3>
                        <p className="mt-2 text-sm text-matcha-700">
                          {item.relatedStoreName || "Related store"}
                        </p>
                        {item.relatedStoreAddress ? (
                          <p className="mt-1 text-sm text-stone-500">{item.relatedStoreAddress}</p>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-stone-600">
                      {item.message || "You did not enter a detailed message."}
                    </p>

                    {hasFeedbackReply(item) ? (
                      <div className="mt-4 rounded-[1.35rem] border border-matcha-900/10 bg-matcha-500/10 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={ui.pill}>Admin reply</span>
                          {item.repliedAt ? (
                            <span className={ui.pill}>{formatDateTime(item.repliedAt)}</span>
                          ) : null}
                        </div>

                        <p className="mt-3 text-sm leading-7 text-stone-700">
                          {item.replyMessage}
                        </p>

                        {formatFeedbackResponder(item) ? (
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-500">
                            Replied by {formatFeedbackResponder(item)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.35rem] border border-dashed border-matcha-900/15 bg-white/50 p-4 text-sm leading-7 text-stone-600">
                        Kamatcha has not replied to this feedback yet.
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link className={ui.primaryButton} to={feedbackLink(item)}>
                        View store
                      </Link>

                      <button
                        className={ui.secondaryButton}
                        type="button"
                        disabled={feedbackLoading}
                        onClick={() => handleDeleteFeedback(item.id)}
                      >
                        Delete feedback
                      </button>
                    </div>
                  </article>
                ))
              ) : null}

              {!userDataLoading && !feedbackLoading && !hydratedFeedbacks.length ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  You have not sent any feedback yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      </AccountLayout>
    </main>
  );
}
