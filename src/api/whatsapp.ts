import api from "./client";

export const getWhatsappSettings = () => api.get("/school/whatsapp/settings");

export const patchWhatsappSettings = (body: {
  whatsappEnabled?: boolean;
  whatsappMonthlyLimit?: number | null;
}) => api.patch("/school/whatsapp/settings", body);

export const getWhatsappLog = (limit = 50) =>
  api.get("/school/whatsapp/log", { params: { limit } });

export const sendMonthlyAttendanceReport = (body: {
  classSectionId?: string;
  year?: number;
  month?: number;
} = {}) => api.post("/school/whatsapp/monthly-attendance-report", body);
