import { apiRequest, ApiError, parseApiResponsePayload, resolveApiUrl } from "./api";
import { normalizeImagePathList } from "./images";

function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function toNullableNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function toNullableBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Boolean(value);
}

function toRequestNumber(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : value;
}

function toId(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value);
}

function pickText(...values) {
  const matched = values.find(
    (value) => value !== undefined && value !== null && String(value).trim() !== "",
  );

  return matched === undefined || matched === null ? "" : String(matched);
}

function pickValue(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function getContentSectionImagePaths(section) {
  const imagePaths = normalizeImagePathList(section?.imagePaths);
  return imagePaths.length ? imagePaths : normalizeImagePathList(section?.imagePath);
}

function mapContentSection(section) {
  const imagePaths = getContentSectionImagePaths(section);

  return {
    title: pickText(section?.title),
    content: pickText(section?.content),
    imagePath: imagePaths[0] ?? "",
    imagePaths,
  };
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const normalized = params.toString();
  return normalized ? `?${normalized}` : "";
}

export function normalizeTargetType(targetType) {
  const normalized = String(targetType ?? "").trim().toLowerCase();

  if (normalized === "item") {
    return "dish";
  }

  return normalized;
}

export function toApiTargetType(targetType) {
  const normalized = normalizeTargetType(targetType);

  if (normalized === "store") {
    return "STORE";
  }

  if (normalized === "dish") {
    return "DISH";
  }

  if (normalized === "event") {
    return "EVENT";
  }

  return String(targetType ?? "").trim().toUpperCase();
}

function fromApiTargetType(targetType) {
  return normalizeTargetType(targetType);
}

function normalizePagedPayload(payload) {
  const items = ensureArray(payload?.items);

  return {
    items,
    page: toNumber(payload?.page, 0),
    size: toNumber(payload?.size, items.length || 10),
    totalItems: toNumber(payload?.totalItems, items.length),
    totalPages: toNumber(payload?.totalPages, items.length ? 1 : 0),
    hasNext: Boolean(payload?.hasNext),
    hasPrevious: Boolean(payload?.hasPrevious),
  };
}

function mapStoreBase(store) {
  return {
    id: toId(pickValue(store?.id, store?.storeId)),
    slug: pickText(store?.slug, store?.storeSlug),
    name: pickText(store?.name, store?.storeName),
    description: pickText(store?.description),
    address: pickText(store?.address),
    area: pickText(store?.area),
    positionLabel: pickText(store?.positionLabel),
    latitude: toNullableNumber(store?.latitude),
    longitude: toNullableNumber(store?.longitude),
    imagePaths: normalizeImagePathList(store?.imagePaths),
    averageRating: toNumber(store?.averageRating, 0),
    reviewCount: toNumber(store?.reviewCount, 0),
    favoriteCount: toNumber(store?.favoriteCount, 0),
    availableItemCount: toNumber(store?.availableItemCount, 0),
    distanceKm: toNullableNumber(store?.distanceKm),
    open: toNullableBoolean(pickValue(store?.open, store?.isOpen, store?.storeOpen)),
    disabled: Boolean(pickValue(store?.disabled, store?.storeDisabled)),
    disabledReason: pickText(store?.disabledReason),
    contactEmail: pickText(store?.contactEmail),
    phoneNumber: pickText(store?.phoneNumber),
    hoursText: pickText(store?.hoursText, store?.hours),
    openTime: pickText(store?.openTime),
    closeTime: pickText(store?.closeTime),
    hours: pickText(store?.hoursText, store?.hours),
    personality: pickText(store?.personality),
    designSignature: pickText(store?.designSignature),
    franchiseMood: pickText(store?.franchiseMood),
    specialty: pickText(store?.specialty),
    highlightSummary: pickText(store?.highlightSummary),
    highlightTags: ensureArray(store?.highlightTags).map((tag) => pickText(tag)).filter(Boolean),
    serviceTags: ensureArray(store?.serviceTags).map((tag) => pickText(tag)).filter(Boolean),
    sections: ensureArray(store?.sections)
      .map(mapContentSection)
      .filter((section) => section.title || section.content || section.imagePaths.length),
    active: toNullableBoolean(store?.active),
    createdAt: pickText(store?.createdAt),
    updatedAt: pickText(store?.updatedAt),
  };
}

function mapStoreCategoryItem(item) {
  return {
    id: toId(pickValue(item?.id, item?.dishId)),
    name: pickText(item?.name, item?.dishName),
    description: pickText(item?.description),
    note: pickText(item?.note),
    price: toNumber(item?.price, 0),
    priceDisplay: pickText(item?.priceDisplay),
    averageRating: toNumber(item?.averageRating, 0),
    reviewCount: toNumber(item?.reviewCount, 0),
    orderCount: toNumber(item?.orderCount, 0),
    favoriteCount: toNumber(item?.favoriteCount, 0),
    stock: toNumber(item?.stock, 0),
    available: Boolean(item?.available),
    disabled: Boolean(item?.disabled),
    schedulable: toNullableBoolean(item?.schedulable),
    franchiseRequired: Boolean(item?.franchiseRequired),
    franchiseNote: pickText(item?.franchiseNote),
    imagePaths: normalizeImagePathList(item?.imagePaths),
    categoryId: toId(item?.categoryId),
    highlightSummary: pickText(item?.highlightSummary),
    highlightTags: ensureArray(item?.highlightTags).map((tag) => pickText(tag)).filter(Boolean),
    active: toNullableBoolean(item?.active),
    status: pickText(item?.status),
  };
}

function mapCategory(category) {
  return {
    id: toId(category?.id),
    title: pickText(category?.title, category?.name),
    name: pickText(category?.name, category?.title),
    description: pickText(category?.description),
    imagePaths: normalizeImagePathList(category?.imagePaths),
    averageRating: toNumber(category?.averageRating, 0),
    reviewCount: toNumber(category?.reviewCount, 0),
    items: ensureArray(category?.items).map(mapStoreCategoryItem),
  };
}

function mapPublicReview(review) {
  return {
    id: toId(review?.id),
    userId: toId(review?.userId),
    userName: pickText(review?.userName, review?.userFullName, review?.fullName),
    userEmail: pickText(review?.userEmail, review?.email),
    targetType: fromApiTargetType(review?.targetType),
    targetId: toId(review?.targetId),
    targetSlug: pickText(review?.targetSlug, review?.eventSlug, review?.storeSlug, review?.slug),
    targetLabel: pickText(review?.targetLabel),
    targetImagePaths: normalizeImagePathList(review?.targetImagePaths),
    rating: toNumber(review?.rating, 0),
    title: pickText(review?.title),
    comment: pickText(review?.comment),
    createdAt: pickText(review?.createdAt),
    updatedAt: pickText(review?.updatedAt),
  };
}

function mapNews(news) {
  return {
    id: toId(news?.id),
    title: pickText(news?.title),
    slug: pickText(news?.slug),
    summary: pickText(news?.summary),
    content: pickText(news?.content),
    relatedStoreId: toId(news?.relatedStoreId),
    relatedStoreSlug: pickText(news?.relatedStoreSlug),
    relatedStoreName: pickText(news?.relatedStoreName),
    storeId: toId(news?.relatedStoreId),
    storeSlug: pickText(news?.relatedStoreSlug),
    storeName: pickText(news?.relatedStoreName),
    tags: ensureArray(news?.tags).map((tag) => pickText(tag)).filter(Boolean),
    imagePaths: normalizeImagePathList(news?.imagePaths),
    sections: ensureArray(news?.sections)
      .map(mapContentSection)
      .filter((section) => section.title || section.content || section.imagePaths.length),
    featured: Boolean(news?.featured),
    published: toNullableBoolean(news?.published),
    publishedAt: pickText(news?.publishedAt),
    createdAt: pickText(news?.createdAt),
    updatedAt: pickText(news?.updatedAt),
  };
}

function mapEvent(event) {
  const mappedStore = event?.store
    ? {
        ...mapStoreBase(event.store),
        id: toId(pickValue(event?.store?.id, event?.store?.storeId, event?.storeId)),
        slug: pickText(event?.store?.slug, event?.store?.storeSlug, event?.storeSlug),
        name: pickText(event?.store?.name, event?.store?.storeName, event?.storeName),
      }
    : {
        id: toId(event?.storeId),
        slug: pickText(event?.storeSlug),
        name: pickText(event?.storeName),
        imagePaths: [],
      };

  return {
    id: toId(event?.id),
    slug: pickText(event?.slug, event?.eventSlug),
    eventSlug: pickText(event?.eventSlug, event?.slug),
    storeId: toId(pickValue(event?.storeId, event?.store?.id, event?.store?.storeId)),
    storeSlug: pickText(event?.storeSlug, event?.store?.slug, event?.store?.storeSlug),
    storeName: pickText(event?.storeName, event?.store?.name, event?.store?.storeName),
    name: pickText(event?.name, event?.title),
    title: pickText(event?.title, event?.name),
    description: pickText(event?.description, event?.summary),
    summary: pickText(event?.summary, event?.description),
    location: pickText(event?.location),
    schedule: pickText(event?.scheduleText, event?.schedule),
    scheduleText: pickText(event?.scheduleText, event?.schedule),
    imagePaths: normalizeImagePathList(event?.imagePaths),
    sections: ensureArray(event?.sections)
      .map(mapContentSection)
      .filter((section) => section.title || section.content || section.imagePaths.length),
    highlightSummary: pickText(event?.highlightSummary),
    highlightTags: ensureArray(event?.highlightTags).map((tag) => pickText(tag)).filter(Boolean),
    startsAt: pickText(event?.startsAt),
    endsAt: pickText(event?.endsAt),
    averageRating: toNumber(event?.averageRating, 0),
    reviewCount: toNumber(event?.reviewCount, 0),
    favoriteCount: toNumber(event?.favoriteCount, 0),
    capacity: toNumber(event?.capacity, 0),
    bookedCount: toNumber(event?.bookedCount, 0),
    remainingSlots: toNumber(
      pickValue(
        event?.remainingSlots,
        event?.capacity !== undefined && event?.bookedCount !== undefined
          ? Number(event.capacity) - Number(event.bookedCount)
          : undefined,
      ),
      0,
    ),
    disabled: Boolean(event?.disabled),
    disabledReason: pickText(event?.disabledReason),
    distanceKm: toNullableNumber(event?.distanceKm),
    active: toNullableBoolean(event?.active),
    featuredDishes: ensureArray(event?.featuredDishes).map((dish) => ({
      id: toId(pickValue(dish?.id, dish?.dishId)),
      name: pickText(dish?.name, dish?.dishName),
    })),
    reviews: ensureArray(event?.reviews).map(mapPublicReview),
    store: mappedStore,
    createdAt: pickText(event?.createdAt),
    updatedAt: pickText(event?.updatedAt),
  };
}

function mapDishBase(dish) {
  return {
    id: toId(pickValue(dish?.id, dish?.dishId)),
    name: pickText(dish?.name, dish?.dishName),
    description: pickText(dish?.description),
    note: pickText(dish?.note),
    price: toNumber(pickValue(dish?.price, dish?.effectivePrice, dish?.basePrice), 0),
    priceDisplay: pickText(dish?.priceDisplay),
    categoryId: toId(dish?.categoryId),
    categoryName: pickText(dish?.categoryName),
    status: pickText(dish?.status),
    franchiseRequired: Boolean(dish?.franchiseRequired),
    franchiseNote: pickText(dish?.franchiseNote),
    imagePaths: normalizeImagePathList(dish?.imagePaths),
    sections: ensureArray(dish?.sections)
      .map(mapContentSection)
      .filter((section) => section.title || section.content || section.imagePaths.length),
    highlightSummary: pickText(dish?.highlightSummary),
    highlightTags: ensureArray(dish?.highlightTags).map((tag) => pickText(tag)).filter(Boolean),
    averageRating: toNumber(dish?.averageRating, 0),
    reviewCount: toNumber(dish?.reviewCount, 0),
    orderCount: toNumber(dish?.orderCount, 0),
    favoriteCount: toNumber(dish?.favoriteCount, 0),
    stock: toNumber(dish?.stock, 0),
    available: Boolean(dish?.available),
    disabled: Boolean(dish?.disabled),
    active: toNullableBoolean(dish?.active),
    storeId: toId(dish?.storeId),
    storeName: pickText(dish?.storeName),
    createdAt: pickText(dish?.createdAt),
    updatedAt: pickText(dish?.updatedAt),
  };
}

function mapDishListItem(dish) {
  return {
    ...mapDishBase(dish),
    bestStore: dish?.bestStore
      ? {
        ...mapStoreBase(dish.bestStore),
        storeId: toId(pickValue(dish.bestStore.storeId, dish.bestStore.id)),
        storeSlug: pickText(dish.bestStore.storeSlug, dish.bestStore.slug),
        storeName: pickText(dish.bestStore.storeName, dish.bestStore.name),
        stock: toNullableNumber(dish.bestStore.stock),
        available: toNullableBoolean(dish.bestStore.available),
        disabled: toNullableBoolean(dish.bestStore.disabled),
        schedulable: toNullableBoolean(dish.bestStore.schedulable),
        price: toNumber(dish.bestStore.price, 0),
      }
      : dish?.storeId || dish?.storeSlug || dish?.storeName
        ? {
            id: toId(dish?.storeId),
            storeId: toId(dish?.storeId),
            slug: pickText(dish?.storeSlug),
            name: pickText(dish?.storeName),
            storeName: pickText(dish?.storeName),
            stock: toNullableNumber(dish?.stock),
            available: toNullableBoolean(dish?.available),
            disabled: toNullableBoolean(dish?.disabled),
            schedulable: toNullableBoolean(dish?.schedulable),
            price: toNumber(dish?.price, 0),
            imagePaths: normalizeImagePathList(dish?.imagePaths),
          }
        : null,
  };
}

function mapDishDetailStore(store) {
  return {
    id: toId(pickValue(store?.storeId, store?.id)),
    storeId: toId(pickValue(store?.storeId, store?.id)),
    slug: pickText(store?.slug, store?.storeSlug),
    storeSlug: pickText(store?.storeSlug, store?.slug),
    name: pickText(store?.storeName, store?.name),
    storeName: pickText(store?.storeName, store?.name),
    address: pickText(store?.address),
    area: pickText(store?.area),
    latitude: toNullableNumber(store?.latitude),
    longitude: toNullableNumber(store?.longitude),
    distanceKm: toNullableNumber(store?.distanceKm),
    storeOpen: Boolean(pickValue(store?.storeOpen, store?.isOpen, store?.open)),
    storeDisabled: Boolean(store?.storeDisabled),
    stock: toNumber(store?.stock, 0),
    available: Boolean(store?.available),
    disabled: Boolean(store?.disabled),
    schedulable: toNullableBoolean(store?.schedulable),
    price: toNumber(store?.price, 0),
    imagePaths: normalizeImagePathList(store?.imagePaths),
  };
}

function mapFavorite(item) {
  return {
    id: toId(item?.id),
    targetType: fromApiTargetType(item?.targetType),
    targetId: toId(item?.targetId),
    targetSlug: pickText(item?.targetSlug, item?.eventSlug, item?.storeSlug, item?.slug),
    targetLabel: pickText(item?.targetLabel),
    targetImagePaths: normalizeImagePathList(item?.targetImagePaths),
    purchased: Boolean(item?.purchased),
    createdAt: pickText(item?.createdAt),
  };
}

function mapUserReview(review) {
  return {
    id: toId(review?.id),
    userId: toId(review?.userId),
    userName: pickText(review?.userName, review?.userFullName, review?.fullName),
    userEmail: pickText(review?.userEmail, review?.email),
    targetType: fromApiTargetType(review?.targetType),
    targetId: toId(review?.targetId),
    targetSlug: pickText(review?.targetSlug, review?.eventSlug, review?.storeSlug, review?.slug),
    targetLabel: pickText(review?.targetLabel),
    targetImagePaths: normalizeImagePathList(review?.targetImagePaths),
    rating: toNumber(review?.rating, 0),
    title: pickText(review?.title),
    comment: pickText(review?.comment),
    approved: Boolean(review?.approved),
    createdAt: pickText(review?.createdAt),
    updatedAt: pickText(review?.updatedAt),
  };
}

function mapCustomerFeedback(feedback) {
  return {
    id: toId(feedback?.id),
    userId: toId(feedback?.userId),
    userName: pickText(feedback?.userName, feedback?.userFullName, feedback?.fullName),
    userEmail: pickText(feedback?.userEmail, feedback?.email),
    category: pickText(feedback?.category),
    relatedStoreId: toId(feedback?.relatedStoreId),
    relatedStoreSlug: pickText(feedback?.relatedStoreSlug, feedback?.storeSlug),
    relatedStoreName: pickText(feedback?.relatedStoreName, feedback?.storeName),
    relatedStoreAddress: pickText(feedback?.relatedStoreAddress, feedback?.storeAddress),
    relatedOrderId: toId(feedback?.relatedOrderId),
    relatedOrderStatus: pickText(feedback?.relatedOrderStatus),
    relatedOrderPaymentStatus: pickText(feedback?.relatedOrderPaymentStatus),
    relatedOrderPaymentReference: pickText(feedback?.relatedOrderPaymentReference),
    subject: pickText(feedback?.subject),
    message: pickText(feedback?.message),
    replyMessage: pickText(feedback?.replyMessage),
    repliedAt: pickText(feedback?.repliedAt),
    repliedByUserId: toId(feedback?.repliedByUserId),
    repliedByUserName: pickText(feedback?.repliedByUserName),
    repliedByUserRole: pickText(feedback?.repliedByUserRole),
    createdAt: pickText(feedback?.createdAt),
    updatedAt: pickText(feedback?.updatedAt),
  };
}

function mapUserNotification(notification) {
  const metadata = ensureObject(pickValue(notification?.metadata, notification?.payload));

  return {
    id: toId(notification?.id),
    type: pickText(notification?.type, notification?.notificationType),
    title: pickText(notification?.title),
    message: pickText(
      notification?.message,
      notification?.content,
      notification?.body,
      notification?.description,
    ),
    read: Boolean(pickValue(notification?.read, notification?.isRead)),
    readAt: pickText(notification?.readAt),
    createdAt: pickText(notification?.createdAt),
    updatedAt: pickText(notification?.updatedAt),
    orderId: toId(
      pickValue(
        notification?.orderId,
        notification?.relatedOrderId,
        metadata?.orderId,
        metadata?.relatedOrderId,
      ),
    ),
    relatedOrderId: toId(
      pickValue(
        notification?.relatedOrderId,
        notification?.orderId,
        metadata?.relatedOrderId,
        metadata?.orderId,
      ),
    ),
    eventId: toId(pickValue(notification?.eventId, metadata?.eventId)),
    eventSlug: pickText(
      notification?.eventSlug,
      notification?.eventKey,
      metadata?.eventSlug,
      metadata?.eventKey,
      notification?.slug,
      metadata?.slug,
    ),
    newsId: toId(pickValue(notification?.newsId, metadata?.newsId)),
    newsKey: pickText(notification?.newsKey, metadata?.newsKey),
    newsSlug: pickText(notification?.newsSlug, metadata?.newsSlug, notification?.slug),
    relatedStoreId: toId(
      pickValue(
        notification?.relatedStoreId,
        notification?.storeId,
        metadata?.relatedStoreId,
        metadata?.storeId,
      ),
    ),
    relatedStoreName: pickText(
      notification?.relatedStoreName,
      notification?.storeName,
      metadata?.relatedStoreName,
      metadata?.storeName,
    ),
    actionUrl: pickText(notification?.actionUrl, metadata?.actionUrl),
    metadata,
  };
}

function mapUserCurrentLevel(level) {
  return {
    storeId: toId(level?.storeId),
    storeSlug: pickText(level?.storeSlug, level?.slug),
    storeName: pickText(level?.storeName),
    currentYear: toNullableNumber(level?.currentYear),
    currentQuarter: toNullableNumber(level?.currentQuarter),
    evaluatedYear: toNullableNumber(level?.evaluatedYear),
    evaluatedQuarter: toNullableNumber(level?.evaluatedQuarter),
    qualifyingPaidAmount: toNumber(level?.qualifyingPaidAmount, 0),
    levelId: toId(level?.levelId),
    levelCode: pickText(level?.levelCode, level?.code),
    levelName: pickText(level?.levelName, level?.name),
    levelMinPaidAmount: toNumber(level?.levelMinPaidAmount, level?.minPaidAmount, 0),
  };
}

function mapDeliveryAddress(address) {
  return {
    id: toId(address?.id),
    userId: toId(address?.userId),
    fullName: pickText(address?.fullName, address?.name),
    phoneNumber: pickText(address?.phoneNumber, address?.phone),
    deliveryAddress: pickText(address?.deliveryAddress, address?.address),
    latitude: toNullableNumber(address?.latitude),
    longitude: toNullableNumber(address?.longitude),
    primary: Boolean(address?.primary),
    verifiedAt: pickText(address?.verifiedAt),
    lastUsedAt: pickText(address?.lastUsedAt),
    createdAt: pickText(address?.createdAt),
    updatedAt: pickText(address?.updatedAt),
  };
}

function mapShippingFeeBreakdownItem(item) {
  return {
    storeId: toId(item?.storeId),
    storeName: pickText(item?.storeName),
    distanceKm: toNullableNumber(item?.distanceKm),
    shippingFeeAmount: toNumber(item?.shippingFeeAmount, 0),
  };
}

function mapCartItem(item) {
  return {
    id: toId(item?.id),
    storeId: toId(item?.storeId),
    storeSlug: pickText(item?.storeSlug),
    storeName: pickText(item?.storeName),
    storeLatitude: toNullableNumber(
      pickValue(item?.storeLatitude, item?.store?.latitude, item?.latitude),
    ),
    storeLongitude: toNullableNumber(
      pickValue(item?.storeLongitude, item?.store?.longitude, item?.longitude),
    ),
    dishId: toId(item?.dishId),
    dishName: pickText(item?.dishName),
    quantity: toNumber(item?.quantity, 0),
    unitPrice: toNumber(item?.unitPrice, 0),
    totalPrice: toNumber(item?.totalPrice, 0),
    imagePaths: normalizeImagePathList(item?.imagePaths),
    stock: toNumber(item?.stock, 0),
    available: Boolean(item?.available),
    disabled: Boolean(item?.disabled),
    schedulable: Boolean(item?.schedulable),
    createdAt: pickText(item?.createdAt),
    updatedAt: pickText(item?.updatedAt),
  };
}

function mapCart(payload) {
  return {
    id: toId(payload?.id),
    userId: toId(payload?.userId),
    status: pickText(payload?.status),
    items: ensureArray(payload?.items).map(mapCartItem),
    totalItems: toNumber(payload?.totalItems, 0),
    subtotal: toNumber(pickValue(payload?.subtotal, payload?.totalAmount), 0),
    subtotalAmount: toNumber(pickValue(payload?.subtotalAmount, payload?.subtotal, payload?.totalAmount), 0),
    discountAmount: toNumber(payload?.discountAmount, 0),
    shippingDistanceKm: toNullableNumber(payload?.shippingDistanceKm),
    shippingFeeAmount: toNullableNumber(payload?.shippingFeeAmount),
    shippingFeeBreakdown: ensureArray(payload?.shippingFeeBreakdown).map(mapShippingFeeBreakdownItem),
    totalAmount: toNumber(pickValue(payload?.totalAmount, payload?.subtotal, payload?.subtotalAmount), 0),
    createdAt: pickText(payload?.createdAt),
    updatedAt: pickText(payload?.updatedAt),
  };
}

function mapCheckoutPricing(payload) {
  return {
    subtotalAmount: toNumber(pickValue(payload?.subtotalAmount, payload?.subtotal), 0),
    discountAmount: toNumber(payload?.discountAmount, 0),
    shippingDistanceKm: toNullableNumber(payload?.shippingDistanceKm),
    shippingFeeAmount: toNullableNumber(payload?.shippingFeeAmount),
    shippingFeeBreakdown: ensureArray(payload?.shippingFeeBreakdown).map(mapShippingFeeBreakdownItem),
    totalAmount: toNumber(pickValue(payload?.totalAmount, payload?.subtotalAmount, payload?.subtotal), 0),
    promotionCode: pickText(payload?.promotionCode),
    statusSummary: pickText(payload?.statusSummary),
  };
}

function mapOrderItem(item) {
  return {
    id: toId(item?.id),
    storeId: toId(item?.storeId),
    storeSlug: pickText(item?.storeSlug),
    storeName: pickText(item?.storeName),
    dishId: toId(item?.dishId),
    dishName: pickText(item?.dishName),
    quantity: toNumber(item?.quantity, 0),
    unitPrice: toNumber(item?.unitPrice, 0),
    totalPrice: toNumber(pickValue(item?.totalPrice, item?.lineTotal), 0),
    lineTotal: toNumber(pickValue(item?.lineTotal, item?.totalPrice), 0),
    imagePaths: normalizeImagePathList(item?.imagePaths),
    createdAt: pickText(item?.createdAt),
    updatedAt: pickText(item?.updatedAt),
  };
}

function mapEmployeeWorkSchedule(item) {
  return {
    id: toId(item?.id),
    userId: toId(item?.userId),
    fullName: pickText(item?.fullName, item?.userName, item?.name),
    email: pickText(item?.email),
    role: pickText(item?.role),
    storeId: toId(item?.storeId),
    storeName: pickText(item?.storeName),
    storeAddress: pickText(item?.storeAddress),
    workDate: pickText(item?.workDate),
    scheduledStartTime: pickText(item?.scheduledStartTime),
    scheduledEndTime: pickText(item?.scheduledEndTime),
    scheduledMinutes: toNumber(item?.scheduledMinutes, 0),
    note: pickText(item?.note),
    attendanceId: toId(item?.attendanceId),
    checkInAt: pickText(item?.checkInAt),
    checkOutAt: pickText(item?.checkOutAt),
    workedMinutes: toNullableNumber(item?.workedMinutes),
    checkedIn: Boolean(item?.checkedIn),
    checkedOut: Boolean(item?.checkedOut),
    currentlyWorking: Boolean(item?.currentlyWorking),
  };
}

function mapEmployeeAttendance(item) {
  return {
    id: toId(item?.id),
    workScheduleId: toId(item?.workScheduleId),
    userId: toId(item?.userId),
    fullName: pickText(item?.fullName, item?.userName, item?.name),
    email: pickText(item?.email),
    role: pickText(item?.role),
    storeId: toId(item?.storeId),
    storeName: pickText(item?.storeName),
    storeAddress: pickText(item?.storeAddress),
    workDate: pickText(item?.workDate),
    scheduledStartTime: pickText(item?.scheduledStartTime),
    scheduledEndTime: pickText(item?.scheduledEndTime),
    scheduleNote: pickText(item?.scheduleNote, item?.note),
    checkInAt: pickText(item?.checkInAt),
    checkOutAt: pickText(item?.checkOutAt),
    workedMinutes: toNullableNumber(item?.workedMinutes),
    checkedIn: Boolean(item?.checkedIn),
    checkedOut: Boolean(item?.checkedOut),
    currentlyWorking: Boolean(item?.currentlyWorking),
  };
}

function mapOrder(payload, includeNestedOrders = true) {
  const items = ensureArray(payload?.items).map(mapOrderItem);
  const fallbackItems =
    items.length === 0 && (payload?.dishId !== undefined || payload?.dishName !== undefined)
      ? [mapOrderItem(payload)]
      : items;

  return {
    id: toId(payload?.id),
    userId: toId(payload?.userId),
    storeId: toId(payload?.storeId),
    storeSlug: pickText(payload?.storeSlug),
    storeName: pickText(payload?.storeName),
    status: pickText(payload?.status),
    paymentStatus: pickText(payload?.paymentStatus),
    paymentProvider: pickText(payload?.paymentProvider),
    payosOrderCode: pickText(payload?.payosOrderCode, payload?.orderCode),
    paymentLinkId: pickText(payload?.paymentLinkId),
    paymentCheckoutUrl: pickText(payload?.paymentCheckoutUrl),
    paymentQrCode: pickText(payload?.paymentQrCode),
    paymentExpiresAt: pickText(payload?.paymentExpiresAt),
    paidAt: pickText(payload?.paidAt),
    paymentReference: pickText(
      payload?.paymentReference,
      payload?.paymentLinkId,
      payload?.orderCode,
      payload?.payosOrderCode,
    ),
    invoiceAvailable: Boolean(payload?.invoiceAvailable),
    invoiceId: toId(payload?.invoiceId),
    invoiceNumber: pickText(payload?.invoiceNumber),
    invoiceIssuedAt: pickText(payload?.invoiceIssuedAt),
    invoiceDownloadUrl: pickText(payload?.invoiceDownloadUrl),
    invoicePreviewUrl: pickText(payload?.invoicePreviewUrl),
    orderQrToken: pickText(payload?.orderQrToken, payload?.qrToken),
    allowedActions: ensureArray(payload?.allowedActions)
      .map((action) => pickText(action).toUpperCase())
      .filter(Boolean),
    subtotalAmount: toNumber(pickValue(payload?.subtotalAmount, payload?.subtotal), 0),
    discountAmount: toNumber(payload?.discountAmount, 0),
    shippingDistanceKm: toNullableNumber(payload?.shippingDistanceKm),
    shippingFeeAmount: toNullableNumber(payload?.shippingFeeAmount),
    shippingFeeBreakdown: ensureArray(payload?.shippingFeeBreakdown).map(mapShippingFeeBreakdownItem),
    totalAmount: toNumber(pickValue(payload?.totalAmount, payload?.subtotal), 0),
    promotionCode: pickText(payload?.promotionCode),
    promotionScope: pickText(payload?.promotionScope),
    promotionEligibleAmount: toNumber(payload?.promotionEligibleAmount, 0),
    promotionDishIds: ensureArray(payload?.promotionDishIds).map((dishId) => toId(dishId)),
    deliveryType: pickText(payload?.deliveryType),
    scheduledDeliveryAt: pickText(payload?.scheduledDeliveryAt),
    confirmedByUserId: toId(
      pickValue(payload?.confirmedByUserId, payload?.confirmedByUser?.id),
    ),
    confirmedByUserName: pickText(
      payload?.confirmedByUserName,
      payload?.confirmedByUser?.fullName,
      payload?.confirmedByUser?.name,
    ),
    confirmedByUserRole: pickText(
      payload?.confirmedByUserRole,
      payload?.confirmedByUser?.role,
    ),
    confirmedAt: pickText(payload?.confirmedAt),
    preparingStaffId: toId(pickValue(payload?.preparingStaffId, payload?.preparingStaff?.id)),
    preparingStaffName: pickText(
      payload?.preparingStaffName,
      payload?.preparingStaff?.fullName,
      payload?.preparingStaff?.name,
    ),
    deliveringShipperId: toId(
      pickValue(payload?.deliveringShipperId, payload?.deliveringShipper?.id),
    ),
    deliveringShipperName: pickText(
      payload?.deliveringShipperName,
      payload?.deliveringShipper?.fullName,
      payload?.deliveringShipper?.name,
    ),
    statusSummary: pickText(payload?.statusSummary),
    deliveryFullName: pickText(payload?.deliveryFullName),
    deliveryPhoneNumber: pickText(payload?.deliveryPhoneNumber),
    deliveryAddress: pickText(payload?.deliveryAddress),
    deliveryProofImagePath: pickText(payload?.deliveryProofImagePath),
    deliveryProofCapturedAt: pickText(payload?.deliveryProofCapturedAt),
    deliveryProofUploadedAt: pickText(payload?.deliveryProofUploadedAt),
    deliveryProofNote: pickText(payload?.deliveryProofNote),
    items: fallbackItems,
    orders: includeNestedOrders ? ensureArray(payload?.orders).map((order) => mapOrder(order, false)) : [],
    createdAt: pickText(payload?.createdAt),
    updatedAt: pickText(payload?.updatedAt),
  };
}

function mapEmployeeOrderScanResponse(payload) {
  return {
    success: Boolean(payload?.success),
    message: pickText(payload?.message),
    claimedByUserId: toId(payload?.claimedByUserId),
    claimedByUserName: pickText(payload?.claimedByUserName),
    claimedByUserRole: pickText(payload?.claimedByUserRole),
    order: payload?.order ? mapOrder(payload.order) : null,
  };
}

function mapMobileOrderQrResponse(payload) {
  return {
    success: payload?.success === undefined ? true : Boolean(payload?.success),
    message: pickText(payload?.message),
    targetScreen: pickText(payload?.targetScreen),
    qrToken: pickText(payload?.qrToken, payload?.token),
    order: payload?.order ? mapOrder(payload.order) : payload?.id ? mapOrder(payload) : null,
  };
}

function mapDeliveryProofResponse(payload) {
  return {
    message: pickText(payload?.message),
    orderId: toId(payload?.orderId),
    imagePath: pickText(payload?.imagePath),
    capturedAt: pickText(payload?.capturedAt),
    note: pickText(payload?.note),
    uploadedAt: pickText(payload?.uploadedAt),
  };
}

function authOptions(auth) {
  return {
    token: auth?.token,
    tokenType: auth?.tokenType ?? "Bearer",
  };
}

function mapPublicHomePayload(payload) {
  return {
    brand: payload?.brand ?? null,
    featuredStores: ensureArray(payload?.featuredStores).map(mapStoreBase),
    featuredDishes: ensureArray(payload?.featuredDishes).map(mapDishListItem),
    upcomingEvents: ensureArray(payload?.upcomingEvents).map(mapEvent),
    storeLocations: ensureArray(payload?.storeLocations).map(mapStoreBase),
    latestNews: ensureArray(payload?.latestNews).map(mapNews),
  };
}

function mapPagedPayload(payload, itemMapper) {
  const paged = normalizePagedPayload(payload);

  return {
    ...paged,
    items: paged.items.map(itemMapper),
  };
}

function mapPublicStoreDetailPayload(payload) {
  return {
    store: mapStoreBase(payload?.store ?? {}),
    stats: {
      averageRating: toNumber(payload?.stats?.averageRating, 0),
      reviewCount: toNumber(payload?.stats?.reviewCount, 0),
      favoriteCount: toNumber(payload?.stats?.favoriteCount, 0),
      availableItemCount: toNumber(payload?.stats?.availableItemCount, 0),
    },
    categories: ensureArray(payload?.categories).map(mapCategory),
    events: ensureArray(payload?.events).map(mapEvent),
    reviews: ensureArray(payload?.reviews).map(mapPublicReview),
  };
}

function mapPublicDishDetailPayload(payload) {
  return {
    dish: mapDishBase(payload?.dish ?? {}),
    category: payload?.category
      ? {
          id: toId(payload.category.id),
          title: pickText(payload.category.title, payload.category.name),
          name: pickText(payload.category.name, payload.category.title),
        }
      : null,
    stats: {
      averageRating: toNumber(payload?.stats?.averageRating, 0),
      reviewCount: toNumber(payload?.stats?.reviewCount, 0),
      orderCount: toNumber(payload?.stats?.orderCount, 0),
      favoriteCount: toNumber(payload?.stats?.favoriteCount, 0),
      totalStock: toNumber(payload?.stats?.totalStock, 0),
    },
    stores: ensureArray(payload?.stores).map((store) => ({
      ...mapDishDetailStore(store),
    })),
    reviews: ensureArray(payload?.reviews).map(mapPublicReview),
    relatedDishes: ensureArray(payload?.relatedDishes).map(mapDishBase),
  };
}

export async function fetchPublicHome() {
  const payload = await apiRequest("/api/public/home");
  return mapPublicHomePayload(payload);
}

export async function fetchPublicStores(query = {}) {
  const payload = await apiRequest(`/api/public/stores${buildQueryString(query)}`);
  return mapPagedPayload(payload, mapStoreBase);
}

export async function fetchPublicStoreDetail(storeId, query = {}) {
  try {
    const payload = await apiRequest(`/api/public/stores/${storeId}${buildQueryString(query)}`);
    return mapPublicStoreDetailPayload(payload);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }

    const fallbackPayload = await apiRequest(
      `/api/public/stores${buildQueryString({ page: 0, size: 100 })}`,
    );
    const fallbackPaged = normalizePagedPayload(fallbackPayload);
    const matchedStore = fallbackPaged.items.find(
      (store) => pickText(store?.slug).toLowerCase() === String(storeId).trim().toLowerCase(),
    );

    if (!matchedStore?.id) {
      throw error;
    }

    const payload = await apiRequest(`/api/public/stores/${matchedStore.id}${buildQueryString(query)}`);
    return mapPublicStoreDetailPayload(payload);
  }
}

