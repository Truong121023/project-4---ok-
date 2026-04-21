import { apiRequest } from "./api";

const GEOCODER_SEARCH_URL =
  import.meta.env.VITE_GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";
const GEOCODER_CACHE = new Map();
const ADDRESS_LOOKUP_SUGGESTIONS_PATH = "/api/public/address-suggestions";
const ADDRESS_LOOKUP_RESOLVE_PATH = "/api/public/address-resolve";

function foldText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    searchParams.set(key, String(value).trim());
  });

  const normalized = searchParams.toString();
  return normalized ? `?${normalized}` : "";
}

export function createAddressLookupSessionToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `address-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function titleCase(value) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function normalizeSegment(segment) {
  const normalizedSegment = String(segment ?? "").trim();

  if (!normalizedSegment) {
    return "";
  }

  const lower = foldText(normalizedSegment);
  const exactCities = {
    hcm: "Ho Chi Minh City",
    tphcm: "Ho Chi Minh City",
    "tp hcm": "Ho Chi Minh City",
    "tp. hcm": "Ho Chi Minh City",
    saigon: "Ho Chi Minh City",
    "sai gon": "Ho Chi Minh City",
    sg: "Ho Chi Minh City",
    "ho chi minh": "Ho Chi Minh City",
    "ho chi minh city": "Ho Chi Minh City",
    hn: "Hanoi",
    "ha noi": "Hanoi",
    hanoi: "Hanoi",
    dn: "Da Nang",
    "da nang": "Da Nang",
    danang: "Da Nang",
    "can tho": "Can Tho",
    cantho: "Can Tho",
  };
  const exactCity = exactCities[lower];

  if (exactCity) {
    return exactCity;
  }

  const districtNumberMatch = /^(?:q\.?\s*(\d+)|q(\d+)|district\s*(\d+)|dist\.?\s*(\d+))$/i.exec(
    normalizedSegment,
  );
  if (districtNumberMatch) {
    const value = districtNumberMatch[1]
      ?? districtNumberMatch[2]
      ?? districtNumberMatch[3]
      ?? districtNumberMatch[4]
      ?? "";
    return `District ${value}`.trim();
  }

  const districtMatch = /^(?:quan|district|dist\.?|huyen)\s+(.+)$/i.exec(normalizedSegment);
  if (districtMatch) {
    return `District ${titleCase(districtMatch[1])}`.trim();
  }

  const wardNumberMatch = /^(?:p\.?\s*(\d+)|p(\d+)|ward\s*(\d+))$/i.exec(normalizedSegment);
  if (wardNumberMatch) {
    const value = wardNumberMatch[1] ?? wardNumberMatch[2] ?? wardNumberMatch[3] ?? "";
    return `Ward ${value}`.trim();
  }

  const wardMatch = /^(?:phuong|ward)\s+(.+)$/i.exec(normalizedSegment);
  if (wardMatch) {
    return `Ward ${titleCase(wardMatch[1])}`.trim();
  }

  const communeMatch = /^(?:xa|commune)\s+(.+)$/i.exec(normalizedSegment);
  if (communeMatch) {
    return `Commune ${titleCase(communeMatch[1])}`.trim();
  }

  const provinceMatch = /^(?:tinh|province)\s+(.+)$/i.exec(normalizedSegment);
  if (provinceMatch) {
    return `${titleCase(provinceMatch[1])} Province`.trim();
  }

  const cityPrefixMatch = /^(?:tp\.?|thanh pho|city)\s+(.+)$/i.exec(normalizedSegment);
  if (cityPrefixMatch) {
    return `${titleCase(cityPrefixMatch[1])} City`.trim();
  }

  return titleCase(normalizedSegment);
}

function containsVietnam(value) {
  const lower = foldText(value);
  return lower.includes("vietnam") || lower.includes("viet nam");
}

function containsMajorCity(value) {
  const lower = foldText(value);
  return (
    lower.includes("ho chi minh") ||
    lower.includes("hanoi") ||
    lower.includes("ha noi") ||
    lower.includes("da nang") ||
    lower.includes("can tho")
  );
}

export function normalizeVietnameseAddress(address) {
  const cleaned = String(address ?? "")
    .trim()
    .replaceAll(";", ",")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/\s+/g, " ");

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(",")
    .map((segment) => normalizeSegment(segment))
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAddressSearchCandidates(address) {
  const original = String(address ?? "").trim();
  const normalized = normalizeVietnameseAddress(original);
  const segments = normalized
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const streetWithoutNumber = segments[0]?.replace(/^\d+[A-Za-z/-]*\s*/, "").trim() ?? "";
  const truncatedCandidates = [
    streetWithoutNumber && segments.length >= 2 && streetWithoutNumber !== segments[0]
      ? [streetWithoutNumber, ...segments.slice(1)].join(", ")
      : "",
    segments.length >= 2 ? segments.slice(1).join(", ") : "",
    segments.length >= 3 ? segments.slice(-3).join(", ") : "",
    segments.length >= 2 ? segments.slice(-2).join(", ") : "",
    segments.length ? segments[segments.length - 1] : "",
  ];
  const baseCandidates = [
    original,
    normalized && normalized !== original ? normalized : "",
    ...truncatedCandidates,
  ];
  const extendedCandidates = [
    ...baseCandidates,
    ...baseCandidates
      .filter((candidate) => candidate && !containsVietnam(candidate))
      .map((candidate) => `${candidate}, Vietnam`),
  ];

  if (normalized && !containsMajorCity(normalized)) {
    extendedCandidates.push(
      `${normalized}, Ho Chi Minh City, Vietnam`,
      `${normalized}, Hanoi, Vietnam`,
    );
  }

  const seen = new Set();
  return extendedCandidates.filter((candidate) => {
    const normalizedCandidate = String(candidate ?? "").trim();

    if (!normalizedCandidate) {
      return false;
    }

    const key = foldText(normalizedCandidate);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function geocodeCandidate(candidate, normalizedAddress) {
  const cacheKey = foldText(candidate);
  const cached = GEOCODER_CACHE.get(cacheKey);

  if (cached) {
    return cached.map((entry) => ({
      ...entry,
      normalizedAddress,
    }));
  }

  const searchParams = new URLSearchParams({
    q: candidate,
    format: "jsonv2",
    limit: "3",
    addressdetails: "1",
    countrycodes: "vn",
    dedupe: "1",
  });

  const response = await fetch(`${GEOCODER_SEARCH_URL}?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (response.status === 429) {
    throw new Error("Address lookup is temporarily busy. Please try again in a moment.");
  }

  if (!response.ok) {
    throw new Error("Unable to find that address right now.");
  }

  const payload = await response.json();
  const resolved = Array.isArray(payload)
    ? payload
      .map((item) => {
        const latitude = toCoordinate(item?.lat);
        const longitude = toCoordinate(item?.lon);

        if (latitude === null || longitude === null) {
          return null;
        }

        return {
          latitude,
          longitude,
          label: String(item?.display_name ?? candidate),
          secondaryLabel: "",
          placeId: "",
          resolvedQuery: candidate,
          source: "nominatim",
        };
      })
      .filter(Boolean)
    : [];

  GEOCODER_CACHE.set(cacheKey, resolved);
  return resolved.map((entry) => ({
    ...entry,
    normalizedAddress,
  }));
}

