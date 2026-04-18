export const GLOBAL_CATALOG_STORE_ID = String(
  import.meta.env.VITE_GLOBAL_CATALOG_STORE_ID ?? "",
).trim();

export const GLOBAL_CATALOG_STORE_SLUG = String(
  import.meta.env.VITE_GLOBAL_CATALOG_STORE_SLUG ?? "global-catalog",
).trim();

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isGlobalCatalogStore(store) {
  const id = normalize(store?.id ?? store?.storeId);
  const slug = normalize(store?.slug ?? store?.storeSlug);

  return Boolean(
    (GLOBAL_CATALOG_STORE_ID && id === normalize(GLOBAL_CATALOG_STORE_ID)) ||
      (GLOBAL_CATALOG_STORE_SLUG && slug === normalize(GLOBAL_CATALOG_STORE_SLUG)),
  );
}

export function isGlobalCatalogStoreId(storeId, stores = []) {
  const normalizedId = normalize(storeId);

  if (!normalizedId) {
    return false;
  }

  if (GLOBAL_CATALOG_STORE_ID && normalizedId === normalize(GLOBAL_CATALOG_STORE_ID)) {
    return true;
  }

  return stores.some(
    (store) =>
      normalize(store?.id ?? store?.storeId) === normalizedId && isGlobalCatalogStore(store),
  );
}

export function findGlobalCatalogStore(stores = []) {
  return stores.find((store) => isGlobalCatalogStore(store)) ?? null;
}