export async function fetchPublicDishes(query = {}) {
  const payload = await apiRequest(`/api/public/dishes${buildQueryString(query)}`);
  return mapPagedPayload(payload, mapDishListItem);
}

export async function fetchPublicDishDetail(dishId, query = {}) {
  const payload = await apiRequest(`/api/public/dishes/${dishId}${buildQueryString(query)}`);
  return mapPublicDishDetailPayload(payload);
}

export async function fetchPublicEvents(query = {}) {
  const payload = await apiRequest(`/api/public/events${buildQueryString(query)}`);
  return mapPagedPayload(payload, mapEvent);
}

export async function fetchPublicEventDetail(eventKey) {
  const normalizedEventKey = String(eventKey ?? "").trim();

  if (!normalizedEventKey) {
    throw new Error("Event key is required.");
  }

  try {
    const payload = await apiRequest(`/api/public/events/${normalizedEventKey}`);
    return mapEvent(payload?.event ?? payload?.data ?? payload);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) {
      throw error;
    }

    const fallbackResponse = await fetchPublicEvents({ page: 0, size: 100 });
    const normalizedLookupKey = normalizedEventKey.toLowerCase();
    const matchedEvent =
      fallbackResponse.items.find(
        (event) => String(event.slug ?? "").trim().toLowerCase() === normalizedLookupKey,
      ) ??
      fallbackResponse.items.find(
        (event) => String(event.eventSlug ?? "").trim().toLowerCase() === normalizedLookupKey,
      ) ??
      fallbackResponse.items.find(
        (event) => String(event.id ?? "").trim().toLowerCase() === normalizedLookupKey,
      ) ??
      null;

    if (!matchedEvent) {
      throw error;
    }

    return matchedEvent;
  }
}

