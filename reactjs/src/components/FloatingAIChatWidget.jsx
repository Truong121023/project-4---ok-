import { Link } from "react-router-dom";
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

export default function FloatingAIChatWidget() {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.hasRole("USER")) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      <Link
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 text-white shadow-[0_16px_40px_rgba(39,64,45,0.28)] transition hover:-translate-y-1"
        to="/ai-chat"
        title="Chatbox AI"
      >
        <RobotIcon />
      </Link>
    </div>
  );
}
