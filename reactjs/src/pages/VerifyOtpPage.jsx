import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/templates/auth-layout";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { getDefaultAuthenticatedPath } from "../lib/authRedirects";
import { ui } from "../ui";

export default function VerifyOtpPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = location.state?.email ?? searchParams.get("email") ?? "";
  const [form, setForm] = useState({
    email: initialEmail,
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useToastMessage(error, {
    type: "error",
    title: "Verification failed",
  });

  if (auth.isAuthenticated) {
    return <Navigate replace to={getDefaultAuthenticatedPath(auth.user)} />;
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

    try {
      const response = await auth.verifyOtp(form);
      navigate("/login", {
        replace: true,
        state: {
          message: `${response.message} Email ${form.email} has been activated.`,
        },
      });
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "OTP verification failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Brand mark */}
      <div className="mb-6 text-center">
        <p className={ui.eyebrow}>Kamatcha</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Verify your account
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink-600">
          Enter the OTP sent to your email to activate the account and sign in.
        </p>
      </div>

      {/* OTP expiry notice */}
      {location.state?.otpExpiresAt && (
        <div className="mb-5 rounded-lg border border-beige-300 bg-beige-100/60 px-4 py-3 text-center text-sm text-ink-600">
          OTP expires at:{" "}
          <span className="font-semibold text-ink-900">{location.state.otpExpiresAt}</span>
        </div>
      )}

      <form className="grid gap-5" onSubmit={handleSubmit}>
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
          <span className="text-sm font-semibold text-ink-900">OTP code</span>
          <input
            className={`${ui.input} text-center text-lg tracking-[0.3em] font-semibold`}
            name="otp"
            placeholder="— — — — — —"
            maxLength={8}
            value={form.otp}
            onChange={handleChange}
            required
            autoComplete="one-time-code"
            inputMode="numeric"
          />
        </label>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <button className={ui.primaryButton} type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      {/* Footer links */}
      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-ink-500">
        <Link className="font-semibold text-matcha-700 hover:text-matcha-900" to="/register">
          Back to sign up
        </Link>
        <span aria-hidden="true" className="text-ink-300">|</span>
        <Link className="font-semibold text-matcha-700 hover:text-matcha-900" to="/login">
          Go to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