export async function fetchPublicReviews(query = {}) {
  const payload = await apiRequest(`/api/public/reviews${buildQueryString(query)}`);
  return mapPagedPayload(payload, mapPublicReview);
}

export async function fetchPublicNews(query = {}) {
  const payload = await apiRequest(`/api/public/news${buildQueryString(query)}`);
  return mapPagedPayload(payload, mapNews);
}

export async function fetchPublicNewsDetail(newsKey) {
  const payload = await apiRequest(`/api/public/news/${newsKey}`);
  return mapNews(payload);
}

export async function fetchUserFavorites(auth, query = {}) {
  const payload = await apiRequest(
    `/api/user/favorites${buildQueryString(query)}`,
    authOptions(auth),
  );
  const items = Array.isArray(payload) ? payload : normalizePagedPayload(payload).items;
  return items.map(mapFavorite);
}

export async function fetchUserCurrentLevels(auth, query = {}) {
  const payload = await apiRequest(
    `/api/user/levels/current${buildQueryString(query)}`,
    authOptions(auth),
  );
  const items = ensureArray(payload);
  return items.map(mapUserCurrentLevel);
}

export async function fetchUserNotifications(auth, query = {}) {
  const payload = await apiRequest(
    `/api/user/notifications${buildQueryString(query)}`,
    authOptions(auth),
  );
  const paged = normalizePagedPayload(payload);

  return {
    ...paged,
    items: paged.items.map(mapUserNotification),
  };
}

