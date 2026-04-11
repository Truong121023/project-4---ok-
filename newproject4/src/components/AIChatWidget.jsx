import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SmartImage from "./SmartImage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useSiteData } from "../context/SiteDataContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { buildEventPath } from "../lib/eventRouting";
import { getPrimaryImageUrl } from "../lib/images";
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
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatThreadTime(value) {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(date);
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
        href: `/admin?section=${encodeURIComponent(matcher.sectionKey)}&record=${encodeURIComponent(matched[1])}`,
      };
    }
  }

  const orderMatch = adminPath.match(/^\/api\/admin\/orders\/([^/]+)$/i);
  return orderMatch ? { href: `/admin/orders/${encodeURIComponent(orderMatch[1])}` } : null;
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
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) return { href: "/admin?section=orders" };
    if (normalizedRole === "USER") return { href: "/orders" };
    if (["ADMIN", "MANAGER"].includes(normalizedRole)) return { href: "/admin?section=orders" };
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
    if (["ADMIN", "MANAGER"].includes(normalizedRole)) return { href: `/admin/orders/${encodeURIComponent(orderId)}` };
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
  };

  const handleAction = async (action) => {
    const actionType = String(action?.actionType ?? "").trim().toUpperCase();
    const payload = action?.payload && typeof action.payload === "object" ? action.payload : null;

    if (actionType === "ADD_TO_CART") {
      const dishId = String(payload?.dishId ?? "").trim();
      const storeId = String(payload?.storeId ?? "").trim();
      const quantity = Number(payload?.quantity ?? 1) || 1;

      if (!dishId || !storeId) {
        toast.error("AI action is missing storeId or dishId.", { title: "AI chat" });
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
        title: "AI chat",
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
        title: "AI chat",
        dedupeKey: `ai-chat-error:${messageText}`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={ui.panel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <span className={ui.eyebrow}>AI chatbox</span>
          <h1 className="max-w-[18ch] text-3xl font-bold tracking-tight text-tea-900 sm:text-4xl">
            Ask AI about stores, dishes, orders, promotions, and your account
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
            This screen now follows the backend thread model directly. Conversation history comes
            from the server, and each new message can continue an existing thread or start a new one.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 rounded-full border border-matcha-900/10 bg-white/78 px-4 py-3 text-sm font-semibold text-tea-900">
          <RobotIcon className="h-5 w-5 text-matcha-700" />
          <span>{latestStatus?.role || auth.user?.role || "Authenticated user"}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start">
          <div className="rounded-[1.45rem] border border-matcha-900/10 bg-white/72 p-4 text-sm text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={ui.pill}>{auth.user?.role || "Account"}</span>
              {latestStatus?.workingStoreName ? <span className={ui.pill}>{latestStatus.workingStoreName}</span> : null}
            </div>
            <strong className="mt-3 block text-base text-tea-900">
              {latestStatus?.fullName || auth.user?.fullName || "Signed-in user"}
            </strong>
            <div className="mt-2 grid gap-1 text-sm leading-6 text-stone-600">
              <span>{latestStatus?.email || auth.user?.email || "No email yet"}</span>
              <span>
                Verified: {latestStatus?.verified === false ? "No" : "Yes"}
                {" / "}Enabled: {latestStatus?.enabled === false ? "No" : "Yes"}
              </span>
              {"profileCompleted" in (latestStatus ?? {}) ? (
                <span>Profile completed: {latestStatus?.profileCompleted === false ? "No" : "Yes"}</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-matcha-900/10 bg-white/72 p-4 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Conversations</p>
              <button className={ui.secondaryButton} type="button" onClick={handleStartNewThread}>
                New chat
              </button>
            </div>

            <input
              className={`${ui.input} mt-4`}
              placeholder="Search AI chat history..."
              value={threadSearch}
              onChange={(event) => setThreadSearch(event.target.value)}
            />

            {threadsError ? (
              <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {threadsError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              {threadsLoading ? (
                <div className="rounded-[1.1rem] border border-dashed border-matcha-900/15 bg-white/60 px-4 py-4 text-sm text-stone-600">
                  Loading AI chat history...
                </div>
              ) : filteredThreads.length ? (
                filteredThreads.map((thread) => {
                  const isActive = thread.threadId === activeThreadId;
                  return (
                    <button
                      key={thread.threadId}
                      className={cn(
                        "rounded-[1.2rem] border px-4 py-3 text-left transition",
                        isActive ? "border-matcha-500/25 bg-matcha-500/12" : "border-matcha-900/10 bg-white/78 hover:-translate-y-0.5 hover:bg-white",
                      )}
                      type="button"
                      onClick={() => {
                        void handleOpenThread(thread);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="line-clamp-2 text-sm text-tea-900">{thread.title || "Untitled conversation"}</strong>
                        {thread.messageCount ? <span className={ui.pill}>{thread.messageCount}</span> : null}
                      </div>
                      {thread.lastMessagePreview ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-6 text-stone-600">{thread.lastMessagePreview}</p>
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

          <div className="rounded-[1.45rem] border border-matcha-900/10 bg-white/72 p-4 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Quick prompts</p>
            <div className="mt-3 grid gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-[1.1rem] border border-matcha-900/10 bg-white/78 px-4 py-3 text-left text-sm leading-6 text-stone-700 transition hover:-translate-y-0.5 hover:bg-white"
                  type="button"
                  onClick={() => setDraftMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid gap-4 rounded-[1.6rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 shadow-[0_18px_46px_rgba(79,70,45,0.12)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                AI assistant
              </span>
              <h2 className="mt-2 text-xl font-semibold text-tea-900">
                {activeThreadTitle || "New conversation"}
              </h2>
              {activeThreadId ? (
                <p className="mt-2 text-sm leading-6 text-stone-500">Thread #{activeThreadId}</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Send a message to let the backend create a new chat thread.
                </p>
              )}
            </div>
          </div>

          {error ? (
            <div className="rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {threadError ? (
            <div className="rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
              {threadError}
            </div>
          ) : null}

          <div
            ref={scrollRef}
            className="grid min-h-[28rem] max-h-[42rem] gap-3 overflow-y-auto rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4"
          >
            {threadLoading ? (
              <div className="justify-self-start rounded-[1.2rem] border border-matcha-900/10 bg-white/72 px-4 py-3 text-sm text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
                Loading this AI conversation...
              </div>
            ) : messages.length ? (
              messages.map((message) => {
                const isUser = message.role === "user";
                const groupedActions = groupActionsByReference(message.actions);

                return (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[95%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 break-words sm:max-w-[88%]",
                      isUser
                        ? "justify-self-end border border-matcha-700/25 bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_16px_30px_rgba(89,108,61,0.26)]"
                        : "justify-self-start border border-matcha-900/10 bg-[#f8f5ef] text-stone-700 shadow-[0_10px_24px_rgba(79,70,45,0.06)]",
                    )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]",
                          isUser ? "text-foam/80" : "text-stone-500",
                      )}
                      >
                        <span>{isUser ? "You" : "AI"}</span>
                        <span>{formatTime(message.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap font-medium">{message.content}</p>

                      {!isUser && message.references?.length ? (
                        <div className="mt-4 rounded-[1.1rem] border border-matcha-900/10 bg-white/55 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
                            Related picks
                          </p>
                          <div className="mt-3 grid gap-3 xl:grid-cols-2">
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
                  </article>
                );
              })
            ) : (
              <div className="grid place-items-center rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-8 text-center text-sm leading-7 text-stone-600">
                <div className="max-w-2xl">
                  <RobotIcon className="mx-auto h-10 w-10 text-matcha-700" />
                  <p className="mt-4">
                    Ask about nearby stores, menu items, news, promotions, recent orders, or your
                    current account. The server will keep this conversation for later, so you can
                    come back and continue it.
                  </p>
                </div>
              </div>
            )}

            {sending ? (
              <div className="justify-self-start rounded-[1.2rem] border border-matcha-900/10 bg-white/72 px-4 py-3 text-sm text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
                AI is preparing an answer...
              </div>
            ) : null}
          </div>

          <form className="grid gap-3" onSubmit={handleSubmit}>
            <textarea
              className={`${ui.input} min-h-[8rem] resize-y`}
              placeholder="Ask about stores, dishes, promotions, orders, or your account..."
              value={draftMessage}
              disabled={sending}
              onChange={(event) => setDraftMessage(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <button className={ui.primaryButton} disabled={sending} type="submit">
                {sending ? "Sending..." : activeThreadId ? "Send reply" : "Start chat"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
