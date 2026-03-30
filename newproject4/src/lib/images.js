function uniqueValues(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

const REMOTE_ASSET_BASE_URL = (
  import.meta.env.VITE_ASSET_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/, "");
const LOCAL_ASSET_BASE_URL = String(import.meta.env.VITE_LOCAL_APP_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

export function normalizeImagePath(imagePath) {
  if (!imagePath) {
    return "";
  }

  const normalized = String(imagePath).trim().replace(/\\/g, "/");

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const uploadsIndex = normalized.indexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return normalized.slice(uploadsIndex);
  }

  if (normalized.startsWith("uploads/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("/public/uploads/")) {
    return normalized.replace("/public", "");
  }

  if (normalized.startsWith("public/uploads/")) {
    return `/${normalized.replace(/^public\//, "")}`;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function normalizeImagePathList(imagePaths) {
  if (Array.isArray(imagePaths)) {
    return uniqueValues(imagePaths.map((imagePath) => normalizeImagePath(imagePath)).filter(Boolean));
  }

  if (typeof imagePaths === "string") {
    return normalizeImagePath(imagePaths) ? [normalizeImagePath(imagePaths)] : [];
  }

  return [];
}

export function getImageCandidates(imagePath) {
  const normalized = normalizeImagePath(imagePath);

  if (!normalized) {
    return [];
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return [normalized];
  }

  const candidates = [normalized];

  if (REMOTE_ASSET_BASE_URL && normalized.startsWith("/")) {
    candidates.unshift(`${REMOTE_ASSET_BASE_URL}${normalized}`);
  }

  if (normalized.startsWith("/uploads/")) {
    candidates.push(`${LOCAL_ASSET_BASE_URL}${normalized}`);
  }

  return uniqueValues(candidates);
}

export function getPrimaryImageUrl(imagePath) {
  return getImageCandidates(imagePath)[0] ?? "";
}
