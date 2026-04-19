import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Breadcrumb } from "./ui/index.js";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../context/AuthContext";

function cn(...args) { return args.filter(Boolean).join(" "); }

function buildBreadcrumb(pathname, t) {
  const segments = pathname.split("/").filter(Boolean);
  const items = [];

  segments.forEach((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const isId = /^\d+$/.test(seg) || (seg.length > 8 && !t(`breadcrumb.${seg}`, { defaultValue: "" }));
    const label = isId
      ? `#${seg}`
      : t(`breadcrumb.${seg}`, { defaultValue: seg.charAt(0).toUpperCase() + seg.slice(1) });
    items.push({ label, href });
  });

  return items;
}

function UserMenuPanel({ onClose, onLogout, loggingOut, user, isManagerMode, t }) {
  return (
    <div
      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-2xl border border-matcha-900/10 bg-cream-50 p-4 shadow-lift"
      role="menu"
    >
      <div className="mb-3 rounded-xl border border-matcha-900/10 bg-white/72 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          {t("buttons.signedIn")}
        </p>
        <p className="mt-1 text-sm font-semibold text-tea-900">{user?.fullName || "Admin"}</p>
        <p className="text-xs text-stone-500">{isManagerMode ? user?.workingStoreName : user?.email}</p>
      </div>
      <div className="grid gap-2">
        <button
          className="w-full rounded-xl border border-matcha-900/10 bg-white/72 px-4 py-2.5 text-left text-sm font-semibold text-tea-900 transition hover:bg-white"
          role="menuitem"
          type="button"
          onClick={onClose}
        >
          {t("buttons.closeMenu")}
        </button>
        <button
          className={cn(
            "w-full rounded-xl bg-gradient-to-br from-matcha-500 to-matcha-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5",
            loggingOut && "opacity-60 cursor-not-allowed"
          )}
          disabled={loggingOut}
          role="menuitem"
          type="button"
          onClick={onLogout}
        >
          {loggingOut ? t("buttons.signingOut") : t("buttons.signOut")}
        </button>
      </div>
    </div>
  );
}

function UserIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminHeader() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const breadcrumbItems = buildBreadcrumb(location.pathname, t);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-cream-50/20 bg-matcha-900 px-4 sm:px-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={breadcrumbItems}
        className="[&_a]:text-cream-100/70 [&_a:hover]:text-cream-50 [&_span[aria-current]]:text-cream-50 [&_.text-beige-400]:text-cream-50/30 [&_ol]:text-cream-100/60"
      />

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher variant="admin" />

        {/* User menu trigger */}
        <div className="relative">
          {menuOpen && (
            <button
              aria-label={t("aria.closeUserMenu")}
              className="fixed inset-0 z-40"
              type="button"
              onClick={() => setMenuOpen(false)}
            />
          )}
          <button
            aria-label={t("aria.openUserMenu")}
            aria-expanded={menuOpen}
            className="relative z-50 inline-flex items-center gap-2 rounded-full border border-cream-50/20 bg-cream-50/10 px-3 py-1.5 text-sm font-semibold text-cream-50 transition hover:bg-cream-50/20"
            type="button"
            onClick={() => setMenuOpen(v => !v)}
          >
            <UserIcon />
            <span className="hidden sm:inline max-w-[10rem] truncate">
              {auth.user?.fullName || "Admin"}
            </span>
          </button>

          {menuOpen && (
            <UserMenuPanel
              user={auth.user}
              isManagerMode={isManagerMode}
              loggingOut={loggingOut}
              onClose={() => setMenuOpen(false)}
              onLogout={() => { void handleLogout(); }}
              t={t}
            />
          )}
        </div>
      </div>
    </header>
  );
}
