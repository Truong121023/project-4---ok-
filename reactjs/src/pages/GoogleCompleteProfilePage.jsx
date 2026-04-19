import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/templates/auth-layout";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { isProfileCompleted, resolvePostAuthPath } from "../lib/authRedirects";
import { ui } from "../ui";
import { useTranslation } from "react-i18next";

const initialForm = { fullName: "", password: "", confirmPassword: "" };

export default function GoogleCompleteProfilePage() {
  const { t } = useTranslation("auth");
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
  useToastMessage(error, { type: "error", title: t("googleProfile.failedTitle") });
  useToastMessage(notice, { type: "success", title: t("login.notice") });

  if (auth.initializing) {
    return (
      <AuthLayout>
        <p className={ui.eyebrow}>{t("googleProfile.eyebrow")}</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">{t("googleProfile.restoringTitle")}</h1>
        <p className="mt-3 text-sm leading-7 text-ink-600">{t("googleProfile.restoringSubtitle")}</p>
      </AuthLayout>
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
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    if (!form.fullName.trim()) {
      setError(t("googleProfile.validationFullName"));
      setLoading(false);
      return;
    }

    if (!form.password.trim()) {
      setError(t("googleProfile.validationPassword"));
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t("googleProfile.validationConfirmPassword"));
      setLoading(false);
      return;
    }

    try {
      const response = await auth.completeGoogleProfile({
        fullName: form.fullName.trim(),
        password: form.password,
      });
      setNotice(response?.message ?? t("googleProfile.profileUpdated"));
      navigate(resolvePostAuthPath(response.user, redirectTo), { replace: true });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, t("googleProfile.failed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout wide>
      {/* Eyebrow */}
      <p aria-hidden="true" className="mb-1 font-display text-2xl font-medium tracking-wider text-matcha-600/50">
        抹茶
      </p>
      <p className={ui.eyebrow}>Kamatcha</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink-900">
        {t("googleProfile.title")}
      </h1>
      <p className="mt-2 text-sm leading-7 text-ink-600">
        {t("googleProfile.subtitle")}
      </p>

      {/* Google account info */}
      <div className="mt-5 rounded-xl border border-matcha-200 bg-matcha-50 p-4">
        <p className={ui.eyebrow}>{t("googleProfile.googleAccountSection")}</p>
        <p className="mt-1 font-semibold text-ink-900">{auth.user?.email}</p>
        <p className="mt-2 text-xs leading-6 text-ink-600">
          {t("googleProfile.sessionNote")}
        </p>
      </div>

      <form
        className="mt-6 grid gap-4"
        onSubmit={handleSubmit}
        aria-describedby={error ? "google-profile-error" : undefined}
      >
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">{t("googleProfile.googleEmail")}</span>
          <input className={ui.input} type="email" value={auth.user?.email ?? ""} disabled />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">{t("googleProfile.fullName")}</span>
          <input
            className={ui.input}
            name="fullName"
            placeholder={t("googleProfile.fullNamePlaceholder")}
            value={form.fullName}
            onChange={handleChange}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">{t("googleProfile.password")}</span>
          <input
            className={ui.input}
            type="password"
            name="password"
            placeholder={t("googleProfile.passwordPlaceholder")}
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">{t("googleProfile.confirmPassword")}</span>
          <input
            className={ui.input}
            type="password"
            name="confirmPassword"
            placeholder={t("googleProfile.confirmPasswordPlaceholder")}
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </label>

        {notice ? (
          <div className="rounded-xl border border-matcha-200 bg-matcha-50 px-4 py-3 text-sm text-matcha-700">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div id="google-profile-error" role="alert" className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <button
          className={ui.primaryButton}
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? t("googleProfile.submitting") : t("googleProfile.submit")}
        </button>
      </form>

      {/* Footer links */}
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-ink-600">
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/">
          {t("googleProfile.backToHome")}
        </Link>
        <button
          className="font-semibold text-matcha-700 hover:text-matcha-500"
          type="button"
          onClick={() => auth.logout()}
        >
          {t("googleProfile.signOut")}
        </button>
      </div>
    </AuthLayout>
  );
}
