function resolveNewsKey(newsOrId) {
  if (newsOrId === undefined || newsOrId === null || newsOrId === "") {
    return "";
  }

  if (typeof newsOrId !== "object") {
    return String(newsOrId).trim();
  }

  const slug = String(newsOrId.slug ?? "").trim();
  return slug;
}

export function buildNewsPath(newsOrId) {
  const newsKey = resolveNewsKey(newsOrId);
  return newsKey ? `/news/${newsKey}` : "/news";
}
