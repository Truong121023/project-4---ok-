import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import SiteMobileNav from "./site-mobile-nav";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { navigationLinks } from "../siteContent";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import { getAdminNavigation } from "../lib/adminNavigation";

function cn(...args) { return args.filter(Boolean).join(" "); }

function CartIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 8h14M5 12h14M5 16h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
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

function getNavClass({ isActive }) {
  return cn(
    "rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition",
    isActive
      ? "bg-white text-tea-900 shadow-[0_10px_24px_rgba(79,70,45,0.08)]"
      : "text-stone-600 hover:bg-white/70 hover:text-tea-900"
  );
}

export default function SiteHeader() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const { cartCount } = useSiteData();
  const location = useLocation();
  const operationHref = useAdminOperationHref();
  const hamburgerRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Scroll detection — rAF throttled
  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        rafId = null;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const canAccessAdminArea = auth.hasRole("ADMIN", "MANAGER");
  const canAccessEmployeeArea = auth.hasRole("STAFF", "SHIPPER");
  const canUseSupportChat = auth.hasRole("USER", "ADMIN", "MANAGER");

  const adminNavLinks = canAccessAdminArea
    ? getAdminNavigation({ isManagerMode, operationHref }).primaryLinks.map(e => ({
        to: e.href,
        labelKey: `nav.${e.key}`,
      }))
    : [];

  const navLinks = canAccessAdminArea
    ? [
        ...adminNavLinks,
        ...(canUseSupportChat ? [{ to: "/support-chat", labelKey: "nav.support" }] : []),
      ]
    : [
        ...navigationLinks,
        ...(canUseSupportChat ? [{ to: "/support-chat", labelKey: "nav.support" }] : []),
        ...(canAccessEmployeeArea ? [{ to: "/employee", labelKey: "nav.workspace" }] : []),
      ];

  const cartAriaLabel = cartCount
    ? `${t("aria.cart")}, ${t("cart.items_count_other", { count: cartCount })}`
    : t("aria.cart");

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-[background-color,box-shadow,backdrop-filter] duration-200",
          scrolled
            ? "bg-cream-50/90 backdrop-blur-md shadow-[0_1px_0_rgba(42,58,30,0.10)]"
            : "bg-cream-50"
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <NavLink className="inline-flex shrink-0 items-center" to="/">
            <BrandLogo size="md" subtitleClassName="hidden sm:block" />
          </NavLink>

          {/* Center nav — desktop only */}
          <nav className="hidden flex-1 justify-center gap-1 lg:flex" aria-label={t("aria.mainNav")}>
            {navLinks.slice(0, 6).map(link => (
              <NavLink key={link.to} className={getNavClass} to={link.to}>
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Language */}
            <LanguageSwitcher variant="site" />

            {/* Cart */}
            <NavLink
              to="/cart"
              aria-label={cartAriaLabel}
              className="inline-flex items-center gap-1.5 rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm font-semibold text-tea-900 transition hover:bg-white"
            >
              <CartIcon />
              <span className="hidden sm:inline">{t("cart.label")}</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-matcha-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </NavLink>

            {/* Auth */}
            {auth.initializing ? null : auth.isAuthenticated ? (
              <NavLink
                to="/account"
                aria-label={t("aria.account")}
                className="inline-flex items-center gap-1.5 rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm font-semibold text-tea-900 transition hover:bg-white"
              >
                <UserIcon />
                <span className="hidden sm:inline">{t("buttons.account")}</span>
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/register"
                  className="hidden rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm font-semibold text-tea-900 transition hover:bg-white sm:inline-flex"
                >
                  {t("buttons.signUp")}
                </NavLink>
                <NavLink
                  to="/login"
                  className="inline-flex rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(89,108,61,0.2)] transition hover:-translate-y-0.5"
                >
                  {t("buttons.signIn")}
                </NavLink>
              </>
            )}

            {/* Hamburger — mobile */}
            <button
              ref={hamburgerRef}
              aria-label={t("aria.menu")}
              aria-expanded={mobileNavOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-matcha-900/10 bg-white/72 text-tea-900 transition hover:bg-white lg:hidden"
              type="button"
              onClick={() => setMobileNavOpen(true)}
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>
        {/* Hairline bottom border */}
        <div aria-hidden="true" className="h-px w-full bg-matcha-900/10" />
      </header>

      <SiteMobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        triggerRef={hamburgerRef}
        navLinks={navLinks}
      />
    </>
  );
}