export async function fetchUserNotificationUnreadCount(auth) {
  const payload = await apiRequest("/api/user/notifications/unread-count", authOptions(auth));
  return toNumber(
    pickValue(payload?.unreadCount, payload?.count, payload?.total, payload),
    0,
  );
}

export async function markUserNotificationRead(auth, notificationId) {
  return apiRequest(`/api/user/notifications/${notificationId}/read`, {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function markUserNotificationUnread(auth, notificationId) {
  return apiRequest(`/api/user/notifications/${notificationId}/unread`, {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function markAllUserNotificationsRead(auth) {
  return apiRequest("/api/user/notifications/read-all", {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function fetchAdminNotifications(auth, query = {}) {
  const payload = await apiRequest(
    `/api/admin/notifications${buildQueryString(query)}`,
    authOptions(auth),
  );
  const paged = normalizePagedPayload(payload);

  return {
    ...paged,
    items: paged.items.map(mapUserNotification),
  };
}

export async function fetchAdminNotificationUnreadCount(auth) {
  const payload = await apiRequest("/api/admin/notifications/unread-count", authOptions(auth));
  return toNumber(
    pickValue(payload?.unreadCount, payload?.count, payload?.total, payload),
    0,
  );
}

export async function markAdminNotificationRead(auth, notificationId) {
  return apiRequest(`/api/admin/notifications/${notificationId}/read`, {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function markAdminNotificationUnread(auth, notificationId) {
  return apiRequest(`/api/admin/notifications/${notificationId}/unread`, {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function markAllAdminNotificationsRead(auth) {
  return apiRequest("/api/admin/notifications/read-all", {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function createUserFavorite(auth, payload) {
  const response = await apiRequest("/api/user/favorites", {
    method: "POST",
    body: {
      targetType: toApiTargetType(payload?.targetType),
      targetId: payload?.targetId,
    },
    ...authOptions(auth),
  });

  return mapFavorite(response);
}

export async function deleteUserFavorite(auth, payload) {
  return apiRequest("/api/user/favorites", {
    method: "DELETE",
    body: {
      targetType: toApiTargetType(payload?.targetType),
      targetId: payload?.targetId,
    },
    ...authOptions(auth),
  });
}

export async function fetchMyReviews(auth, query = { page: 0, size: 100 }) {
  const payload = await apiRequest(`/api/user/reviews${buildQueryString(query)}`, authOptions(auth));
  const paged = normalizePagedPayload(payload);
  return paged.items.map(mapUserReview);
}

export async function fetchUserDeliveryAddresses(auth) {
  try {
    const payload = await apiRequest("/api/user/delivery-addresses", authOptions(auth));
    return ensureArray(payload).map(mapDeliveryAddress);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function fetchUserDeliveryAddressDetail(auth, addressId) {
  const payload = await apiRequest(`/api/user/delivery-addresses/${addressId}`, authOptions(auth));
  return mapDeliveryAddress(payload);
}

export async function requestPasswordResetOtp(payload) {
  return apiRequest("/api/auth/password/request-otp", {
    method: "POST",
    body: {
      email: payload?.email,
    },
  });
}

export async function resetPasswordWithOtp(payload) {
  return apiRequest("/api/auth/password/reset", {
    method: "POST",
    body: {
      email: payload?.email,
      otp: payload?.otp,
      newPassword: payload?.newPassword,
    },
  });
}

export async function createUserDeliveryAddress(auth, payload) {
  const response = await apiRequest("/api/user/delivery-addresses", {
    method: "POST",
    body: {
      fullName: payload?.fullName,
      phoneNumber: payload?.phoneNumber,
      deliveryAddress: payload?.deliveryAddress,
      primary: payload?.primary,
    },
    ...authOptions(auth),
  });

  return mapDeliveryAddress(response);
}

export async function setPrimaryUserDeliveryAddress(auth, addressId) {
  const response = await apiRequest(`/api/user/delivery-addresses/${addressId}/primary`, {
    method: "PUT",
    ...authOptions(auth),
  });

  return mapDeliveryAddress(response);
}

export async function updateUserDeliveryAddress(auth, addressId, payload) {
  const response = await apiRequest(`/api/user/delivery-addresses/${addressId}`, {
    method: "PUT",
    body: {
      fullName: payload?.fullName,
      phoneNumber: payload?.phoneNumber,
      deliveryAddress: payload?.deliveryAddress,
      primary: payload?.primary,
    },
    ...authOptions(auth),
  });

  return mapDeliveryAddress(response);
}

export async function deleteUserDeliveryAddress(auth, addressId) {
  return apiRequest(`/api/user/delivery-addresses/${addressId}`, {
    method: "DELETE",
    ...authOptions(auth),
  });
}

export async function createUserReview(auth, payload) {
  const response = await apiRequest("/api/user/reviews", {
    method: "POST",
    body: {
      targetType: toApiTargetType(payload?.targetType),
      targetId: payload?.targetId,
      rating: payload?.rating,
      title: payload?.title,
      comment: payload?.comment,
    },
    ...authOptions(auth),
  });

  return mapUserReview(response);
}

export async function updateUserReview(auth, reviewId, payload) {
  const response = await apiRequest(`/api/user/reviews/${reviewId}`, {
    method: "PUT",
    body: {
      targetType: toApiTargetType(payload?.targetType),
      targetId: payload?.targetId,
      rating: payload?.rating,
      title: payload?.title,
      comment: payload?.comment,
    },
    ...authOptions(auth),
  });

  return mapUserReview(response);
}

export async function deleteUserReview(auth, reviewId) {
  return apiRequest(`/api/user/reviews/${reviewId}`, {
    method: "DELETE",
    ...authOptions(auth),
  });
}

export async function fetchUserFeedbacks(auth, query = { page: 0, size: 100 }) {
  try {
    const payload = await apiRequest(
      `/api/user/feedbacks${buildQueryString(query)}`,
      authOptions(auth),
    );
    const items = Array.isArray(payload) ? payload : normalizePagedPayload(payload).items;
    return items.map(mapCustomerFeedback);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function fetchUserFeedbackDetail(auth, feedbackId) {
  const payload = await apiRequest(`/api/user/feedbacks/${feedbackId}`, authOptions(auth));
  return mapCustomerFeedback(payload);
}

export async function createUserFeedback(auth, payload) {
  const response = await apiRequest("/api/user/feedbacks", {
    method: "POST",
    body: {
      category: payload?.category,
      relatedStoreId: toRequestNumber(payload?.relatedStoreId),
      subject: payload?.subject,
      message: payload?.message,
    },
    ...authOptions(auth),
  });

  return mapCustomerFeedback(response);
}

export async function deleteUserFeedback(auth, feedbackId) {
  return apiRequest(`/api/user/feedbacks/${feedbackId}`, {
    method: "DELETE",
    ...authOptions(auth),
  });
}

export async function fetchUserCart(auth) {
  try {
    const payload = await apiRequest("/api/user/cart", authOptions(auth));
    return mapCart(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        id: "",
        userId: "",
        status: "OPEN",
        items: [],
        totalItems: 0,
        subtotal: 0,
        createdAt: "",
        updatedAt: "",
      };
    }

    throw error;
  }
}

export async function addUserCartItem(auth, payload) {
  return apiRequest("/api/user/cart/items", {
    method: "POST",
    body: {
      storeId: toRequestNumber(payload?.storeId),
      dishId: toRequestNumber(payload?.dishId),
      quantity: toRequestNumber(payload?.quantity),
    },
    ...authOptions(auth),
  });
}

export async function updateUserCartItem(auth, itemId, payload) {
  return apiRequest(`/api/user/cart/items/${itemId}`, {
    method: "PUT",
    body: {
      storeId: toRequestNumber(payload?.storeId),
      dishId: toRequestNumber(payload?.dishId),
      quantity: toRequestNumber(payload?.quantity),
    },
    ...authOptions(auth),
  });
}

export async function deleteUserCartItem(auth, itemId) {
  return apiRequest(`/api/user/cart/items/${itemId}`, {
    method: "DELETE",
    ...authOptions(auth),
  });
}

export async function clearUserCart(auth) {
  return apiRequest("/api/user/cart", {
    method: "DELETE",
    ...authOptions(auth),
  });
}

export async function checkoutUserCart(auth, checkoutPayload = {}) {
  const payload = await apiRequest("/api/user/cart/checkout", {
    method: "POST",
    body: {
      deliveryAddressId: toRequestNumber(checkoutPayload?.deliveryAddressId),
      promotionCode: checkoutPayload?.promotionCode?.trim() || undefined,
      deliveryType: checkoutPayload?.deliveryType || undefined,
      scheduledDeliveryAt:
        checkoutPayload?.deliveryType === "SCHEDULED"
          ? checkoutPayload?.scheduledDeliveryAt || undefined
          : undefined,
      returnUrl: checkoutPayload?.returnUrl,
      cancelUrl: checkoutPayload?.cancelUrl,
    },
    ...authOptions(auth),
  });

  return mapOrder(payload);
}

export async function previewUserCartCheckout(auth, previewPayload = {}) {
  const payload = await apiRequest("/api/user/cart/checkout-preview", {
    method: "POST",
    body: {
      deliveryAddressId: toRequestNumber(previewPayload?.deliveryAddressId),
      promotionCode: previewPayload?.promotionCode?.trim() || undefined,
      deliveryType: previewPayload?.deliveryType || undefined,
      scheduledDeliveryAt:
        previewPayload?.deliveryType === "SCHEDULED"
          ? previewPayload?.scheduledDeliveryAt || undefined
          : undefined,
    },
    ...authOptions(auth),
  });

  return mapCheckoutPricing(payload);
}

export async function fetchUserOrders(auth, query = {}) {
  const payload = await apiRequest(`/api/user/orders${buildQueryString(query)}`, authOptions(auth));
  const paged = normalizePagedPayload(payload);

  return {
    ...paged,
    items: paged.items.map(mapOrder),
  };
}

export async function fetchUserOrderDetail(auth, orderId) {
  const payload = await apiRequest(`/api/user/orders/${orderId}`, authOptions(auth));
  return mapOrder(payload);
}

export async function refreshUserOrderPayment(auth, orderId) {
  const payload = await apiRequest(`/api/user/orders/${orderId}/refresh-payment`, {
    method: "POST",
    ...authOptions(auth),
  });

  return mapOrder(payload);
}

export async function fetchEmployeeOrders(auth, query = {}) {
  const payload = await apiRequest(
    `/api/employee/orders${buildQueryString(query)}`,
    authOptions(auth),
  );
  const paged = normalizePagedPayload(payload);

  return {
    ...paged,
    items: paged.items.map(mapOrder),
  };
}

export async function fetchEmployeeOrderDetail(auth, orderId) {
  const payload = await apiRequest(`/api/employee/orders/${orderId}`, authOptions(auth));
  return mapOrder(payload);
}

export async function acceptEmployeePreparing(auth, orderId) {
  const payload = await apiRequest(`/api/employee/orders/${orderId}/accept-preparing`, {
    method: "POST",
    ...authOptions(auth),
  });
  return mapOrder(payload);
}

export async function markEmployeeOrderReady(auth, orderId) {
  const payload = await apiRequest(`/api/employee/orders/${orderId}/mark-ready`, {
    method: "POST",
    ...authOptions(auth),
  });
  return mapOrder(payload);
}

export async function acceptEmployeeDelivery(auth, orderId) {
  const payload = await apiRequest(`/api/employee/orders/${orderId}/accept-delivery`, {
    method: "POST",
    ...authOptions(auth),
  });
  return mapOrder(payload);
}

export async function completeEmployeeDelivery(auth, orderId) {
  const payload = await apiRequest(`/api/employee/orders/${orderId}/complete-delivery`, {
    method: "POST",
    ...authOptions(auth),
  });
  return mapOrder(payload);
}

export async function uploadEmployeeDeliveryProof(auth, orderId, payload = {}) {
  const file = payload?.file;

  if (!file) {
    throw new Error("Please choose a delivery proof image first.");
  }

  const formData = new FormData();
  formData.append("file", file);

  if (String(payload?.capturedAt ?? "").trim()) {
    formData.append("capturedAt", String(payload.capturedAt).trim());
  }

  if (String(payload?.note ?? "").trim()) {
    formData.append("note", String(payload.note).trim());
  }

  const requestHeaders = new Headers();

  if (auth?.token) {
    requestHeaders.set("Authorization", `${auth?.tokenType ?? "Bearer"} ${auth.token}`);
  }

  const response = await fetch(resolveApiUrl(`/api/employee/orders/${orderId}/delivery-proof`), {
    method: "POST",
    headers: requestHeaders,
    body: formData,
  });

  const parsedPayload = await parseApiResponsePayload(response, {
    path: `/api/employee/orders/${orderId}/delivery-proof`,
    method: "POST",
    token: auth?.token,
    tokenType: auth?.tokenType ?? "Bearer",
  });

  return mapDeliveryProofResponse(parsedPayload);
}

export async function scanEmployeeOrder(auth, payload = {}) {
  const response = await apiRequest("/api/employee/orders/scan", {
    method: "POST",
    body: {
      qrToken: pickText(payload?.qrToken),
      action: pickText(payload?.action).toUpperCase(),
    },
    ...authOptions(auth),
  });

  return mapEmployeeOrderScanResponse(response);
}

export async function fetchMobileOrderQr(auth, qrToken) {
  const payload = await apiRequest(
    `/api/mobile/order-qr/${encodeURIComponent(pickText(qrToken))}`,
    authOptions(auth),
  );
  return mapMobileOrderQrResponse(payload);
}

export async function fetchEmployeeNotifications(auth, query = {}) {
  const payload = await apiRequest(
    `/api/employee/notifications${buildQueryString(query)}`,
    authOptions(auth),
  );
  const paged = normalizePagedPayload(payload);

  return {
    ...paged,
    items: paged.items.map(mapUserNotification),
  };
}

export async function fetchEmployeeNotificationUnreadCount(auth) {
  const payload = await apiRequest(
    "/api/employee/notifications/unread-count",
    authOptions(auth),
  );
  return toNumber(
    pickValue(payload?.unreadCount, payload?.count, payload?.total, payload),
    0,
  );
}

export async function markEmployeeNotificationRead(auth, notificationId) {
  return apiRequest(`/api/employee/notifications/${notificationId}/read`, {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function markEmployeeNotificationUnread(auth, notificationId) {
  return apiRequest(`/api/employee/notifications/${notificationId}/unread`, {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function markAllEmployeeNotificationsRead(auth) {
  return apiRequest("/api/employee/notifications/read-all", {
    method: "PUT",
    ...authOptions(auth),
  });
}

export async function fetchEmployeeWorkScheduleToday(auth) {
  try {
    const payload = await apiRequest("/api/employee/work-schedules/today", authOptions(auth));
    return mapEmployeeWorkSchedule(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function fetchEmployeeWorkScheduleMonthly(auth, query = {}) {
  try {
    const payload = await apiRequest(
      `/api/employee/work-schedules/monthly${buildQueryString(query)}`,
      authOptions(auth),
    );

    return {
      month: pickText(payload?.month),
      storeId: toId(payload?.storeId),
      storeName: pickText(payload?.storeName),
      items: ensureArray(payload?.items).map(mapEmployeeWorkSchedule),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        month: pickText(query?.month),
        storeId: "",
        storeName: "",
        items: [],
      };
    }

    throw error;
  }
}

export async function fetchEmployeeAttendanceToday(auth) {
  try {
    const payload = await apiRequest("/api/employee/attendance/today", authOptions(auth));
    return mapEmployeeAttendance(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function checkInEmployeeAttendance(auth) {
  const payload = await apiRequest("/api/employee/attendance/check-in", {
    method: "POST",
    ...authOptions(auth),
  });
  return mapEmployeeAttendance(payload);
}

export async function checkOutEmployeeAttendance(auth) {
  const payload = await apiRequest("/api/employee/attendance/check-out", {
    method: "POST",
    ...authOptions(auth),
  });
  return mapEmployeeAttendance(payload);
}

export async function fetchEmployeeAttendanceHistory(auth, query = {}) {
  try {
    const payload = await apiRequest(
      `/api/employee/attendance/history${buildQueryString(query)}`,
      authOptions(auth),
    );
    const paged = normalizePagedPayload(payload);

    return {
      ...paged,
      items: paged.items.map(mapEmployeeAttendance),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        items: [],
        page: 0,
        size: toNumber(query?.size, 10),
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      };
    }

    throw error;
  }
}
