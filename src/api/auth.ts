import api from "./client";

// Mirrors the website's src/api/auth.js: /auth/login takes the password in the `otp` field.
export const loginWithPassword = (phone: string, password: string) =>
  api.post("/auth/login", { phone, otp: password });
export const getMe = () => api.get("/auth/me");

// Public (no token): feeds the school picker on the registration form.
export const getSchoolOptions = () => api.get("/auth/schools");

// Public: the class picker for the "joining as a student" step.
export const getSchoolClassOptions = (schoolId: string) => api.get(`/auth/schools/${schoolId}/classes`);

// Public: creates a PENDING request. No account exists until it is approved.
export const register = (payload: {
  schoolId: string; name: string; phone: string; email: string | null;
  requestedRole: string; password: string; classSectionId: string | null;
}) => api.post("/auth/register", payload);
