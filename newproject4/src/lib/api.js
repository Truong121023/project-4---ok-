export const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/$/,
  "",
);

export function resolveApiUrl(path) {
  const normalizedPath = String(path ?? "").trim();

  if (!normalizedPath) {
    return "";
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

const AUTH_STORAGE_KEY = "tea-matcha.auth";
const inflightGetRequests = new Map();
let authFailureHandler = null;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function registerAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === "function" ? handler : null;

  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
}

async function notifyAuthFailure(response, payload, requestContext = {}) {
  if (response.status !== 401 || typeof authFailureHandler !== "function") {
    return;
  }

  if (!String(requestContext?.token ?? "").trim()) {
    return;
  }

  try {
    await authFailureHandler({
      status: response.status,
      message: String(payload?.message ?? "").trim(),
      path: String(requestContext?.path ?? "").trim(),
      method: String(requestContext?.method ?? response?.method ?? "GET").trim().toUpperCase(),
      token: String(requestContext?.token ?? "").trim(),
      tokenType: String(requestContext?.tokenType ?? "Bearer").trim() || "Bearer",
      payload,
    });
  } catch {
    // Ignore auth failure callback errors so the original request error still propagates.
  }
}

export async function parseApiResponsePayload(response, requestContext = {}) {
  const rawText = await response.text();
  let payload = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { message: rawText };
    }
  }

  if (!response.ok) {
    await notifyAuthFailure(response, payload, requestContext);

    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      payload,
    );
  }

  return payload;
}

export async function apiRequest(
  path,
  { method = "GET", body, token, tokenType = "Bearer", headers = {} } = {},
) {
  const normalizedMethod = method.toUpperCase();
  const requestKey =
    normalizedMethod === "GET" && body === undefined
      ? `${normalizedMethod}:${path}:${tokenType}:${token ?? ""}`
      : null;

  if (requestKey && inflightGetRequests.has(requestKey)) {
    return inflightGetRequests.get(requestKey);
  }

  const requestPromise = (async () => {
    const requestHeaders = new Headers(headers);

    if (body !== undefined && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (token) {
      requestHeaders.set("Authorization", `${tokenType} ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: normalizedMethod,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return parseApiResponsePayload(response, {
      path,
      method: normalizedMethod,
      token,
      tokenType,
    });
  })();

  if (requestKey) {
    inflightGetRequests.set(requestKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (requestKey) {
      inflightGetRequests.delete(requestKey);
    }
  }
}

export async function uploadAdminImages(
  files,
  folder = "general",
  { token, tokenType = "Bearer" } = {},
) {
  const normalizedFiles = Array.isArray(files) ? files : Array.from(files ?? []);

  if (normalizedFiles.length === 0) {
    throw new Error("Please choose at least one image file.");
  }

  const formData = new FormData();
  formData.append("folder", folder);
  normalizedFiles.forEach((file) => {
    formData.append("files", file);
  });

  const requestHeaders = new Headers();

  if (token) {
    requestHeaders.set("Authorization", `${tokenType} ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/uploads/images`, {
    method: "POST",
    headers: requestHeaders,
    body: formData,
  });

  return parseApiResponsePayload(response, {
    path: "/api/admin/uploads/images",
    method: "POST",
    token,
    tokenType,
  });
}

function formatValidationErrors(validationErrors) {
  if (!validationErrors) {
    return "";
  }

  if (Array.isArray(validationErrors)) {
    return validationErrors
      .map((entry) => {
        if (typeof entry === "string") {
          return entry.trim();
        }

        if (entry && typeof entry === "object") {
          const field = entry.field || entry.name || entry.path || "";
          const message = entry.message || entry.defaultMessage || entry.error || "";
          return [field, message].filter(Boolean).join(": ").trim();
        }

        return "";
      })
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof validationErrors === "object") {
    return Object.entries(validationErrors)
      .flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${field}: ${item}`);
        }

        if (value && typeof value === "object") {
          const message = value.message || value.defaultMessage || value.error;
          return message ? `${field}: ${message}` : [];
        }

        return value ? [`${field}: ${value}`] : [];
      })
      .filter(Boolean)
      .join(" | ");
  }

  return String(validationErrors).trim();
}

export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  if (error instanceof ApiError) {
    const validationMessage = formatValidationErrors(error.data?.validationErrors);

    if (validationMessage) {
      if (error.message && error.message !== "Validation failed") {
        return `${error.message}: ${validationMessage}`;
      }

      return validationMessage;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
