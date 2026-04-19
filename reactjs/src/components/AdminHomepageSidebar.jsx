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
        "flex items-center justify-between rounded-md border px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-matcha-500/30 bg-matcha-100 text-matcha-800"
          : "border-ink-900/8 bg-cream-50 text-ink-800 hover:bg-cream-100",
      )}
      to={href}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-ink-400">›</span>
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
    () => getAdminNavigation({ isManagerMode, operationHref }),
    [isManagerMode, operationHref],
  );

  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <div className="grid gap-3 rounded-xl border border-ink-900/8 bg-cream-50 p-4 shadow-soft">
        {/* User identity card */}
        <div className="rounded-lg border border-matcha-700/20 bg-matcha-900 p-4 text-cream-50">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cream-50/60">
            Signed in
          </p>
          <strong className="mt-2 block text-lg font-semibold leading-tight tracking-tight text-cream-50">
            {auth.user?.fullName || "Admin user"}
          </strong>
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-cream-50/60">
            {auth.user?.role || "Account"}
          </span>
          <p className="mt-2 text-xs leading-5 text-cream-50/70">
            {isManagerMode
              ? auth.user?.workingStoreName || "No working store assigned."
              : auth.user?.email || "No email available."}
          </p>
          {isManagerMode && auth.user?.workingStoreAddress ? (
            <p className="mt-1 text-xs leading-5 text-cream-50/50">
              {auth.user.workingStoreAddress}
            </p>
          ) : null}
        </div>

        {/* Primary nav */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
            Main navigation
          </p>
          <nav className="grid gap-1" aria-label="Homepage admin navigation">
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

        {/* Secondary nav */}
        {secondaryLinks.length ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
                More modules
              </p>
              <Link className="text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-600" to="/admin">
                Dashboard
              </Link>
            </div>
            <nav className="grid gap-1" aria-label="Homepage admin modules">
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
