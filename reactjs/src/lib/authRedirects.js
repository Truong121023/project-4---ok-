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

  return "/";
}

export function resolvePostAuthPath(user, redirectPath) {
  const defaultPath = getDefaultAuthenticatedPath(user);

  if (!redirectPath || redirectPath === "/login" || redirectPath === "/complete-profile") {
    return defaultPath;
  }

  if (!isProfileCompleted(user)) {
    return "/complete-profile";
  }

  return defaultPath;
}
