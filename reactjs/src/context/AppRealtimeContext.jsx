import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../lib/api";
import { useAuth } from "./AuthContext";

const AppRealtimeContext = createContext(null);

function emptyState() {
  return {
    connected: false,
    connectionError: "",
    lastOrderEvent: null,
    orderEventVersion: 0,
    lastNotificationEvent: null,
    notificationEventVersion: 0,
  };
}

export function AppRealtimeProvider({ children }) {
  const auth = useAuth();
  const socketRef = useRef(null);
  const [state, setState] = useState(emptyState);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setState(emptyState());
      return undefined;
    }

    const socket = io(`${API_BASE_URL}/app`, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      path: "/socket.io",
      auth: {
        token: auth.token,
        tokenType: auth.tokenType,
      },
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setState((current) => ({
        ...current,
        connected: true,
        connectionError: "",
      }));
    };

    const handleDisconnect = () => {
      setState((current) => ({
        ...current,
        connected: false,
      }));
    };

    const handleConnectError = (error) => {
      setState((current) => ({
        ...current,
        connected: false,
        connectionError: error?.message || "Realtime connection failed.",
      }));
    };

    const handleOrderUpdate = (payload) => {
      setState((current) => ({
        ...current,
        lastOrderEvent: payload && typeof payload === "object" ? payload : null,
        orderEventVersion: current.orderEventVersion + 1,
      }));
    };

    const handleNotificationUpdate = (payload) => {
      setState((current) => ({
        ...current,
        lastNotificationEvent: payload && typeof payload === "object" ? payload : null,
        notificationEventVersion: current.notificationEventVersion + 1,
      }));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("app:order:update", handleOrderUpdate);
    socket.on("app:notification:update", handleNotificationUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("app:order:update", handleOrderUpdate);
      socket.off("app:notification:update", handleNotificationUpdate);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setState(emptyState());
    };
  }, [auth.isAuthenticated, auth.token, auth.tokenType, auth.user?.id]);

  const value = useMemo(
    () => ({
      ...state,
    }),
    [state],
  );

  return <AppRealtimeContext.Provider value={value}>{children}</AppRealtimeContext.Provider>;
}

export function useAppRealtime() {
  const context = useContext(AppRealtimeContext);
  if (!context) {
    throw new Error("useAppRealtime must be used within AppRealtimeProvider.");
  }
  return context;
}
