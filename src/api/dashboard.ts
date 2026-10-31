import api from "./client";

export type WeeklyDay = {
  day: string;    // "Mon"
  date: string;   // "2026-10-26"
  present: number;
  absent: number;
};

export type ClassCoverageItem = {
  grade: string;
  section: string;
  classSectionId: string;
  covered: boolean;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
};

export type DashboardStats = {
  roleType?: string;
  totalStudents?: number;
  totalClasses?: number;
  totalTeachers?: number;
  teachersPresent?: number;
  teachersAbsent?: number;
  myClassCount?: number;
  classesAttMarked?: number;
  myAttendancePercentage?: number | null;
  studentId?: string | null;
  // v1.1 additions
  pendingApprovals?: number;
  studentsPresentToday?: number;
  studentsAbsentToday?: number;
  weeklyAttendance?: WeeklyDay[];
  classCoverage?: ClassCoverageItem[];
  myClassCoverage?: ClassCoverageItem[];
};

export const getDashboardStats = () => api.get("/dashboard/stats");