async function fetchBackendAddressSuggestions(address, limit = 5, sessionToken = "") {
  const payload = await apiRequest(
    `${ADDRESS_LOOKUP_SUGGESTIONS_PATH}${buildQueryString({
      input: address,
      limit,
      sessionToken,
    })}`,
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => ({
      placeId: String(item?.placeId ?? "").trim(),
      label: String(item?.label ?? "").trim(),
      secondaryLabel: String(item?.secondaryLabel ?? "").trim(),
      sessionToken: String(item?.sessionToken ?? sessionToken ?? "").trim(),
      latitude: toCoordinate(item?.latitude),
      longitude: toCoordinate(item?.longitude),
      normalizedAddress: String(item?.normalizedAddress ?? item?.label ?? "").trim(),
      source: String(item?.source ?? "mapbox_geocoding").trim() || "mapbox_geocoding",
    }))
    .filter((item) => item.label);
}

async function resolveBackendAddress({
  address = "",
  placeId = "",
  sessionToken = "",
} = {}) {
  const payload = await apiRequest(
    `${ADDRESS_LOOKUP_RESOLVE_PATH}${buildQueryString({
      input: address,
      placeId,
      sessionToken,
    })}`,
  );

  return {
    placeId: String(payload?.placeId ?? placeId ?? "").trim(),
    label: String(payload?.label ?? payload?.normalizedAddress ?? address ?? "").trim(),
    secondaryLabel: "",
    normalizedAddress: String(payload?.normalizedAddress ?? payload?.label ?? address ?? "").trim(),
    latitude: toCoordinate(payload?.latitude),
    longitude: toCoordinate(payload?.longitude),
    source: String(payload?.source ?? "mapbox_geocoding").trim() || "mapbox_geocoding",
  };
}

export async function searchAddressSuggestions(address, limit = 5, sessionToken = "") {
  const normalizedAddress = normalizeVietnameseAddress(address);

  if (!normalizedAddress) {
    return [];
  }

  let backendError = null;
  try {
    const backendSuggestions = await fetchBackendAddressSuggestions(
      normalizedAddress,
      limit,
      sessionToken,
    );
    if (backendSuggestions.length) {
      return backendSuggestions;
    }
  } catch (error) {
    backendError = error;
  }

  const suggestions = [];
  const seen = new Set();
  let lastError = backendError;

  for (const candidate of buildAddressSearchCandidates(normalizedAddress)) {
    try {
      const matches = await geocodeCandidate(candidate, normalizedAddress);
      for (const match of matches) {
        const key = `${match.latitude.toFixed(6)}:${match.longitude.toFixed(6)}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        suggestions.push(match);
        if (suggestions.length >= limit) {
          return suggestions;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return suggestions;
}

export async function geocodeAddress(address, { placeId = "", sessionToken = "" } = {}) {
  const rawAddress = String(address ?? "").trim();
  const normalizedAddress = normalizeVietnameseAddress(rawAddress);

  if (!normalizedAddress) {
    throw new Error("Please enter an address to calculate the distance.");
  }

  let lastError = null;

  try {
    const backendMatch = await resolveBackendAddress({
      address: normalizedAddress,
      placeId,
      sessionToken,
    });
    if (backendMatch.latitude !== null && backendMatch.longitude !== null) {
      return backendMatch;
    }
  } catch (error) {
    lastError = error;
  }

  for (const candidate of buildAddressSearchCandidates(normalizedAddress)) {
    try {
      const matches = await geocodeCandidate(candidate, normalizedAddress);
      if (matches.length) {
        return matches[0];
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No matching address was found.");
}

export async function requestCurrentLocation() {
  if (!window.isSecureContext) {
    throw new Error("Geolocation requires HTTPS or localhost to request permission.");
  }

  if (!navigator.geolocation) {
    throw new Error("This browser does not support the Geolocation API.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Current location",
        });
      },
      (error) => {
        reject(new Error(`Unable to get location: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  });
}
