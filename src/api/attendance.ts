import api from "./client";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE";
export type AttendanceMark = { studentId: string; status: AttendanceStatus };

export const getClassRoster = (classSectionId: string) =>
  api.get("/attendance/students/class-roster", { params: { classSectionId } });

export const getAttendanceByDate = (classSectionId: string, date: string) =>
  api.get("/attendance/students", { params: { classSectionId, date } });

export const bulkMarkAttendance = (classSectionId: string, marks: AttendanceMark[]) =>
  api.post("/attendance/students/bulk-mark", { classSectionId, marks });

export const getStudentSummary = (studentId: string, from?: string, to?: string) =>
  api.get(`/attendance/students/${studentId}/summary`, { params: { from, to } });
