import { Outlet, useLocation } from "react-router-dom";
import AdminHeader from "./admin-header";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="density-compact flex min-h-screen bg-cream-50">
      {/* Vertical sidebar — 248px desktop, hidden on mobile */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet key={location.key} />
          </div>
        </main>
      </div>
    </div>
  );
}
