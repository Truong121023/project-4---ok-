import { NavLink } from "react-router-dom";

const quickLinks = [
  { to: "/menu", label: "Menu" },
  { to: "/stores", label: "Stores" },
  { to: "/events", label: "Events" },
  { to: "/promotions", label: "Promotions" },
  { to: "/news", label: "News" },
  { to: "/reviews", label: "Reviews" },
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
  return (
    <footer className="mt-16 border-t border-matcha-900/10 bg-cream-200">
      {/* Main 3-column grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        {/* Col 1 — Brand */}
        <div>
          <h2 className="font-display text-lg font-semibold text-tea-900">Kamatcha</h2>
          <p className="mt-3 max-w-xs text-sm leading-7 text-stone-600">
            Matcha, milk tea, and calm corners across the city. Crafted with intention, served with care.
          </p>
          {/* Social icons */}
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kamatcha on Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 text-stone-600 transition hover:bg-white hover:text-tea-900"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kamatcha on Facebook"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 text-stone-600 transition hover:bg-white hover:text-tea-900"
            >
              <FacebookIcon />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kamatcha on TikTok"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 text-stone-600 transition hover:bg-white hover:text-tea-900"
            >
              <TiktokIcon />
            </a>
          </div>
        </div>

        {/* Col 2 — Quick links */}
        <nav aria-label="Footer quick links">
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-tea-900">
            Explore
          </h3>
          <div className="mt-4 h-px bg-matcha-900/10" />
          <ul className="mt-4 grid gap-2">
            {quickLinks.map(link => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className="text-sm text-stone-600 transition hover:text-tea-900"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Col 3 — Contact */}
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-tea-900">
            Contact
          </h3>
          <div className="mt-4 h-px bg-matcha-900/10" />
          <ul className="mt-4 grid gap-3 text-sm text-stone-600">
            <li>Open daily 07:00 – 22:30</li>
            <li>Member hotline: <span className="font-semibold text-tea-900">1900 2026</span></li>
            <li>
              Email:{" "}
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
          <span>&copy; {new Date().getFullYear()} Kamatcha. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="transition hover:text-tea-900">Privacy Policy</a>
            <a href="#" className="transition hover:text-tea-900">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
