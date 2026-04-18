import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import { getAdminNavigation } from "../lib/adminNavigation";
import { navigationLinks } from "../siteContent";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function MenuIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 8h14M5 12h14M5 16h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function Sidebar() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const operationHref = useAdminOperationHref();
  const canAccessAdminArea = auth.hasRole("ADMIN", "MANAGER");
  const canAccessEmployeeArea = auth.hasRole("STAFF", "SHIPPER");

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

  const allLinks = canAccessAdminArea ? [...primaryLinks, ...secondaryLinks] : userLinks;

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
    <aside className="fixed left-0 top-0 h-full w-64 border-r border-matcha-900/10 bg-[#fffdf7]/96 p-5 shadow-[20px_0_60px_rgba(59,62,46,0.18)] backdrop-blur-xl z-40">
      <div className="mb-6">
        <Link className="flex items-center" to="/">
          <BrandLogo size="sm" />
        </Link>
      </div>

      <div className="rounded-[1.8rem] border border-matcha-900/10 bg-white/78 p-5 mb-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-tea-700">
          Signed in
        </p>
        <strong className="mt-3 block text-2xl font-semibold text-tea-900">
          {auth.user?.fullName || "User"}
        </strong>
        <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {auth.user?.role || "ACCOUNT"}
        </span>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          {auth.user?.email || "No email available."}
        </p>
      </div>

      <div className="grid gap-3">
        {allLinks.map((entry) => (
          <Link
            key={entry.key || entry.href}
            className={cn(
              "rounded-[1.4rem] border px-4 py-4 text-sm font-semibold transition",
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
            className="rounded-[1.4rem] border border-matcha-900/10 bg-white/78 px-4 py-4 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
            to="/support-chat"
          >
            24/7 Support
          </Link>
        )}

        {canAccessEmployeeArea && (
          <Link
            className="rounded-[1.4rem] border border-matcha-900/10 bg-white/78 px-4 py-4 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
            to="/employee"
          >
            Employee workspace
          </Link>
        )}

        <button
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-4 py-3 text-sm font-semibold text-foam shadow-[0_16px_30px_rgba(89,108,61,0.24)] transition hover:-translate-y-0.5"
          disabled={loggingOut}
          type="button"
          onClick={handleLogout}
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
