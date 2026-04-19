/**
 * LeftSidebar — customer-facing left sidebar shown on non-account pages.
 *
 * NOTE (phase-06): This component is a near-duplicate of Sidebar.jsx but for
 * the public/customer shell. It is rendered by the old SiteLayout path.
 * After Phase 03 refactor, SiteLayout no longer renders LeftSidebar — it has
 * been replaced by SiteHeader + SiteFooter. This file is preserved for
 * backward-compat only and will be consolidated/removed in Phase 06.
 *
 * If you see this in production, check that SiteLayout.jsx no longer imports it.
 */
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import { getAdminNavigation } from "../lib/adminNavigation";
import { navigationLinks } from "../siteContent";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export default function LeftSidebar() {
  const auth = useAuth();
  const location = useLocation();
  const operationHref = useAdminOperationHref();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const canAccessAdminArea = auth.hasRole("ADMIN", "MANAGER");

  const { primaryLinks, secondaryLinks } = canAccessAdminArea
    ? getAdminNavigation({ isManagerMode, operationHref })
    : { primaryLinks: [], secondaryLinks: [] };

  const userLinks = navigationLinks.map(link => ({
    href: link.to,
    label: link.label,
    key: link.to,
  }));

  const allLinks = canAccessAdminArea ? primaryLinks : userLinks;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 overflow-y-auto border-r border-matcha-900/10 bg-cream-50/96 p-5 shadow-lift backdrop-blur-xl">
      <div className="mb-6">
        <Link className="flex items-center" to="/">
          <BrandLogo size="sm" />
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-matcha-900/10 bg-white/78 p-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
          {auth.isAuthenticated ? "Signed in" : "Not signed in"}
        </p>
        {auth.isAuthenticated ? (
          <>
            <strong className="mt-2 block text-lg font-semibold text-tea-900">
              {auth.user?.fullName || "User"}
            </strong>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              {auth.user?.role || "ACCOUNT"}
            </span>
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Sign in to access your account</p>
        )}
      </div>

      <nav aria-label="Sidebar navigation">
        <ul className="grid gap-2">
          {allLinks.map((entry) => (
            <li key={entry.key || entry.href}>
              <Link
                className={cn(
                  "block rounded-xl border px-4 py-3 text-sm font-semibold transition",
                  (location.pathname === entry.href ||
                    (entry.matchers &&
                      entry.matchers.some(
                        m => location.pathname === m || location.pathname.startsWith(m)
                      )))
                    ? "border-matcha-500/20 bg-matcha-500/10 text-matcha-800"
                    : "border-matcha-900/10 bg-white/78 text-tea-900 hover:-translate-y-0.5 hover:bg-white"
                )}
                to={entry.href}
              >
                {entry.label}
              </Link>
            </li>
          ))}

          {auth.isAuthenticated && auth.hasRole("USER", "ADMIN", "MANAGER") && (
            <li>
              <Link
                className="block rounded-xl border border-matcha-900/10 bg-white/78 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                to="/support-chat"
              >
                24/7 Support
              </Link>
            </li>
          )}

          {canAccessAdminArea && secondaryLinks.length > 0 && (
            <li>
              <div className="mt-4 border-t border-matcha-900/10 pt-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
                  More
                </p>
                <ul className="grid gap-2">
                  {secondaryLinks.map((entry) => (
                    <li key={entry.key}>
                      <Link
                        className="block rounded-xl border border-matcha-900/10 bg-white/78 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                        to={entry.href}
                      >
                        {entry.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}
