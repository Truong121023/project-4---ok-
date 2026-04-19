import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../components/templates/auth-layout";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { getDefaultAuthenticatedPath } from "../lib/authRedirects";
import { ui } from "../ui";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useToastMessage(error, { type: "error", title: "Registration failed" });

  if (auth.isAuthenticated) {
    return <Navigate replace to={getDefaultAuthenticatedPath(auth.user)} />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Password confirmation does not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await auth.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      navigate(`/verify-otp?email=${encodeURIComponent(response.email)}`, {
        replace: true,
        state: {
          email: response.email,
          message: response.message,
          otpExpiresAt: response.otpExpiresAt,
        },
      });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Registration failed."));
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
        Create account
      </h1>
      <p className="mt-2 text-sm leading-7 text-ink-600">
        Join Kamatcha — place orders, track deliveries, and unlock member perks.
      </p>

      {/* Steps intro */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { step: "1", label: "Register", note: "Enter your details" },
          { step: "2", label: "Verify OTP", note: "Confirm via email" },
          { step: "3", label: "Sign in", note: "Start using the app" },
        ].map(({ step, label, note }) => (
          <div key={step} className="rounded-xl border border-ink-900/10 bg-cream-100 p-3 text-center">
            <span className="inline-block rounded-full bg-matcha-500 px-2 py-0.5 text-[10px] font-bold text-cream-50">
              {step}
            </span>
            <p className="mt-2 text-xs font-semibold text-ink-900">{label}</p>
            <p className="mt-0.5 text-[11px] text-ink-500">{note}</p>
          </div>
        ))}
      </div>

      <form
        className="mt-6 grid gap-4"
        onSubmit={handleSubmit}
        aria-describedby={error ? "register-error" : undefined}
      >
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">Full name</span>
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
          <span className="text-sm font-semibold text-ink-900">Email</span>
          <input
            className={ui.input}
            type="email"
            name="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={handleChange}
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
              placeholder="Enter a password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
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

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">Confirm password</span>
          <div className="relative">
            <input
              className={`${ui.input} pr-24`}
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-matcha-500 px-3 py-1.5 text-xs font-semibold text-cream-50 transition hover:bg-matcha-700"
              type="button"
              onClick={() => setShowConfirmPassword((c) => !c)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error ? (
          <div id="register-error" role="alert" className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-ink-900/10 bg-cream-100 px-4 py-3 text-sm leading-7 text-ink-600">
          After registration you will receive an OTP by email to verify the account.
        </div>

        <button
          className={ui.primaryButton}
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Submitting..." : "Create account"}
        </button>
      </form>

      {/* Footer links */}
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-ink-600">
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/verify-otp">
          Already have an OTP? Verify now
        </Link>
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/login">
          Already have an account? Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
