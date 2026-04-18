function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function hasExplicitBoolean(value) {
  return value === true || value === false;
}

export function getCartAvailabilityDecision(source = {}) {
  const stock = toNumber(source?.stock, 0);
  const storeClosed = source?.storeOpen === false || source?.open === false;
  const storeDisabled = source?.storeDisabled === true;
  const hasSchedulable = hasExplicitBoolean(source?.schedulable);
  const immediateAvailable = source?.available !== false && source?.disabled !== true;

  if (stock <= 0) {
    return {
      allowed: false,
      preorderOnly: false,
      reason: "This item is currently out of stock.",
    };
  }

  if (storeDisabled) {
    return {
      allowed: false,
      preorderOnly: false,
      reason: source?.disabledReason || "This store is temporarily unavailable.",
    };
  }

  if (hasSchedulable) {
    if (source.schedulable) {
      return {
        allowed: true,
        preorderOnly: source?.available !== true || source?.disabled === true || storeClosed,
        reason: "",
      };
    }

    if (immediateAvailable) {
      return {
        allowed: true,
        preorderOnly: false,
        reason: "",
      };
    }

    return {
      allowed: false,
      preorderOnly: false,
      reason: source?.disabledReason || "This item is not ready to be added to the cart yet.",
    };
  }

  if (storeClosed) {
    return {
      allowed: true,
      preorderOnly: true,
      reason: "",
    };
  }

  if (immediateAvailable) {
    return {
      allowed: true,
      preorderOnly: false,
      reason: "",
    };
  }

  return {
    allowed: false,
    preorderOnly: false,
    reason: source?.disabledReason || "This item is not ready to be added to the cart yet.",
  };
}

export function getCartSuccessMessage(preorderOnly = false) {
  return preorderOnly
    ? "Item added to cart. This item is currently available for preorder only."
    : "Item added to cart.";
}
