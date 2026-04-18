import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
    <main className={ui.page}>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col`}>
          <p className={ui.eyebrow}>Kamatcha</p>
          <h1 className={ui.bannerTitle}>Verify your OTP to activate the account</h1>
          <p className={ui.copy}>
            Enter the OTP sent to your email to activate the account and sign in normally.
          </p>

          {location.state?.otpExpiresAt ? (
            <div className="mt-7 rounded-[1.5rem] border border-matcha-900/10 bg-white/65 px-5 py-4 text-sm leading-7 text-stone-600">
              OTP expires at: {location.state.otpExpiresAt}
            </div>
          ) : null}
        </div>

        <form className={`${ui.panel} grid gap-5`} onSubmit={handleSubmit}>
          <div>
            <p className={ui.eyebrow}>Verify account</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">Enter OTP</p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Email</span>
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

          {error ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button className={ui.primaryButton} type="submit" disabled={loading}>
            {loading ? "Processing..." : "Verify OTP"}
          </button>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/register">
              Back to sign up
            </Link>
            <Link className="font-semibold text-matcha-700" to="/login">
              Go to sign in
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
