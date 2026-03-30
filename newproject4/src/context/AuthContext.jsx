import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  clearStoredSession,
  getStoredSession,
  persistSession,
} from "../lib/api";
import { requestPasswordResetOtp, resetPasswordWithOtp } from "../lib/siteApi";

const AuthContext = createContext(null);

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

  const saveSession = useCallback(({ accessToken, tokenType: nextTokenType, expiresAt, user }) => {
    setToken(accessToken);
    setTokenType(nextTokenType ?? "Bearer");
    setExpiresAt(expiresAt ?? null);
    setUser(user ?? null);
    persistSession({
      accessToken,
      tokenType: nextTokenType ?? "Bearer",
      expiresAt: expiresAt ?? null,
      user: user ?? null,
    });
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

        clearStoredSession();
        setToken("");
        setTokenType("Bearer");
        setUser(null);
        setExpiresAt(null);
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

  const clearSession = () => {
    clearStoredSession();
    setToken("");
    setTokenType("Bearer");
    setExpiresAt(null);
    setUser(null);
  };

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
      clearSession();
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
      clearSession();
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
      clearSession();
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
    try {
      if (token) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          token,
          tokenType,
        });
      }
    } finally {
      clearSession();
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
    }),
    [expiresAt, initializing, token, tokenType, user],
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
