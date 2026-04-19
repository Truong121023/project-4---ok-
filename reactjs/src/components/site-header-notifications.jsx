import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useSiteData } from "../context/SiteDataContext";
import { formatShortDateTimeVn } from "../lib/locale";

function cn(...args) { return args.filter(Boolean).join(" "); }

function BellIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function resolveActionHref(notification) {
  if (notification?.actionUrl) return notification.actionUrl;
  if (notification?.orderId) return `/orders/${notification.orderId}`;
  if (notification?.eventSlug) return `/store-events/${notification.eventSlug}`;
  if (notification?.newsSlug) return `/news/${notification.newsSlug}`;
  return "/account?tab=notifications";
}

export default function SiteHeaderNotifications() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadNotificationCount,
    notificationLoading,
    notificationError,
    canUseUserFeatures,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications,
  } = useSiteData();

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const badgeLabel = useMemo(() => {
    if (!unreadNotificationCount) return "";
    return unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  }, [unreadNotificationCount]);

  if (auth.initializing || !auth.isAuthenticated || !canUseUserFeatures) return null;

  const ariaLabel = unreadNotificationCount
    ? `${t("aria.notifications")}, ${t("notifications.unreadCount", { count: unreadNotificationCount })}`
    : t("aria.notifications");

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) void refreshNotifications({ silent: true });
      return next;
    });
  };

  const handleOpenNotification = async (notification) => {
    close();
    if (!notification.read) void markNotificationRead(notification.id);
    navigate(resolveActionHref(notification));
  };

  const handleMarkAll = async () => {
    if (!unreadNotificationCount) return;
    void markAllNotificationsRead();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={handleToggle}
        className="relative inline-flex h-10 items-center gap-1.5 rounded-full border border-matcha-900/10 bg-white/72 px-3 text-sm font-semibold text-tea-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matcha-500"
      >
        <BellIcon />
        {badgeLabel ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-matcha-500 px-1 text-[10px] font-bold text-white"
          >
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("notifications.panelTitle")}
          className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-matcha-900/10 bg-white shadow-[0_20px_48px_rgba(42,58,30,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-matcha-900/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-tea-900">{t("notifications.panelTitle")}</p>
              <p className="text-[11px] text-stone-500">
                {unreadNotificationCount
                  ? t("notifications.unreadCount", { count: unreadNotificationCount })
                  : t("notifications.allCaughtUp")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={!unreadNotificationCount}
              className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-matcha-700 transition hover:bg-matcha-50 disabled:cursor-not-allowed disabled:text-stone-400 disabled:hover:bg-transparent"
            >
              {t("notifications.markAllRead")}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notificationError ? (
              <div className="px-4 py-6 text-center text-sm text-red-700">{notificationError}</div>
            ) : notificationLoading && !notifications.length ? (
              <div className="px-4 py-6 text-center text-sm text-stone-500">{t("notifications.loading")}</div>
            ) : !notifications.length ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-matcha-50 text-matcha-600">
                  <BellIcon className="h-5 w-5" />
                </div>
                {t("notifications.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-matcha-900/5">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-cream-50 focus-visible:bg-cream-50 focus-visible:outline-none",
                        !n.read && "bg-matcha-50/50"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.read ? "bg-transparent" : "bg-matcha-500"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm", n.read ? "font-medium text-stone-700" : "font-semibold text-tea-900")}>
                          {n.title || t("notifications.defaultTitle")}
                        </p>
                        {n.message ? (
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-stone-600">{n.message}</p>
                        ) : null}
                        {n.createdAt ? (
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-stone-400">
                            {formatShortDateTimeVn(n.createdAt)}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-matcha-900/10 bg-cream-50/60 px-4 py-2.5 text-center">
            <button
              type="button"
              onClick={() => { close(); navigate("/account?tab=notifications"); }}
              className="text-[12px] font-semibold text-matcha-700 hover:text-matcha-800"
            >
              {t("notifications.viewAll")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
