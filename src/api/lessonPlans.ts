import api from "./client";

export type LessonPlan = {
  id: string;
  title: string;
  subject: string;
  content?: string;
  planDate: string;
  status?: string;
  teacherName?: string;
  classLabel?: string;
};

export const getLessonPlans = (classSectionId?: string) =>
  api.get("/lesson-plans", { params: classSectionId ? { classSectionId } : {} });

export const createLessonPlan = (payload: {
  title: string;
  subject: string;
  content?: string;
  planDate: string;
  classSectionId: string;
}) => api.post("/lesson-plans", payload);

export const updateLessonPlan = (id: string, payload: {
  title: string;
  subject: string;
  content?: string;
  planDate: string;
}) => api.put(`/lesson-plans/${id}`, payload);

export const deleteLessonPlan = (id: string) => api.delete(`/lesson-plans/${id}`);
