export function isAdminLikeRole(role) {
  const normalizedRole = String(role ?? "").toUpperCase();
  return normalizedRole === "ADMIN" || normalizedRole === "MANAGER";
}

export function isEmployeeRole(role) {
  const normalizedRole = String(role ?? "").toUpperCase();
  return normalizedRole === "STAFF" || normalizedRole === "SHIPPER";
}

export function isProfileCompleted(user) {
  return user?.profileCompleted !== false;
}

export function getDefaultAuthenticatedPath(user) {
  if (!isProfileCompleted(user)) {
    return "/complete-profile";
  }

  if (isEmployeeRole(user?.role)) {
    return "/employee";
  }

  return isAdminLikeRole(user?.role) ? "/admin" : "/account";
}

export function resolvePostAuthPath(user, redirectPath) {
  const normalizedRole = String(user?.role ?? "").toUpperCase();
  const defaultPath = getDefaultAuthenticatedPath(user);

  if (!redirectPath || redirectPath === "/login" || redirectPath === "/complete-profile") {
    return defaultPath;
  }

  if (!isProfileCompleted(user)) {
    return "/complete-profile";
  }

  if (redirectPath.startsWith("/employee")) {
    return isEmployeeRole(normalizedRole) ? redirectPath : "/unauthorized";
  }

  if (redirectPath.startsWith("/admin")) {
    return isAdminLikeRole(normalizedRole) ? redirectPath : "/unauthorized";
  }

  if (redirectPath.startsWith("/orders") || redirectPath.startsWith("/payment")) {
    return normalizedRole === "USER" ? redirectPath : "/unauthorized";
  }

  return redirectPath;
}
