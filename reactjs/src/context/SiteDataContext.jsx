import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../lib/api";
import {
  addUserCartItem,
  fetchAdminNotifications,
  fetchAdminNotificationUnreadCount,
  clearUserCart,
  checkoutUserCart,
  createUserFeedback,
  createUserDeliveryAddress,
  createUserFavorite,
  createUserReview,
  deleteUserCartItem,
  deleteUserFeedback,
  deleteUserDeliveryAddress,
  deleteUserFavorite,
  deleteUserReview,
  fetchMyReviews,
  fetchPublicDishDetail,
  fetchUserCart,
  fetchUserFeedbackDetail,
  fetchUserFeedbacks,
  fetchUserDeliveryAddresses,
  fetchUserFavorites,
  fetchUserNotificationUnreadCount,
  fetchUserNotifications,
  normalizeTargetType,
  markAdminNotificationRead,
  markAdminNotificationUnread,
  markAllAdminNotificationsRead,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  markUserNotificationUnread,
  previewUserCartCheckout,
  setPrimaryUserDeliveryAddress,
  updateUserCartItem,
  updateUserDeliveryAddress,
  updateUserReview,
} from "../lib/siteApi";
import { getCartAvailabilityDecision, getCartSuccessMessage } from "../lib/cartAvailability";
import { useAuth } from "./AuthContext";

const SiteDataContext = createContext(null);
const GUEST_CART_STORAGE_KEY = "kamatcha.guest-cart";

function emptyCart() {
  return {
    id: "",
    userId: "",
    status: "OPEN",
    items: [],
    totalItems: 0,
    subtotal: 0,
    subtotalAmount: 0,
    discountAmount: 0,
    shippingDistanceKm: null,
    shippingFeeAmount: null,
    shippingFeeBreakdown: [],
    totalAmount: 0,
    createdAt: "",
    updatedAt: "",
  };
}

function emptyNotificationFeed() {
  return {
    items: [],
    page: 0,
    size: 8,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  };
}

function buildTargetKey(targetType, targetId) {
  return `${normalizeTargetType(targetType)}:${String(targetId ?? "").trim()}`;
}

function normalizeCartSnapshot(snapshot) {
  const items = Array.isArray(snapshot?.items)
    ? snapshot.items
        .map((item) => ({
          id: String(item?.id ?? `guest-${item?.storeId ?? ""}-${item?.dishId ?? ""}`),
          storeId: String(item?.storeId ?? ""),
          storeSlug: String(item?.storeSlug ?? ""),
          storeName: String(item?.storeName ?? ""),
          storeLatitude:
            item?.storeLatitude === undefined || item?.storeLatitude === null
              ? null
              : Number(item.storeLatitude),
          storeLongitude:
            item?.storeLongitude === undefined || item?.storeLongitude === null
              ? null
              : Number(item.storeLongitude),
          dishId: String(item?.dishId ?? ""),
          dishName: String(item?.dishName ?? ""),
          quantity: Number(item?.quantity ?? 0),
          unitPrice: Number(item?.unitPrice ?? 0),
          totalPrice: Number(item?.totalPrice ?? 0),
          imagePaths: Array.isArray(item?.imagePaths) ? item.imagePaths : [],
          stock: Number(item?.stock ?? 0),
          available: Boolean(item?.available),
          disabled: Boolean(item?.disabled),
          schedulable: Boolean(item?.schedulable),
          createdAt: String(item?.createdAt ?? ""),
          updatedAt: String(item?.updatedAt ?? ""),
        }))
        .filter((item) => item.dishId && item.storeId && item.quantity > 0)
    : [];

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice ?? 0), 0);

  return {
    id: String(snapshot?.id ?? (items.length ? "guest-cart" : "")),
    userId: String(snapshot?.userId ?? ""),
    status: String(snapshot?.status ?? "OPEN"),
    items,
    totalItems,
    subtotal,
    subtotalAmount: Number(snapshot?.subtotalAmount ?? subtotal),
    discountAmount: Number(snapshot?.discountAmount ?? 0),
    shippingDistanceKm:
      snapshot?.shippingDistanceKm === undefined || snapshot?.shippingDistanceKm === null
        ? null
        : Number(snapshot.shippingDistanceKm),
    shippingFeeAmount:
      snapshot?.shippingFeeAmount === undefined || snapshot?.shippingFeeAmount === null
        ? null
        : Number(snapshot.shippingFeeAmount),
    shippingFeeBreakdown: Array.isArray(snapshot?.shippingFeeBreakdown)
      ? snapshot.shippingFeeBreakdown.map((item) => ({
          storeId: String(item?.storeId ?? ""),
          storeName: String(item?.storeName ?? ""),
          distanceKm:
            item?.distanceKm === undefined || item?.distanceKm === null
              ? null
              : Number(item.distanceKm),
          shippingFeeAmount: Number(item?.shippingFeeAmount ?? 0),
        }))
      : [],
    totalAmount: Number(snapshot?.totalAmount ?? subtotal),
    createdAt: String(snapshot?.createdAt ?? ""),
    updatedAt: String(snapshot?.updatedAt ?? ""),
  };
}

