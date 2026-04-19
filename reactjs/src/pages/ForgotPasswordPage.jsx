import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/templates/auth-layout";
import { useAuth } from "../context/AuthContext";
import { useToastMessage } from "../hooks/useToastMessage";
import { getApiErrorMessage } from "../lib/api";
import { getDefaultAuthenticatedPath } from "../lib/authRedirects";
import { ui } from "../ui";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = location.state?.email ?? searchParams.get("email") ?? "";
  const [form, setForm] = useState({
    email: initialEmail,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otpRequested, setOtpRequested] = useState(Boolean(initialEmail));
  const [otpExpiresAt, setOtpExpiresAt] = useState(location.state?.otpExpiresAt ?? "");
  const [notice, setNotice] = useState(location.state?.message ?? "");
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);

  useToastMessage(error, { type: "error", title: "Unable to process" });
  useToastMessage(notice, { type: "success", title: "Notice" });

  if (auth.isAuthenticated) {
    return <Navigate replace to={getDefaultAuthenticatedPath(auth.user)} />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setSendingOtp(true);
    setError("");
    setNotice("");
    try {
      const response = await auth.requestResetOtp({ email: form.email });
      setOtpRequested(true);
      setOtpExpiresAt(response?.otpExpiresAt ?? "");
      setNotice(response?.message ?? "OTP sent. Please check your email.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to send the reset OTP."));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setResetting(true);
    setError("");
    setNotice("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Password confirmation does not match.");
      setResetting(false);
      return;
    }

    try {
      const response = await auth.resetPassword({
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });
      navigate("/login", {
        replace: true,
        state: {
          message: response?.message
            ? `${response.message} Please sign in with your new password.`
            : "Password reset successful. Please sign in with your new password.",
        },
      });
    } catch (resetError) {
      setError(getApiErrorMessage(resetError, "Unable to reset the password."));
    } finally {
      setResetting(false);
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
        Reset password
      </h1>
      <p className="mt-2 text-sm leading-7 text-ink-600">
        Request an OTP by email, then enter the code and your new password.
      </p>

      {/* Steps */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          { step: "1", label: "Request OTP", note: "Enter email to receive code" },
          { step: "2", label: "Set new password", note: "Use OTP to create new password" },
        ].map(({ step, label, note }) => (
          <div key={step} className="rounded-xl border border-ink-900/10 bg-cream-100 p-3">
            <span className="inline-block rounded-full bg-matcha-500 px-2 py-0.5 text-[10px] font-bold text-cream-50">
              {step}
            </span>
            <p className="mt-2 text-xs font-semibold text-ink-900">{label}</p>
            <p className="mt-0.5 text-[11px] text-ink-500">{note}</p>
          </div>
        ))}
      </div>

      {otpExpiresAt ? (
        <div className="mt-4 rounded-xl border border-ink-900/10 bg-cream-100 px-4 py-3 text-sm leading-7 text-ink-600">
          OTP expires at: {otpExpiresAt}
        </div>
      ) : null}

      {/* Step 1 — Request OTP */}
      <form className="mt-6 grid gap-4" onSubmit={handleRequestOtp}>
        <div>
          <p className={ui.eyebrow}>Step 1</p>
          <p className="font-display text-xl font-semibold text-ink-900">Send reset code</p>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">Email</span>
          <input
            className={ui.input}
            type="email"
            name="email"
            placeholder="user@kamatcha.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <button className={ui.primaryButton} disabled={sendingOtp} type="submit" aria-busy={sendingOtp}>
          {sendingOtp ? "Sending OTP..." : otpRequested ? "Resend OTP" : "Send OTP"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 h-px bg-ink-900/10" />

      {/* Step 2 — Reset password */}
      <form
        className="grid gap-4"
        onSubmit={handleResetPassword}
        aria-describedby={error ? "forgot-error" : undefined}
      >
        <div>
          <p className={ui.eyebrow}>Step 2</p>
          <p className="font-display text-xl font-semibold text-ink-900">Enter OTP &amp; new password</p>
        </div>

        {notice ? (
          <div className="rounded-xl border border-matcha-200 bg-matcha-50 px-4 py-3 text-sm text-matcha-700">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div id="forgot-error" role="alert" className="rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">OTP</span>
          <input
            className={ui.input}
            name="otp"
            placeholder="Enter the OTP code"
            value={form.otp}
            onChange={handleChange}
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">New password</span>
          <input
            className={ui.input}
            type="password"
            name="newPassword"
            placeholder="Enter a new password"
            value={form.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink-900">Confirm new password</span>
          <input
            className={ui.input}
            type="password"
            name="confirmPassword"
            placeholder="Re-enter the new password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </label>

        <button
          className={ui.primaryButton}
          disabled={resetting || !otpRequested}
          type="submit"
          aria-busy={resetting}
        >
          {resetting ? "Resetting..." : "Reset password"}
        </button>
      </form>

      {/* Footer links */}
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-ink-600">
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/login">
          Back to sign in
        </Link>
        <Link className="font-semibold text-matcha-700 hover:text-matcha-500" to="/register">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
