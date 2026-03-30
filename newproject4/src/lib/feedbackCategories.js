const feedbackCategoryLabels = {
  GENERAL: "General",
  STORE_SERVICE: "Store service",
  PRODUCT_QUALITY: "Product quality",
  DELIVERY: "Delivery",
  ORDER_EXPERIENCE: "Order experience",
  APP_EXPERIENCE: "App experience",
  OTHER: "Other",
};

export const feedbackCategoryOptions = Object.entries(feedbackCategoryLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export function normalizeFeedbackCategory(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized || "GENERAL";
}

export function getFeedbackCategoryLabel(value) {
  const normalized = normalizeFeedbackCategory(value);
  return feedbackCategoryLabels[normalized] ?? (normalized || "Other");
}
