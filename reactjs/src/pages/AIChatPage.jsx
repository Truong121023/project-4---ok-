import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AIChatWidget from "../components/AIChatWidget";
import AccountLayout from "../components/templates/account-layout";
import { ui } from "../ui";

/** Minimal account nav rail for chat pages */
function ChatProfileRail({ activePage, t }) {
  const links = [
    { href: "/account", label: t("nav.overview") },
    { href: "/orders", label: t("nav.orders") },
    { href: "/support", label: t("nav.support"), key: "support" },
    { href: "/ai-chat", label: t("nav.aiChat"), key: "ai" },
  ];

  return (
    <div className="grid gap-4">
      <div>
        <p className={ui.eyebrow}>{t("chat.navEyebrow")}</p>
        <h2 className="font-display text-xl font-semibold text-ink-900">{t("chat.navTitle")}</h2>
      </div>
      <nav aria-label="Account sections" className="grid gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              link.key === activePage
                ? "bg-matcha-500/10 font-semibold text-matcha-800"
                : "text-ink-700 hover:bg-cream-100"
            }`}
            to={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="rounded-lg border border-ink-900/10 bg-cream-100/60 px-4 py-3 text-sm leading-7 text-ink-600">
        <p className="font-semibold text-ink-900">{t("chat.aiTitle")}</p>
        <p className="mt-1">{t("chat.aiBody")}</p>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const { t } = useTranslation("account");

  return (
    <main className={ui.page}>
      <AccountLayout profile={<ChatProfileRail activePage="ai" t={t} />}>
        <div>
          <p className={ui.eyebrow}>{t("chat.aiPageEyebrow")}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {t("chat.aiPageHeadline")}
          </h1>
          <p className="mt-3 text-sm leading-7 text-ink-600">
            {t("chat.aiPageSubcopy")}
          </p>
        </div>

        {/* AIChatWidget fills the available height */}
        <div className="mt-6 h-[70dvh] min-h-[34rem]">
          <AIChatWidget />
        </div>
      </AccountLayout>
    </main>
  );
}
