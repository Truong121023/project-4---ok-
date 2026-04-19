import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sheet } from "./ui/index.js";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";

function cn(...args) { return args.filter(Boolean).join(" "); }

function getMobileNavClass({ isActive }) {
  return cn(
    "flex items-center rounded-xl border px-4 py-3 text-sm font-semibold transition",
    isActive
      ? "border-matcha-500/20 bg-matcha-500/10 text-matcha-800"
      : "border-matcha-900/10 bg-white/72 text-tea-900 hover:bg-white"
  );
}

/**
 * SiteMobileNav — Sheet-based full nav drawer for mobile.
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {React.RefObject} props.triggerRef — focus returns here on close
 * @param {Array<{to: string, labelKey: string}>} props.navLinks
 */
export default function SiteMobileNav({ open, onClose, triggerRef, navLinks = [] }) {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const navigate = useNavigate();

  // Return focus to hamburger after close
  useEffect(() => {
    if (!open) {
      triggerRef?.current?.focus();
    }
  }, [open, triggerRef]);

  const handleLogout = async () => {
    await auth.logout();
    onClose();
    navigate("/login");
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="left"
      title="Navigation"
      className="bg-cream-50 max-w-[20rem] w-full"
    >
      {/* Brand */}
      <div className="mb-6 flex items-center">
        <NavLink to="/" onClick={onClose}>
          <BrandLogo size="sm" />
        </NavLink>
      </div>

      {/* Nav links */}
      <nav aria-label={t("aria.mobileNav")}>
        <ul className="grid gap-2">
          {navLinks.map(link => (
            <li key={link.to}>
              <NavLink className={getMobileNavClass} to={link.to} onClick={onClose}>
                {t(link.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Auth section */}
      <div className="mt-8 border-t border-matcha-900/10 pt-6 grid gap-3">
        {auth.initializing ? null : auth.isAuthenticated ? (
          <>
            <div className="rounded-xl border border-matcha-900/10 bg-white/72 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
                {t("buttons.signedInAs")}
              </p>
              <p className="mt-1 text-sm font-semibold text-tea-900">{auth.user?.fullName || "User"}</p>
              <p className="text-xs text-stone-500">{auth.user?.email}</p>
            </div>
            <NavLink
              to="/account"
              onClick={onClose}
              className="flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/72 px-4 py-2.5 text-sm font-semibold text-tea-900 transition hover:bg-white"
            >
              {t("buttons.account")}
            </NavLink>
            <button
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(89,108,61,0.2)] transition hover:-translate-y-0.5"
              type="button"
              onClick={() => { void handleLogout(); }}
            >
              {t("buttons.signOut")}
            </button>
          </>
        ) : (
          <>
            <NavLink
              to="/register"
              onClick={onClose}
              className="flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/72 px-4 py-2.5 text-sm font-semibold text-tea-900 transition hover:bg-white"
            >
              {t("buttons.signUp")}
            </NavLink>
            <NavLink
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(89,108,61,0.2)] transition hover:-translate-y-0.5"
            >
              {t("buttons.signIn")}
            </NavLink>
          </>
        )}
      </div>
    </Sheet>
  );
}
