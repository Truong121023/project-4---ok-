import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserFeedbackForm from "../components/UserFeedbackForm";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { buildEventPath } from "../lib/eventRouting";
import { getFeedbackCategoryLabel } from "../lib/feedbackCategories";
import { formatDeliveryTypeLabel, getOrderStatusMeta, getPaymentStatusMeta } from "../lib/orderStatus";
import {
  fetchMyReviews,
  fetchPublicStores,
  fetchUserCurrentLevels,
  fetchUserFavorites,
  fetchUserOrders,
  normalizeTargetType,
} from "../lib/siteApi";
import { buildStorePath } from "../lib/storeRouting";
import { ui } from "../ui";

function formatDateTime(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    primary: false,
  };
}

function formatPrice(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatQuarterLabel(year, quarter) {
  if (!year || !quarter) {
    return "N/A";
  }

  return `Q${quarter}/${year}`;
}

function calculateLevelProgress(level) {
  const qualifyingPaidAmount = Number(level?.qualifyingPaidAmount ?? 0);
  const minimumAmount = Number(level?.levelMinPaidAmount ?? 0);

  if (minimumAmount <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, (qualifyingPaidAmount / minimumAmount) * 100));
}

export default function AccountPage() {
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
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
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
  const [memberLevelsLoading, setMemberLevelsLoading] = useState(false);
  const [memberLevelsError, setMemberLevelsError] = useState("");
  const [levelStoreFilter, setLevelStoreFilter] = useState("all");
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

  useToastMessage(error, { type: "error", title: "Khong the tai du lieu" });
  useToastMessage(notice, { type: "success", title: "Thong bao" });
  useToastMessage(feedbackError, { type: "error", title: "Feedback" });
  useToastMessage(feedbackNotice, { type: "success", title: "Feedback" });
  useToastMessage(favoritesError, { type: "error", title: "Yeu thich" });
  useToastMessage(favoriteNotice, { type: "success", title: "Yeu thich" });
  useToastMessage(reviewHistoryError, { type: "error", title: "Danh gia" });
  useToastMessage(reviewNotice, { type: "success", title: "Danh gia" });
  useToastMessage(memberLevelsError, { type: "error", title: "Thanh vien" });
  useToastMessage(deliveryAddressError, { type: "error", title: "Dia chi giao hang" });
  useToastMessage(deliveryAddressNotice, { type: "success", title: "Dia chi giao hang" });
  useToastMessage(ordersError, { type: "error", title: "Don hang" });
  useToastMessage(passwordResetError, { type: "error", title: "Dat lai mat khau" });
  useToastMessage(passwordResetNotice, { type: "success", title: "Dat lai mat khau" });

  const isUser = auth.hasRole("USER");
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
        const nextLevels = await fetchUserCurrentLevels(
          auth,
          activeAccountSection === "levels" && levelStoreFilter !== "all"
            ? { storeId: levelStoreFilter }
            : {},
        );

        if (!cancelled) {
          setMemberLevels(
            [...nextLevels].sort((left, right) => {
              const thresholdDiff =
                Number(right.levelMinPaidAmount ?? 0) - Number(left.levelMinPaidAmount ?? 0);

              if (thresholdDiff !== 0) {
                return thresholdDiff;
              }

              const paidDiff =
                Number(right.qualifyingPaidAmount ?? 0) - Number(left.qualifyingPaidAmount ?? 0);

              if (paidDiff !== 0) {
                return paidDiff;
              }

              return String(left.storeName ?? "").localeCompare(String(right.storeName ?? ""), "vi");
            }),
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setMemberLevelsError(
            requestError?.status === 404
              ? "Current backend has not exposed membership levels yet."
              : requestError.message || "Unable to load membership levels.",
          );
          setMemberLevels([]);
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
  }, [activeAccountSection, auth, isUser, levelStoreFilter]);

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

  const handleRefresh = async () => {
    setLoading(true);
    setNotice("");
    setError("");

    try {
      const response = await auth.refreshMe();
      setNotice(response?.message ?? "Account information has been refreshed.");
    } catch (refreshError) {
      setError(getApiErrorMessage(refreshError, "Unable to reload user information."));
    } finally {
      setLoading(false);
    }
  };

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
    setDeliveryAddressDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitDeliveryAddress = async () => {
    setDeliveryAddressNotice("");
    setDeliveryAddressError("");

    if (
      !deliveryAddressDraft.fullName.trim() ||
      !deliveryAddressDraft.phoneNumber.trim() ||
      !deliveryAddressDraft.deliveryAddress.trim()
    ) {
      setDeliveryAddressError("Please enter the full name, phone number, and delivery address.");
      return;
    }

    setDeliveryAddressLoading(true);

    try {
      const result = await saveDeliveryAddress(
        deliveryAddressDraft,
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

  return (
    <main className={ui.page}>
      {activeAccountSection === "overview" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col`}>
          <p className={ui.eyebrow}>Tai khoan</p>
          <h1 className={ui.bannerTitle}>Thong tin tai khoan hien tai</h1>
          <p className={ui.copy}>
            Xem nhanh thong tin ho so, vai tro hien tai va nhung tinh nang lien quan den tai khoan
            cua ban.
          </p>

          <div className="mt-7 grid gap-4">
            <article className={`${ui.card} bg-white/55 p-5`}>
              <p className="text-sm text-stone-600">Token expires at</p>
              <strong className="mt-2 block text-lg text-tea-900">
                {auth.expiresAt ?? "N/A"}
              </strong>
            </article>
            <article className={`${ui.card} bg-white/55 p-5`}>
              <p className="text-sm text-stone-600">Current role</p>
              <strong className="mt-2 block text-lg text-tea-900">
                {auth.user?.role ?? "Unknown"}
              </strong>
            </article>
          </div>
        </div>

        <section className={`${ui.panel} grid gap-5`}>
          <div>
            <p className={ui.eyebrow}>Current user</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">
              {auth.user?.fullName}
            </p>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
              <p className="text-sm text-stone-600">Email</p>
              <strong className="mt-2 block text-base text-tea-900">
                {auth.user?.email}
              </strong>
            </article>
            <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
              <p className="text-sm text-stone-600">Role</p>
              <strong className="mt-2 block text-base text-tea-900">
                {auth.user?.role}
              </strong>
            </article>
            <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
              <p className="text-sm text-stone-600">Created at</p>
              <strong className="mt-2 block text-base text-tea-900">
                {auth.user?.createdAt ?? "N/A"}
              </strong>
            </article>
            <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
              <p className="text-sm text-stone-600">Verified at</p>
              <strong className="mt-2 block text-base text-tea-900">
                {auth.user?.verifiedAt ?? "Not verified yet"}
              </strong>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className={ui.primaryButton} type="button" onClick={handleRefresh}>
              {loading ? "Dang tai..." : "Lam moi thong tin"}
            </button>
          </div>

          {isUser ? (
            <div className="grid gap-5 rounded-[1.75rem] border border-matcha-900/10 bg-white/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={ui.eyebrow}>Membership</p>
                  <h2 className="text-2xl font-semibold text-tea-900">Current level snapshot</h2>
                </div>

                <Link className={ui.secondaryButton} to="/account/levels">
                  Open membership
                </Link>
              </div>

              {memberLevelsError ? (
                <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                  {memberLevelsError}
                </div>
              ) : null}

              {memberLevelsLoading ? (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  Loading membership levels...
                </div>
              ) : featuredLevel ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                    <p className="text-sm text-stone-600">Highest level currently tracked</p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {featuredLevel.levelName || featuredLevel.levelCode || "Member"}
                    </strong>
                    <p className="mt-2 text-sm font-semibold text-matcha-700">
                      {featuredLevel.storeName || "Tea Matcha"}
                    </p>
                  </article>

                  <article className="rounded-3xl border border-matcha-900/10 bg-white/65 p-5">
                    <p className="text-sm text-stone-600">Qualifying paid amount</p>
                    <strong className="mt-2 block text-2xl text-tea-900">
                      {formatPrice(featuredLevel.qualifyingPaidAmount)}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600">
                      Evaluated from {formatQuarterLabel(featuredLevel.evaluatedYear, featuredLevel.evaluatedQuarter)}.
                    </p>
                  </article>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
                  Chua co du lieu cap thanh vien.
                </div>
              )}
            </div>
          ) : null}

          {isUser ? (
            <div className="grid gap-5 rounded-[1.75rem] border border-matcha-900/10 bg-white/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={ui.eyebrow}>Security</p>
                  <h2 className="text-2xl font-semibold text-tea-900">Reset password</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                    Request an OTP to your current account email, then enter the OTP and your new
                    password here without leaving the profile page.
                  </p>
                </div>

                <button
                  className={ui.secondaryButton}
                  type="button"
                  onClick={handleRequestPasswordResetOtp}
                >
                  {passwordOtpSending ? "Sending OTP..." : "Send OTP"}
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
                    Account email
                  </span>
                  <input className={ui.input} type="email" value={auth.user?.email ?? ""} disabled />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    OTP expires at
                  </span>
                  <input
                    className={ui.input}
                    type="text"
                    value={passwordOtpExpiresAt || "Request OTP to receive an expiry time"}
                    disabled
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    OTP
                  </span>
                  <input
                    className={ui.input}
                    type="text"
                    value={passwordResetForm.otp}
                    onChange={(event) => handlePasswordResetFormChange("otp", event.target.value)}
                    placeholder="Enter the OTP code"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    New password
                  </span>
                  <input
                    className={ui.input}
                    type="password"
                    value={passwordResetForm.newPassword}
                    onChange={(event) =>
                      handlePasswordResetFormChange("newPassword", event.target.value)
                    }
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                    Confirm password
                  </span>
                  <input
                    className={ui.input}
                    type="password"
                    value={passwordResetForm.confirmPassword}
                    onChange={(event) =>
                      handlePasswordResetFormChange("confirmPassword", event.target.value)
                    }
                    placeholder="Re-enter the new password"
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
                  {passwordResetLoading ? "Resetting..." : "Reset password in profile"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </section>
      ) : null}

      {isUser && activeAccountSection === "levels" ? (
        <section className={ui.panel}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={ui.eyebrow}>Membership</p>
              <h2 className={ui.sectionTitle}>Current level by store</h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">
                Xem muc chi tieu duoc tinh, cap thanh vien hien tai va tung cua hang ap dung.
              </p>
            </div>

            <span className={ui.pill}>{memberLevels.length} level records</span>
          </div>

          <div className="mt-6 max-w-sm">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                Store filter
              </span>
              <select
                className={ui.input}
                value={levelStoreFilter}
                onChange={(event) => setLevelStoreFilter(event.target.value)}
              >
                <option value="all">All stores</option>
                {storeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {memberLevelsError ? (
            <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50/80 p-6 text-sm leading-7 text-red-700">
              {memberLevelsError}
            </div>
          ) : null}

          {memberLevelsLoading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              Loading membership levels...
            </div>
          ) : null}

          {!memberLevelsLoading && memberLevels.length ? (
            <div className="mt-6 grid gap-4">
              {memberLevels.map((level) => {
                const progress = calculateLevelProgress(level);
                const neededAmount = Math.max(
                  0,
                  Number(level.levelMinPaidAmount ?? 0) - Number(level.qualifyingPaidAmount ?? 0),
                );

                return (
                  <article
                    key={`${level.storeId || "store"}-${level.levelId || level.levelCode || "level"}`}
                    className="rounded-[1.5rem] border border-matcha-900/10 bg-white/72 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={ui.pill}>{level.levelCode || "LEVEL"}</span>
                          <span className={ui.pill}>
                            {formatQuarterLabel(level.currentYear, level.currentQuarter)}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-semibold text-tea-900">
                          {level.levelName || "Membership level"}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-matcha-700">
                          {level.storeName || "Tea Matcha"}
                        </p>
                      </div>

                      <div className="grid gap-1 text-right text-sm text-stone-500">
                        <span>
                          Evaluated: {formatQuarterLabel(level.evaluatedYear, level.evaluatedQuarter)}
                        </span>
                        <span>Progress: {progress.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-matcha-500/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-matcha-500 to-matcha-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm leading-7 text-stone-600 sm:grid-cols-3">
                      <span>Paid amount: {formatPrice(level.qualifyingPaidAmount)}</span>
                      <span>Minimum threshold: {formatPrice(level.levelMinPaidAmount)}</span>
                      <span>
                        {neededAmount > 0
                          ? `Need ${formatPrice(neededAmount)} more to re-qualify`
                          : "Threshold reached for this level"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        className={ui.secondaryButton}
                        to={buildStorePath({
                          id: level.storeId,
                          slug: level.storeSlug,
                        })}
                      >
                        View store
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!memberLevelsLoading && !memberLevels.length && !memberLevelsError ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-matcha-900/15 bg-white/50 p-6 text-sm text-stone-600">
              No membership level data is available for the current filter.
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
                    <span>Total: {Number(order.totalAmount ?? 0).toLocaleString("vi-VN")}d</span>
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
                  placeholder="Nguyen Quang Truong"
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
                  placeholder="0901234567"
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
                  placeholder="12 Nguyen Hue, Quan 1, TP HCM"
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
                        Tea Matcha has not replied to this feedback yet.
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
    </main>
  );
}
