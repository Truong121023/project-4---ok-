import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { ADMIN_HOME_PATH, buildAdminOrdersPath } from "../lib/adminRoutes";

export default function useAdminOperationHref() {
  const auth = useAuth();
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const managerStoreId = String(auth.user?.workingStoreId ?? "").trim();

  return useMemo(() => {
    if (isAdmin) {
      return buildAdminOrdersPath();
    }

    if (isManagerMode) {
      return buildAdminOrdersPath({ storeId: managerStoreId });
    }

    return ADMIN_HOME_PATH;
  }, [isAdmin, isManagerMode, managerStoreId]);
}
