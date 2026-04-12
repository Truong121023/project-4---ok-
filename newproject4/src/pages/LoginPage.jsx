import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { getDefaultAuthenticatedPath, isProfileCompleted, resolvePostAuthPath } from "../lib/authRedirects";
import { loadGoogleIdentityScript } from "../lib/googleIdentity";
import { loginBenefits } from "../siteContent";
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
    return "Dang nhap tren website khong ho tro cho tai khoan SHIPPER. Neu ban dang dung tai khoan SHIPPER, vui long dang nhap bang ung dung mobile.";
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
    title: "Thong bao",
  });
  useToastMessage(error, {
    type: "error",
    title: "Dang nhap that bai",
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
            "Dang nhap Google that bai.",
          );

          setError(
            nextMessage === "Google account is not linked to any user"
              ? "Tai khoan Google nay chua duoc lien ket voi user nao trong database Tea Matcha."
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
          <p className={ui.eyebrow}>Tea Matcha</p>
          <h1 className={ui.bannerTitle}>Sign in with your Tea Matcha account</h1>
          <p className={ui.copy}>
            Dang nhap de tiep tuc mua hang, theo doi don, quan ly cua hang hoac xu ly van hanh theo
            vai tro cua ban.
          </p>

          <div className="mt-7 grid gap-4">
            {loginBenefits.map((benefit) => (
              <article key={benefit} className={`${ui.card} bg-white/55 p-5`}>
                <p className={ui.muted}>{benefit}</p>
              </article>
            ))}
          </div>

          <div className="mt-7 rounded-[1.5rem] border border-matcha-900/10 bg-white/65 px-5 py-4 text-sm leading-7 text-stone-600">
            No account yet? Sign up first, then enter your OTP to activate the account before you
            sign in. If you forgot your password, request a reset OTP and create a new one.
          </div>
        </div>

        <form className={`${ui.panel} grid gap-5`} onSubmit={handleSubmit}>
          <div>
            <p className={ui.eyebrow}>tea matcha</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">Sign in</p>
            <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
              Dang nhap bang email, mat khau hoac chon Google de dang nhap nhanh khi email Google
              cua ban da trung voi tai khoan trong he thong Tea Matcha.
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-tea-900">Dang nhap bang Google</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Chon tai khoan Google cua ban. Neu email do da ton tai trong Tea Matcha thi he
                    thong se dang nhap ngay.
                  </p>
                </div>
              </div>

              {googleEnabled ? (
                <div className="grid gap-3">
                  <div ref={googleButtonRef} className="min-h-11" />

                  {!googleReady ? (
                    <div className="rounded-full border border-matcha-900/10 bg-white px-4 py-2 text-sm font-semibold text-tea-900">
                      {googleLoading ? "Dang tai nut Google..." : "Khong the tai Google Sign-In."}
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
                  <span>Tiep tuc voi Google</span>
                </button>
              )}

              {googleEnabled ? null : (
                <div className="rounded-[1.1rem] border border-dashed border-matcha-900/15 bg-white/70 px-4 py-3 text-sm leading-7 text-stone-600">
                  Dang nhap Google tam thoi chua san sang tren moi truong nay.
                </div>
              )}

              {googleError ? (
                <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                  {googleError}
                </div>
              ) : null}

              {googleEnabled && openedFromLoopbackIp ? (
                <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
                  Neu dang nhap Google bi loi, hay mo frontend bang{" "}
                  <code>http://localhost:3000</code> thay vi <code>127.0.0.1</code>.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/register">
              Create a new account
            </Link>
            <Link className="font-semibold text-matcha-700" to="/verify-otp">
              Verify OTP
            </Link>
            <Link className="font-semibold text-matcha-700" to="/forgot-password">
              Forgot password
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
