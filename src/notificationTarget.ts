import type { AppNotification } from "./api/notifications";

/**
 * Where tapping a notification should go. Mirrors the website's notificationTarget() in
 * AppShell.jsx: NOTICE and ASSIGNMENT deep-link with ?highlight=<id> so the target screen can
 * scroll to and open the exact item the notification was about.
 *
 * Returns null when there is nowhere better to go than staying on the notifications list.
 */
export function notificationTarget(
  n: AppNotification,
  role: string | undefined
): { pathname: string; params?: { highlight: string } } | null {
  switch (n.referenceType) {
    case "NOTICE":
      return { pathname: "/notices", ...(n.referenceId ? { params: { highlight: n.referenceId } } : {}) };
    case "ASSIGNMENT":
      if (role === "STUDENT") {
        return { pathname: "/", ...(n.referenceId ? { params: { highlight: n.referenceId } } : {}) };
      }
      return null;
    default:
      return null;
  }
}
