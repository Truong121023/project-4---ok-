function parseClockTime(value) {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function parseHoursWindow(hoursText) {
  const match = String(hoursText ?? "").match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);

  if (!match) {
    return null;
  }

  const opensAtMinutes = parseClockTime(match[1]);
  const closesAtMinutes = parseClockTime(match[2]);

  if (opensAtMinutes === null || closesAtMinutes === null) {
    return null;
  }

  return {
    opensAtMinutes,
    closesAtMinutes,
    opensAtLabel: match[1],
    closesAtLabel: match[2],
  };
}

function getCurrentMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

export function getStoreAvailability(store, now = new Date()) {
  const window = parseHoursWindow(store?.hours);

  if (!window) {
    return {
      isOpen: true,
      isDisabled: false,
      state: "unknown",
      label: "Serving now",
      reason: "Opening hours are not available for comparison yet",
    };
  }

  const currentMinutes = getCurrentMinutes(now);
  const isOvernight = window.opensAtMinutes > window.closesAtMinutes;
  const isOpen = isOvernight
    ? currentMinutes >= window.opensAtMinutes || currentMinutes <= window.closesAtMinutes
    : currentMinutes >= window.opensAtMinutes && currentMinutes <= window.closesAtMinutes;

  return isOpen
    ? {
        isOpen: true,
        isDisabled: false,
        state: "open",
        label: `Open until ${window.closesAtLabel}`,
        reason: "Available for dine-in and takeaway",
      }
    : {
        isOpen: false,
        isDisabled: true,
        state: "closed",
        label: `Temporarily closed, reopens at ${window.opensAtLabel}`,
        reason: "Outside the store service hours",
      };
}

export function getItemStock(item, storeId) {
  if (!storeId) {
    return 0;
  }

  return Number(item?.stockByStoreId?.[storeId] ?? 0);
}

export function getItemTotalStock(item) {
  return Object.values(item?.stockByStoreId ?? {}).reduce(
    (sum, value) => sum + Number(value ?? 0),
    0,
  );
}

export function getItemAvailability(item, storeId) {
  const stock = storeId ? getItemStock(item, storeId) : getItemTotalStock(item);

  return stock > 0
    ? {
        stock,
        isAvailable: true,
        isDisabled: false,
        state: "in-stock",
        label: `${stock} cups left`,
      }
    : {
        stock: 0,
        isAvailable: false,
        isDisabled: true,
        state: "sold-out",
        label: "Temporarily sold out",
      };
}

export function getEventAvailability(event, store, menuItems, now = new Date()) {
  const startsAt = new Date(event?.startsAt ?? "");
  const endsAt = new Date(event?.endsAt ?? event?.startsAt ?? "");
  const hasStarted = Number.isFinite(startsAt.getTime()) ? startsAt.getTime() <= now.getTime() : false;
  const hasEnded = Number.isFinite(endsAt.getTime()) ? endsAt.getTime() < now.getTime() : false;
  const remainingSlots = Math.max(
    Number(event?.capacity ?? 0) - Number(event?.bookedCount ?? 0),
    0,
  );
  const storeAvailability = getStoreAvailability(store, now);
  const featuredItems = (event?.featuredItemIds ?? [])
    .map((itemId) => menuItems.find((item) => item.id === itemId))
    .filter(Boolean);
  const hasSellableItems = featuredItems.length
    ? featuredItems.some((item) => getItemStock(item, store?.id) > 0)
    : true;

  if (hasEnded) {
    return {
      isDisabled: true,
      state: "ended",
      remainingSlots,
      label: "Ended",
      reason: "The event date has passed",
    };
  }

  if (remainingSlots <= 0) {
    return {
      isDisabled: true,
      state: "full",
      remainingSlots,
      label: "Sold out",
      reason: "All participation slots have been booked",
    };
  }

  if (!hasSellableItems) {
    return {
      isDisabled: true,
      state: "sold-out-items",
      remainingSlots,
      label: "Temporarily unavailable",
      reason: "Featured event items are sold out",
    };
  }

  if (store && storeAvailability.isDisabled) {
    return {
      isDisabled: true,
      state: "store-closed",
      remainingSlots,
      label: "Temporarily unavailable",
      reason: storeAvailability.label,
    };
  }

  return {
    isDisabled: false,
    state: hasStarted ? "live" : "upcoming",
    remainingSlots,
    label: hasStarted ? `Live - ${remainingSlots} slots left` : `${remainingSlots} slots left`,
    reason: hasStarted ? "Ready to join now" : "Booking is open for the upcoming schedule",
  };
}
