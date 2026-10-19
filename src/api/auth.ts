import api from "./client";

// Mirrors the website's src/api/auth.js: /auth/login takes the password in the `otp` field.
export const loginWithPassword = (phone: string, password: string) =>
  api.post("/auth/login", { phone, otp: password });
export const getMe = () => api.get("/auth/me");
