import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/templates/auth-layout";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { getDefaultAuthenticatedPath, isProfileCompleted, resolvePostAuthPath } from "../lib/authRedirects";
import { loadGoogleIdentityScript } from "../lib/googleIdentity";
import { ui } from "../ui";

const initialForm = { email: "", password: "" };

function resolveLoginErrorMessage(requestError, fallbackMessage) {
  const message = getApiErrorMessage(requestError, fallbackMessage);
  const normalizedMessage = String(message ?? "").trim().toLowerCase();
  if (
    normalizedMessage === "unexpected server error" ||
    normalizedMessage === "request failed with status 500."
  ) {
    return "This account cannot sign in on the website.";
  }
  return message;
}

export default function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const googleSignInInFlightRef = useRef(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
  const googleEnabled = Boolean(googleClientId);
  const openedFromLoopbackIp =
    typeof window !== "undefined" && window.location.hostname === "127.0.0.1";

  const infoMessage = location.state?.message ?? "";
  const redirectTo = location.state?.from?.pathname;

  useToastMessage(infoMessage, { type: "success", title: "Notice" });
  useToastMessage(error, { type: "error", title: "Sign-in failed" });
  useToastMessage(googleError, { type: "error", title: "Google Sign-In" });

  const finishLogin = useCallback(
    (response) => {
      const nextUser = response?.user ?? null;
      const nextPath = resolvePostAuthPath(nextUser, redirectTo);
      const nextState = !isProfileCompleted(nextUser) && redirectTo ? { from: location.state?.from } : null;
      navigate(nextPath, { replace: true, state: nextState });
    },
    [location.state?.from, navigate, redirectTo],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await auth.login(form);
      finishLogin(response);
    } catch (submitError) {
      setError(resolveLoginErrorMessage(submitError, "Sign-in failed."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleEnabled) {
      setGoogleReady(false);
      setGoogleLoading(false);
      setGoogleError("");
      return undefined;
    }

    let cancelled = false;

    const handleGoogleCredential = async (credentialResponse) => {
      const idToken = String(credentialResponse?.credential ?? "").trim();
      if (!idToken || googleSignInInFlightRef.current) return;

      googleSignInInFlightRef.current = true;
      setLoading(true);
      setError("");
      setGoogleError("");

      try {
        const response = await auth.googleLogin(idToken);
        if (cancelled) return;
        finishLogin(response);
      } catch (googleLoginError) {
        if (!cancelled) {
          const nextMessage = resolveLoginErrorMessage(googleLoginError, "Google sign-in failed.");
          setError(
            nextMessage === "Google account is not linked to any user"
              ? "This Google account is not linked to any user in the Kamatcha database."
              : nextMessage,
          );
        }
      } finally {
        googleSignInInFlightRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    async function setupGoogleLogin() {
      setGoogleLoading(true);
      setGoogleError("");
      try {
        const googleIdentityApi = await loadGoogleIdentityScript();
        if (cancelled || !googleButtonRef.current) return;

        googleIdentityApi.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleButtonRef.current.innerHTML = "";
        googleIdentityApi.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: "320",
        });
        setGoogleReady(true);
      } catch (scriptError) {
        if (!cancelled) {
          setGoogleReady(false);
          setGoogleError(getApiErrorMessage(scriptError, "Unable to load Google Sign-In."));
        }
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    }

    void setupGoogleLogin();
    return () => {
      cancelled = true;
      googleSignInInFlightRef.current = false;
    };
  }, [auth, finishLogin, googleClientId, googleEnabled]);

  if (auth.isAuthenticated) {
    return <Navigate replace to={getDefaultAuthenticatedPath(auth.user)} />;
  }

  return (
    <AuthLayout wide>
      {/* Kanji / eyebrow */}
      <p aria-hidden="true" className="mb-1 font-display text-2xl font-medium tracking-wider text-matcha-600/50">
        抹茶
      </p>
      <p className={ui.eyebrow}>Kamatcha</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-7 text-ink-600">
        Sign in with your email and password.
      </p>

      {infoMessage ? (
        <div className="mt-4 rounded-xl bg-matcha-50 border border-matcha-200 px-4 py-3 text-sm text-matcha-700">
          {infoMessage}
        </div>
      ) : null}

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit} aria-describedby={error ? "login-error" : undefined}>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">Email</span>
          <input
            className={ui.input}
            type="email"
            name="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">Password</span>
          <div className="relative">
            <input
              className={`${ui.input} pr-24`}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-matcha-500 px-3 py-1.5 text-xs font-semibold text-cream-50 transition hover:bg-matcha-700"
              type="button"
              onClick={() => setShowPassword((c) => !c)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error ? (
          <div id="login-error" role="alert" className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <button
          className={ui.primaryButton}
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Processing..." : "Sign in"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
        <span className="h-px flex-1 bg-ink-900/10" />
        <span>Or continue with</span>
        <span className="h-px flex-1 bg-ink-900/10" />
      </div>

      {/* Google Sign-In */}
      <div className="rounded-xl border border-ink-900/10 bg-cream-100 p-4">
        <p className="mb-3 text-sm font-semibold text-ink-900">Sign in with Google</p>

        {googleEnabled ? (
          <div className="grid gap-3">
            <div ref={googleButtonRef} className="min-h-11" />
            {!googleReady ? (
              <div className="rounded-full border border-ink-900/10 bg-cream-50 px-4 py-2 text-sm text-ink-600">
                {googleLoading ? "Loading Google button..." : "Unable to load Google Sign-In."}
              </div>
            ) : null}
          </div>
        ) : (
          <button
            className="inline-flex w-fit cursor-not-allowed items-center gap-3 rounded-full border border-ink-900/10 bg-cream-100 px-4 py-3 text-sm font-semibold text-ink-500 opacity-75"
            type="button"
            disabled
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-cream-50 text-xs font-bold text-ink-900">G</span>
            <span>Continue with Google</span>
          </button>
        )}

        {googleError ? (
          <div className="mt-3 rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {googleError}
          </div>
        ) : null}

        {googleEnabled && openedFromLoopbackIp ? (
          <div className="mt-3 rounded-xl border border-warn-soft bg-warn-soft px-4 py-3 text-sm leading-7 text-warn">
            If Google sign-in fails, open the app on <code>localhost:3000</code> instead of <code>127.0.0.1</code>.
          </div>
        ) : null}
      </div>

      {/* Footer links */}
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-ink-600">
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/register">
          Create a new account
        </Link>
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/forgot-password">
          Forgot password
        </Link>
      </div>
    </AuthLayout>
  );
}
