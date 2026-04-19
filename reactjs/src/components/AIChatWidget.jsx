import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SmartImage from "./SmartImage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useSiteData } from "../context/SiteDataContext";
import { buildAdminOrderPath, buildAdminWorkspacePath } from "../lib/adminRoutes";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { buildEventPath } from "../lib/eventRouting";
import { getPrimaryImageUrl } from "../lib/images";
import { formatShortDateTimeVn, formatTimeVn } from "../lib/locale";
import { buildNewsPath } from "../lib/newsRouting";
import { ui } from "../ui";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function RobotIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4v4M9 4h6M9 12h.01M15 12h.01M9 15h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function formatTime(value) {
  return formatTimeVn(value, "Just now");
}

function formatThreadTime(value) {
  return formatShortDateTimeVn(value, "");
}

function createMessage(role, content, extras = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    references: [],
    actions: [],
    currentUserStatus: null,
    ...extras,
  };
}

function normalizeReferenceList(value) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

function normalizeActionList(value) {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") : [];
}

function normalizeCurrentUserStatus(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function buildAdminFocusTarget(reference) {
  const adminPath = String(reference?.adminApiPath ?? "").trim();
  if (!adminPath.startsWith("/api/admin/")) return null;

  const matchers = [
    { regex: /^\/api\/admin\/stores\/([^/]+)$/i, sectionKey: "stores" },
    { regex: /^\/api\/admin\/users\/([^/]+)$/i, sectionKey: "users" },
    { regex: /^\/api\/admin\/events\/([^/]+)$/i, sectionKey: "events" },
    { regex: /^\/api\/admin\/categories\/([^/]+)$/i, sectionKey: "categories" },
    { regex: /^\/api\/admin\/dishes\/([^/]+)$/i, sectionKey: "dishes" },
    { regex: /^\/api\/admin\/store-dishes\/([^/]+)$/i, sectionKey: "storeDishes" },
    { regex: /^\/api\/admin\/news\/([^/]+)$/i, sectionKey: "news" },
    { regex: /^\/api\/admin\/promotions\/([^/]+)$/i, sectionKey: "promotions" },
    { regex: /^\/api\/admin\/user-levels\/([^/]+)$/i, sectionKey: "userLevels" },
    { regex: /^\/api\/admin\/reviews\/([^/]+)$/i, sectionKey: "reviews" },
    { regex: /^\/api\/admin\/feedbacks\/([^/]+)$/i, sectionKey: "feedbacks" },
  ];

  for (const matcher of matchers) {
    const matched = adminPath.match(matcher.regex);
    if (matched) {
      return {
        href: buildAdminWorkspacePath({
          sectionKey: matcher.sectionKey,
          recordId: matched[1],
        }),
      };
    }
  }

  const orderMatch = adminPath.match(/^\/api\/admin\/orders\/([^/]+)$/i);
  return orderMatch ? { href: buildAdminOrderPath(orderMatch[1]) } : null;
}

function resolveReferenceNavigation(reference, auth) {
  const normalizedRole = String(auth.user?.role ?? "").trim().toUpperCase();
  const adminTarget = buildAdminFocusTarget(reference);
  if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;

  const publicApiPath = String(reference?.publicApiPath ?? "").trim();
  if (publicApiPath) {
    const storeMatch = publicApiPath.match(/^\/api\/public\/stores\/(.+)$/i);
    if (storeMatch) return { href: `/stores/${encodeURIComponent(reference?.slug || storeMatch[1])}` };
    const dishMatch = publicApiPath.match(/^\/api\/public\/dishes\/(.+)$/i);
    if (dishMatch) return { href: `/menu/${encodeURIComponent(reference?.id ?? dishMatch[1])}` };
    const eventMatch = publicApiPath.match(/^\/api\/public\/events\/(.+)$/i);
    if (eventMatch) return { href: buildEventPath(reference?.slug || eventMatch[1]) };
    const newsMatch = publicApiPath.match(/^\/api\/public\/news\/(.+)$/i);
    if (newsMatch) return { href: buildNewsPath(reference?.slug || newsMatch[1]) };
  }

  const userApiPath = String(reference?.userApiPath ?? "").trim();
  if (userApiPath === "/api/auth/me") {
    return ["STAFF", "SHIPPER"].includes(normalizedRole) ? { href: "/employee" } : { href: "/account" };
  }
  if (userApiPath === "/api/user/cart") return { href: "/cart" };
  const userOrderMatch = userApiPath.match(/^\/api\/user\/orders\/([^/]+)$/i);
  if (userOrderMatch) return { href: `/orders/${encodeURIComponent(userOrderMatch[1])}` };
  if (userApiPath === "/api/user/orders") return { href: "/orders" };
  return null;
}

function resolveActionNavigation(action, auth) {
  const actionType = String(action?.actionType ?? "").trim().toUpperCase();
  const apiPath = String(action?.apiPath ?? "").trim();
  const payload = action?.payload && typeof action.payload === "object" ? action.payload : null;
  const normalizedRole = String(auth.user?.role ?? "").trim().toUpperCase();
  const adminTarget = buildAdminFocusTarget({ adminApiPath: apiPath });

  if (actionType === "OPEN_CART") return { href: "/cart" };
  if (actionType === "OPEN_ORDERS") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return { href: buildAdminWorkspacePath({ sectionKey: "orders" }) };
    }
    if (normalizedRole === "USER") return { href: "/orders" };
    if (["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return { href: buildAdminWorkspacePath({ sectionKey: "orders" }) };
    }
    if (["STAFF", "SHIPPER"].includes(normalizedRole)) return { href: "/employee" };
    return null;
  }
  if (actionType === "OPEN_ORDER") {
    const userOrderMatch = apiPath.match(/^\/api\/user\/orders\/([^/]+)$/i);
    const adminOrderMatch = apiPath.match(/^\/api\/admin\/orders\/([^/]+)$/i);
    const employeeOrderMatch = apiPath.match(/^\/api\/employee\/orders\/([^/]+)$/i);
    const orderId = String(payload?.orderId ?? userOrderMatch?.[1] ?? adminOrderMatch?.[1] ?? employeeOrderMatch?.[1] ?? "").trim();
    if (!orderId) return null;
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;
    if (["ADMIN", "MANAGER"].includes(normalizedRole)) return { href: buildAdminOrderPath(orderId) };
    if (["STAFF", "SHIPPER"].includes(normalizedRole)) return { href: `/employee/orders/${encodeURIComponent(orderId)}` };
    if (normalizedRole === "USER") return { href: `/orders/${encodeURIComponent(orderId)}` };
    return null;
  }
  if (actionType === "OPEN_ACCOUNT") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;
    return ["STAFF", "SHIPPER"].includes(normalizedRole) ? { href: "/employee" } : { href: "/account" };
  }
  if (actionType === "OPEN_STORE") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;
    const storeMatch = apiPath.match(/^\/api\/public\/stores\/(.+)$/i);
    const storeKey = String(payload?.storeSlug ?? payload?.slug ?? storeMatch?.[1] ?? "").trim();
    return storeKey ? { href: `/stores/${encodeURIComponent(storeKey)}` } : null;
  }
  if (actionType === "OPEN_DISH") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;
    const dishMatch = apiPath.match(/^\/api\/public\/dishes\/(.+)$/i);
    const dishId = String(payload?.dishId ?? payload?.id ?? dishMatch?.[1] ?? "").trim();
    return dishId ? { href: `/menu/${encodeURIComponent(dishId)}` } : null;
  }
  if (actionType === "OPEN_EVENT") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;
    const eventMatch = apiPath.match(/^\/api\/public\/events\/(.+)$/i);
    const eventKey = String(payload?.slug ?? payload?.eventKey ?? eventMatch?.[1] ?? "").trim();
    return eventKey ? { href: buildEventPath(eventKey) } : null;
  }
  if (actionType === "OPEN_NEWS") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return adminTarget;
    const newsMatch = apiPath.match(/^\/api\/public\/news\/(.+)$/i);
    const newsKey = String(payload?.slug ?? newsMatch?.[1] ?? "").trim();
    return newsKey ? { href: buildNewsPath(newsKey) } : null;
  }
  if (actionType === "OPEN_PROMOTION") {
    return adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole) ? adminTarget : null;
  }
  return null;
}

