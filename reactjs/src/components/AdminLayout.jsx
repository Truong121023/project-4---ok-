import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import useAdminOperationHref from "../hooks/useAdminOperationHref";
import {
  ADMIN_HOME_PATH,
  ADMIN_SECTION_ROUTE_MAP,
  buildAdminOrderPath,
  buildAdminWorkspacePath,
} from "../lib/adminRoutes";
import {
  getAdminNavigation,
  isAdminNavigationEntryActive,
} from "../lib/adminNavigation";
import { formatShortDateTimeVn } from "../lib/locale";
import { ui } from "../ui";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function MenuIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 8h14M5 12h14M5 16h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BellIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 4a4 4 0 0 0-4 4v2.1c0 .7-.2 1.4-.6 2l-1.3 2.1A1 1 0 0 0 7 16h10a1 1 0 0 0 .9-1.5l-1.3-2.1a3.8 3.8 0 0 1-.6-2V8a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function formatNotificationTime(value) {
  return formatShortDateTimeVn(value, "Just now");
}

function getNormalizedNotificationType(notification) {
  return String(notification?.type ?? "").trim().toUpperCase();
}

function extractFirstNumberToken(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (!text) {
      continue;
    }

    const matched = text.match(/#\s*(\d+)/) ?? text.match(/\b(\d{1,12})\b/);

    if (matched?.[1]) {
      return matched[1];
    }
  }

  return "";
}

function getNotificationOrderId(notification) {
  const metadata =
    notification?.metadata && typeof notification.metadata === "object"
      ? notification.metadata
      : {};

  return (
    String(notification?.orderId ?? metadata.orderId ?? "").trim() ||
    extractFirstNumberToken(notification?.title, notification?.message)
  );
}

function getNotificationNewsKey(notification) {
  const metadata =
    notification?.metadata && typeof notification.metadata === "object"
      ? notification.metadata
      : {};

  return String(
    notification?.newsSlug ??
      metadata.newsSlug ??
      notification?.newsKey ??
      metadata.newsKey ??
      notification?.newsId ??
      metadata.newsId ??
      notification?.slug ??
      metadata.slug ??
      "",
  ).trim();
}

function getNotificationEventKey(notification) {
  const metadata =
    notification?.metadata && typeof notification.metadata === "object"
      ? notification.metadata
      : {};

  return String(
    notification?.eventSlug ??
      metadata.eventSlug ??
      notification?.eventId ??
      metadata.eventId ??
      notification?.slug ??
      metadata.slug ??
      "",
  ).trim();
}

function getNotificationTargetPath(notification) {
  const notificationType = getNormalizedNotificationType(notification);
  const orderId = getNotificationOrderId(notification);
  const actionUrl = String(notification?.actionUrl ?? "").trim();

  if (notificationType === "ORDER_STATUS" || notificationType.includes("ORDER")) {
    return orderId ? buildAdminOrderPath(orderId) : buildAdminWorkspacePath({ sectionKey: "orders" });
  }

  if (notificationType.includes("NEWS")) {
    return ADMIN_SECTION_ROUTE_MAP.news;
  }

  if (notificationType === "BRAND_EVENT" || notificationType.includes("EVENT")) {
    return ADMIN_SECTION_ROUTE_MAP.events;
  }

  if (actionUrl.startsWith("/admin")) {
    return actionUrl;
  }

  return actionUrl;
}

function getNotificationActionLabel(notification) {
  return getNotificationTargetPath(notification) ? "View now" : "Mark read";
}

