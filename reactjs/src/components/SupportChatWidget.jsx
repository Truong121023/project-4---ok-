import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSupportChat } from "../context/SupportChatContext";
import { formatTimeVn } from "../lib/locale";
import { ui } from "../ui";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function MessageIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 9.5h10M7 13h6m-7 7 2.1-3.4a2 2 0 0 1 1.7-.9H18a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H6A3 3 0 0 0 3 7v8a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function formatTime(value) {
  return formatTimeVn(value, "Just now");
}

function MessageList({ messages = [], currentUserId = "", isAdminView = false }) {
  if (!messages.length) {
    return (
      <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="grid max-h-[20rem] gap-3 overflow-y-auto rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4">
      {messages.map((message) => {
        const isOwnMessage = String(message?.senderId ?? "") === String(currentUserId ?? "");
        const isSystemMessage = String(message?.senderRole ?? "").toUpperCase() === "SYSTEM";

        return (
          <article
            key={message?.id ?? `${message?.createdAt}-${message?.content}`}
            className={cn(
              "max-w-[88%] rounded-[1.2rem] px-4 py-3 text-sm leading-6 break-words",
              isSystemMessage
                ? "justify-self-center border border-dashed border-matcha-900/15 bg-white/70 text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]"
                : isOwnMessage
                  ? "justify-self-end border border-matcha-700/25 bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_16px_30px_rgba(89,108,61,0.26)]"
                  : "justify-self-start border border-matcha-900/10 bg-[#f8f5ef] text-stone-700 shadow-[0_10px_24px_rgba(79,70,45,0.06)]",
            )}
          >
            <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]">
              <span className={isOwnMessage ? "text-foam/80" : "text-stone-500"}>
                {isSystemMessage
                  ? "System"
                  : isOwnMessage
                    ? "You"
                    : isAdminView
                      ? message?.senderName || "Customer"
                      : message?.senderName || "Support"}
              </span>
              <span className={isOwnMessage ? "text-foam/80" : "text-stone-500"}>
                {formatTime(message?.createdAt)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap font-medium">{message?.content}</p>
          </article>
        );
      })}
    </div>
  );
}

function UserSupportPanel() {
  const auth = useAuth();
  const {
    connected,
    connectionError,
    stores,
    storesLoading,
    storesError,
    userSession,
    sending,
    notice,
    loadSupportStores,
    startUserSession,
    sendUserMessage,
    clearNotice,
  } = useSupportChat();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [draft, setDraft] = useState("");
  const currentUserId = String(auth.user?.id ?? "");

  useEffect(() => {
    if (userSession) {
      return;
    }

    void loadSupportStores();
  }, [loadSupportStores, userSession]);

  useEffect(() => {
    if (!selectedStoreId && stores.length) {
      setSelectedStoreId(String(stores[0]?.id ?? ""));
    }
  }, [selectedStoreId, stores]);

  const handleStartChat = async () => {
    const storeId = Number(selectedStoreId);

    if (!Number.isFinite(storeId) || storeId <= 0) {
      return;
    }

    await startUserSession(storeId);
  };

  const handleSendMessage = async () => {
    const content = draft.trim();

    if (!content) {
      return;
    }

    const result = await sendUserMessage(content);

    if (result?.ok) {
      setDraft("");
      clearNotice();
    }
  };

  if (!userSession) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-2 rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4 text-sm text-stone-600">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            {connected ? "Connected to support" : "Connecting to support..."}
          </span>
          {connectionError ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {connectionError}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {notice}
            </div>
          ) : null}
          {storesError ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {storesError}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4">
          <div className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Choose a store
            </span>
            <p className="text-base text-tea-900">
              Start a support conversation with the team managing that store.
            </p>
          </div>

          {storesLoading ? (
            <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
              Loading stores...
            </div>
          ) : (
            <div className="grid gap-3 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 text-sm text-stone-600">
              <select
                className={ui.select}
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
              >
                {stores.map((store) => (
                  <option key={store?.id} value={store?.id}>
                    {store?.name ?? `Store #${store?.id}`}
                  </option>
                ))}
              </select>

              <button
                className={ui.primaryButton}
                type="button"
                disabled={!selectedStoreId || sending}
                onClick={() => {
                  void handleStartChat();
                }}
              >
                Start support chat
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-matcha-900/10 bg-white/72 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          {userSession?.storeName || "Support"}
        </span>
        <span className="rounded-full border border-matcha-900/10 bg-white/72 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          {userSession?.assignedAdminName ? `Handled by ${userSession.assignedAdminName}` : "Waiting for support"}
        </span>
      </div>

      {notice ? (
        <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
          {notice}
        </div>
      ) : null}

      <MessageList messages={userSession?.messages ?? []} currentUserId={currentUserId} />

      <div className="grid gap-3">
        <textarea
          className={`${ui.input} min-h-[7rem] resize-y`}
          placeholder="Describe what you need support with..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className={ui.primaryButton}
          type="button"
          disabled={!draft.trim() || sending}
          onClick={() => {
            void handleSendMessage();
          }}
        >
          {sending ? "Sending..." : "Send message"}
        </button>
      </div>
    </div>
  );
}

function AdminSupportPanel() {
  const auth = useAuth();
  const {
    connected,
    connectionError,
    adminSessions,
    sending,
    notice,
    sendAdminMessage,
    clearNotice,
  } = useSupportChat();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [draft, setDraft] = useState("");
  const currentUserId = String(auth.user?.id ?? "");

  useEffect(() => {
    if (!selectedSessionId && adminSessions.length) {
      setSelectedSessionId(String(adminSessions[0]?.id ?? ""));
      return;
    }

    if (selectedSessionId && !adminSessions.some((session) => String(session?.id ?? "") === selectedSessionId)) {
      setSelectedSessionId(String(adminSessions[0]?.id ?? ""));
    }
  }, [adminSessions, selectedSessionId]);

  const activeSession = useMemo(
    () => adminSessions.find((session) => String(session?.id ?? "") === selectedSessionId) ?? null,
    [adminSessions, selectedSessionId],
  );

  const handleSendReply = async () => {
    const content = draft.trim();

    if (!activeSession?.id || !content) {
      return;
    }

    const result = await sendAdminMessage(activeSession.id, content);

    if (result?.ok) {
      setDraft("");
      clearNotice();
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="grid gap-3">
        <div className="grid gap-2 rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4 text-sm text-stone-600">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            {connected ? "Connected to support inbox" : "Connecting to support inbox..."}
          </span>
          {connectionError ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {connectionError}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {notice}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4">
          {adminSessions.length ? (
            adminSessions.map((session) => {
              const isActive = String(session?.id ?? "") === selectedSessionId;

              return (
                <button
                  key={session?.id}
                  className={cn(
                    "grid gap-2 rounded-[1.2rem] border px-4 py-3 text-left transition",
                    isActive
                      ? "border-matcha-500/30 bg-matcha-500/12"
                      : "border-matcha-900/10 bg-white/72 hover:-translate-y-0.5 hover:bg-white",
                  )}
                  type="button"
                  onClick={() => setSelectedSessionId(String(session?.id ?? ""))}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-tea-900">{session?.userName || "Customer"}</strong>
                    <span className="text-xs text-stone-500">{session?.storeName || "Store"}</span>
                  </div>
                  <span className="text-xs text-stone-500">
                    {session?.assignedAdminId
                      ? String(session.assignedAdminId) === currentUserId
                        ? "Claimed by you"
                        : `Handled by ${session?.assignedAdminName || "another admin"}`
                      : "First reply will claim this chat"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
              No active customer chats right now.
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4">
        {activeSession ? (
          <>
            <div className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                {activeSession?.storeName || "Store"}
              </span>
              <h3 className="text-base font-semibold text-tea-900">
                {activeSession?.userName || "Customer"}
              </h3>
              <p className="text-sm text-stone-600">{activeSession?.userEmail || "No email available"}</p>
            </div>

            <MessageList
              isAdminView
              messages={activeSession?.messages ?? []}
              currentUserId={currentUserId}
            />

            <div className="grid gap-3">
              <textarea
                className={`${ui.input} min-h-[7rem] resize-y`}
                placeholder="Reply to the customer..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                className={ui.primaryButton}
                type="button"
                disabled={!draft.trim() || sending}
                onClick={() => {
                  void handleSendReply();
                }}
              >
                {sending ? "Sending..." : "Send reply"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
            Choose a customer chat to start replying.
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportChatWidget({ mode = "floating" }) {
  const {
    adminSessions,
    canUseSupportChat,
    canUseUserChat,
    activateSupportChat,
  } = useSupportChat();
  const [open, setOpen] = useState(mode === "page");
  const isPageMode = mode === "page";
  const badgeCount = canUseUserChat ? 0 : adminSessions.filter((session) => session?.waitingForAdmin).length;

  useEffect(() => {
    if (isPageMode) {
      activateSupportChat();
      setOpen(true);
    }
  }, [activateSupportChat, isPageMode]);

  if (!canUseSupportChat) {
    return null;
  }

  const handleToggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    activateSupportChat();
    setOpen(true);
  };

  const panel = (
    <section
      className={
        isPageMode
          ? ui.panel
          : "w-[min(28rem,calc(100vw-1.5rem))] rounded-[1.8rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 shadow-[0_24px_60px_rgba(39,64,45,0.18)]"
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
            {canUseUserChat ? "24/7 Support" : "Support inbox"}
          </span>
          <h2 className="mt-2 text-xl font-semibold text-tea-900">
            {canUseUserChat ? "Chat with support staff" : "Active customer chats"}
          </h2>
          {isPageMode ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600">
              {canUseUserChat
                ? "Choose a store and message the assigned admin or manager directly for help."
                : "Track and reply to customer support sessions for your assigned store."}
            </p>
          ) : null}
        </div>

        {!isPageMode ? (
          <button className={ui.secondaryButton} type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        ) : null}
      </div>

      {canUseUserChat ? <UserSupportPanel /> : <AdminSupportPanel />}
    </section>
  );

  if (isPageMode) {
    return panel;
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[70] bg-tea-950/25 backdrop-blur-[1px] sm:hidden" />
      ) : null}

      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
        {open ? panel : null}

        <button
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 text-white shadow-[0_16px_40px_rgba(39,64,45,0.28)] transition hover:-translate-y-1"
          type="button"
          onClick={() => {
            void handleToggleOpen();
          }}
        >
          <MessageIcon />
          {badgeCount > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </button>
      </div>
    </>
  );
}
