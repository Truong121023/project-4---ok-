import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SmartImage from "./SmartImage";
import { useAuth } from "../context/AuthContext";
import { useSupportChat } from "../context/SupportChatContext";
import { useToast } from "../context/ToastContext";
import { apiRequest, getApiErrorMessage } from "../lib/api";
import { buildEventPath } from "../lib/eventRouting";
import { getPrimaryImageUrl } from "../lib/images";
import { buildNewsPath } from "../lib/newsRouting";
import { ui } from "../ui";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function SparkIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m18.5 14 1 2.8 2.8 1-2.8 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m5.5 14 .8 2.1 2.2.8-2.2.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function formatTime(value) {
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createMessage(role, content, extras = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    references: [],
    currentUserStatus: null,
    ...extras,
  };
}

function normalizeReferenceList(value) {
  return Array.isArray(value)
    ? value.filter((entry) => entry && typeof entry === "object")
    : [];
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
        href: `/admin?section=${encodeURIComponent(matcher.sectionKey)}&record=${encodeURIComponent(matched[1])}`,
      };
    }
  }

  const orderMatch = adminPath.match(/^\/api\/admin\/orders\/([^/]+)$/i);

  if (orderMatch) {
    return {
      href: `/admin/orders/${encodeURIComponent(orderMatch[1])}`,
    };
  }

  return null;
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
      return {
        href: `/stores/${encodeURIComponent(reference?.slug || storeMatch[1])}`,
      };
    }

    const dishMatch = publicApiPath.match(/^\/api\/public\/dishes\/(.+)$/i);
    if (dishMatch) {
      return {
        href: `/menu/${encodeURIComponent(reference?.id ?? dishMatch[1])}`,
      };
    }

    const eventMatch = publicApiPath.match(/^\/api\/public\/events\/(.+)$/i);
    if (eventMatch) {
      return {
        href: buildEventPath(reference?.slug || eventMatch[1]),
      };
    }

    const newsMatch = publicApiPath.match(/^\/api\/public\/news\/(.+)$/i);
    if (newsMatch) {
      return {
        href: buildNewsPath(reference?.slug || newsMatch[1]),
      };
    }
  }

  const userApiPath = String(reference?.userApiPath ?? "").trim();

  if (userApiPath === "/api/auth/me") {
    if (["STAFF", "SHIPPER"].includes(normalizedRole)) {
      return { href: "/employee" };
    }

    return { href: "/account" };
  }

  return null;
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
    default:
      return entityType || "Reference";
  }
}

