import { Link } from "react-router-dom";
import { ui } from "../ui";

export default function UnauthorizedPage() {
  return (
    <main className={ui.page}>
      <section className={`${ui.panel} text-center`}>
        <p className={ui.eyebrow}>403 / Unauthorized</p>
        <h1 className="mx-auto max-w-[14ch] text-4xl font-bold leading-none tracking-tight text-tea-900 sm:text-5xl">
          Your current account does not have access to this page.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          The admin area only allows `ADMIN` or `MANAGER` roles. You can return home or sign in
          with a different account.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className={ui.secondaryButton} to="/">
            Back to home
          </Link>
          <Link className={ui.primaryButton} to="/login">
            Sign in again
          </Link>
        </div>
      </section>
    </main>
  );
}
