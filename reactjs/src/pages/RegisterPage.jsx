import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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

  useToastMessage(error, {
    type: "error",
    title: "Registration failed",
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
    <main className={ui.page}>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`${ui.panel} flex flex-col gap-5`}>
          <div>
            <p className={ui.eyebrow}>Kamatcha</p>
            <h1 className={ui.bannerTitle}>Create your Kamatcha account in one minute</h1>
            <p className={ui.copy}>
              Create a new account to place orders, pay online, track deliveries, and unlock member perks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className={`${ui.card} h-full`}>
              <span className={ui.pill}>Step 1</span>
              <h2 className="mt-4 text-lg font-semibold text-tea-900">Register</h2>
              <p className={`${ui.muted} mt-3`}>
                Enter your basic details to create a new account.
              </p>
            </article>

            <article className={`${ui.card} h-full`}>
              <span className={ui.pill}>Step 2</span>
              <h2 className="mt-4 text-lg font-semibold text-tea-900">Receive OTP</h2>
              <p className={`${ui.muted} mt-3`}>
                Receive the OTP by email and verify the account.
              </p>
            </article>

            <article className={`${ui.card} h-full`}>
              <span className={ui.pill}>Step 3</span>
              <h2 className="mt-4 text-lg font-semibold text-tea-900">Sign in</h2>
              <p className={`${ui.muted} mt-3`}>
                Sign in to start using the system.
              </p>
            </article>
          </div>
        </div>

        <form className={`${ui.panel} grid gap-5`} onSubmit={handleSubmit}>
          <div>
            <p className={ui.eyebrow}>Create account</p>
            <p className="text-3xl font-bold tracking-tight text-tea-900">Sign up</p>
            <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
              Enter your basic information to create a new account. OTP verification is the next
              step before you sign in.
            </p>
          </div>

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
            <span className="text-sm font-semibold text-tea-900">Password</span>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-matcha-500 px-3 py-2 text-sm font-medium text-foam transition hover:-translate-y-[55%]"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-tea-900">Confirm password</span>
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-matcha-500 px-3 py-2 text-sm font-medium text-foam transition hover:-translate-y-[55%]"
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-matcha-900/10 bg-white/70 px-4 py-4 text-sm leading-7 text-stone-600">
            After successful registration, you will move to the OTP verification step.
          </div>

          <button className={ui.primaryButton} type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Create account"}
          </button>

          <div className="flex flex-wrap gap-3 text-sm text-stone-600">
            <Link className="font-semibold text-matcha-700" to="/verify-otp">
              Already have an OTP? Verify now
            </Link>
            <Link className="font-semibold text-matcha-700" to="/login">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
