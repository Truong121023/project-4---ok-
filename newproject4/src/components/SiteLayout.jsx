import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import SupportChatWidget from "./SupportChatWidget";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { buildEventPath } from "../lib/eventRouting";
import { buildNewsPath } from "../lib/newsRouting";
import { navigationLinks } from "../siteContent";
import { ui } from "../ui";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function BellIcon({ className = "h-4 w-4" }) {
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
  const date = new Date(value ?? "");

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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
  if (notification?.actionUrl) {
    return notification.actionUrl;
  }

  const notificationType = getNormalizedNotificationType(notification);
  const orderId = getNotificationOrderId(notification);

  if (
    notificationType === "ORDER_STATUS" ||
    notificationType.includes("ORDER")
  ) {
    return orderId ? `/orders/${orderId}` : "/orders";
  }

  if (notificationType.includes("NEWS")) {
    const newsKey = getNotificationNewsKey(notification);
    return newsKey ? buildNewsPath(newsKey) : "/news";
  }

  if (notificationType === "BRAND_EVENT" || notificationType.includes("EVENT")) {
    const eventKey = getNotificationEventKey(notification);
    return eventKey ? buildEventPath(eventKey) : "/events";
  }

  return "";
}

function getNotificationActionLabel(notification) {
  return getNotificationTargetPath(notification) ? "View now" : "Mark read";
}

const headerGhostButton =
  "inline-flex items-center justify-center rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm font-semibold text-tea-900 transition hover:bg-white";

const headerPrimaryButton =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-matcha-500 to-matcha-700 px-3.5 py-2 text-sm font-semibold text-foam shadow-[0_10px_24px_rgba(89,108,61,0.2)] transition hover:-translate-y-0.5";

function getNavClass({ isActive }) {
  return [
    "rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition",
    isActive
      ? "bg-white text-tea-900 shadow-[0_10px_24px_rgba(79,70,45,0.08)]"
      : "text-stone-600 hover:bg-white/70 hover:text-tea-900",
  ].join(" ");
}

