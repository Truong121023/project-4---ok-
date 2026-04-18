export function navigateToExternalUrl(url) {
  const normalizedUrl = String(url ?? "").trim();

  if (typeof window === "undefined" || !normalizedUrl) {
    return false;
  }

  try {
    window.location.assign(normalizedUrl);
    window.setTimeout(() => {
      if (window.location.href !== normalizedUrl) {
        window.location.href = normalizedUrl;
      }
    }, 80);
    return true;
  } catch {
    try {
      window.location.href = normalizedUrl;
      return true;
    } catch {
      return false;
    }
  }
}
