import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const quickLinkKeys = [
  { to: "/menu", key: "menu" },
  { to: "/stores", key: "stores" },
  { to: "/events", key: "events" },
  { to: "/promotions", key: "promotions" },
  { to: "/news", key: "news" },
  { to: "/reviews", key: "reviews" },
];

function InstagramIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function TiktokIcon({ className = "h-5 w-5" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SiteFooter() {
  const { t } = useTranslation("common");

  return (
    <footer className="mt-16 border-t border-matcha-900/10 bg-cream-200">
      {/* Main 3-column grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        {/* Col 1 — Brand */}
        <div>
          <h2 className="font-display text-lg font-semibold text-tea-900">Kamatcha</h2>
          <p className="mt-3 max-w-xs text-sm leading-7 text-stone-600">
            {t("footer.tagline")}
          </p>
          {/* Social icons */}
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("footer.instagramAriaLabel")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 text-stone-600 transition hover:bg-white hover:text-tea-900"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("footer.facebookAriaLabel")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 text-stone-600 transition hover:bg-white hover:text-tea-900"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("footer.tiktokAriaLabel")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 text-stone-600 transition hover:bg-white hover:text-tea-900"
            >
              <TiktokIcon />
            </a>
          </div>
        </div>

        {/* Col 2 — Quick links */}
        <nav aria-label={t("aria.footerQuickLinks")}>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-tea-900">
            {t("footer.exploreTitle")}
          </h3>
          <div className="mt-4 h-px bg-matcha-900/10" />
          <ul className="mt-4 grid gap-2">
            {quickLinkKeys.map(link => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className="text-sm text-stone-600 transition hover:text-tea-900"
                >
                  {t(`footer.quickLinks.${link.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Col 3 — Contact */}
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-tea-900">
            {t("footer.contactTitle")}
          </h3>
          <div className="mt-4 h-px bg-matcha-900/10" />
          <ul className="mt-4 grid gap-3 text-sm text-stone-600">
            <li>{t("footer.openHours")}</li>
            <li>
              {t("footer.hotline")}{" "}
              <span className="font-semibold text-tea-900">1900 2026</span>
            </li>
            <li>
              {t("footer.email")}{" "}
              <a
                href="mailto:hello@kamatcha.vn"
                className="font-semibold text-tea-900 transition hover:text-matcha-700"
              >
                hello@kamatcha.vn
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Legal strip */}
      <div className="border-t border-matcha-900/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-stone-500 sm:flex-row sm:px-6">
          <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
          <div className="flex gap-4">
            <a href="#" className="transition hover:text-tea-900">{t("footer.privacyPolicy")}</a>
            <a href="#" className="transition hover:text-tea-900">{t("footer.termsOfService")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
