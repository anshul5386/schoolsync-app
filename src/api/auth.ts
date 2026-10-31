import api from "./client";

export const sendOtp = (phone: string) => api.post("/auth/otp/send", { phone });
export const verifyOtp = (phone: string, otp: string) => api.post("/auth/otp/verify", { phone, otp });
export const loginWithPassword = (phone: string, password: string) =>
  api.post("/auth/login", { phone, otp: password });
export const selectStudent = (selectionToken: string, userId: string) =>
  api.post("/auth/select-student", { selectionToken, userId });
export const getSchoolClasses = (schoolId: string) => api.get(`/auth/schools/${schoolId}/classes`);
export const getSchoolClassOptions = getSchoolClasses;
export const getMe = () => api.get("/auth/me");
export const seedDemo = () => api.post("/auth/seed");

// Public (no token): feeds the school picker on the registration form.
export const getSchoolOptions = () => api.get("/auth/schools");

// Public: creates a PENDING request. No account exists until it is approved.
export const register = (payload: {
  schoolId: string; name: string; phone: string; email: string | null;
  requestedRole: string; password: string; classSectionId: string | null;
}) => api.post("/auth/register", payload);