function getActionTone(actionType) {
  return ["ADD_TO_CART", "OPEN_CART"].includes(actionType) ? ui.primaryButton : ui.secondaryButton;
}

function getCompactActionClass(actionType) {
  if (["ADD_TO_CART", "OPEN_CART"].includes(String(actionType ?? "").trim().toUpperCase())) {
    return "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-3.5 py-2 text-xs font-semibold text-foam shadow-[0_10px_20px_rgba(89,108,61,0.2)] transition hover:-translate-y-0.5";
  }

  return "inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/80 px-3.5 py-2 text-xs font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white";
}

function isOpenActionType(actionType) {
  return String(actionType ?? "").trim().toUpperCase().startsWith("OPEN_");
}

function groupActionsByReference(actions) {
  const deduped = [];
  const seenKeys = new Set();

  for (const action of Array.isArray(actions) ? actions : []) {
    const actionKey = String(
      action?.actionKey ?? `${action?.actionType ?? ""}:${action?.referenceKey ?? ""}:${action?.label ?? ""}`,
    ).trim();

    if (!actionKey || seenKeys.has(actionKey)) {
      continue;
    }

    seenKeys.add(actionKey);
    deduped.push(action);
  }

  const actionsByReferenceKey = new Map();
  const generalActions = [];

  for (const action of deduped) {
    const referenceKey = String(action?.referenceKey ?? "").trim();

    if (!referenceKey) {
      generalActions.push(action);
      continue;
    }

    const current = actionsByReferenceKey.get(referenceKey) ?? [];
    current.push(action);
    actionsByReferenceKey.set(referenceKey, current);
  }

  return { actionsByReferenceKey, generalActions };
}

