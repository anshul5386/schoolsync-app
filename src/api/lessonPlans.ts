import api from "./client";

export type LessonPlanPayload = {
  classSectionId: string;
  title: string;
  subject: string;
  planDate: string;
  content?: string;
};

export const getLessonPlans = (classSectionId?: string) =>
  api.get("/lesson-plans", { params: classSectionId ? { classSectionId } : {} });

export const createLessonPlan = (payload: LessonPlanPayload) => api.post("/lesson-plans", payload);

export const updateLessonPlan = (id: string, payload: LessonPlanPayload) =>
  api.put(`/lesson-plans/${id}`, payload);

export const deleteLessonPlan = (id: string) => api.delete(`/lesson-plans/${id}`);
