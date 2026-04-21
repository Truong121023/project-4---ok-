import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PaymentQrCard from "./PaymentQrCard";
import SmartImage from "./SmartImage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useSiteData } from "../context/SiteDataContext";
import { buildAdminOrderPath, buildAdminWorkspacePath } from "../lib/adminRoutes";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { buildEventPath } from "../lib/eventRouting";
import { getPrimaryImageUrl } from "../lib/images";
import { formatTimeVn } from "../lib/locale";
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
  if (!adminPath.startsWith("/api/admin/")) {
    return null;
  }

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
  if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
    return adminTarget;
  }

  const publicApiPath = String(reference?.publicApiPath ?? "").trim();
  if (publicApiPath) {
    const storeMatch = publicApiPath.match(/^\/api\/public\/stores\/(.+)$/i);
    if (storeMatch) {
      return { href: `/stores/${encodeURIComponent(reference?.slug || storeMatch[1])}` };
    }

    const dishMatch = publicApiPath.match(/^\/api\/public\/dishes\/(.+)$/i);
    if (dishMatch) {
      return { href: `/menu/${encodeURIComponent(reference?.id ?? dishMatch[1])}` };
    }

    const eventMatch = publicApiPath.match(/^\/api\/public\/events\/(.+)$/i);
    if (eventMatch) {
      return { href: buildEventPath(reference?.slug || eventMatch[1]) };
    }

    const newsMatch = publicApiPath.match(/^\/api\/public\/news\/(.+)$/i);
    if (newsMatch) {
      return { href: buildNewsPath(reference?.slug || newsMatch[1]) };
    }
  }

  const userApiPath = String(reference?.userApiPath ?? "").trim();
  if (userApiPath === "/api/auth/me") {
    return ["STAFF", "SHIPPER"].includes(normalizedRole) ? { href: "/employee" } : { href: "/account" };
  }
  if (userApiPath === "/api/user/cart") {
    return { href: "/cart" };
  }

  const userOrderMatch = userApiPath.match(/^\/api\/user\/orders\/([^/]+)$/i);
  if (userOrderMatch) {
    return { href: `/orders/${encodeURIComponent(userOrderMatch[1])}` };
  }
  if (userApiPath === "/api/user/orders") {
    return { href: "/orders" };
  }
  return null;
}