function HeaderChip({ active, href, label }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-3 text-[15px] font-semibold transition",
        active
          ? "bg-white text-tea-900 shadow-[0_10px_24px_rgba(79,70,45,0.12)]"
          : "bg-[#f8f3ea] text-tea-900 hover:-translate-y-0.5 hover:bg-white",
      )}
      to={href}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout() {
  const auth = useAuth();
  const {
    notifications,
    unreadNotificationCount,
    notificationLoading,
    notificationError,
    refreshNotifications,
    markNotificationRead,
    markNotificationUnread,
    markAllNotificationsRead,
  } = useSiteData();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = auth.hasRole("ADMIN");
  const isManagerMode = auth.hasRole("MANAGER") && !isAdmin;
  const operationHref = useAdminOperationHref();
  const { primaryLinks, secondaryLinks } = useMemo(
    () =>
      getAdminNavigation({
        isManagerMode,
        operationHref,
      }),
    [isManagerMode, operationHref],
  );

  useEffect(() => {
    setMenuOpen(false);
    setNotificationPanelOpen(false);
    setNotificationNotice("");
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen || typeof document === "undefined") {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!notificationPanelOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotificationPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationPanelOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await auth.logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleNotificationToggle = () => {
    const nextOpen = !notificationPanelOpen;
    setNotificationPanelOpen(nextOpen);
    setMenuOpen(false);
    setNotificationNotice("");

    if (nextOpen) {
      void refreshNotifications().catch(() => {});
    }
  };

  const handleNotificationAction = async (notification) => {
    setNotificationNotice("");

    if (!notification?.read) {
      const result = await markNotificationRead(notification.id);

      if (!result.ok) {
        setNotificationNotice(result.message);
        return;
      }
    }

    setNotificationPanelOpen(false);
    const targetPath = getNotificationTargetPath(notification);

    if (targetPath) {
      navigate(targetPath);
    }
  };

  const handleNotificationReadToggle = async (notification) => {
    const result = notification.read
      ? await markNotificationUnread(notification.id)
      : await markNotificationRead(notification.id);

    setNotificationNotice(result.message);
  };

  const handleReadAllNotifications = async () => {
    const result = await markAllNotificationsRead();
    setNotificationNotice(result.message);
  };

  return (
    <div className="min-h-screen bg-[#efe3b8] text-tea-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,200,116,0.42),transparent_28%),radial-gradient(circle_at_top_right,rgba(150,171,116,0.24),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(152,171,108,0.22),transparent_28%),linear-gradient(180deg,#f4ecd3_0%,#edf0d6_100%)]" />

      <div
        className={cn(
          "relative mx-auto min-h-screen px-4 py-5 transition-[padding] duration-300 sm:px-6 lg:px-8",
          menuOpen ? "xl:pr-[29rem]" : "",
        )}
      >
        <header className="relative z-[130] mx-auto w-full max-w-7xl rounded-[2rem] border border-matcha-900/10 bg-white/72 p-4 shadow-[0_24px_60px_rgba(79,70,45,0.14)] backdrop-blur-xl transition-[width] duration-300 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center" to={ADMIN_HOME_PATH}>
              <BrandLogo size="md" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="relative z-[140]">
                {notificationPanelOpen ? (
                  <button
                    className="fixed inset-0 z-[135] bg-transparent"
                    type="button"
                    onClick={() => setNotificationPanelOpen(false)}
                  />
                ) : null}

                <button
                  aria-label="Open notifications"
                  className="relative z-[145] inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 px-3 text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                  type="button"
                  onClick={handleNotificationToggle}
                >
                  <BellIcon />
                  {unreadNotificationCount > 0 ? (
                    <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                </button>

                {notificationPanelOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[150] w-[min(28rem,calc(100vw-2rem))] max-h-[min(32rem,calc(100vh-8rem))] overflow-y-auto rounded-[1.6rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 shadow-[0_24px_60px_rgba(39,64,45,0.18)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-stone-500">
                          Notifications
                        </p>
                        <p className="mt-2 text-sm leading-7 text-stone-600">
                          Latest store, order, moderation, and workspace updates for your admin panel.
                        </p>
                      </div>

                      <button
                        className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm font-semibold text-tea-900 transition hover:bg-white"
                        type="button"
                        onClick={handleReadAllNotifications}
                      >
                        Read all
                      </button>
                    </div>

                    {notificationNotice ? (
                      <div className="mt-4 rounded-2xl bg-matcha-500/12 px-4 py-3 text-sm text-matcha-700">
                        {notificationNotice}
                      </div>
                    ) : null}

                    {notificationError ? (
                      <div className="mt-4 rounded-2xl bg-red-100/80 px-4 py-3 text-sm text-red-700">
                        {notificationError}
                      </div>
                    ) : null}

                    {notificationLoading ? (
                      <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                        Loading notifications...
                      </div>
                    ) : notifications.length ? (
                      <div className="mt-4 grid gap-3">
                        {notifications.map((notification) => (
                          <article
                            key={notification.id}
                            className={cn(
                              "rounded-[1.2rem] border p-4 transition",
                              notification.read
                                ? "border-matcha-900/10 bg-white/70"
                                : "border-matcha-500/20 bg-matcha-500/10",
                            )}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-matcha-700">
                                    {notification.type || "UPDATE"}
                                  </span>
                                  {!notification.read ? (
                                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                                      New
                                    </span>
                                  ) : null}
                                </div>

                                <h3 className="mt-3 text-sm font-semibold text-tea-900">
                                  {notification.title || "Notification"}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-stone-600">
                                  {notification.message || "You have a new update."}
                                </p>
                                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-500">
                                  {formatNotificationTime(notification.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                className={ui.primaryButton}
                                type="button"
                                onClick={() => handleNotificationAction(notification)}
                              >
                                {getNotificationActionLabel(notification)}
                              </button>
                              <button
                                className={ui.secondaryButton}
                                type="button"
                                onClick={() => handleNotificationReadToggle(notification)}
                              >
                                {notification.read ? "Mark unread" : "Mark read"}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.2rem] border border-dashed border-matcha-900/15 bg-white/60 p-4 text-sm text-stone-600">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <button
                aria-label="Open admin menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                type="button"
                onClick={() => {
                  setNotificationPanelOpen(false);
                  setMenuOpen((current) => !current);
                }}
              >
                <MenuIcon />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[1.9rem] border border-white/65 bg-[#ebe4d3] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <nav className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2.5">
                {primaryLinks.map((entry) => (
                  <HeaderChip
                    key={entry.key}
                    active={isAdminNavigationEntryActive(location, entry)}
                    href={entry.href}
                    label={entry.label}
                  />
                ))}
              </div>
            </nav>
          </div>
        </header>

        <main className="mx-auto mt-6 w-full max-w-7xl">
          <Outlet key={location.key} />
        </main>

        <footer className="relative z-10 mx-auto mt-8 flex w-full max-w-7xl flex-col gap-4 px-2 pb-4 text-sm text-stone-600 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-tea-900">
              Kamatcha
            </p>
            <p className="mt-3 max-w-2xl leading-7">
              Matcha, milk tea, and calm corners across the city.
            </p>
          </div>

          <div className="grid gap-1 lg:text-right">
            <span>Open daily 07:00 - 22:30</span>
            <span>Member hotline 1900 2026</span>
          </div>
        </footer>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[160] flex justify-end bg-[#24331f]/28 backdrop-blur-[2px] xl:items-start xl:px-6 xl:py-5">
          <button
            aria-label="Close admin menu"
            className="flex-1"
            type="button"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="flex h-[100dvh] w-[min(25.5rem,calc(100vw-0.75rem))] max-w-full flex-col overflow-hidden rounded-l-[1.9rem] border-l border-matcha-900/10 bg-[#fffdf7]/96 shadow-[-20px_0_60px_rgba(59,62,46,0.18)] backdrop-blur-xl xl:h-[calc(100dvh-2.5rem)] xl:w-[25.5rem] xl:rounded-[1.9rem] xl:border">
            <div className="shrink-0 border-b border-matcha-900/10 px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-tea-700">
                    Signed in
                  </p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    Scroll to open every module in your workspace.
                  </p>
                </div>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 px-4 py-2 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                  type="button"
                  onClick={() => setMenuOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="grid gap-5">
                <div className="rounded-[1.8rem] border border-matcha-900/10 bg-white/78 p-5">
                  <strong className="block text-2xl font-semibold text-tea-900">
                    {auth.user?.fullName || "Admin user"}
                  </strong>
                  <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {auth.user?.role || "ACCOUNT"}
                  </span>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    {isManagerMode
                      ? auth.user?.workingStoreName || "No working store assigned."
                      : auth.user?.email || "No email available."}
                  </p>
                  {isManagerMode && auth.user?.workingStoreAddress ? (
                    <p className="mt-2 text-sm leading-7 text-stone-500">
                      {auth.user.workingStoreAddress}
                    </p>
                  ) : null}
                </div>

                {secondaryLinks.length ? (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-matcha-900/10 bg-white/55 px-4 py-3">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-stone-500">
                          More modules
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          Swipe and scroll to reach every workspace section.
                        </p>
                      </div>
                      <span className="rounded-full bg-matcha-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-matcha-700">
                        {secondaryLinks.length} items
                      </span>
                    </div>

                    <div className="grid gap-3 pb-1">
                      {secondaryLinks.map((entry) => (
                        <Link
                          key={entry.key}
                          className={cn(
                            "rounded-[1.4rem] border px-4 py-4 text-sm font-semibold transition",
                            isAdminNavigationEntryActive(location, entry)
                              ? "border-matcha-500/20 bg-matcha-500/10 text-matcha-800"
                              : "border-matcha-900/10 bg-white/78 text-tea-900 hover:-translate-y-0.5 hover:bg-white",
                          )}
                          to={entry.href}
                        >
                          {entry.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-matcha-900/10 px-5 pb-5 pt-4">
              <div className="grid gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/82 px-4 py-3 text-sm font-semibold text-tea-900 transition hover:-translate-y-0.5 hover:bg-white"
                  to="/account"
                >
                  Account details
                </Link>
                <button
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-4 py-3 text-sm font-semibold text-foam shadow-[0_16px_30px_rgba(89,108,61,0.24)] transition hover:-translate-y-0.5"
                  disabled={loggingOut}
                  type="button"
                  onClick={handleLogout}
                >
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
