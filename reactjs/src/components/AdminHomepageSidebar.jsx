import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import {
  getAdminNavigation,
  isAdminNavigationEntryActive,
} from "../lib/adminNavigation";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function SidebarLink({ active, href, label }) {
  return (
    <Link
      className={cn(
        "flex items-center justify-between rounded-[1.25rem] border px-4 py-3 text-sm font-semibold transition",
        active
          ? "border-matcha-500/25 bg-matcha-500/12 text-matcha-800"
          : "border-matcha-900/10 bg-white/78 text-tea-900 hover:-translate-y-0.5 hover:bg-white",
      )}
      to={href}
    >
      <span>{label}</span>
      <span aria-hidden="true">{">"}</span>
    </Link>
  );
}

export default function AdminHomepageSidebar() {
  const auth = useAuth();
  const location = useLocation();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const operationHref = useAdminOperationHref();
  const { primaryLinks, secondaryLinks } = useMemo(
    () =>
      getAdminNavigation({
        isManagerMode,
        operationHref,
      }),
    [isManagerMode, operationHref],
  );

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="grid gap-4 rounded-[2rem] border border-matcha-900/10 bg-white/72 p-5 shadow-[0_24px_60px_rgba(79,70,45,0.14)] backdrop-blur-xl">
        <div className="rounded-[1.7rem] border border-matcha-900/10 bg-[#203228] p-5 text-white shadow-[0_18px_40px_rgba(32,50,40,0.22)]">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-white/62">
            Signed in
          </p>
          <strong className="mt-3 block text-2xl font-semibold tracking-tight">
            {auth.user?.fullName || "Admin user"}
          </strong>
          <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/62">
            {auth.user?.role || "Account"}
          </span>
          <p className="mt-3 text-sm leading-7 text-white/78">
            {isManagerMode
              ? auth.user?.workingStoreName || "No working store assigned."
              : auth.user?.email || "No email available."}
          </p>
          {isManagerMode && auth.user?.workingStoreAddress ? (
            <p className="mt-2 text-sm leading-7 text-white/58">
              {auth.user.workingStoreAddress}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
            Main navigation
          </p>
          <nav className="mt-3 grid gap-2" aria-label="Homepage admin navigation">
            {primaryLinks.map((entry) => (
              <SidebarLink
                key={entry.key}
                active={isAdminNavigationEntryActive(location, entry)}
                href={entry.href}
                label={entry.label}
              />
            ))}
          </nav>
        </div>

        {secondaryLinks.length ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
                More modules
              </p>
              <Link
                className="text-xs font-semibold uppercase tracking-[0.18em] text-matcha-700"
                to="/admin"
              >
                Dashboard
              </Link>
            </div>

            <nav className="mt-3 grid gap-2" aria-label="Homepage admin modules">
              {secondaryLinks.map((entry) => (
                <SidebarLink
                  key={entry.key}
                  active={isAdminNavigationEntryActive(location, entry)}
                  href={entry.href}
                  label={entry.label}
                />
              ))}
            </nav>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
