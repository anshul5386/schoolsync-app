import api from "./client";

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  message?: string;
  type?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  read?: boolean;
  isRead?: boolean;
  createdAt?: string;
};

export const getNotifications = () => api.get("/notifications");
export const getUnreadCount = () => api.get("/notifications/unread-count");
export const markRead = (id: string) => api.post(`/notifications/${id}/read`);
export const markAllRead = () => api.post("/notifications/mark-all-read");
