import { Link } from "react-router-dom";
import AuthLayout from "../components/templates/auth-layout";
import { ui } from "../ui";

export default function UnauthorizedPage() {
  return (
    <AuthLayout>
      {/* Decorative kanji */}
      <p aria-hidden="true" className="mb-1 font-display text-3xl font-medium tracking-wider text-matcha-600/30">
        禁止
      </p>

      <p className={ui.eyebrow}>403 / Unauthorized</p>
      <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-ink-900">
        Your account does not have access to this page.
      </h1>
      <p className="mt-4 text-sm leading-7 text-ink-600">
        The admin area only allows <code className="rounded bg-cream-100 px-1 font-mono text-xs">ADMIN</code> or{" "}
        <code className="rounded bg-cream-100 px-1 font-mono text-xs">MANAGER</code> roles. Return
        home or sign in with a different account.
      </p>

      {/* Empty state illustration */}
      <div className="my-6 flex justify-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-matcha-50">
          <span className="font-display text-4xl font-light text-matcha-300" aria-hidden="true">403</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link className={ui.secondaryButton} to="/">
          Back to home
        </Link>
        <Link className={ui.primaryButton} to="/login">
          Sign in again
        </Link>
      </div>
    </AuthLayout>
  );
}
