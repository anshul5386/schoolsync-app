import api from "./client";

export type DashboardStats = {
  totalStudents?: number;
  totalClasses?: number;
  totalTeachers?: number;
  teachersPresent?: number;
  teachersAbsent?: number;
  myClassCount?: number;
  classesAttMarked?: number;
  myAttendancePercentage?: number | null;
};

export const getDashboardStats = () => api.get("/dashboard/stats");
