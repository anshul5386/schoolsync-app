import api from "./client";

export type Notice = {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned?: boolean;
  authorName?: string;
  audience?: string;
  targetRole?: string | null;
  targetClassLabel?: string | null;
  publishedAt?: string;
  expiresAt?: string | null;
};

/** The server scopes the board by role and class; there is no audience parameter to tamper with. */
export const getNotices = () => api.get("/notices");
