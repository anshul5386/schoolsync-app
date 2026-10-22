import api from "./client";

export type AssignmentPayload = {
  title: string;
  description?: string;
  subject: string;
  teacherId?: string | null;
  dueDate: string;
  type: string;
  classSectionId?: string;
};

export type ExamPayload = {
  name: string;
  subject: string;
  examDate: string;
  maxMarks: number;
  type: string;
  classSectionId: string;
};

export type ResultEntry = { studentId: string; marks: number; grade: string | null };

export const getAssignments = (classSectionId?: string) =>
  api.get("/records/assignments", { params: classSectionId ? { classSectionId } : {} });

export const createAssignment = (payload: AssignmentPayload) => api.post("/records/assignments", payload);

/** classSectionId is not editable - see UpdateAssignmentRequest for why. */
export const updateAssignment = (id: string, payload: Omit<AssignmentPayload, "classSectionId">) =>
  api.put(`/records/assignments/${id}`, payload);

/** Also removes its attachments and notifies the class that it was withdrawn. */
export const deleteAssignment = (id: string) => api.delete(`/records/assignments/${id}`);

export const getExams = (classSectionId?: string) =>
  api.get("/records/exams", { params: classSectionId ? { classSectionId } : {} });

export const createExam = (payload: ExamPayload) => api.post("/records/exams", payload);

export const getResults = (params: { examId?: string; classSectionId?: string } = {}) =>
  api.get("/records/results", { params });

export const saveResults = (examId: string, results: ResultEntry[]) =>
  api.post("/records/results/bulk", { examId, results });
