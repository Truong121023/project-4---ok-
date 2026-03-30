import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSupportChat } from "../context/SupportChatContext";
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
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function senderLabel(message) {
  const normalizedRole = String(message?.senderRole ?? "").trim().toUpperCase();

  if (normalizedRole === "USER") {
    return "You";
  }

  if (normalizedRole === "SYSTEM") {
    return "System";
  }

  return message?.senderName || "Support";
}

function getMessageBubbleClass({ isSystem, isCurrentSender }) {
  if (isSystem) {
    return "justify-self-center border border-dashed border-matcha-900/15 bg-white/70 text-stone-600 shadow-[0_10px_24px_rgba(79,70,45,0.06)]";
  }

  if (isCurrentSender) {
    return "justify-self-end border border-matcha-700/25 bg-gradient-to-br from-matcha-500 to-matcha-700 text-foam shadow-[0_16px_30px_rgba(89,108,61,0.26)]";
  }

  return "justify-self-start border border-matcha-900/10 bg-[#f8f5ef] text-stone-700 shadow-[0_10px_24px_rgba(79,70,45,0.06)]";
}

function getMessageMetaClass({ isSystem, isCurrentSender }) {
  if (isSystem) {
    return "text-stone-500";
  }

  if (isCurrentSender) {
    return "text-foam/80";
  }

  return "text-stone-500";
}

