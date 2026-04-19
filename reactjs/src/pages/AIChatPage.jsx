import { Link } from "react-router-dom";
import AIChatWidget from "../components/AIChatWidget";
import AccountLayout from "../components/templates/account-layout";
import { ui } from "../ui";

/** Minimal account nav rail for chat pages */
function ChatProfileRail({ activePage }) {
  const links = [
    { href: "/account", label: "Overview" },
    { href: "/orders", label: "Orders" },
    { href: "/support", label: "Support chat", key: "support" },
    { href: "/ai-chat", label: "AI assistant", key: "ai" },
  ];

  return (
    <div className="grid gap-4">
      <div>
        <p className={ui.eyebrow}>Account</p>
        <h2 className="font-display text-xl font-semibold text-ink-900">Help & chat</h2>
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
        <p className="font-semibold text-ink-900">AI assistant</p>
        <p className="mt-1">
          Ask Kamatcha&apos;s AI about our menu, ingredients, store hours, or anything else you&apos;d
          like to know.
        </p>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  return (
    <main className={ui.page}>
      <AccountLayout profile={<ChatProfileRail activePage="ai" />}>
        <div>
          <p className={ui.eyebrow}>AI assistant</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Chat with Kamatcha AI
          </h1>
          <p className="mt-3 text-sm leading-7 text-ink-600">
            Ask anything about our menu, ingredients, promotions, or store locations. Powered by AI.
          </p>
        </div>

        {/* AIChatWidget internals are untouched */}
        <div className="mt-6">
          <AIChatWidget />
        </div>
      </AccountLayout>
    </main>
  );
}