function ReferenceCard({ reference, auth, onOpen }) {
  const navigationTarget = resolveReferenceNavigation(reference, auth);
  const previewImage = getPrimaryImageUrl(reference?.imagePath ?? "");

  return (
    <article className="rounded-[1.15rem] border border-matcha-900/10 bg-white/78 p-3 shadow-[0_10px_24px_rgba(79,70,45,0.06)]">
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

          <h4 className="mt-2 text-sm font-semibold text-tea-900">
            {reference?.title || "Reference"}
          </h4>
          {reference?.subtitle ? (
            <p className="mt-1 text-xs leading-6 text-stone-600">{reference.subtitle}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {navigationTarget ? (
              <Link
                className={ui.secondaryButton}
                to={navigationTarget.href}
                onClick={onOpen}
              >
                Open
              </Link>
            ) : (
              <span className="rounded-full border border-matcha-900/10 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-500">
                No direct screen
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AIChatWidget() {
  const auth = useAuth();
  const toast = useToast();
  const location = useLocation();
  const { canUseSupportChat } = useSupportChat();
  const [open, setOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setOpen(false);
      setDraftMessage("");
      setMessages([]);
      setSending(false);
      setError("");
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!open) {
      return;
    }

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, sending]);

  const anchorClass = canUseSupportChat ? "bottom-24" : "bottom-5";
  const latestStatus = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.currentUserStatus) {
        return messages[index].currentUserStatus;
      }
    }

    return auth.user ?? null;
  }, [auth.user, messages]);

  if (!auth.isAuthenticated) {
    return null;
  }

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
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

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
        },
      });

      const assistantMessage = createMessage(
        "assistant",
        String(response?.answer ?? "").trim() || "I could not generate an answer yet.",
        {
          references: normalizeReferenceList(response?.references),
          currentUserStatus: normalizeCurrentUserStatus(response?.currentUserStatus),
        },
      );

      setMessages((current) => [...current, assistantMessage]);
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

  const handleToggle = () => {
    setOpen((current) => !current);
  };

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[72] bg-tea-950/25 backdrop-blur-[1px] sm:hidden" />
      ) : null}

      <div className={`fixed right-5 z-[82] flex flex-col items-end gap-3 ${anchorClass}`}>
        {open ? (
          <section className="w-[min(31rem,calc(100vw-1.5rem))] rounded-[1.9rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 shadow-[0_28px_70px_rgba(39,64,45,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  AI assistant
                </span>
                <h2 className="mt-2 text-xl font-semibold text-tea-900">
                  Ask about stores, dishes, news, events, and your account
                </h2>
              </div>

              <button className={ui.secondaryButton} type="button" onClick={handleToggle}>
                Close
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4 text-sm text-stone-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={ui.pill}>{auth.user?.role || "Account"}</span>
                  {latestStatus?.workingStoreName ? (
                    <span className={ui.pill}>{latestStatus.workingStoreName}</span>
                  ) : null}
                </div>
                <strong className="mt-3 block text-base text-tea-900">
                  {latestStatus?.fullName || auth.user?.fullName || "Signed-in user"}
                </strong>
                <div className="mt-2 grid gap-1 text-sm leading-6 text-stone-600">
                  <span>{latestStatus?.email || auth.user?.email || "No email yet"}</span>
                  <span>
                    Verified: {latestStatus?.verified === false ? "No" : "Yes"}
                    {" · "}Enabled: {latestStatus?.enabled === false ? "No" : "Yes"}
                  </span>
                  {"profileCompleted" in (latestStatus ?? {}) ? (
                    <span>
                      Profile completed: {latestStatus?.profileCompleted === false ? "No" : "Yes"}
                    </span>
                  ) : null}
                </div>
              </div>

              {error ? (
                <div className="rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div
                ref={scrollRef}
                className="grid max-h-[24rem] gap-3 overflow-y-auto rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4"
              >
                {messages.length ? (
                  messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <article
                        key={message.id}
                        className={cn(
                          "max-w-[92%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 break-words",
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
                          <div className="mt-4 grid gap-3">
                            {message.references.map((reference) => (
                              <ReferenceCard
                                key={reference.referenceKey || `${reference.entityType}-${reference.id}`}
                                auth={auth}
                                reference={reference}
                                onOpen={() => setOpen(false)}
                              />
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm leading-7 text-stone-600">
                    Ask about nearby stores, menu items, news, promotions, or your current account
                    status. AI replies can include quick links to open the right screen in the app.
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
                  className={`${ui.input} min-h-[7rem] resize-y`}
                  placeholder="Ask about stores, dishes, promotions, or your account..."
                  value={draftMessage}
                  disabled={sending}
                  onChange={(event) => setDraftMessage(event.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  <button className={ui.primaryButton} disabled={sending} type="submit">
                    {sending ? "Sending..." : "Send to AI"}
                  </button>
                  {messages.length ? (
                    <button
                      className={ui.secondaryButton}
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setError("");
                      }}
                    >
                      Clear chat
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </section>
        ) : null}

        <button
          className={cn(
            "relative inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_16px_40px_rgba(32,50,93,0.24)] transition hover:-translate-y-1",
            location.pathname.startsWith("/admin")
              ? "bg-gradient-to-br from-tea-900 to-[#3b2d20]"
              : "bg-gradient-to-br from-[#3d5877] to-[#1f324a]",
          )}
          type="button"
          onClick={handleToggle}
        >
          <SparkIcon />
        </button>
      </div>
    </>
  );
}