function readGuestCart() {
  if (typeof window === "undefined") {
    return emptyCart();
  }

  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    return raw ? normalizeCartSnapshot(JSON.parse(raw)) : emptyCart();
  } catch {
    return emptyCart();
  }
}

function writeGuestCart(snapshot) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeCartSnapshot(snapshot);

  if (!normalized.items.length) {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(normalized));
}

async function buildGuestCartItemSnapshot({ itemId, storeId, quantity }) {
  const response = await fetchPublicDishDetail(itemId);
  const matchedStore =
    response.stores.find((store) => String(store.id) === String(storeId)) ??
    response.stores.find((store) => String(store.storeId) === String(storeId)) ??
    null;

  if (!matchedStore) {
    throw new Error("No matching store was found for adding this item to the cart.");
  }

  const stock = Number(matchedStore.stock ?? 0);
  const availability = getCartAvailabilityDecision(matchedStore);

  if (!availability.allowed) {
    throw new Error(availability.reason || "This item cannot be added to the cart yet.");
  }

  const canSchedule = availability.allowed;
  const canServeNow = availability.allowed && !availability.preorderOnly;
  const unitPrice = Number(matchedStore.price ?? response.dish?.price ?? 0);
  const nowIso = new Date().toISOString();

  return {
    id: `guest-${matchedStore.storeId || matchedStore.id}-${itemId}`,
    storeId: String(matchedStore.storeId || matchedStore.id || storeId),
    storeSlug: String(matchedStore.storeSlug ?? matchedStore.slug ?? ""),
    storeName: String(matchedStore.storeName ?? matchedStore.name ?? ""),
    dishId: String(itemId),
    dishName: String(response.dish?.name ?? ""),
    storeLatitude:
      matchedStore?.latitude === undefined || matchedStore?.latitude === null
        ? null
        : Number(matchedStore.latitude),
    storeLongitude:
      matchedStore?.longitude === undefined || matchedStore?.longitude === null
        ? null
        : Number(matchedStore.longitude),
    quantity: Number(quantity ?? 1),
    unitPrice,
    totalPrice: unitPrice * Number(quantity ?? 1),
    imagePaths: Array.isArray(response.dish?.imagePaths) ? response.dish.imagePaths : [],
    stock,
    available: canServeNow,
    disabled: !canServeNow,
    schedulable: canSchedule,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function upsertGuestCartItem(snapshot, item) {
  const currentCart = normalizeCartSnapshot(snapshot);
  const currentItems = [...currentCart.items];
  const matchedIndex = currentItems.findIndex(
    (entry) =>
      String(entry.dishId) === String(item.dishId) &&
      String(entry.storeId) === String(item.storeId),
  );

  if (matchedIndex >= 0) {
    const previousItem = currentItems[matchedIndex];
    const nextQuantity = Number(previousItem.quantity ?? 0) + Number(item.quantity ?? 0);
    currentItems[matchedIndex] = {
      ...previousItem,
      ...item,
      quantity: nextQuantity,
      totalPrice: Number(item.unitPrice ?? previousItem.unitPrice ?? 0) * nextQuantity,
      createdAt: previousItem.createdAt || item.createdAt,
      updatedAt: new Date().toISOString(),
    };
  } else {
    currentItems.push(item);
  }

  return normalizeCartSnapshot({
    ...currentCart,
    id: "guest-cart",
    items: currentItems,
    updatedAt: new Date().toISOString(),
  });
}

function updateGuestCartItem(snapshot, cartItemId, quantity) {
  const currentCart = normalizeCartSnapshot(snapshot);
  return normalizeCartSnapshot({
    ...currentCart,
    items: currentCart.items.map((item) =>
      String(item.id) === String(cartItemId)
        ? {
            ...item,
            quantity,
            totalPrice: Number(item.unitPrice ?? 0) * Number(quantity ?? 0),
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
    updatedAt: new Date().toISOString(),
  });
}

function removeGuestCartItem(snapshot, cartItemId) {
  const currentCart = normalizeCartSnapshot(snapshot);
  return normalizeCartSnapshot({
    ...currentCart,
    items: currentCart.items.filter((item) => String(item.id) !== String(cartItemId)),
    updatedAt: new Date().toISOString(),
  });
}

async function hydrateFeedbackDetails(auth, feedbackItems) {
  if (!Array.isArray(feedbackItems) || feedbackItems.length === 0) {
    return [];
  }

  const detailedFeedbacks = await Promise.allSettled(
    feedbackItems.map(async (feedback) => {
      if (!feedback?.id) {
        return feedback;
      }

      return fetchUserFeedbackDetail(auth, feedback.id);
    }),
  );

  return feedbackItems.map((feedback, index) =>
    detailedFeedbacks[index]?.status === "fulfilled"
      ? detailedFeedbacks[index].value
      : feedback,
  );
}

export function SiteDataProvider({ children }) {
  const auth = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [cart, setCart] = useState(emptyCart);
  const [guestCart, setGuestCart] = useState(() => readGuestCart());
  const [deliveryAddresses, setDeliveryAddresses] = useState([]);
  const [notificationFeed, setNotificationFeed] = useState(emptyNotificationFeed);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [userDataError, setUserDataError] = useState("");

  const canUseUserFeatures =
    auth.isAuthenticated && String(auth.user?.role ?? "").toUpperCase() === "USER";
  const canUseAdminNotifications =
    auth.isAuthenticated && ["ADMIN", "MANAGER"].includes(String(auth.user?.role ?? "").toUpperCase());
  const canUseNotificationCenter = canUseUserFeatures || canUseAdminNotifications;
  const canUseGuestCart = !auth.isAuthenticated;

  const currentUserProfile = useMemo(() => {
    if (!auth.user) {
      return null;
    }

    return {
      id: String(auth.user.id ?? ""),
      name: auth.user.fullName ?? auth.user.email ?? "User",
      email: auth.user.email ?? "",
      role: auth.user.role ?? "",
    };
  }, [auth.user]);

  const favoriteKeySet = useMemo(
    () => new Set(favorites.map((item) => buildTargetKey(item.targetType, item.targetId))),
    [favorites],
  );

  const persistGuestCart = (nextCart) => {
    const normalizedCart = normalizeCartSnapshot(nextCart);
    writeGuestCart(normalizedCart);
    setGuestCart(normalizedCart);
    if (!auth.isAuthenticated) {
      setCart(normalizedCart);
    }
    return normalizedCart;
  };

  const mergeGuestCartIntoServer = async () => {
    const snapshot = readGuestCart();

    if (!snapshot.items.length) {
      return [];
    }

    const remainingItems = [];
    const mergeErrors = [];

    for (const item of snapshot.items) {
      try {
        await addUserCartItem(auth, {
          storeId: item.storeId,
          dishId: item.dishId,
          quantity: item.quantity,
        });
      } catch (error) {
        remainingItems.push(item);
        mergeErrors.push(
          getApiErrorMessage(
            error,
            `Could not merge item ${item.dishName || item.dishId} into your account cart.`,
          ),
        );
      }
    }

    persistGuestCart({
      ...snapshot,
      items: remainingItems,
    });

    return mergeErrors;
  };

  const refreshUserData = async () => {
    if (!auth.isAuthenticated) {
      setFavorites([]);
      setMyReviews([]);
      setFeedbacks([]);
      setCart(guestCart);
      setDeliveryAddresses([]);
      if (!canUseNotificationCenter) {
        setNotificationFeed(emptyNotificationFeed());
        setUnreadNotificationCount(0);
        setNotificationError("");
      }
      setUserDataError("");
      return;
    }

    if (!canUseUserFeatures) {
      setFavorites([]);
      setMyReviews([]);
      setFeedbacks([]);
      setCart(emptyCart());
      setDeliveryAddresses([]);
      if (!canUseNotificationCenter) {
        setNotificationFeed(emptyNotificationFeed());
        setUnreadNotificationCount(0);
        setNotificationError("");
      }
      setUserDataError("");
      return;
    }

    setUserDataLoading(true);
    setUserDataError("");

    try {
      const mergeErrors = await mergeGuestCartIntoServer();
      const [nextFavorites, nextReviews, feedbackSummaries, nextCart, nextDeliveryAddresses] =
        await Promise.all([
          fetchUserFavorites(auth),
          fetchMyReviews(auth),
          fetchUserFeedbacks(auth),
          fetchUserCart(auth),
          fetchUserDeliveryAddresses(auth),
        ]);
      const nextFeedbacks = await hydrateFeedbackDetails(auth, feedbackSummaries);

      setFavorites(nextFavorites);
      setMyReviews(nextReviews);
      setFeedbacks(nextFeedbacks);
      setCart(nextCart);
      setDeliveryAddresses(nextDeliveryAddresses);

      if (mergeErrors.length) {
        setUserDataError(mergeErrors.join(" | "));
      }
    } catch (error) {
      setUserDataError(getApiErrorMessage(error, "Unable to load account data."));
    } finally {
      setUserDataLoading(false);
    }
  };

  useEffect(() => {
    if (auth.initializing) {
      return;
    }

    refreshUserData();
  }, [
    auth.initializing,
    auth.isAuthenticated,
    auth.token,
    auth.tokenType,
    auth.user?.id,
    auth.user?.role,
    canUseNotificationCenter,
  ]);

  useEffect(() => {
    if (auth.initializing || !canUseNotificationCenter) {
      setNotificationFeed(emptyNotificationFeed());
      setUnreadNotificationCount(0);
      setNotificationError("");
      return undefined;
    }

    void refreshNotifications();

    const intervalId = window.setInterval(() => {
      void refreshNotifications({ silent: true });
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [auth.initializing, canUseNotificationCenter, auth.token, auth.tokenType, auth.user?.id]);

  const isFavorite = (targetType, targetId) =>
    favoriteKeySet.has(buildTargetKey(targetType, targetId));

  const getFavoriteCount = (_targetType, _targetId, baseCount = 0) => Number(baseCount ?? 0);

  const getCurrentUserReview = (targetType, targetId) =>
    myReviews.find(
      (review) =>
        normalizeTargetType(review.targetType) === normalizeTargetType(targetType) &&
        String(review.targetId) === String(targetId),
    ) ?? null;

  const toggleFavorite = async (targetType, targetId) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can save favorites." };
    }

    const key = buildTargetKey(targetType, targetId);
    const currentlyFavorite = favoriteKeySet.has(key);

    try {
      if (currentlyFavorite) {
        await deleteUserFavorite(auth, { targetType, targetId });
      } else {
        await createUserFavorite(auth, { targetType, targetId });
      }

      const nextFavorites = await fetchUserFavorites(auth);
      setFavorites(nextFavorites);

      return {
        ok: true,
        message: currentlyFavorite ? "Removed from favorites." : "Added to favorites.",
      };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to update favorites."),
      };
    }
  };

  const submitReview = async ({ targetType, targetId, rating, title, comment }) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can submit reviews." };
    }

    try {
      const existingReview = getCurrentUserReview(targetType, targetId);
      const payload = {
        targetType,
        targetId,
        rating,
        title,
        comment,
      };

      const savedReview = existingReview
        ? await updateUserReview(auth, existingReview.id, payload)
        : await createUserReview(auth, payload);

      setMyReviews((currentReviews) => {
        const filteredReviews = currentReviews.filter(
          (review) => String(review.id) !== String(savedReview.id),
        );
        return [...filteredReviews, savedReview];
      });

      return {
        ok: true,
        message: existingReview ? "Review updated." : "Review submitted.",
      };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to save the review."),
      };
    }
  };

  const saveFeedback = async ({ category, relatedStoreId, subject, message }) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can send feedback." };
    }

    try {
      const savedFeedback = await createUserFeedback(auth, {
        category,
        relatedStoreId,
        subject,
        message,
      });

      setFeedbacks((currentFeedbacks) => {
        const filteredFeedbacks = currentFeedbacks.filter(
          (feedback) => String(feedback.id) !== String(savedFeedback.id),
        );
        return [savedFeedback, ...filteredFeedbacks];
      });

      return {
        ok: true,
        message: "Feedback submitted.",
      };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to save feedback."),
      };
    }
  };

  const refreshCart = async () => {
    if (canUseGuestCart) {
      const snapshot = readGuestCart();
      setGuestCart(snapshot);
      setCart(snapshot);
      return snapshot;
    }

    if (!canUseUserFeatures) {
      setCart(emptyCart());
      return emptyCart();
    }

    const nextCart = await fetchUserCart(auth);
    setCart(nextCart);
    return nextCart;
  };

  const refreshDeliveryAddresses = async () => {
    if (!canUseUserFeatures) {
      setDeliveryAddresses([]);
      return [];
    }

    const nextDeliveryAddresses = await fetchUserDeliveryAddresses(auth);
    setDeliveryAddresses(nextDeliveryAddresses);
    return nextDeliveryAddresses;
  };

  async function refreshNotifications({ silent = false, query = { page: 0, size: 8 } } = {}) {
    if (!canUseNotificationCenter) {
      setNotificationFeed(emptyNotificationFeed());
      setUnreadNotificationCount(0);
      setNotificationError("");
      return emptyNotificationFeed();
    }

    if (!silent) {
      setNotificationLoading(true);
      setNotificationError("");
    }

    try {
      const [nextFeed, nextUnreadCount] = await Promise.all([
        canUseAdminNotifications
          ? fetchAdminNotifications(auth, query)
          : fetchUserNotifications(auth, query),
        canUseAdminNotifications
          ? fetchAdminNotificationUnreadCount(auth)
          : fetchUserNotificationUnreadCount(auth),
      ]);

      setNotificationFeed(nextFeed);
      setUnreadNotificationCount(nextUnreadCount);
      setNotificationError("");
      return nextFeed;
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load notifications.");
      setNotificationError(message);
      if (!silent) {
        throw error;
      }
      return emptyNotificationFeed();
    } finally {
      if (!silent) {
        setNotificationLoading(false);
      }
    }
  }

  const addToCart = async ({ itemId, storeId, quantity = 1 }) => {
    if (canUseGuestCart) {
      try {
        const guestItem = await buildGuestCartItemSnapshot({
          itemId,
          storeId,
          quantity,
        });
        const nextCart = upsertGuestCartItem(guestCart, guestItem);
        persistGuestCart(nextCart);
        return {
          ok: true,
          message: getCartSuccessMessage(guestItem.schedulable && !guestItem.available),
        };
      } catch (error) {
        return {
          ok: false,
          message: getApiErrorMessage(error, "Unable to add the item to the cart."),
        };
      }
    }

    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can use the cart." };
    }

    try {
      await addUserCartItem(auth, {
        dishId: itemId,
        storeId,
        quantity,
      });
      await refreshCart();
      return { ok: true, message: "Item added to cart." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to add the item to the cart."),
      };
    }
  };

  const updateCartItemQuantity = async (cartItemId, quantity, cartItem = null) => {
    if (canUseGuestCart) {
      const nextCart = updateGuestCartItem(guestCart, cartItemId, Math.max(1, Number(quantity || 1)));
      persistGuestCart(nextCart);
      return { ok: true, message: "Guest cart updated." };
    }

    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can use the cart." };
    }

    const matchedItem =
      cartItem ?? cart.items.find((entry) => String(entry.id) === String(cartItemId)) ?? null;

    if (!matchedItem) {
      return { ok: false, message: "Cart line item could not be found." };
    }

    try {
      await updateUserCartItem(auth, cartItemId, {
        storeId: matchedItem.storeId,
        dishId: matchedItem.dishId,
        quantity,
      });
      await refreshCart();
      return { ok: true, message: "Cart updated." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to update the cart."),
      };
    }
  };

  const removeCartItem = async (cartItemId) => {
    if (canUseGuestCart) {
      const nextCart = removeGuestCartItem(guestCart, cartItemId);
      persistGuestCart(nextCart);
      return { ok: true, message: "Item removed from guest cart." };
    }

    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can use the cart." };
    }

    try {
      await deleteUserCartItem(auth, cartItemId);
      await refreshCart();
      return { ok: true, message: "Item removed from cart." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to remove the item from the cart."),
      };
    }
  };

  const clearCart = async () => {
    if (canUseGuestCart) {
      persistGuestCart(emptyCart());
      return { ok: true, message: "Guest cart cleared." };
    }

    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can use the cart." };
    }

    try {
      await clearUserCart(auth);
      setCart(emptyCart());
      return { ok: true, message: "Cart cleared." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to clear the cart."),
      };
    }
  };

  const checkoutCart = async (payload = {}) => {
    if (!canUseUserFeatures) {
      return {
        ok: false,
        loginRequired: !auth.isAuthenticated,
        message: auth.isAuthenticated
          ? "Only USER accounts can check out."
          : "Please sign in with a USER account to place an order and pay.",
      };
    }

    try {
      const order = await checkoutUserCart(auth, payload);
      await refreshCart();
      const createdOrders = Array.isArray(order?.orders) ? order.orders : [];
      const checkoutMessage =
        createdOrders.length > 1
          ? `Created ${createdOrders.length} orders, one per store.`
          : createdOrders.length === 1
            ? `Created order #${createdOrders[0].id}.`
            : `Created order #${order.id}.`;
      return {
        ok: true,
        order,
        message: checkoutMessage,
      };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to check out the cart."),
      };
    }
  };

  const previewCartCheckout = async (payload = {}) => {
    if (!canUseUserFeatures) {
      return {
        ok: false,
        loginRequired: !auth.isAuthenticated,
        preview: null,
        message: auth.isAuthenticated
          ? "Only USER accounts can preview checkout."
          : "Please sign in with a USER account to preview checkout.",
      };
    }

    try {
      const preview = await previewUserCartCheckout(auth, payload);
      return {
        ok: true,
        preview,
        message: preview?.statusSummary || "Checkout preview loaded.",
      };
    } catch (error) {
      return {
        ok: false,
        preview: null,
        error,
        message: getApiErrorMessage(error, "Unable to preview checkout."),
      };
    }
  };

  const deleteReview = async (reviewId) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can delete reviews." };
    }

    try {
      await deleteUserReview(auth, reviewId);
      setMyReviews((currentReviews) =>
        currentReviews.filter((review) => String(review.id) !== String(reviewId)),
      );
      return { ok: true, message: "Review deleted." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to delete the review."),
      };
    }
  };

  const removeFeedback = async (feedbackId) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can delete feedback." };
    }

    try {
      await deleteUserFeedback(auth, feedbackId);
      setFeedbacks((currentFeedbacks) =>
        currentFeedbacks.filter((feedback) => String(feedback.id) !== String(feedbackId)),
      );
      return { ok: true, message: "Feedback deleted." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to delete feedback."),
      };
    }
  };

  const saveDeliveryAddress = async (payload, addressId = "") => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can save delivery addresses." };
    }

    try {
      const latitude = Number(payload?.latitude);
      const longitude = Number(payload?.longitude);
      const normalizedPayload = {
        fullName: String(payload?.fullName ?? "").trim(),
        phoneNumber: String(payload?.phoneNumber ?? "").trim(),
        deliveryAddress: String(payload?.deliveryAddress ?? "").trim(),
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        primary: Boolean(payload?.primary),
      };

      if (addressId) {
        await updateUserDeliveryAddress(auth, addressId, normalizedPayload);
      } else {
        await createUserDeliveryAddress(auth, normalizedPayload);
      }

      await refreshDeliveryAddresses();

      return {
        ok: true,
        message: addressId ? "Delivery address updated." : "Delivery address saved.",
      };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to save the delivery address."),
      };
    }
  };

  const removeDeliveryAddress = async (addressId) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can delete delivery addresses." };
    }

    try {
      await deleteUserDeliveryAddress(auth, addressId);
      await refreshDeliveryAddresses();
      return { ok: true, message: "Delivery address deleted." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to delete the delivery address."),
      };
    }
  };

  const setPrimaryDeliveryAddress = async (addressId) => {
    if (!canUseUserFeatures) {
      return { ok: false, message: "Only USER accounts can manage delivery addresses." };
    }

    try {
      await setPrimaryUserDeliveryAddress(auth, addressId);
      await refreshDeliveryAddresses();
      return { ok: true, message: "Primary delivery address updated." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to update the primary delivery address."),
      };
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!canUseNotificationCenter) {
      return { ok: false, message: "This account cannot manage notifications." };
    }

    try {
      if (canUseAdminNotifications) {
        await markAdminNotificationRead(auth, notificationId);
      } else {
        await markUserNotificationRead(auth, notificationId);
      }
      await refreshNotifications({ silent: true });
      return { ok: true, message: "Notification marked as read." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to mark the notification as read."),
      };
    }
  };

  const markNotificationUnread = async (notificationId) => {
    if (!canUseNotificationCenter) {
      return { ok: false, message: "This account cannot manage notifications." };
    }

    try {
      if (canUseAdminNotifications) {
        await markAdminNotificationUnread(auth, notificationId);
      } else {
        await markUserNotificationUnread(auth, notificationId);
      }
      await refreshNotifications({ silent: true });
      return { ok: true, message: "Notification marked as unread." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to mark the notification as unread."),
      };
    }
  };

  const markAllNotificationsRead = async () => {
    if (!canUseNotificationCenter) {
      return { ok: false, message: "This account cannot manage notifications." };
    }

    try {
      if (canUseAdminNotifications) {
        await markAllAdminNotificationsRead(auth);
      } else {
        await markAllUserNotificationsRead(auth);
      }
      await refreshNotifications({ silent: true });
      return { ok: true, message: "All notifications marked as read." };
    } catch (error) {
      return {
        ok: false,
        message: getApiErrorMessage(error, "Unable to mark all notifications as read."),
      };
    }
  };

  const value = {
    currentUserProfile,
    feedbacks,
    favorites,
    myReviews,
    cart,
    guestCart,
    deliveryAddresses,
    notifications: notificationFeed.items,
    unreadNotificationCount,
    notificationLoading,
    notificationError,
    cartItems: cart.items,
    cartCount: Number(cart.totalItems ?? 0),
    cartSubtotal: Number(cart.subtotal ?? 0),
    userDataLoading,
    userDataError,
    canUseUserFeatures,
    canUseGuestCart,
    refreshUserData,
    refreshCart,
    refreshDeliveryAddresses,
    refreshNotifications,
    isFavorite,
    getFavoriteCount,
    getCurrentUserReview,
    toggleFavorite,
    submitReview,
    saveFeedback,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    previewCartCheckout,
    checkoutCart,
    deleteReview,
    removeFeedback,
    saveDeliveryAddress,
    removeDeliveryAddress,
    setPrimaryDeliveryAddress,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
  };

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSiteData() {
  const context = useContext(SiteDataContext);

  if (!context) {
    throw new Error("useSiteData must be used within SiteDataProvider.");
  }

  return context;
}