function getQuickPrompts(role) {
  switch (String(role ?? "").trim().toUpperCase()) {
    case "ADMIN":
      return [
        "Show me the latest order issues that need admin attention.",
        "Which store is performing best right now?",
        "Open the most relevant promotion or store record for me.",
      ];
    case "MANAGER":
      return [
        "What needs my attention in my store today?",
        "Show recent orders and customer issues for my branch.",
        "Recommend which store records I should update first.",
      ];
    case "STAFF":
      return [
        "Show me the orders I should focus on next.",
        "Which drink is mentioned most often today?",
        "Help me find the right order screen quickly.",
      ];
    case "SHIPPER":
      return [
        "Show delivery orders that likely need my attention.",
        "Open the latest order ready for delivery.",
        "Help me check customer delivery details quickly.",
      ];
    default:
      return [
        "Which store nearby has a good matcha latte right now?",
        "Recommend a drink and add it to my cart.",
        "Help me find my latest order or account status.",
      ];
  }
}

function getReferenceBadge(reference) {
  const entityType = String(reference?.entityType ?? "").trim().toUpperCase();
  switch (entityType) {
    case "STORE":
      return "Store";
    case "DISH":
      return "Dish";
    case "EVENT":
      return "Event";
    case "NEWS":
      return "News";
    case "PROMOTION":
      return "Promotion";
    case "USER":
      return "Account";
    case "CART":
      return "Cart";
    case "ORDER":
      return "Order";
    default:
      return entityType || "Reference";
  }
}

function looksLikeHtmlFragment(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value ?? ""));
}

function AIMessageContent({ content }) {
  const normalizedContent = String(content ?? "").trim();

  if (!looksLikeHtmlFragment(normalizedContent)) {
    return <p className="mt-2 whitespace-pre-wrap font-medium">{normalizedContent}</p>;
  }

  return (
    <div
      className="mt-2 space-y-3 text-[0.95rem] leading-7 text-stone-700 [&_section]:space-y-3 [&_h2]:text-[0.72rem] [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-[0.16em] [&_h2]:text-matcha-700 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-tea-900 [&_p]:m-0 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_small]:text-xs [&_small]:font-medium [&_small]:uppercase [&_small]:tracking-[0.12em] [&_small]:text-stone-500 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5"
      dangerouslySetInnerHTML={{ __html: normalizedContent }}
    />
  );
}

function HistoryIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4M12 8v4l2.8 1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function normalizeThreadSummaryList(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  return items
    .map((entry) => ({
      threadId: String(entry?.threadId ?? entry?.id ?? "").trim(),
      title: String(entry?.title ?? "").trim(),
      messageCount: Number(entry?.messageCount ?? 0) || 0,
      lastMessageRole: String(entry?.lastMessageRole ?? "").trim(),
      lastMessagePreview: String(entry?.lastMessagePreview ?? "").trim(),
      lastMessageAt: String(entry?.lastMessageAt ?? "").trim(),
      updatedAt: String(entry?.updatedAt ?? "").trim(),
    }))
    .filter((entry) => entry.threadId);
}

