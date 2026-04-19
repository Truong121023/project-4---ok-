import { useEffect, useState } from "react";
import AIChatWidget from "./AIChatWidget";
import { useAuth } from "../context/AuthContext";

function RobotIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" y="8" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 4v4M9 4h6M9 12h.01M15 12h.01M9 15h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function FloatingAIChatWidget() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  // Close on Escape key for accessibility
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!auth.isAuthenticated || !auth.hasRole("USER")) {
    return null;
  }

  return (
    <>
      {/* Popover chat panel — floating window above bubble */}
      {open ? (
        <div
          className="fixed inset-x-3 bottom-24 z-[79] mx-auto sm:inset-auto sm:bottom-24 sm:right-5 sm:mx-0"
          role="dialog"
          aria-modal="false"
          aria-label="Kamatcha AI chat"
        >
          <div className="h-[min(38rem,calc(100dvh-8rem))] w-full sm:w-[26rem] lg:w-[28rem]">
            <AIChatWidget />
          </div>
        </div>
      ) : null}

      {/* Floating action bubble — toggles the panel */}
      <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
        <button
          aria-expanded={open}
          aria-label={open ? "Close Kamatcha AI chat" : "Open Kamatcha AI chat"}
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 text-white shadow-[0_16px_40px_rgba(39,64,45,0.28)] transition hover:-translate-y-1 active:scale-95"
          title="Chatbox AI"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon /> : <RobotIcon />}
        </button>
      </div>
    </>
  );
}
