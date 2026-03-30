import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL, apiRequest, getApiErrorMessage } from "../lib/api";
import { useAuth } from "./AuthContext";

const SupportChatContext = createContext(null);

function emptyArray(value) {
  return Array.isArray(value) ? value : [];
}

export function SupportChatProvider({ children }) {
  const auth = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [supportUnavailable, setSupportUnavailable] = useState(false);
  const [chatRequested, setChatRequested] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState("");
  const [userSession, setUserSession] = useState(null);
  const [adminSessions, setAdminSessions] = useState([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const canUseUserChat = auth.hasRole("USER");
  const canUseAdminChat = auth.hasRole("ADMIN", "MANAGER");
  const canUseSupportChat =
    auth.isAuthenticated && !supportUnavailable && (canUseUserChat || canUseAdminChat);

  const resetRuntimeState = useCallback(() => {
    setConnected(false);
    setConnectionError("");
    setStoresLoading(false);
    setUserSession(null);
    setAdminSessions([]);
    setNotice("");
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setSupportUnavailable(false);
      setChatRequested(false);
      setStores([]);
      setStoresError("");
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!canUseSupportChat || !auth.token || !chatRequested) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      resetRuntimeState();
      return undefined;
    }

    const socket = io(API_BASE_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: {
        token: auth.token,
        tokenType: auth.tokenType,
      },
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      setConnectionError("");
    };

    const handleDisconnect = (reason) => {
      setConnected(false);

      if (reason !== "io client disconnect") {
        setConnectionError("Realtime support chat is disconnected.");
      }
    };

    const handleConnectError = (error) => {
      setConnected(false);
      setConnectionError("");
      setSupportUnavailable(true);
      setStores([]);
      setStoresError("");
      socket.disconnect();
    };

    const handleUserState = (nextSession) => {
      setUserSession(nextSession ?? null);
    };

    const handleAdminState = (nextSessions) => {
      setAdminSessions(emptyArray(nextSessions));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("support:user_state", handleUserState);
    socket.on("support:admin_state", handleAdminState);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("support:user_state", handleUserState);
      socket.off("support:admin_state", handleAdminState);
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      resetRuntimeState();
    };
  }, [auth.token, auth.tokenType, canUseSupportChat, chatRequested, resetRuntimeState]);

  const emitWithAck = useCallback((eventName, payload = {}) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;

      if (!socket || !socket.connected) {
        reject(new Error("Support chat is not connected yet."));
        return;
      }

      socket.timeout(10_000).emit(eventName, payload, (error, response) => {
        if (error) {
          reject(new Error("Support chat request timed out."));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.message || "Support chat request failed."));
          return;
        }

        resolve(response);
      });
    });
  }, []);

  const loadSupportStores = useCallback(
    async ({ force = false } = {}) => {
      if (!canUseUserChat) {
        return [];
      }

      if (stores.length && !force) {
        return stores;
      }

      setStoresLoading(true);
      setStoresError("");

      try {
        const response = await apiRequest("/api/support-chat/stores", {
          token: auth.token,
          tokenType: auth.tokenType,
        });
        const nextStores = emptyArray(response?.items);
        setStores(nextStores);
        return nextStores;
      } catch (requestError) {
        if (requestError?.status === 404) {
          setSupportUnavailable(true);
          setStores([]);
          setStoresError("");
          return [];
        }

        const message = getApiErrorMessage(requestError, "Unable to load store list.");
        setStoresError(message);
        return [];
      } finally {
        setStoresLoading(false);
      }
    },
    [auth.token, auth.tokenType, canUseUserChat, stores],
  );

  const startUserSession = useCallback(
    async (storeId) => {
      setNotice("");

      try {
        const response = await emitWithAck("support:user_session:start", { storeId });
        setNotice(response?.message || "Support chat started.");
        return { ok: true, message: response?.message || "Support chat started." };
      } catch (requestError) {
        const message = getApiErrorMessage(requestError, "Unable to start support chat.");
        setNotice(message);
        return { ok: false, message };
      }
    },
    [emitWithAck],
  );

  const sendUserMessage = useCallback(
    async (content) => {
      setSending(true);
      setNotice("");

      try {
        const response = await emitWithAck("support:message:send", { content });
        return { ok: true, message: response?.message || "Message sent." };
      } catch (requestError) {
        const message = getApiErrorMessage(requestError, "Unable to send the message.");
        setNotice(message);
        return { ok: false, message };
      } finally {
        setSending(false);
      }
    },
    [emitWithAck],
  );

  const sendAdminMessage = useCallback(
    async (sessionId, content) => {
      setSending(true);
      setNotice("");

      try {
        const response = await emitWithAck("support:message:send", { sessionId, content });
        return { ok: true, message: response?.message || "Reply sent." };
      } catch (requestError) {
        const message = getApiErrorMessage(requestError, "Unable to send the reply.");
        setNotice(message);
        return { ok: false, message };
      } finally {
        setSending(false);
      }
    },
    [emitWithAck],
  );

  const value = useMemo(
    () => ({
      connected,
      supportUnavailable,
      connectionError,
      stores,
      storesLoading,
      storesError,
      userSession,
      adminSessions,
      sending,
      notice,
      canUseUserChat,
      canUseAdminChat,
      canUseSupportChat,
      activateSupportChat: () => setChatRequested(true),
      loadSupportStores,
      startUserSession,
      sendUserMessage,
      sendAdminMessage,
      clearNotice: () => setNotice(""),
    }),
    [
      adminSessions,
      canUseAdminChat,
      canUseSupportChat,
      canUseUserChat,
      chatRequested,
      connected,
      connectionError,
      loadSupportStores,
      notice,
      sendAdminMessage,
      sendUserMessage,
      sending,
      startUserSession,
      stores,
      storesError,
      storesLoading,
      supportUnavailable,
      userSession,
    ],
  );

  return <SupportChatContext.Provider value={value}>{children}</SupportChatContext.Provider>;
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);

  if (!context) {
    throw new Error("useSupportChat must be used within SupportChatProvider.");
  }

  return context;
}
