import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SessionSecurityOverlay() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastRedirectNonceRef = useRef(0);

  useEffect(() => {
    if (!auth.loginRedirectNonce || auth.loginRedirectNonce === lastRedirectNonceRef.current) {
      return;
    }

    lastRedirectNonceRef.current = auth.loginRedirectNonce;

    if (location.pathname === "/login" || location.pathname === "/forgot-password") {
      return;
    }

    navigate("/login", {
      replace: true,
      state: {
        from:
          location.pathname === "/complete-profile"
            ? undefined
            : { pathname: location.pathname, search: location.search, hash: location.hash },
      },
    });
  }, [auth.loginRedirectNonce, location.hash, location.pathname, location.search, navigate]);

  if (!auth.sessionAlert) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(47,38,25,0.38)] px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-matcha-900/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,244,238,0.97))] p-6 shadow-[0_32px_90px_rgba(79,70,45,0.22)] sm:p-7">
        <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
          Bao mat phien dang nhap
        </div>

        <h2 className="mt-4 text-3xl font-bold tracking-tight text-tea-900">
          {auth.sessionAlert.title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
          {auth.sessionAlert.message}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-5 py-3 text-sm font-semibold text-foam shadow-[0_16px_30px_rgba(89,108,61,0.24)] transition hover:-translate-y-0.5"
            type="button"
            onClick={() => {
              auth.dismissSessionAlert();
              navigate("/login", { replace: true });
            }}
          >
            Dang nhap lai
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/60 px-5 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white/80"
            type="button"
            onClick={() => {
              auth.dismissSessionAlert();
              navigate("/forgot-password");
            }}
          >
            Quen mat khau
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold text-stone-500 transition hover:text-tea-900"
            type="button"
            onClick={auth.dismissSessionAlert}
          >
            Dong
          </button>
        </div>
      </div>
    </div>
  );
}