function normalizeStoredMessage(entry) {
  return {
    id: `thread-message-${String(entry?.id ?? entry?.createdAt ?? Math.random())}`,
    role: String(entry?.role ?? "assistant").trim().toLowerCase() === "user" ? "user" : "assistant",
    content: String(entry?.content ?? "").trim(),
    createdAt: String(entry?.createdAt ?? new Date().toISOString()),
    references: normalizeReferenceList(entry?.references),
    actions: normalizeActionList(entry?.actions),
    currentUserStatus: null,
  };
}

function normalizeThreadDetail(payload) {
  return {
    threadId: String(payload?.threadId ?? payload?.id ?? "").trim(),
    title: String(payload?.title ?? "").trim(),
    messages: Array.isArray(payload?.messages) ? payload.messages.map((entry) => normalizeStoredMessage(entry)) : [],
  };
}

function upsertThreadSummary(threadList, nextSummary) {
  const normalizedSummary = {
    threadId: String(nextSummary?.threadId ?? "").trim(),
    title: String(nextSummary?.title ?? "").trim(),
    messageCount: Number(nextSummary?.messageCount ?? 0) || 0,
    lastMessageRole: String(nextSummary?.lastMessageRole ?? "").trim(),
    lastMessagePreview: String(nextSummary?.lastMessagePreview ?? "").trim(),
    lastMessageAt: String(nextSummary?.lastMessageAt ?? "").trim(),
    updatedAt: String(nextSummary?.updatedAt ?? nextSummary?.lastMessageAt ?? "").trim(),
  };
  if (!normalizedSummary.threadId) return threadList;

  const withoutCurrent = threadList.filter((entry) => String(entry.threadId) !== normalizedSummary.threadId);
  return [normalizedSummary, ...withoutCurrent].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.lastMessageAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.lastMessageAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function ReferenceCard({ reference, auth, actions = [], onAction }) {
  const navigationTarget = resolveReferenceNavigation(reference, auth);
  const previewImage = getPrimaryImageUrl(reference?.imagePath ?? "");
  const hasOpenAction = actions.some((action) => isOpenActionType(action?.actionType));
  const shouldShowFallbackOpen = navigationTarget && !hasOpenAction;

  return (
    <article className="rounded-[1.15rem] border border-matcha-900/10 bg-white/82 p-3 shadow-[0_10px_24px_rgba(79,70,45,0.06)] sm:p-4">
      <div className="flex gap-3">
        {previewImage ? (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] border border-matcha-900/10 bg-stone-100">
            <SmartImage
              className="h-full w-full object-cover"
              src={previewImage}
              alt={reference?.title ?? "Reference"}
              loading="lazy"
              fallbackClassName="grid h-full w-full place-items-center bg-stone-100 text-[10px] text-stone-500"
            />
          </div>
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1rem] border border-matcha-900/10 bg-matcha-500/10 text-[10px] font-bold uppercase tracking-[0.16em] text-matcha-700">
            {getReferenceBadge(reference)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={ui.pill}>{getReferenceBadge(reference)}</span>
            {reference?.tableName ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                {reference.tableName}
              </span>
            ) : null}
          </div>

          <h4 className="mt-2 text-sm font-semibold text-tea-900">{reference?.title || "Reference"}</h4>
          {reference?.subtitle ? (
            <p className="mt-1 text-xs leading-6 text-stone-600">{reference.subtitle}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action?.actionKey || `${action?.actionType ?? ""}-${action?.label ?? ""}`}
                className={getCompactActionClass(action?.actionType)}
                type="button"
                onClick={() => {
                  void onAction(action);
                }}
              >
                {action?.label || action?.actionType || "Action"}
              </button>
            ))}

            {shouldShowFallbackOpen ? (
              <Link className={getCompactActionClass("OPEN_REFERENCE")} to={navigationTarget.href}>
                Open
              </Link>
            ) : !actions.length ? (
              <span className="rounded-full border border-matcha-900/10 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-500">
                No direct screen
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function ActionButtons({ actions, onAction, title = "Quick actions" }) {
  if (!actions.length) return null;

  return (
    <div className="mt-4 rounded-[1rem] border border-matcha-900/10 bg-white/70 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => {
          const actionType = String(action?.actionType ?? "").trim().toUpperCase();
          return (
            <button
              key={action?.actionKey || `${actionType}-${action?.label ?? ""}`}
              className={getCompactActionClass(actionType)}
              type="button"
              onClick={() => {
                void onAction(action);
              }}
            >
              {action?.label || actionType}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AIChatWidget() {
  const { t } = useTranslation("account");
  const auth = useAuth();
  const toast = useToast();
  const siteData = useSiteData();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [activeThreadTitle, setActiveThreadTitle] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [error, setError] = useState("");
  const [threadsError, setThreadsError] = useState("");
  const [threadError, setThreadError] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setDraftMessage("");
      setMessages([]);
      setThreads([]);
      setActiveThreadId("");
      setActiveThreadTitle("");
      setThreadSearch("");
      setThreadsLoading(false);
      setThreadLoading(false);
      setSending(false);
      setHistoryPanelOpen(false);
      setError("");
      setThreadsError("");
      setThreadError("");
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, threadLoading, sending]);

  useEffect(() => {
    if (!historyPanelOpen || typeof document === "undefined") {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setHistoryPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [historyPanelOpen]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    let cancelled = false;

    const loadInitialThreads = async () => {
      setThreadsLoading(true);
      setThreadsError("");

      try {
        const payload = await apiRequest("/api/ai/chat/threads?page=0&size=20", {
          token: auth.token,
          tokenType: auth.tokenType,
        });

        if (cancelled) return;

        const nextThreads = normalizeThreadSummaryList(payload);
        setThreads(nextThreads);

        if (!nextThreads.length) {
          setActiveThreadId("");
          setActiveThreadTitle("");
          setMessages([]);
          setThreadError("");
          return;
        }

        const firstThread = nextThreads[0];
        setThreadLoading(true);
        setThreadError("");

        try {
          const detailPayload = await apiRequest(`/api/ai/chat/threads/${encodeURIComponent(firstThread.threadId)}`, {
            token: auth.token,
            tokenType: auth.tokenType,
          });

          if (cancelled) return;

          const nextDetail = normalizeThreadDetail(detailPayload);
          setActiveThreadId(nextDetail.threadId || firstThread.threadId);
          setActiveThreadTitle(nextDetail.title || firstThread.title);
          setMessages(nextDetail.messages);
        } catch (detailError) {
          if (cancelled) return;
          setThreadError(getApiErrorMessage(detailError, "Unable to load this AI conversation."));
          setActiveThreadId(firstThread.threadId);
          setActiveThreadTitle(firstThread.title);
          setMessages([]);
        } finally {
          if (!cancelled) {
            setThreadLoading(false);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setThreadsError(getApiErrorMessage(requestError, "Unable to load AI chat history."));
        }
      } finally {
        if (!cancelled) {
          setThreadsLoading(false);
        }
      }
    };

    void loadInitialThreads();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.token, auth.tokenType, auth.user?.id]);

  const latestStatus = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.currentUserStatus) {
        return messages[index].currentUserStatus;
      }
    }

    return auth.user ?? null;
  }, [auth.user, messages]);

  const quickPrompts = useMemo(
    () => getQuickPrompts(latestStatus?.role || auth.user?.role),
    [auth.user?.role, latestStatus?.role],
  );

  const filteredThreads = useMemo(() => {
    const search = String(threadSearch ?? "").trim().toLowerCase();
    if (!search) {
      return threads;
    }

    return threads.filter((thread) => {
      const haystack = [thread.title, thread.lastMessagePreview, thread.lastMessageRole]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [threadSearch, threads]);

  if (!auth.isAuthenticated) {
    return null;
  }

  const loadThreadsOnly = async () => {
    try {
      const payload = await apiRequest("/api/ai/chat/threads?page=0&size=20", {
        token: auth.token,
        tokenType: auth.tokenType,
      });
      setThreads(normalizeThreadSummaryList(payload));
    } catch {
      // Keep the current sidebar if a silent refresh fails.
    }
  };

  const handleOpenThread = async (thread) => {
    const threadId = String(thread?.threadId ?? "").trim();
    if (!threadId) {
      return;
    }

    setActiveThreadId(threadId);
    setActiveThreadTitle(String(thread?.title ?? "").trim());
    setThreadLoading(true);
    setThreadError("");
    setHistoryPanelOpen(false);

    try {
      const payload = await apiRequest(`/api/ai/chat/threads/${encodeURIComponent(threadId)}`, {
        token: auth.token,
        tokenType: auth.tokenType,
      });

      const nextDetail = normalizeThreadDetail(payload);
      setActiveThreadId(nextDetail.threadId || threadId);
      setActiveThreadTitle(nextDetail.title || thread.title || "");
      setMessages(nextDetail.messages);
    } catch (requestError) {
      setThreadError(getApiErrorMessage(requestError, "Unable to load this AI conversation."));
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const handleStartNewThread = () => {
    setActiveThreadId("");
    setActiveThreadTitle("");
    setMessages([]);
    setThreadError("");
    setError("");
    setHistoryPanelOpen(false);
  };

  const handleAction = async (action) => {
    const actionType = String(action?.actionType ?? "").trim().toUpperCase();
    const payload = action?.payload && typeof action.payload === "object" ? action.payload : null;

    if (actionType === "ADD_TO_CART") {
      const dishId = String(payload?.dishId ?? "").trim();
      const storeId = String(payload?.storeId ?? "").trim();
      const quantity = Number(payload?.quantity ?? 1) || 1;

      if (!dishId || !storeId) {
        toast.error("AI action is missing storeId or dishId.", { title: "Chatbox AI" });
        return;
      }

      const result = await siteData.addToCart({ itemId: dishId, storeId, quantity });

      if (result?.ok) {
        toast.success(result.message || "Item added to cart.", { title: "Cart" });
      } else {
        toast.error(result?.message || "Unable to add this item to the cart.", { title: "Cart" });
      }

      return;
    }

    const navigationTarget = resolveActionNavigation(action, auth);

    if (!navigationTarget?.href) {
      toast.info("This AI action does not have a direct screen in the current app yet.", {
        title: "Chatbox AI",
      });
      return;
    }

    navigate(navigationTarget.href);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const message = String(draftMessage ?? "").trim();
    if (!message) {
      return;
    }

    const userMessage = createMessage("user", message);
    const requestHistory = messages
      .filter((entry) => entry?.role === "user" || entry?.role === "assistant")
      .slice(-8)
      .map((entry) => ({ role: entry.role, content: entry.content }));

    setMessages((current) => [...current, userMessage]);
    setDraftMessage("");
    setSending(true);
    setError("");

    try {
      const response = await apiRequest("/api/ai/chat/query", {
        method: "POST",
        token: auth.token,
        tokenType: auth.tokenType,
        body: {
          message,
          history: requestHistory,
          ...(activeThreadId ? { threadId: Number(activeThreadId) || activeThreadId } : {}),
        },
      });

      const responseThreadId = String(response?.threadId ?? activeThreadId ?? "").trim();
      const responseThreadTitle = String(response?.threadTitle ?? "").trim() || activeThreadTitle || message;
      const assistantMessage = createMessage(
        "assistant",
        String(response?.answer ?? "").trim() || "I could not generate an answer yet.",
        {
          references: normalizeReferenceList(response?.references),
          actions: normalizeActionList(response?.actions),
          currentUserStatus: normalizeCurrentUserStatus(response?.currentUserStatus),
        },
      );

      setActiveThreadId(responseThreadId);
      setActiveThreadTitle(responseThreadTitle);
      setMessages((current) => [...current, assistantMessage]);
      setThreads((current) =>
        upsertThreadSummary(current, {
          threadId: responseThreadId,
          title: responseThreadTitle,
          messageCount: (current.find((entry) => entry.threadId === responseThreadId)?.messageCount || 0) + 2,
          lastMessageRole: "assistant",
          lastMessagePreview: assistantMessage.content,
          lastMessageAt: assistantMessage.createdAt,
          updatedAt: assistantMessage.createdAt,
        }),
      );
      void loadThreadsOnly();
    } catch (requestError) {
      const messageText = getApiErrorMessage(requestError, "Unable to reach AI assistant.");
      setError(messageText);
      toast.error(messageText, {
        title: "Chatbox AI",
        dedupeKey: `ai-chat-error:${messageText}`,
      });
    } finally {
      setSending(false);
    }
  };

  const isEmpty = !messages.length && !threadLoading && !(threadsLoading && !messages.length);
  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sending && draftMessage.trim()) {
        void handleSubmit(event);
      }
    }
  };

  return (
    <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-matcha-900/10 bg-white shadow-[0_24px_60px_rgba(79,70,45,0.12)]">
      {/* Compact header */}
      <header className="flex items-center justify-between gap-3 border-b border-matcha-900/10 bg-gradient-to-br from-matcha-500/8 via-white to-cream-50 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_8px_18px_rgba(89,108,61,0.28)]">
            <RobotIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-tea-900 sm:text-base">
              {activeThreadTitle || "Kamatcha AI"}
            </h2>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-matcha-700">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
              Online
            </p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-matcha-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-cream-50 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm"
          type="button"
          onClick={() => setHistoryPanelOpen(true)}
        >
          <HistoryIcon className="h-4 w-4 text-matcha-700" />
          <span className="hidden sm:inline">{t("chat.widgetHistory")}</span>
          {threads.length ? (
            <span className="rounded-full bg-matcha-500/15 px-1.5 py-0.5 text-[10px] font-bold text-matcha-700">
              {threads.length}
            </span>
          ) : null}
        </button>
      </header>

      {(error || threadError) ? (
        <div className="border-b border-red-200 bg-red-50/90 px-4 py-2.5 text-xs text-red-700 sm:px-5">
          {error || threadError}
        </div>
      ) : null}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex min-h-[20rem] flex-1 flex-col gap-3 overflow-y-auto bg-[linear-gradient(180deg,#f8f5ef_0%,#fdfbf7_100%)] px-4 py-4 sm:px-5 sm:py-5"
      >
        {threadLoading || (threadsLoading && !messages.length) ? (
          <div className="self-start rounded-[1.1rem] border border-matcha-900/10 bg-white px-4 py-2.5 text-sm text-stone-600 shadow-sm">
            Loading this AI conversation...
          </div>
        ) : isEmpty ? (
          <div className="m-auto grid w-full max-w-md place-items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-matcha-500/10 text-matcha-700">
              <RobotIcon className="h-7 w-7" />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-tea-900">
              How can I help you today?
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Pick a suggestion or type a message below to start chatting.
            </p>
            <div className="mt-5 grid w-full gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-matcha-900/10 bg-white px-4 py-2.5 text-left text-sm leading-6 text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:border-matcha-500/40 hover:bg-matcha-500/5"
                  type="button"
                  onClick={() => setDraftMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            const groupedActions = groupActionsByReference(message.actions);

            return (
              <article
                key={message.id}
                className={cn(
                  "flex w-full gap-2 sm:gap-2.5",
                  isUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    isUser
                      ? "bg-matcha-700 text-foam"
                      : "bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam",
                  )}
                >
                  {isUser ? "You" : <RobotIcon className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-6 break-words sm:text-[0.9375rem]",
                    isUser
                      ? "rounded-tr-sm bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_8px_20px_rgba(89,108,61,0.18)]"
                      : "rounded-tl-sm border border-matcha-900/10 bg-white text-stone-700 shadow-sm",
                  )}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                  ) : (
                    <AIMessageContent content={message.content} />
                  )}
                  <div
                    className={cn(
                      "mt-1.5 text-[10px] uppercase tracking-[0.14em]",
                      isUser ? "text-foam/70" : "text-stone-400",
                    )}
                  >
                    {formatTime(message.createdAt)}
                  </div>

                  {!isUser && message.references?.length ? (
                    <div className="mt-3 rounded-xl border border-matcha-900/10 bg-cream-50/70 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">
                        Related picks
                      </p>
                      <div className="mt-2 grid gap-2 xl:grid-cols-2">
                        {message.references.map((reference) => (
                          <ReferenceCard
                            key={reference.referenceKey || `${reference.entityType}-${reference.id}`}
                            auth={auth}
                            reference={reference}
                            actions={
                              groupedActions.actionsByReferenceKey.get(
                                String(reference.referenceKey ?? "").trim(),
                              ) ?? []
                            }
                            onAction={handleAction}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!isUser && groupedActions.generalActions.length ? (
                    <ActionButtons
                      actions={groupedActions.generalActions}
                      onAction={handleAction}
                      title="Quick actions"
                    />
                  ) : null}
                </div>
              </article>
            );
          })
        )}

        {sending ? (
          <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-sm border border-matcha-900/10 bg-white px-4 py-2.5 text-sm text-stone-600 shadow-sm">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-matcha-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-matcha-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-matcha-500" />
            </span>
            <span className="text-xs">{t("chat.widgetAiThinking")}</span>
          </div>
        ) : null}
      </div>

      {/* Inline composer */}
      <form
        className="border-t border-matcha-900/10 bg-white px-3 py-3 sm:px-4 sm:py-3.5"
        onSubmit={handleSubmit}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-matcha-900/15 bg-cream-50 px-3 py-2 transition focus-within:border-matcha-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_oklch(46%_0.11_140_/_0.12)]">
          <textarea
            className="max-h-40 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent py-1.5 text-sm leading-6 text-ink-900 outline-none placeholder:text-ink-400"
            placeholder={t("chat.widgetComposerPlaceholder")}
            aria-label={t("chat.widgetComposerAria")}
            rows={1}
            value={draftMessage}
            disabled={sending}
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_6px_14px_rgba(89,108,61,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(89,108,61,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={sending || !draftMessage.trim()}
            type="submit"
            aria-label={sending ? t("chat.widgetSending") : t("chat.widgetSend")}
          >
            {sending ? (
              <svg aria-hidden="true" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
              </svg>
            ) : (
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="M5 12l14-7-5 14-2.5-5L5 12z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 px-2 text-[11px] text-stone-400">
          {t("chat.widgetKeyboardHint", {
            enter: "Enter",
            shiftEnter: "Shift+Enter",
          })}
        </p>
      </form>

      <div
        className="pointer-events-none fixed inset-y-0 right-0 z-50 flex justify-end"
        aria-hidden={!historyPanelOpen}
      >
        <aside
          className={cn(
            "pointer-events-auto relative flex h-[100dvh] w-[min(25.5rem,calc(100vw-0.75rem))] max-w-full flex-col overflow-hidden rounded-l-[1.9rem] border-l border-matcha-900/10 bg-[#f8f5ef] shadow-[-18px_0_50px_rgba(39,64,45,0.18)] transition-transform duration-300",
            historyPanelOpen ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={t("chat.widgetHistoryHeading")}
        >
          <div className="shrink-0 border-b border-matcha-900/10 px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
                  {t("chat.widgetHistoryHeading")}
                </span>
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {t("chat.widgetHistorySubcopy")}
                </p>
              </div>
              <button
                className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                type="button"
                onClick={() => setHistoryPanelOpen(false)}
              >
                {t("chat.widgetHistoryClose")}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <div className="grid gap-4">
              <button className={ui.primaryButton} type="button" onClick={handleStartNewThread}>
                {t("chat.widgetNewChat")}
              </button>

              <input
                className={ui.input}
                placeholder={t("chat.widgetHistorySearchPlaceholder")}
                value={threadSearch}
                onChange={(event) => setThreadSearch(event.target.value)}
              />

              {threadsError ? (
                <div className="rounded-[1.1rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  {threadsError}
                </div>
              ) : null}

              <div className="grid gap-2">
                {threadsLoading ? (
                  <div className="rounded-[1.1rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-4 text-sm text-stone-600">
                    {t("chat.widgetHistoryLoading")}
                  </div>
                ) : filteredThreads.length ? (
                  filteredThreads.map((thread) => {
                    const isActive = thread.threadId === activeThreadId;
                    return (
                      <button
                        key={thread.threadId}
                        className={cn(
                          "rounded-[1.2rem] border px-4 py-3 text-left transition",
                          isActive
                            ? "border-matcha-500/25 bg-matcha-500/12"
                            : "border-matcha-900/10 bg-white/78 hover:-translate-y-0.5 hover:bg-white",
                        )}
                        type="button"
                        onClick={() => {
                          void handleOpenThread(thread);
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <strong className="line-clamp-2 text-sm text-tea-900">
                            {thread.title || "Untitled conversation"}
                          </strong>
                          {thread.messageCount ? <span className={ui.pill}>{thread.messageCount}</span> : null}
                        </div>
                        {thread.lastMessagePreview ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-6 text-stone-600">
                            {thread.lastMessagePreview}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-stone-400">
                          {thread.lastMessageRole ? <span>{thread.lastMessageRole}</span> : null}
                          {thread.lastMessageAt ? <span>{formatThreadTime(thread.lastMessageAt)}</span> : null}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[1.1rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-4 text-sm text-stone-600">
                    No saved AI conversations yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
