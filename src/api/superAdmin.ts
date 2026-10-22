import api from "./client";

export const getAllSchools = () => api.get("/super-admin/schools");

// schoolId and role are optional narrowing filters, not security boundaries.
export const getAllUsers = (schoolId?: string, role?: string) =>
  api.get("/super-admin/users", {
    params: { ...(schoolId ? { schoolId } : {}), ...(role ? { role } : {}) },
  });

export const getAllTeachers = (schoolId?: string) =>
  api.get("/super-admin/teachers", { params: schoolId ? { schoolId } : {} });

export type CreateUserPayload = {
  schoolId: string; name: string; phone: string; email: string | null; role: string; password: string;
};
export const createUser = (payload: CreateUserPayload) => api.post("/super-admin/users", payload);

export const activateUser = (id: string) => api.post(`/super-admin/users/${id}/activate`);
export const deactivateUser = (id: string) => api.post(`/super-admin/users/${id}/deactivate`);
