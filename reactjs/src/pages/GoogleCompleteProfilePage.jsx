import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { isProfileCompleted, resolvePostAuthPath } from "../lib/authRedirects";
import { ui } from "../ui";

const initialForm = {
  fullName: "",
  password: "",
  confirmPassword: "",
};

export default function GoogleCompleteProfilePage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    fullName: auth.user?.fullName ?? "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const redirectTo = location.state?.from?.pathname ?? "";
  useToastMessage(error, {
    type: "error",
    title: "Profile completion failed",
  });
  useToastMessage(notice, {
    type: "success",
    title: "Notice",
  });

  if (auth.initializing) {
    return (
      <main className={ui.page}>
        <section className={`${ui.panel} text-center`}>
          <p className={ui.eyebrow}>Google profile</p>
          <h1 className="text-3xl font-bold tracking-tight text-tea-900">
            Restoring your session
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
            Please wait a moment...
          </p>
        </section>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location.state?.from ?? null }} to="/login" />;
  }

  if (isProfileCompleted(auth.user)) {
    return <Navigate replace to={resolvePostAuthPath(auth.user, redirectTo)} />;
  }

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
    setNotice("");

    if (!form.fullName.trim()) {
      setError("Please enter your full name to complete the account.");
      setLoading(false);
      return;
    }

    if (!form.password.trim()) {
      setError("Please create a password for your Kamatcha account.");
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("The confirmation password does not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await auth.completeGoogleProfile({
        fullName: form.fullName.trim(),
        password: form.password,
      });

      setNotice(response?.message ?? "Profile updated.");
      navigate(resolvePostAuthPath(response.user, redirectTo), { replace: true });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Unable to complete the Google profile setup."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={ui.page}>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col gap-5`}>
          <div>
            <p className={ui.eyebrow}>Kamatcha</p>
            <h1 className={ui.bannerTitle}>Complete your Kamatcha account</h1>
            <p className={ui.copy}>
              You signed in with Google successfully. Just add your full name and password to
              finish your Kamatcha account and enter the system right away.
            </p>
          </div>

          <article className={`${ui.card} grid gap-4`}>
            <div>
              <p className={ui.eyebrow}>Google account</p>
              <h2 className="text-xl font-semibold text-tea-900">{auth.user?.email}</h2>
            </div>

            <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-5 py-4 text-sm leading-7 text-stone-600">
              This account already has an active session. After profile completion, the frontend
              will keep using the current token, so you do not need to sign in again.
            </div>
          </article>
        </div>

        <form className={`${ui.panel} grid gap-5`} onSubmit={handleSubmit}>
          <div>
            <p className={ui.eyebrow}>Finish setup</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">Add your details</p>
            <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
              Your full name will appear in your profile and orders. This password will be used for
              normal Kamatcha sign-in later if you need it.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Google email</span>
            <input className={ui.input} type="email" value={auth.user?.email ?? ""} disabled />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Full name</span>
            <input
              className={ui.input}
              name="fullName"
              placeholder="Alex Nguyen"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Password</span>
            <input
              className={ui.input}
              type="password"
              name="password"
              placeholder="Create a password for Kamatcha"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Confirm password</span>
            <input
              className={ui.input}
              type="password"
              name="confirmPassword"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          {notice ? (
            <div className="rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button className={ui.primaryButton} type="submit" disabled={loading}>
            {loading ? "Updating..." : "Complete account"}
          </button>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/">
              Back to home
            </Link>
            <button className="font-semibold text-matcha-700" type="button" onClick={() => auth.logout()}>
              Sign out
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
