import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  apiRequest,
  clearStoredSession,
  getStoredSession,
  persistSession,
  registerAuthFailureHandler,
} from "../lib/api";
import { requestPasswordResetOtp, resetPasswordWithOtp } from "../lib/siteApi";
import { useToast } from "./ToastContext";

const AuthContext = createContext(null);

const SESSION_REPLACED_ALERT = {
  title: "Tai khoan dang dang nhap o noi khac",
  message:
    "Phien dang nhap hien tai khong con hop le. Tai khoan cua ban co the vua duoc dang nhap tren thiet bi khac hoac phien dang nhap da bi thay the. Neu day khong phai ban, hay dung Quen mat khau de doi mat khau ngay.",
};

export function AuthProvider({ children }) {
  const [storedSession] = useState(() => getStoredSession());
  const storedAccessToken = storedSession?.accessToken ?? storedSession?.token ?? "";
  const storedTokenType = storedSession?.tokenType ?? storedSession?.type ?? "Bearer";
  const storedExpiresAt = storedSession?.expiresAt ?? null;
  const storedUser = storedSession?.user ?? null;
  const [token, setToken] = useState(storedAccessToken);
  const [tokenType, setTokenType] = useState(storedTokenType);
  const [expiresAt, setExpiresAt] = useState(storedExpiresAt);
  const [user, setUser] = useState(storedUser);
  const [initializing, setInitializing] = useState(Boolean(storedAccessToken));
  const [sessionAlert, setSessionAlert] = useState(null);
  const [loginRedirectNonce, setLoginRedirectNonce] = useState(0);
  const hadAuthenticatedSessionRef = useRef(Boolean(storedAccessToken || storedUser));
  const logoutInProgressRef = useRef(false);
  const authFailureHandledRef = useRef(false);
  const toast = useToast();

  const saveSession = useCallback(({ accessToken, tokenType: nextTokenType, expiresAt, user }) => {
    setToken(accessToken);
    setTokenType(nextTokenType ?? "Bearer");
    setExpiresAt(expiresAt ?? null);
    setUser(user ?? null);
    setSessionAlert(null);
    hadAuthenticatedSessionRef.current = Boolean(accessToken);
    authFailureHandledRef.current = false;
    logoutInProgressRef.current = false;
    persistSession({
      accessToken,
      tokenType: nextTokenType ?? "Bearer",
      expiresAt: expiresAt ?? null,
      user: user ?? null,
    });
  }, []);

  const clearSession = useCallback(({ resetHistory = false, dismissAlert = false } = {}) => {
    clearStoredSession();
    setToken("");
    setTokenType("Bearer");
    setExpiresAt(null);
    setUser(null);

    if (dismissAlert) {
      setSessionAlert(null);
    }

    if (resetHistory) {
      hadAuthenticatedSessionRef.current = false;
      authFailureHandledRef.current = false;
    }
  }, []);

  const dismissSessionAlert = useCallback(() => {
    setSessionAlert(null);
  }, []);

  const syncSession = useCallback(
    async ({
      accessToken,
      tokenType: nextTokenType = "Bearer",
      expiresAt: fallbackExpiresAt = null,
      user: fallbackUser = null,
    }) => {
      const meResponse = await apiRequest("/api/auth/me", {
        token: accessToken,
        tokenType: nextTokenType,
      });

      const nextSession = {
        accessToken,
        tokenType: nextTokenType,
        expiresAt: meResponse.expiresAt ?? fallbackExpiresAt ?? null,
        user: meResponse.user ?? fallbackUser ?? null,
      };

      if (!nextSession.user) {
        throw new Error("Unable to load the account after authentication.");
      }

      saveSession(nextSession);

      return {
        ...meResponse,
        ...nextSession,
      };
    },
    [saveSession],
  );

  useEffect(() => {
    if (!storedAccessToken) {
      setInitializing(false);
      return;
    }

    let cancelled = false;

    async function bootstrapAuth() {
      try {
        await syncSession({
          accessToken: storedAccessToken,
          tokenType: storedTokenType,
          expiresAt: storedExpiresAt,
          user: storedUser,
        });
      } catch {
        if (cancelled) {
          return;
        }

        clearSession();
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [storedAccessToken, storedExpiresAt, storedTokenType, storedUser, syncSession]);

  useEffect(() => {
    const unregister = registerAuthFailureHandler(async ({ message, token: failedToken }) => {
      const normalizedMessage = String(message ?? "").trim();
      const activeToken = String(token ?? "").trim();

      if (!String(failedToken ?? "").trim()) {
        return;
      }

      if (logoutInProgressRef.current || authFailureHandledRef.current) {
        return;
      }

      if (
        !hadAuthenticatedSessionRef.current ||
        !activeToken ||
        activeToken !== String(failedToken).trim()
      ) {
        return;
      }

      if (!normalizedMessage || normalizedMessage === "Authorization header must be Bearer token") {
        return;
      }

      authFailureHandledRef.current = true;
      clearSession();

      if (normalizedMessage === "Token is invalid") {
        setSessionAlert(SESSION_REPLACED_ALERT);
        setLoginRedirectNonce((current) => current + 1);
        return;
      }

      if (normalizedMessage === "Token has expired") {
        toast.warning("Phien dang nhap da het han. Vui long dang nhap lai.", {
          title: "Phien dang nhap",
          dedupeKey: "session-expired",
        });
        setLoginRedirectNonce((current) => current + 1);
        return;
      }

      toast.info("Vui long dang nhap lai de tiep tuc.", {
        title: "Yeu cau dang nhap",
        dedupeKey: "session-required",
      });
      setLoginRedirectNonce((current) => current + 1);
    });

    return unregister;
  }, [clearSession, toast, token]);

  const register = (payload) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: payload,
    });

  const verifyOtp = (payload) =>
    apiRequest("/api/auth/verify-otp", {
      method: "POST",
      body: payload,
    });

  const requestResetOtp = (payload) => requestPasswordResetOtp(payload);

  const resetPassword = (payload) => resetPasswordWithOtp(payload);

  const login = async (payload) => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: payload,
    });

    const accessToken = response?.accessToken ?? response?.token ?? "";
    const tokenTypeFromLogin = response?.tokenType ?? response?.type ?? "Bearer";

    if (!accessToken) {
      throw new Error("Access token was not returned after sign-in.");
    }

    const session = await syncSession({
      accessToken,
      tokenType: tokenTypeFromLogin,
      expiresAt: response?.expiresAt ?? null,
      user: response?.user ?? null,
    }).catch((loginError) => {
      clearSession({ dismissAlert: true });
      throw loginError;
    });

    return {
      ...session,
      ...response,
      accessToken,
      tokenType: tokenTypeFromLogin,
      expiresAt: session.expiresAt ?? response?.expiresAt ?? null,
      user: session.user ?? response?.user ?? null,
    };
  };

  const googleLogin = async (idToken) => {
    const response = await apiRequest("/api/auth/google/login", {
      method: "POST",
      body: {
        idToken,
      },
    });

    const accessToken = response?.accessToken ?? response?.token ?? "";
    const tokenTypeFromLogin = response?.tokenType ?? response?.type ?? "Bearer";

    if (!accessToken) {
      throw new Error("Access token was not returned after Google sign-in.");
    }

    const session = await syncSession({
      accessToken,
      tokenType: tokenTypeFromLogin,
      expiresAt: response?.expiresAt ?? null,
      user: response?.user ?? null,
    }).catch((loginError) => {
      clearSession({ dismissAlert: true });
      throw loginError;
    });

    return {
      ...session,
      ...response,
      accessToken,
      tokenType: tokenTypeFromLogin,
      expiresAt: session.expiresAt ?? response?.expiresAt ?? null,
      user: session.user ?? response?.user ?? null,
    };
  };

  const completeGoogleProfile = async (payload) => {
    if (!token) {
      throw new Error("Google session was not found. Please sign in again.");
    }

    const response = await apiRequest("/api/auth/google/complete-profile", {
      method: "POST",
      body: payload,
      token,
      tokenType,
    });

    const session = await syncSession({
      accessToken: token,
      tokenType,
      expiresAt,
      user: response?.user ?? user ?? null,
    }).catch((completeProfileError) => {
      clearSession({ dismissAlert: true });
      throw completeProfileError;
    });

    return {
      ...response,
      ...session,
      accessToken: token,
      tokenType,
      expiresAt: session.expiresAt ?? expiresAt ?? null,
      user: session.user ?? response?.user ?? user ?? null,
    };
  };

  const refreshMe = async () => {
    if (!token) {
      return null;
    }

    try {
      return await syncSession({
        accessToken: token,
        tokenType,
        expiresAt,
        user,
      });
    } catch (refreshError) {
      clearSession();
      throw refreshError;
    }
  };

  const logout = async () => {
    logoutInProgressRef.current = true;

    try {
      if (token) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          token,
          tokenType,
        });
      }
    } finally {
      clearSession({ resetHistory: true, dismissAlert: true });
      logoutInProgressRef.current = false;
    }
  };

  const value = useMemo(
    () => ({
      token,
      tokenType,
      expiresAt,
      user,
      initializing,
      isAuthenticated: Boolean(token && user),
      sessionAlert,
      loginRedirectNonce,
      hasRole: (...roles) =>
        Boolean(
          user &&
            roles.some(
              (role) =>
                String(role ?? "").toUpperCase() === String(user.role ?? "").toUpperCase(),
            ),
        ),
      register,
      verifyOtp,
      requestResetOtp,
      resetPassword,
      login,
      googleLogin,
      completeGoogleProfile,
      refreshMe,
      logout,
      clearSession,
      dismissSessionAlert,
    }),
    [
      clearSession,
      dismissSessionAlert,
      expiresAt,
      initializing,
      loginRedirectNonce,
      sessionAlert,
      token,
      tokenType,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
