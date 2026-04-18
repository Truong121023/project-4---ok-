import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { getDefaultAuthenticatedPath, isProfileCompleted, resolvePostAuthPath } from "../lib/authRedirects";
import { loadGoogleIdentityScript } from "../lib/googleIdentity";
import { ui } from "../ui";

const initialForm = {
  email: "",
  password: "",
};

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

  useToastMessage(infoMessage, {
    type: "success",
    title: "Notice",
  });
  useToastMessage(error, {
    type: "error",
    title: "Sign-in failed",
  });
  useToastMessage(googleError, {
    type: "error",
    title: "Google Sign-In",
  });

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
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
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

      if (!idToken || googleSignInInFlightRef.current) {
        return;
      }

      googleSignInInFlightRef.current = true;
      setLoading(true);
      setError("");
      setGoogleError("");

      try {
        const response = await auth.googleLogin(idToken);

        if (cancelled) {
          return;
        }

        finishLogin(response);
      } catch (googleLoginError) {
        if (!cancelled) {
          const nextMessage = resolveLoginErrorMessage(
            googleLoginError,
            "Google sign-in failed.",
          );

          setError(
            nextMessage === "Google account is not linked to any user"
              ? "This Google account is not linked to any user in the Kamatcha database."
              : nextMessage,
          );
        }
      } finally {
        googleSignInInFlightRef.current = false;

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    async function setupGoogleLogin() {
      setGoogleLoading(true);
      setGoogleError("");

      try {
        const googleIdentityApi = await loadGoogleIdentityScript();

        if (cancelled || !googleButtonRef.current) {
          return;
        }

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
        if (!cancelled) {
          setGoogleLoading(false);
        }
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
    <main className={ui.page}>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col`}>
          <p className={ui.eyebrow}>Kamatcha</p>
          <h1 className={ui.bannerTitle}>Welcome to Kamatcha Admin Page</h1>
          <div className="relative mt-7 overflow-hidden rounded-[2rem] border border-matcha-900/10 bg-[radial-gradient(circle_at_top_left,_rgba(224,241,182,0.95),_rgba(255,255,255,0.88)_40%,_rgba(214,235,195,0.92)_100%)] p-6 shadow-[0_28px_70px_rgba(79,70,45,0.12)]">
            <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(135deg,rgba(124,151,86,0.22),rgba(255,255,255,0))]" />
            <div className="absolute -right-12 top-10 h-36 w-36 rounded-full bg-matcha-500/14 blur-2xl" />
            <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-tea-900/8 blur-2xl" />

            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-white/65 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.26em] text-tea-700 shadow-sm">
                Signature Brand
              </span>

              <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="self-center">
                  <p className="max-w-[16ch] text-3xl font-black leading-tight tracking-[-0.03em] text-tea-900 sm:text-4xl">
                    Fresh matcha energy, crafted in love.
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-stone-700 sm:text-base">
                    soft textures, clean design, and modern aesthetics
                  </p>
                </div>

                <div className="mx-auto flex w-full max-w-[22rem] items-center justify-center">
                  <div className="relative flex min-h-[22rem] w-full items-center justify-center">
                    {/* <div className="absolute inset-x-8 bottom-8 h-12 rounded-full bg-matcha-900/12 blur-2xl" /> */}
                    {/* <div className="absolute inset-6 rounded-[2rem] border border-white/55 bg-white/38 backdrop-blur-sm" /> */}
                    {/* <div className="relative z-10 rounded-[2rem] border border-[#efe2cf] bg-[#f6ecde] p-4 shadow-[0_24px_36px_rgba(89,108,61,0.12)]"> */}
                      <div >
                      <img
                        className="mx-auto w-full max-w-[17rem] rounded-[1.5rem] object-contain mix-blend-multiply"
                        src="/kamatcha-logo.png"
                        alt="Kamatcha brand logo"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form className={`${ui.panel} grid gap-5`} onSubmit={handleSubmit}>
          <div>
            <p className={ui.eyebrow}>Kamatcha</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">Sign in</p>
            <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
              Sign in with your email and password.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm leading-7 text-amber-900">
            Tai khoan <strong>SHIPPER</strong> chi dang nhap tren ung dung mobile. Website nay
            danh cho USER, STAFF, MANAGER va ADMIN.
          </div>

          {infoMessage ? (
            <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {infoMessage}
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Email</span>
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
            <span className="text-sm font-semibold text-tea-900">Password</span>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-matcha-500 px-3 py-2 text-sm font-medium text-foam transition hover:-translate-y-[55%]"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button className={ui.primaryButton} type="submit" disabled={loading}>
            {loading ? "Processing..." : "Sign in"}
          </button>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              <span className="h-px flex-1 bg-matcha-900/10" />
              <span>Or continue with</span>
              <span className="h-px flex-1 bg-matcha-900/10" />
            </div>

            <div className="grid gap-3 rounded-[1.3rem] border border-matcha-900/10 bg-white/72 p-4">
              <p className="text-sm font-semibold text-tea-900">Sign in with Google</p>

              {googleEnabled ? (
                <div className="grid gap-3">
                  <div ref={googleButtonRef} className="min-h-11" />

                  {!googleReady ? (
                    <div className="rounded-full border border-matcha-900/10 bg-white px-4 py-2 text-sm font-semibold text-tea-900">
                      {googleLoading ? "Loading Google button..." : "Unable to load Google Sign-In."}
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  className="inline-flex w-fit cursor-not-allowed items-center gap-3 rounded-full border border-matcha-900/10 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-500 opacity-90"
                  type="button"
                  disabled
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-tea-900">
                    G
                  </span>
                  <span>Continue with Google</span>
                </button>
              )}

              {googleError ? (
                <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                  {googleError}
                </div>
              ) : null}

              {googleEnabled && openedFromLoopbackIp ? (
                <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
                  If Google sign-in fails, please open the frontend using the correct environment URL.{" "}
                  <code>http://localhost:3000</code> thay vi <code>127.0.0.1</code>.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/register">
              Create a new account
            </Link>
            {/* <Link className="font-semibold text-matcha-700" to="/verify-otp">
              Verify OTP
            </Link> */}
            <Link className="font-semibold text-matcha-700" to="/forgot-password">
              Forgot password
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