function UserSupportPanel() {
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
  } = useSupportChat();
  const auth = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    if (!userSession) {
      void loadSupportStores();
    }
  }, [loadSupportStores, userSession]);

  useEffect(() => {
    if (selectedStoreId || !stores.length) {
      return;
    }

    setSelectedStoreId(String(stores[0].id));
  }, [selectedStoreId, stores]);

  const handleStartSession = async () => {
    if (!selectedStoreId) {
      return;
    }

    await startUserSession(selectedStoreId);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const trimmedMessage = draftMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    const result = await sendUserMessage(trimmedMessage);

    if (result.ok) {
      setDraftMessage("");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4 text-sm text-stone-600">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          Status
        </span>
        <strong className="text-base text-tea-900">
          {connected ? "Connected to support" : "Connecting to support..."}
        </strong>
        {userSession?.assignedAdminName ? (
          <span>
            Your conversation is being handled by <strong>{userSession.assignedAdminName}</strong>.
          </span>
        ) : userSession ? (
          <span>Waiting for an admin/manager from {userSession.storeName}.</span>
        ) : (
          <span>Choose a store first, then start chatting with its admin/manager.</span>
        )}
        {auth.user?.fullName ? <span>Signed in as {auth.user.fullName}</span> : null}
      </div>

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

      {!userSession ? (
        <div className="grid gap-4 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Store
            </span>
            <select
              className={ui.input}
              disabled={storesLoading || !stores.length}
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
            >
              {stores.length ? null : <option value="">No stores available</option>}
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>

          {storesError ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {storesError}
            </div>
          ) : null}

          <button
            className={ui.primaryButton}
            type="button"
            disabled={!connected || storesLoading || !selectedStoreId}
            onClick={handleStartSession}
          >
            {storesLoading ? "Loading stores..." : "Start support chat"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 text-sm text-stone-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className={ui.pill}>{userSession.storeName}</span>
              <span className={ui.pill}>
                {userSession.assignedAdminName ? "In support" : "Waiting"}
              </span>
            </div>
            {userSession.assignedAdminName ? (
              <span>
                Supporting admin/manager: <strong>{userSession.assignedAdminName}</strong>
              </span>
            ) : (
              <span>An admin/manager will claim this chat on the first reply.</span>
            )}
          </div>

          <div className="grid max-h-[20rem] gap-3 overflow-y-auto rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4">
            {userSession.messages.length ? (
              userSession.messages.map((message) => {
                const isCurrentUser =
                  String(message.senderId ?? "") === String(auth.user?.id ?? "") &&
                  String(message.senderRole ?? "").toUpperCase() === "USER";
                const isSystem = String(message.senderRole ?? "").toUpperCase() === "SYSTEM";

                return (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[88%] rounded-[1.2rem] px-4 py-3 text-sm leading-6 break-words",
                      getMessageBubbleClass({ isSystem, isCurrentSender: isCurrentUser }),
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]",
                        getMessageMetaClass({ isSystem, isCurrentSender: isCurrentUser }),
                      )}
                    >
                      <span>{senderLabel(message)}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-medium">{message.content}</p>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                Send the first message so the store admin/manager knows what you need.
              </div>
            )}
          </div>

          <form className="grid gap-3" onSubmit={handleSendMessage}>
            <textarea
              className={`${ui.input} min-h-[7rem] resize-y`}
              placeholder="Describe what you need support with..."
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
            />
            <button className={ui.primaryButton} disabled={!connected || sending} type="submit">
              {sending ? "Sending..." : "Send message"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function AdminSupportPanel() {
  const {
    connected,
    connectionError,
    adminSessions,
    sending,
    notice,
    sendAdminMessage,
  } = useSupportChat();
  const auth = useAuth();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    if (!adminSessions.length) {
      setSelectedSessionId("");
      return;
    }

    setSelectedSessionId((currentValue) =>
      adminSessions.some((session) => session.id === currentValue)
        ? currentValue
        : adminSessions[0].id,
    );
  }, [adminSessions]);

  const selectedSession = useMemo(
    () => adminSessions.find((session) => session.id === selectedSessionId) ?? null,
    [adminSessions, selectedSessionId],
  );

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!selectedSession) {
      return;
    }

    const trimmedMessage = draftMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    const result = await sendAdminMessage(selectedSession.id, trimmedMessage);

    if (result.ok) {
      setDraftMessage("");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-[1.25rem] border border-matcha-900/10 bg-white/72 p-4 text-sm text-stone-600">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          Support inbox
        </span>
        <strong className="text-base text-tea-900">
          {connected ? "Connected to support inbox" : "Connecting to support inbox..."}
        </strong>
        <span>
          Signed in as <strong>{auth.user?.fullName || "Admin"}</strong>
        </span>
        <span>
          Sessions visible here are only the ones for your store, or the ones you already claimed.
        </span>
      </div>

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

      <div className="grid gap-3">
        {adminSessions.length ? (
          adminSessions.map((session) => (
            <button
              key={session.id}
              className={cn(
                "grid gap-2 rounded-[1.2rem] border px-4 py-3 text-left transition",
                session.id === selectedSessionId
                  ? "border-matcha-500/30 bg-matcha-500/12"
                  : "border-matcha-900/10 bg-white/72 hover:-translate-y-0.5 hover:bg-white",
              )}
              type="button"
              onClick={() => setSelectedSessionId(session.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={ui.pill}>{session.storeName}</span>
                <span className={ui.pill}>
                  {session.waitingForAdmin ? "Waiting" : "Claimed by you"}
                </span>
              </div>
              <strong className="text-sm text-tea-900">{session.userName}</strong>
              <span className="text-xs text-stone-500">{session.userEmail}</span>
            </button>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
            No active support sessions for you right now.
          </div>
        )}
      </div>

      {selectedSession ? (
        <>
          <div className="grid gap-3 rounded-[1.3rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 text-sm text-stone-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className={ui.pill}>{selectedSession.storeName}</span>
              <span className={ui.pill}>
                {selectedSession.waitingForAdmin ? "First reply will claim" : "You are supporting"}
              </span>
            </div>
            <span>
              Customer: <strong>{selectedSession.userName}</strong>
            </span>
            {selectedSession.assignedAdminName ? (
              <span>
                Assigned support: <strong>{selectedSession.assignedAdminName}</strong>
              </span>
            ) : (
              <span>This chat will be hidden from other admins/managers after your first reply.</span>
            )}
          </div>

          <div className="grid max-h-[18rem] gap-3 overflow-y-auto rounded-[1.35rem] border border-matcha-900/10 bg-white/72 p-4">
            {selectedSession.messages.length ? (
              selectedSession.messages.map((message) => {
                const isCurrentAdmin =
                  String(message.senderId ?? "") === String(auth.user?.id ?? "");
                const isSystem = String(message.senderRole ?? "").toUpperCase() === "SYSTEM";

                return (
                  <article
                    key={message.id}
                    className={cn(
                      "max-w-[88%] rounded-[1.2rem] px-4 py-3 text-sm leading-6 break-words",
                      getMessageBubbleClass({ isSystem, isCurrentSender: isCurrentAdmin }),
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]",
                        getMessageMetaClass({ isSystem, isCurrentSender: isCurrentAdmin }),
                      )}
                    >
                      <span>{senderLabel(message)}</span>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-medium">{message.content}</p>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                No messages yet. Send the first reply to claim this support chat.
              </div>
            )}
          </div>

          <form className="grid gap-3" onSubmit={handleSendMessage}>
            <textarea
              className={`${ui.input} min-h-[7rem] resize-y`}
              placeholder="Reply to the customer..."
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
            />
            <button className={ui.primaryButton} disabled={!connected || sending} type="submit">
              {sending ? "Sending..." : "Send reply"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}

export default function SupportChatWidget() {
  const auth = useAuth();
  const {
    adminSessions,
    canUseAdminChat,
    canUseSupportChat,
    canUseUserChat,
    activateSupportChat,
    loadSupportStores,
  } = useSupportChat();
  const [open, setOpen] = useState(false);

  if (!auth.isAuthenticated || !canUseSupportChat) {
    return null;
  }

  const badgeCount = canUseAdminChat ? adminSessions.length : 0;

  const handleToggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    if (canUseUserChat) {
      await loadSupportStores();
    }

    activateSupportChat();
    setOpen(true);
  };

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[70] bg-tea-950/25 backdrop-blur-[1px] sm:hidden" />
      ) : null}

      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
        {open ? (
          <section className="w-[min(28rem,calc(100vw-1.5rem))] rounded-[1.8rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 shadow-[0_24px_60px_rgba(39,64,45,0.18)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                  {canUseUserChat ? "Support chat" : "Support inbox"}
                </span>
                <h2 className="mt-2 text-xl font-semibold text-tea-900">
                  {canUseUserChat ? "Chat with store support" : "Active customer chats"}
                </h2>
              </div>

              <button className={ui.secondaryButton} type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {canUseUserChat ? <UserSupportPanel /> : <AdminSupportPanel />}
          </section>
        ) : null}

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