export default function SiteLayout() {
  const auth = useAuth();
  const {
    cartCount,
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState("");
  const adminAreaLabel = auth.hasRole("ADMIN")
    ? "Admin"
    : auth.hasRole("MANAGER")
      ? "Manager"
      : "Admin";
  const navLinks = [
    ...navigationLinks,
    ...(auth.hasRole("STAFF", "SHIPPER") ? [{ to: "/employee", label: "Workspace" }] : []),
    ...(auth.hasRole("ADMIN", "MANAGER") ? [{ to: "/admin", label: adminAreaLabel }] : []),
  ];
  const canAccessAdminArea = auth.hasRole("ADMIN", "MANAGER");
  const canAccessEmployeeArea = auth.hasRole("STAFF", "SHIPPER");
  const canUseNotifications = auth.hasRole("USER");
  const accountSectionLinks = [
    ...(canAccessAdminArea
      ? [{ to: "/admin", label: auth.hasRole("ADMIN") ? "Admin dashboard" : "Manager panel" }]
      : []),
    ...(canAccessEmployeeArea ? [{ to: "/employee", label: "Employee workspace" }] : []),
    { to: "/account", label: "Overview" },
    ...(auth.hasRole("USER")
        ? [
          { to: "/account/favorites", label: "Favorites" },
          { to: "/account/levels", label: "Membership" },
          { to: "/account/orders", label: "Recent order status" },
          { to: "/orders", label: "Order history" },
          { to: "/account/addresses", label: "Addresses" },
          { to: "/account/reviews", label: "Reviews" },
          { to: "/account/feedbacks", label: "Feedback" },
        ]
      : []),
  ];

  useEffect(() => {
    if (!accountMenuOpen || typeof document === "undefined") {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    setAccountMenuOpen(false);
    setNotificationPanelOpen(false);
    setNotificationNotice("");
  }, [location.pathname]);

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
    await auth.logout();
    setAccountMenuOpen(false);
    setNotificationPanelOpen(false);
    navigate("/login");
  };

  const handleAccountMenuClose = () => {
    setAccountMenuOpen(false);
  };

  const handleNotificationToggle = () => {
    const nextOpen = !notificationPanelOpen;
    setNotificationPanelOpen(nextOpen);
    setAccountMenuOpen(false);
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
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute right-[-7rem] top-10 h-80 w-80 rounded-full bg-matcha-300/25 blur-3xl sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute bottom-12 left-[-6rem] h-72 w-72 rounded-full bg-tea-500/12 blur-3xl" />

      <header
        className="relative z-30 mx-auto mb-6 flex w-full max-w-7xl flex-col gap-3 rounded-[1.6rem] border border-matcha-900/10 bg-white/72 px-4 py-4 shadow-[0_20px_50px_rgba(79,70,45,0.12)] backdrop-blur-xl sm:px-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <NavLink className="inline-flex min-w-0 items-center gap-3" to="/">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-matcha-500 to-matcha-700 text-xs font-extrabold tracking-[0.2em] text-foam">
                TM
              </span>

              <div className="min-w-0">
                <strong className="block truncate text-sm uppercase tracking-[0.22em] text-tea-900">
                  tea matcha
                </strong>
                <span className="hidden pt-0.5 text-xs text-stone-500 sm:block">
                  Modern tea spaces
                </span>
              </div>
            </NavLink>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NavLink className={headerGhostButton} to="/cart">
              Cart {cartCount ? `(${cartCount})` : ""}
            </NavLink>
            {auth.initializing ? (
              <span className="rounded-full border border-matcha-900/10 bg-white/72 px-3.5 py-2 text-sm text-stone-600">
                Loading...
              </span>
            ) : auth.isAuthenticated ? (
              <>
                {canUseNotifications ? (
                  <div className="relative z-40">
                    {notificationPanelOpen ? (
                      <button
                        className="fixed inset-0 z-40 bg-transparent"
                        type="button"
                        onClick={() => setNotificationPanelOpen(false)}
                      />
                    ) : null}

                    <button
                      className={cn(headerGhostButton, "relative z-50 gap-2")}
                      type="button"
                      onClick={handleNotificationToggle}
                    >
                      <BellIcon />
                      <span className="hidden sm:inline">Alerts</span>
                      {unreadNotificationCount > 0 ? (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                          {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                        </span>
                      ) : null}
                    </button>

                    {notificationPanelOpen ? (
                      <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[60] w-[min(28rem,calc(100vw-2rem))] max-h-[min(32rem,calc(100vh-8rem))] overflow-y-auto rounded-[1.6rem] border border-matcha-900/10 bg-[#f8f5ef] p-4 shadow-[0_24px_60px_rgba(39,64,45,0.18)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-stone-500">
                              Notifications
                            </p>
                            <p className="mt-2 text-sm leading-7 text-stone-600">
                              Latest updates from brand events and your orders.
                            </p>
                          </div>

                          <button
                            className={headerGhostButton}
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
                ) : null}

                <button
                  className={headerGhostButton}
                  type="button"
                  onClick={() => {
                    setNotificationPanelOpen(false);
                    setAccountMenuOpen(true);
                  }}
                >
                  <span className="flex flex-col gap-1" aria-hidden="true">
                    <span className="h-0.5 w-4 rounded-full bg-current" />
                    <span className="h-0.5 w-4 rounded-full bg-current" />
                    <span className="h-0.5 w-4 rounded-full bg-current" />
                  </span>
                </button>
              </>
            ) : (
              <>
                <NavLink className={headerGhostButton} to="/register">
                  Sign up
                </NavLink>
                <NavLink className={headerPrimaryButton} to="/login">
                  Sign in
                </NavLink>
              </>
            )}
          </div>
        </div>

        <nav
          className="flex items-center gap-1 overflow-x-auto rounded-full bg-matcha-500/10 p-1.5"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <NavLink key={link.to} className={getNavClass} end={link.end} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Outlet />

      <div
        className={`fixed inset-0 z-40 transition ${accountMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!accountMenuOpen}
      >
        <button
          className={`absolute inset-0 bg-tea-950/35 backdrop-blur-sm transition-opacity duration-300 ${
            accountMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          type="button"
          onClick={handleAccountMenuClose}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col gap-5 border-l border-matcha-900/10 bg-[#f8f5ef] p-5 shadow-[-18px_0_50px_rgba(39,64,45,0.18)] transition-transform duration-300 ${
            accountMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Account menu"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.24em] text-stone-500">
                Account
              </span>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                {canAccessAdminArea
                  ? auth.hasRole("ADMIN")
                    ? "Choose what you want to open in your account or admin area."
                    : "Choose what you want to open in your account or manager panel."
                  : canAccessEmployeeArea
                    ? "Open your employee workspace or personal area."
                  : "Choose what you want to view in your personal area."}
              </p>
            </div>

            <button
              className={headerGhostButton}
              type="button"
              onClick={handleAccountMenuClose}
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 rounded-[1.4rem] border border-matcha-900/10 bg-white/72 p-4 text-sm leading-7 text-stone-600">
            <strong className="text-base text-tea-900">
              {auth.user?.fullName || "User"}
            </strong>
            <span className="font-semibold uppercase tracking-[0.18em] text-matcha-700">
              {auth.user?.role || "Account"}
            </span>
            <span>{auth.user?.email || "No email yet"}</span>
          </div>

          <div className="grid gap-3">
            {accountSectionLinks.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between rounded-[1.2rem] border border-matcha-900/10 px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "bg-matcha-500/12 text-matcha-700"
                      : "bg-white/72 text-tea-900 hover:-translate-y-0.5 hover:bg-white",
                  )
                }
                end={link.to === "/account" || link.to === "/admin"}
                to={link.to}
                onClick={handleAccountMenuClose}
              >
                <span>{link.label}</span>
                <span aria-hidden="true">{">"}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-auto">
            <button className={headerPrimaryButton} type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </aside>
      </div>

      <SupportChatWidget />

      <footer className="relative z-10 mx-auto mt-8 flex w-full max-w-7xl flex-col gap-4 px-2 pb-4 text-sm text-stone-600 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-tea-900">
            tea matcha
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
  );
}
