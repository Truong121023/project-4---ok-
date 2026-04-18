import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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

  useToastMessage(error, {
    type: "error",
    title: "Unable to process",
  });
  useToastMessage(notice, {
    type: "success",
    title: "Notice",
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

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setSendingOtp(true);
    setError("");
    setNotice("");

    try {
      const response = await auth.requestResetOtp({
        email: form.email,
      });

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
    <main className={ui.page}>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col gap-5`}>
          <div>
            <p className={ui.eyebrow}>Kamatcha</p>
            <h1 className={ui.bannerTitle}>Reset your password with email OTP</h1>
            <p className={ui.copy}>
              Request an OTP by email, then enter the verification code and your new password to
              reset the account.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className={ui.card}>
              <span className={ui.pill}>Step 1</span>
              <h2 className="mt-4 text-lg font-semibold text-tea-900">Request OTP</h2>
              <p className={`${ui.muted} mt-3`}>
                Enter your email to receive the password reset verification code.
              </p>
            </article>

            <article className={ui.card}>
              <span className={ui.pill}>Step 2</span>
              <h2 className="mt-4 text-lg font-semibold text-tea-900">Set new password</h2>
              <p className={`${ui.muted} mt-3`}>
                Use the OTP you just received to create a new password for the account.
              </p>
            </article>
          </div>

          {otpExpiresAt ? (
            <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/65 px-5 py-4 text-sm leading-7 text-stone-600">
              OTP expires at: {otpExpiresAt}
            </div>
          ) : null}
        </div>

        <div className={`${ui.panel} grid gap-6`}>
          <form className="grid gap-4" onSubmit={handleRequestOtp}>
            <div>
              <p className={ui.eyebrow}>Request OTP</p>
              <p className="text-3xl font-bold tracking-tight text-tea-900">Send reset code</p>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">Email</span>
              <input
                className={ui.input}
                type="email"
                name="email"
                placeholder="user.anna@kamatcha.local"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <button className={ui.primaryButton} disabled={sendingOtp} type="submit">
              {sendingOtp ? "Sending OTP..." : otpRequested ? "Resend OTP" : "Send OTP"}
            </button>
          </form>

          <form className="grid gap-4 border-t border-matcha-900/10 pt-6" onSubmit={handleResetPassword}>
            <div>
              <p className={ui.eyebrow}>Reset Password</p>
              <p className="text-3xl font-bold tracking-tight text-tea-900">Enter OTP</p>
            </div>

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

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-tea-900">OTP</span>
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
              <span className="text-sm font-semibold text-tea-900">New password</span>
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
              <span className="text-sm font-semibold text-tea-900">Confirm new password</span>
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

            <button className={ui.primaryButton} disabled={resetting || !otpRequested} type="submit">
              {resetting ? "Resetting..." : "Reset password"}
            </button>
          </form>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/login">
              Back to sign in
            </Link>
            <Link className="font-semibold text-matcha-700" to="/register">
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
