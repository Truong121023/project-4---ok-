function resolveOperationStoreKey(storeOrId) {
  if (storeOrId === undefined || storeOrId === null || storeOrId === "") {
    return "";
  }

  if (typeof storeOrId !== "object") {
    return String(storeOrId);
  }

  const slug = String(storeOrId.slug ?? storeOrId.storeSlug ?? "").trim();

  if (slug) {
    return slug;
  }

  const storeId = storeOrId.storeId ?? storeOrId.id;
  return storeId === undefined || storeId === null || storeId === "" ? "" : String(storeId);
}

export function buildOperationDetailPath(storeOrId) {
  const storeKey = resolveOperationStoreKey(storeOrId);
  return storeKey ? `/admin/operations/${storeKey}` : "/admin";

}
