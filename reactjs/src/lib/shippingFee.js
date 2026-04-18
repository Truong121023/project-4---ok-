export const SHIPPING_FEE_PER_KM = 4000;

function toCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

export function hasCoordinatePair(location) {
  return (
    toCoordinate(location?.latitude) !== null &&
    toCoordinate(location?.longitude) !== null
  );
}

export function isDeliveryOrderType(deliveryType) {
  return ["DELIVERY", "SCHEDULED"].includes(String(deliveryType ?? "").toUpperCase());
}

export function calculateDistanceKm(from, to) {
  if (!hasCoordinatePair(from) || !hasCoordinatePair(to)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRadians(Number(to.latitude) - Number(from.latitude));
  const dLon = toRadians(Number(to.longitude) - Number(from.longitude));
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateShippingFeeAmount(distanceKm) {
  const normalizedDistance = Number(distanceKm);

  if (!Number.isFinite(normalizedDistance) || normalizedDistance <= 0) {
    return 0;
  }

  return Math.round(normalizedDistance * SHIPPING_FEE_PER_KM);
}

export function formatShippingDistance(distanceKm) {
  const normalizedDistance = Number(distanceKm);

  if (!Number.isFinite(normalizedDistance)) {
    return "Not available";
  }

  return `${normalizedDistance.toFixed(normalizedDistance >= 10 ? 1 : 2)} km`;
}

function buildStoreLocationGroups(cartItems) {
  const groups = new Map();

  cartItems.forEach((item) => {
    const storeId = String(item?.storeId ?? "").trim();

    if (!storeId || groups.has(storeId)) {
      return;
    }

    groups.set(storeId, {
      storeId,
      storeName: String(item?.storeName ?? "").trim(),
      latitude: toCoordinate(item?.storeLatitude),
      longitude: toCoordinate(item?.storeLongitude),
    });
  });

  return [...groups.values()];
}

export function calculateCartShippingEstimate({
  cartItems = [],
  deliveryAddress = null,
  deliveryType = "DELIVERY",
  subtotalAmount = 0,
  discountAmount = 0,
} = {}) {
  if (!isDeliveryOrderType(deliveryType)) {
    return {
      available: true,
      source: "estimated",
      subtotalAmount: Number(subtotalAmount ?? 0),
      discountAmount: Number(discountAmount ?? 0),
      shippingDistanceKm: 0,
      shippingFeeAmount: 0,
      shippingFeeBreakdown: [],
      totalAmount: Math.max(0, Number(subtotalAmount ?? 0) - Number(discountAmount ?? 0)),
      statusSummary: "No shipping fee is required for this delivery type.",
    };
  }

  if (!hasCoordinatePair(deliveryAddress)) {
    return {
      available: false,
      source: "estimated",
      subtotalAmount: Number(subtotalAmount ?? 0),
      discountAmount: Number(discountAmount ?? 0),
      shippingDistanceKm: null,
      shippingFeeAmount: null,
      shippingFeeBreakdown: [],
      totalAmount: null,
      statusSummary: "Shipping fee will be finalized after address coordinates are available.",
      error: "Delivery address is missing coordinates.",
    };
  }

  const storeLocations = buildStoreLocationGroups(cartItems);

  if (!storeLocations.length) {
    return {
      available: false,
      source: "estimated",
      subtotalAmount: Number(subtotalAmount ?? 0),
      discountAmount: Number(discountAmount ?? 0),
      shippingDistanceKm: null,
      shippingFeeAmount: null,
      shippingFeeBreakdown: [],
      totalAmount: null,
      statusSummary: "Shipping fee cannot be estimated because the cart has no store locations.",
      error: "Store coordinates are missing for shipping calculation.",
    };
  }

  const shippingFeeBreakdown = [];

  for (const store of storeLocations) {
    if (!hasCoordinatePair(store)) {
      return {
        available: false,
        source: "estimated",
        subtotalAmount: Number(subtotalAmount ?? 0),
        discountAmount: Number(discountAmount ?? 0),
        shippingDistanceKm: null,
        shippingFeeAmount: null,
        shippingFeeBreakdown: [],
        totalAmount: null,
        statusSummary: "Shipping fee cannot be estimated because at least one store is missing coordinates.",
        error: "Store coordinates are missing for shipping calculation.",
      };
    }

    const distanceKm = calculateDistanceKm(deliveryAddress, store);

    if (distanceKm === null) {
      return {
        available: false,
        source: "estimated",
        subtotalAmount: Number(subtotalAmount ?? 0),
        discountAmount: Number(discountAmount ?? 0),
        shippingDistanceKm: null,
        shippingFeeAmount: null,
        shippingFeeBreakdown: [],
        totalAmount: null,
        statusSummary: "Shipping fee could not be calculated for the selected address.",
        error: "Shipping fee could not be calculated for this address.",
      };
    }

    shippingFeeBreakdown.push({
      storeId: store.storeId,
      storeName: store.storeName,
      distanceKm,
      shippingFeeAmount: calculateShippingFeeAmount(distanceKm),
    });
  }

  const shippingDistanceKm = shippingFeeBreakdown.reduce(
    (sum, item) => sum + Number(item.distanceKm ?? 0),
    0,
  );
  const shippingFeeAmount = shippingFeeBreakdown.reduce(
    (sum, item) => sum + Number(item.shippingFeeAmount ?? 0),
    0,
  );
  const normalizedSubtotal = Number(subtotalAmount ?? 0);
  const normalizedDiscount = Number(discountAmount ?? 0);

  return {
    available: true,
    source: "estimated",
    subtotalAmount: normalizedSubtotal,
    discountAmount: normalizedDiscount,
    shippingDistanceKm,
    shippingFeeAmount,
    shippingFeeBreakdown,
    totalAmount: Math.max(0, normalizedSubtotal - normalizedDiscount + shippingFeeAmount),
    statusSummary: "Estimated from map distance.",
  };
}

export function formatShippingBreakdown(shippingFeeBreakdown = []) {
  return shippingFeeBreakdown
    .map((item) => {
      const storeName = String(item?.storeName ?? "").trim() || `Store #${item?.storeId ?? "?"}`;
      return `${storeName}: ${formatShippingDistance(item?.distanceKm)}`;
    })
    .filter(Boolean)
    .join(" | ");
}
