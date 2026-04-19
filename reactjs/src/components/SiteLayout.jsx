import { Outlet, useLocation } from "react-router-dom";
import FloatingAIChatWidget from "./FloatingAIChatWidget";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";
import SupportChatWidget from "./SupportChatWidget";
import { ToastProvider } from "./ui/index.js";
import SessionSecurityOverlay from "./SessionSecurityOverlay";
import { useAuth } from "../context/AuthContext";

export default function SiteLayout() {
  const auth = useAuth();
  const location = useLocation();

  return (
    <ToastProvider>
      <div className="relative flex min-h-screen flex-col bg-cream-50">
        <SiteHeader />

        <main className="flex-1">
          <Outlet key={location.key} />
        </main>

        <SiteFooter />

        {/* Floating widgets — order matters for z-index stacking */}
        {auth.hasRole("USER") ? <FloatingAIChatWidget /> : <SupportChatWidget />}

        <SessionSecurityOverlay />
      </div>
    </ToastProvider>
  );
}
