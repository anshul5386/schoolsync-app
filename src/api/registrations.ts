import api from "./client";

// Serves school admins and super admins alike; the backend scopes results by the caller's tenant,
// so no schoolId is ever sent from here.
export const getRequests = (status?: string) =>
  api.get("/registrations", { params: status ? { status } : {} });

export const getPendingCount = () => api.get("/registrations/pending-count");

export const approveRequest = (id: string) => api.post(`/registrations/${id}/approve`);

export const rejectRequest = (id: string, reason: string | null) =>
  api.post(`/registrations/${id}/reject`, { reason });
