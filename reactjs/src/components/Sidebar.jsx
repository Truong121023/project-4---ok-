import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import { getAdminNavigation, isAdminNavigationEntryActive } from "../lib/adminNavigation";
import { ADMIN_HOME_PATH } from "../lib/adminRoutes";
import { useState } from "react";

function cn(...args) { return args.filter(Boolean).join(" "); }

function NavDotIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="4" r="3" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function SignOutIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export default function Sidebar() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const operationHref = useAdminOperationHref();
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;

  const { primaryLinks, secondaryLinks } = auth.hasRole("ADMIN", "MANAGER")
    ? getAdminNavigation({ isManagerMode, operationHref })
    : { primaryLinks: [], secondaryLinks: [] };

  const allLinks = [...primaryLinks, ...secondaryLinks];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/*
        Desktop sidebar — 248px wide at ≥1280, icon-only (56px) at 1024-1279.
        Hidden below 1024 (mobile uses AdminHeader burger or Sheet if needed).
      */}
      <aside
        aria-label={t("aria.adminSidebar")}
        className={cn(
          "hidden lg:flex flex-col shrink-0",
          "h-screen sticky top-0 overflow-y-auto overflow-x-hidden",
          "bg-matcha-900",
          "w-14 xl:w-[248px]",
          "transition-[width] duration-200"
        )}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center border-b border-cream-50/10 px-3 xl:px-5">
          <Link className="flex min-w-0 items-center gap-3" to={ADMIN_HOME_PATH}>
            <span className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cream-50/10 text-cream-50">
              <img
                className="h-6 w-6 object-contain"
                src="/kamatcha-logo.png"
                alt="Kamatcha"
              />
            </span>
            <span className="hidden xl:block min-w-0 truncate text-sm font-semibold uppercase tracking-[0.18em] text-cream-50">
              Kamatcha
            </span>
          </Link>
        </div>

        {/* Navigation links */}
        <nav aria-label={t("aria.adminNav")} className="flex-1 px-2 py-4 xl:px-3">
          <ul className="grid gap-1">
            {allLinks.map((entry) => {
              const active = isAdminNavigationEntryActive(location, entry);
              return (
                <li key={entry.key}>
                  <Link
                    to={entry.href}
                    title={t(`nav.${entry.key}`, { defaultValue: entry.label })}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition xl:px-3",
                      active
                        ? "bg-matcha-500 text-cream-50 shadow-[inset_3px_0_0_#7a9a3e]"
                        : "text-cream-100/70 hover:bg-cream-50/10 hover:text-cream-50"
                    )}
                  >
                    <NavDotIcon
                      className={cn(
                        "h-2 w-2 shrink-0",
                        active ? "text-cream-50" : "text-cream-50/30"
                      )}
                    />
                    <span className="hidden xl:block truncate">
                      {t(`nav.${entry.key}`, { defaultValue: entry.label })}
                    </span>
                    {active && (
                      <ChevronRightIcon className="ml-auto hidden h-4 w-4 shrink-0 text-cream-50/60 xl:block" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info + sign out */}
        <div className="shrink-0 border-t border-cream-50/10 px-2 py-4 xl:px-3">
          <div className="mb-3 hidden xl:block rounded-xl bg-cream-50/8 px-3 py-2">
            <p className="truncate text-xs font-semibold text-cream-50">
              {auth.user?.fullName || "Admin"}
            </p>
            <p className="truncate text-[11px] text-cream-100/50 uppercase tracking-[0.16em]">
              {auth.user?.role ? t(`role.${auth.user.role.toLowerCase()}`, { defaultValue: auth.user.role }) : ""}
            </p>
          </div>

          <button
            aria-label={t("buttons.signOut")}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium text-cream-100/60 transition hover:bg-cream-50/10 hover:text-cream-50 xl:px-3",
              loggingOut && "opacity-50 cursor-not-allowed"
            )}
            disabled={loggingOut}
            type="button"
            onClick={() => { void handleLogout(); }}
          >
            <SignOutIcon className="h-4 w-4 shrink-0" />
            <span className="hidden xl:block">
              {loggingOut ? t("buttons.signingOut") : t("buttons.signOut")}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
