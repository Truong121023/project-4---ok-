import { useEffect, useRef, useState } from "react";
import useI18n from "../hooks/useI18n";

function cn(...args) {
  return args.filter(Boolean).join(" ");
}

const OPTIONS = [
  { code: "vi", label: "VI" },
  { code: "en", label: "EN" },
];

function ChevronDown({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function LanguageSwitcher({ variant = "site" }) {
  const { lang, setLang } = useI18n("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (code) => {
    setLang(code);
    setOpen(false);
  };

  const triggerClasses =
    variant === "admin"
      ? "inline-flex items-center gap-1.5 rounded-full border border-cream-50/20 bg-cream-50/10 px-3 py-1.5 text-sm font-semibold text-cream-50 transition hover:bg-cream-50/20"
      : "inline-flex items-center gap-1.5 rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm font-semibold text-tea-900 transition hover:bg-white";

  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Language"
        className={triggerClasses}
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current.label}</span>
        <ChevronDown />
      </button>

      {open && (
        <ul
          className={cn(
            "absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[6rem] overflow-hidden rounded-2xl border shadow-lift",
            variant === "admin"
              ? "border-cream-50/20 bg-matcha-900 text-cream-50"
              : "border-matcha-900/10 bg-cream-50 text-tea-900"
          )}
          role="menu"
        >
          {OPTIONS.map((opt) => {
            const active = opt.code === lang;
            return (
              <li key={opt.code} role="none">
                <button
                  aria-checked={active}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold transition",
                    variant === "admin"
                      ? active
                        ? "bg-cream-50/20"
                        : "hover:bg-cream-50/10"
                      : active
                        ? "bg-white"
                        : "hover:bg-white/70"
                  )}
                  role="menuitemradio"
                  type="button"
                  onClick={() => handleSelect(opt.code)}
                >
                  <span>{opt.label}</span>
                  {active && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
