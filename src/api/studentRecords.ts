import api from "./client";

export type Assignment = {
  id: string;
  title: string;
  description?: string;
  subject: string;
  classLabel?: string;
  teacherName?: string;
  dueDate: string;
  type?: string;
};

/** The server resolves the class from the caller's own student record; there is no class param. */
export const getMyAssignments = () => api.get("/student/records/assignments");
