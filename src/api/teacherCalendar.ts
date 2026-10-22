import api from "./client";

export const getTeacherOptions = () => api.get("/teacher-calendar/teachers");

export const getTeacherDay = (teacherId: string, date: string) =>
  api.get("/teacher-calendar/day", { params: { teacherId, date } });

export const getTeacherMonth = (teacherId: string, month: string) =>
  api.get("/teacher-calendar/month", { params: { teacherId, month } });

export const getTeacherGrid = (date: string) =>
  api.get("/teacher-calendar/grid", { params: { date } });
