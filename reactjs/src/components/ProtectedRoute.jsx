import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isProfileCompleted } from "../lib/authRedirects";
import { ui } from "../ui";

export default function ProtectedRoute({ allowedRoles }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.initializing) {
    return (
      <main className={ui.page}>
        <section className={`${ui.panel} text-center`}>
          <p className={ui.eyebrow}>Auth check</p>
          <h1 className="text-3xl font-bold tracking-tight text-tea-900">
            Verifying your session
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
            Please wait a moment...
          </p>
        </section>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!isProfileCompleted(auth.user) && location.pathname !== "/complete-profile") {
    return <Navigate replace state={{ from: location }} to="/complete-profile" />;
  }

  if (allowedRoles?.length && !auth.hasRole(...allowedRoles)) {
    return <Navigate replace to="/unauthorized" />;
  }

  return <Outlet />;
}