function resolveActionNavigation(action, auth) {
  const actionType = String(action?.actionType ?? "").trim().toUpperCase();
  const apiPath = String(action?.apiPath ?? "").trim();
  const payload = action?.payload && typeof action.payload === "object" ? action.payload : null;
  const normalizedRole = String(auth.user?.role ?? "").trim().toUpperCase();
  const adminTarget = buildAdminFocusTarget({ adminApiPath: apiPath });

  if (actionType === "OPEN_CART") {
    return { href: "/cart" };
  }

  if (actionType === "OPEN_ORDERS") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return { href: buildAdminWorkspacePath({ sectionKey: "orders" }) };
    }
    if (normalizedRole === "USER") {
      return { href: "/orders" };
    }
    if (["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return { href: buildAdminWorkspacePath({ sectionKey: "orders" }) };
    }
    if (["STAFF", "SHIPPER"].includes(normalizedRole)) {
      return { href: "/employee" };
    }
    return null;
  }

  if (actionType === "OPEN_ORDER") {
    const userOrderMatch = apiPath.match(/^\/api\/user\/orders\/([^/]+)$/i);
    const adminOrderMatch = apiPath.match(/^\/api\/admin\/orders\/([^/]+)$/i);
    const employeeOrderMatch = apiPath.match(/^\/api\/employee\/orders\/([^/]+)$/i);
    const orderId = String(
      payload?.orderId ?? userOrderMatch?.[1] ?? adminOrderMatch?.[1] ?? employeeOrderMatch?.[1] ?? "",
    ).trim();
    if (!orderId) {
      return null;
    }
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return adminTarget;
    }
    if (["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return { href: buildAdminOrderPath(orderId) };
    }
    if (["STAFF", "SHIPPER"].includes(normalizedRole)) {
      return { href: `/employee/orders/${encodeURIComponent(orderId)}` };
    }
    if (normalizedRole === "USER") {
      return { href: `/orders/${encodeURIComponent(orderId)}` };
    }
    return null;
  }

  if (actionType === "OPEN_ACCOUNT") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return adminTarget;
    }
    return ["STAFF", "SHIPPER"].includes(normalizedRole) ? { href: "/employee" } : { href: "/account" };
  }

  if (actionType === "OPEN_STORE") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return adminTarget;
    }
    const storeMatch = apiPath.match(/^\/api\/public\/stores\/(.+)$/i);
    const storeKey = String(payload?.storeSlug ?? payload?.slug ?? storeMatch?.[1] ?? "").trim();
    return storeKey ? { href: `/stores/${encodeURIComponent(storeKey)}` } : null;
  }

  if (actionType === "OPEN_DISH") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return adminTarget;
    }
    const dishMatch = apiPath.match(/^\/api\/public\/dishes\/(.+)$/i);
    const dishId = String(payload?.dishId ?? payload?.id ?? dishMatch?.[1] ?? "").trim();
    return dishId ? { href: `/menu/${encodeURIComponent(dishId)}` } : null;
  }

  if (actionType === "OPEN_EVENT") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return adminTarget;
    }
    const eventMatch = apiPath.match(/^\/api\/public\/events\/(.+)$/i);
    const eventKey = String(payload?.slug ?? payload?.eventKey ?? eventMatch?.[1] ?? "").trim();
    return eventKey ? { href: buildEventPath(eventKey) } : null;
  }

  if (actionType === "OPEN_NEWS") {
    if (adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole)) {
      return adminTarget;
    }
    const newsMatch = apiPath.match(/^\/api\/public\/news\/(.+)$/i);
    const newsKey = String(payload?.slug ?? newsMatch?.[1] ?? "").trim();
    return newsKey ? { href: buildNewsPath(newsKey) } : null;
  }

  if (actionType === "OPEN_PROMOTION") {
    return adminTarget && ["ADMIN", "MANAGER"].includes(normalizedRole) ? adminTarget : null;
  }

  return null;
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
        "Show the order issues that need attention right now.",
        "Which store is performing best today?",
        "Open the most relevant order record for me.",
      ];
    case "MANAGER":
      return [
        "What needs my attention in this store today?",
        "Show recent orders that changed status.",
        "Which customer issues should I resolve first?",
      ];
    case "STAFF":
      return [
        "Show the next orders that matter for staff.",
        "Which item is mentioned most today?",
        "Help me open the correct order screen.",
      ];
    case "SHIPPER":
      return [
        "Show my latest delivery task.",
        "Which order is ready for delivery?",
        "Open the latest delivery order details.",
      ];
    default:
      return [
        "What is in my cart right now?",
        "Show my payment QR for the latest unpaid order.",
        "Recommend one drink and add it to my cart.",
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
          {reference?.subtitle ? <p className="mt-1 text-xs leading-6 text-stone-600">{reference.subtitle}</p> : null}

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
  if (!actions.length) {
    return null;
  }

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

function findPaymentQrAction(actions) {
  return (Array.isArray(actions) ? actions : []).find(
    (action) => String(action?.actionType ?? "").trim().toUpperCase() === "SHOW_PAYMENT_QR",
  ) ?? null;
}

function buildPaymentQrOrder(action) {
  const payload = action?.payload && typeof action.payload === "object" ? action.payload : null;
  if (!payload) {
    return null;
  }

  const paymentQrCode = String(payload.paymentQrCode ?? "").trim();
  const paymentCheckoutUrl = String(payload.paymentCheckoutUrl ?? "").trim();
  if (!paymentQrCode && !paymentCheckoutUrl) {
    return null;
  }

  return {
    id: payload.orderId ?? "",
    paymentQrCode,
    paymentCheckoutUrl,
    paymentProvider: String(payload.paymentProvider ?? "").trim(),
    paymentReference: String(payload.paymentReference ?? "").trim(),
    paymentStatus: String(payload.paymentStatus ?? "").trim(),
    status: String(payload.status ?? "").trim(),
    totalAmount: Number(payload.totalAmount ?? 0),
    paymentExpiresAt: String(payload.paymentExpiresAt ?? "").trim(),
  };
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
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThreadTitle, setActiveThreadTitle] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [threadLoading, setThreadLoading] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setDraftMessage("");
      setMessages([]);
      setThreads([]);
      setActiveThreadId(null);
      setActiveThreadTitle("");
      setHistorySearch("");
      setHistoryOpen(false);
      setHistoryLoading(false);
      setHistoryError("");
      setThreadLoading(false);
      setDeletingThreadId("");
      setSending(false);
      setError("");
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return undefined;
    }

    let cancelled = false;

    const loadThreads = async () => {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await apiRequest("/api/ai/chat/threads?page=0&size=20", {
          token: auth.token,
          tokenType: auth.tokenType,
        });
        if (cancelled) {
          return;
        }
        const items = Array.isArray(response?.items) ? response.items : [];
        setThreads(
          items
            .filter((entry) => entry && typeof entry === "object")
            .map((entry) => ({
              threadId: entry.threadId ?? entry.id ?? null,
              title: String(entry.title ?? "").trim(),
              messageCount: Number(entry.messageCount ?? 0) || 0,
              lastMessageRole: String(entry.lastMessageRole ?? "").trim(),
              lastMessagePreview: String(entry.lastMessagePreview ?? "").trim(),
              lastMessageAt: String(entry.lastMessageAt ?? "").trim(),
              updatedAt: String(entry.updatedAt ?? "").trim(),
            }))
            .filter((entry) => entry.threadId),
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        setHistoryError(getApiErrorMessage(requestError, "Unable to load AI chat history."));
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadThreads();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.token, auth.tokenType]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

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
    const search = String(historySearch ?? "").trim().toLowerCase();
    if (!search) {
      return threads;
    }
    return threads.filter((thread) =>
      [thread.title, thread.lastMessagePreview, thread.lastMessageRole]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [historySearch, threads]);

  if (!auth.isAuthenticated) {
    return null;
  }

  const handleStartNewChat = () => {
    setMessages([]);
    setActiveThreadId(null);
    setActiveThreadTitle("");
    setDraftMessage("");
    setError("");
  };

  const refreshThreads = async () => {
    try {
      const response = await apiRequest("/api/ai/chat/threads?page=0&size=20", {
        token: auth.token,
        tokenType: auth.tokenType,
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      setThreads(
        items
          .filter((entry) => entry && typeof entry === "object")
          .map((entry) => ({
            threadId: entry.threadId ?? entry.id ?? null,
            title: String(entry.title ?? "").trim(),
            messageCount: Number(entry.messageCount ?? 0) || 0,
            lastMessageRole: String(entry.lastMessageRole ?? "").trim(),
            lastMessagePreview: String(entry.lastMessagePreview ?? "").trim(),
            lastMessageAt: String(entry.lastMessageAt ?? "").trim(),
            updatedAt: String(entry.updatedAt ?? "").trim(),
          }))
          .filter((entry) => entry.threadId),
      );
      setHistoryError("");
    } catch (requestError) {
      setHistoryError(getApiErrorMessage(requestError, "Unable to load AI chat history."));
    }
  };

  const handleOpenThread = async (thread) => {
    const threadId = String(thread?.threadId ?? "").trim();
    if (!threadId) {
      return;
    }

    setThreadLoading(true);
    setError("");
    try {
      const response = await apiRequest(`/api/ai/chat/threads/${threadId}`, {
        token: auth.token,
        tokenType: auth.tokenType,
      });
      const nextMessages = Array.isArray(response?.messages)
        ? response.messages
            .filter((entry) => entry && typeof entry === "object")
            .map((entry) => ({
              id: String(entry.id ?? `${entry.role ?? "message"}-${Math.random().toString(36).slice(2, 9)}`),
              role: String(entry.role ?? "").trim().toLowerCase() === "user" ? "user" : "assistant",
              content: String(entry.content ?? "").trim(),
              createdAt: entry.createdAt ?? new Date().toISOString(),
              references: normalizeReferenceList(entry.references),
              actions: normalizeActionList(entry.actions),
              currentUserStatus: null,
            }))
        : [];

      setMessages(nextMessages);
      setActiveThreadId(Number(threadId));
      setActiveThreadTitle(String(response?.title ?? thread.title ?? "").trim());
      setHistoryOpen(false);
    } catch (requestError) {
      const messageText = getApiErrorMessage(requestError, "Unable to open this AI chat history.");
      setError(messageText);
      toast.error(messageText, { title: "Chatbox AI" });
    } finally {
      setThreadLoading(false);
    }
  };

  const handleDeleteThread = async (thread, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const threadId = String(thread?.threadId ?? "").trim();
    if (!threadId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${thread?.title || "this conversation"}" from AI chat history?`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingThreadId(threadId);
    setHistoryError("");
    setError("");

    try {
      await apiRequest(`/api/ai/chat/threads/${threadId}`, {
        method: "DELETE",
        token: auth.token,
        tokenType: auth.tokenType,
      });

      setThreads((current) => current.filter((entry) => String(entry.threadId) !== threadId));

      if (String(activeThreadId ?? "") === threadId) {
        setMessages([]);
        setActiveThreadId(null);
        setActiveThreadTitle("");
        setDraftMessage("");
      }

      toast.success("AI chat history deleted.", { title: "Chatbox AI" });
    } catch (requestError) {
      const messageText = getApiErrorMessage(requestError, "Unable to delete this AI chat history.");
      setHistoryError(messageText);
      toast.error(messageText, { title: "Chatbox AI" });
    } finally {
      setDeletingThreadId("");
    }
  };

  const handleAction = async (action) => {
    const actionType = String(action?.actionType ?? "").trim().toUpperCase();
    const payload = action?.payload && typeof action.payload === "object" ? action.payload : null;

    if (actionType === "SHOW_PAYMENT_QR") {
      return;
    }

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
          ...(activeThreadId ? { threadId: activeThreadId } : {}),
        },
      });

      const assistantMessage = createMessage(
        "assistant",
        String(response?.answer ?? "").trim() || "I could not generate an answer yet.",
        {
          references: normalizeReferenceList(response?.references),
          actions: normalizeActionList(response?.actions),
          currentUserStatus: normalizeCurrentUserStatus(response?.currentUserStatus),
        },
      );

      setMessages((current) => [...current, assistantMessage]);
      setActiveThreadId(Number(response?.threadId ?? activeThreadId ?? 0) || null);
      setActiveThreadTitle(String(response?.threadTitle ?? activeThreadTitle ?? message).trim());
      await refreshThreads();
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

  return (
    <section className="rounded-[2.4rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,239,0.98))] p-4 shadow-[0_24px_60px_rgba(79,70,45,0.14)] backdrop-blur-xl sm:p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.45rem] bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_18px_34px_rgba(89,108,61,0.24)]">
            <RobotIcon className="h-6 w-6" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-tea-700">
                Chatbox AI
              </span>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-tea-900 sm:text-3xl">
                Focused assistant
              </h1>
              {activeThreadTitle ? (
                <p className="mt-1 text-sm text-stone-500">Current chat: {activeThreadTitle}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-matcha-900/10 bg-white/88 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                type="button"
                onClick={() => setHistoryOpen((current) => !current)}
              >
                History
                {threads.length ? (
                  <span className="rounded-full bg-matcha-500/12 px-2 py-0.5 text-xs font-bold text-matcha-700">
                    {threads.length}
                  </span>
                ) : null}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-matcha-900/10 bg-white/88 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                type="button"
                onClick={handleStartNewChat}
              >
                New chat
              </button>
            </div>
          </div>
        </div>

        {historyOpen ? (
          <div className="rounded-[1.8rem] border border-matcha-900/10 bg-white/82 p-4 shadow-[0_10px_24px_rgba(79,70,45,0.06)] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
                  Saved conversations
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  History is saved for lookup, but AI replies only to the current question.
                </p>
              </div>
              <button className={ui.secondaryButton} type="button" onClick={handleStartNewChat}>
                New chat
              </button>
            </div>

            <div className="mt-4">
              <input
                className={ui.input}
                placeholder="Search AI chat history..."
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                type="text"
              />
            </div>

            {historyError ? (
              <div className="mt-4 rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {historyError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {historyLoading ? (
                <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-[#f8f5ef]/80 px-4 py-5 text-sm text-stone-600">
                  Loading AI chat history...
                </div>
              ) : filteredThreads.length ? (
                filteredThreads.map((thread) => {
                  const isActive = String(thread.threadId) === String(activeThreadId ?? "");
                  const isDeleting = deletingThreadId === String(thread.threadId);
                  return (
                    <button
                      key={thread.threadId}
                      className={cn(
                        "rounded-[1.25rem] border px-4 py-4 text-left transition",
                        isActive
                          ? "border-matcha-500/35 bg-matcha-500/10"
                          : "border-matcha-900/10 bg-[#f8f5ef]/75 hover:bg-white",
                      )}
                      type="button"
                      disabled={isDeleting}
                      onClick={() => {
                        void handleOpenThread(thread);
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-tea-900">
                          {thread.title || "Untitled conversation"}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {thread.messageCount ? <span className={ui.pill}>{thread.messageCount}</span> : null}
                          {isActive ? <span className={ui.pill}>Open</span> : null}
                          <span
                            className="inline-flex"
                            onClick={(event) => {
                              void handleDeleteThread(thread, event);
                            }}
                          >
                            <span
                              className={cn(
                                "inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold transition",
                                isDeleting
                                  ? "cursor-wait border-stone-200 bg-stone-100 text-stone-400"
                                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                              )}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  void handleDeleteThread(thread, event);
                                }
                              }}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </span>
                          </span>
                        </div>
                      </div>
                      {thread.lastMessagePreview ? (
                        <p className="mt-2 text-sm leading-6 text-stone-600">{thread.lastMessagePreview}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-stone-400">
                        {thread.lastMessageRole ? <span>{thread.lastMessageRole}</span> : null}
                        {thread.lastMessageAt ? <span>{formatTime(thread.lastMessageAt)}</span> : null}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-[#f8f5ef]/80 px-4 py-5 text-sm text-stone-600">
                  No saved AI conversations yet.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.8rem] border border-matcha-900/10 bg-white/78 p-4 shadow-[0_10px_24px_rgba(79,70,45,0.06)] sm:p-5">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                className="min-w-[15rem] rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] px-4 py-3 text-left text-sm font-medium leading-6 text-stone-700 transition hover:-translate-y-0.5 hover:bg-white sm:min-w-[18rem]"
                type="button"
                onClick={() => setDraftMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="grid h-[60dvh] min-h-[32rem] gap-4 overflow-y-auto rounded-[1.95rem] border border-matcha-900/10 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-6 lg:h-[64dvh]"
        >
          {messages.length ? (
            messages.map((message) => {
              const isUser = message.role === "user";
              const visibleActions = (Array.isArray(message.actions) ? message.actions : []).filter(
                (action) => String(action?.actionType ?? "").trim().toUpperCase() !== "SHOW_PAYMENT_QR",
              );
              const groupedActions = groupActionsByReference(visibleActions);
              const paymentQrOrder = buildPaymentQrOrder(findPaymentQrAction(message.actions));

              return (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[96%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 break-words sm:max-w-[88%] sm:px-5 sm:py-4 sm:text-[0.95rem]",
                    isUser
                      ? "justify-self-end border border-matcha-700/25 bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_18px_32px_rgba(89,108,61,0.24)]"
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

                  {isUser ? (
                    <p className="mt-2 whitespace-pre-wrap font-medium">{message.content}</p>
                  ) : (
                    <AIMessageContent content={message.content} />
                  )}

                  {!isUser && paymentQrOrder ? (
                    <PaymentQrCard
                      className="mt-4"
                      order={paymentQrOrder}
                      title="Payment QR"
                      subtitle="Scan this QR with your banking app or open the payment page to complete the order."
                    />
                  ) : null}

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
            <div className="grid place-items-center rounded-[1.4rem] border border-dashed border-matcha-900/15 bg-[#f8f5ef]/80 p-8 text-center">
              <div className="max-w-xl">
                <RobotIcon className="mx-auto h-12 w-12 text-matcha-700" />
                <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
                  Ask one clear question at a time. The assistant answers from your live account, cart, and order state.
                </p>
              </div>
            </div>
          )}

          {threadLoading ? (
            <div className="justify-self-start rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] px-4 py-3 text-sm text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
              Opening saved conversation...
            </div>
          ) : null}

          {sending ? (
            <div className="justify-self-start rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] px-4 py-3 text-sm text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
              AI is preparing an answer...
            </div>
          ) : null}
        </div>

        <form
          className="grid gap-3 rounded-[1.95rem] border border-matcha-900/10 bg-white/82 p-4 shadow-[0_10px_24px_rgba(79,70,45,0.06)] sm:p-5"
          onSubmit={handleSubmit}
        >
          <textarea
            className={`${ui.input} min-h-[10rem] resize-y border border-matcha-900/10 bg-[#f8f5ef] px-5 py-4 text-base leading-7`}
            placeholder="Ask about your cart, checkout, payment QR, stores, or order status..."
            value={draftMessage}
            disabled={sending}
            onChange={(event) => setDraftMessage(event.target.value)}
          />
          <div className="flex justify-end">
            <button className={`${ui.primaryButton} min-w-[10rem]`} disabled={sending} type="submit">
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
