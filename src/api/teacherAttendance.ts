import api from "./client";

export type TeacherMark = { teacherId: string; status: "PRESENT" | "ABSENT" };

export const getTeacherAttendance = (date?: string) =>
  api.get("/attendance/teachers", { params: { date } });

export const bulkMarkTeacherAttendance = (marks: TeacherMark[]) =>
  api.post("/attendance/teachers/bulk-mark", { marks });
