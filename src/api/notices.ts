import api from "./client";

export type Notice = {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned?: boolean;
  authorId?: string;
  authorName?: string;
  audience?: string;
  targetRole?: string | null;
  targetClassLabel?: string | null;
  publishedAt?: string;
  expiresAt?: string | null;
};

export type NoticePayload = {
  title: string;
  body: string;
  category: string;
  audience: string;
  targetRole: string | null;
  targetClassSectionId: string | null;
  pinned: boolean;
  expiresAt: string | null;
};

/** The server scopes the board by role and class; there is no audience parameter to tamper with. */
export const getNotices = () => api.get("/notices");

/** Author view: includes expired and withdrawn notices. Staff only. */
export const getManagedNotices = () => api.get("/notices/manage");

export const publishNotice = (payload: NoticePayload) => api.post("/notices", payload);
export const pinNotice = (id: string) => api.post(`/notices/${id}/pin`);
export const unpinNotice = (id: string) => api.post(`/notices/${id}/unpin`);
export const withdrawNotice = (id: string) => api.post(`/notices/${id}/withdraw`);
