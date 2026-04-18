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
    ? getAdminNavigation({
        isManagerMode,
        operationHref,
      })
    : { primaryLinks: [], secondaryLinks: [] };

  const userLinks = navigationLinks.map(link => ({
    href: link.to,
    label: link.label,
    key: link.to,
  }));

  const allLinks = canAccessAdminArea ? primaryLinks : userLinks;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-matcha-900/10 bg-[#fffdf7]/96 p-5 shadow-[20px_0_60px_rgba(59,62,46,0.18)] backdrop-blur-xl z-40 overflow-y-auto">
      <div className="mb-6">
        <Link className="flex items-center" to="/">
          <BrandLogo size="sm" />
        </Link>
      </div>

      <div className="rounded-[1.8rem] border border-matcha-900/10 bg-white/78 p-4 mb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-tea-700">
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

      <div className="grid gap-2">
        {allLinks.map((entry) => (
          <Link
            key={entry.key || entry.href}
            className={cn(
              "rounded-[1.2rem] border px-4 py-3 text-sm font-semibold transition",
              (location.pathname === entry.href ||
               (entry.matchers && entry.matchers.some(matcher =>
                 location.pathname === matcher || location.pathname.startsWith(matcher)
               )))
                ? "border-matcha-500/20 bg-matcha-500/10 text-matcha-800"
                : "border-matcha-900/10 bg-white/78 text-tea-900 hover:-translate-y-0.5 hover:bg-white",
            )}
            to={entry.href}
          >
            {entry.label}
          </Link>
        ))}

        {auth.isAuthenticated && auth.hasRole("USER", "ADMIN", "MANAGER") && (
          <Link
            className="rounded-[1.2rem] border border-matcha-900/10 bg-white/78 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
            to="/support-chat"
          >
            24/7 Support
          </Link>
        )}

        {canAccessAdminArea && secondaryLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-matcha-900/10">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
              More
            </p>
            {secondaryLinks.map((entry) => (
              <Link
                key={entry.key}
                className="rounded-[1.2rem] border border-matcha-900/10 bg-white/78 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white block mb-2"
                to={entry.href}
              >
                {entry.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
