import api from "./client";

export const getSubstitutionsNeeded = (date?: string) =>
  api.get("/substitutions/needed", { params: { date } });

export const assignSubstitution = (data: { absentTeacherId: string; substituteTeacherId: string; classSectionId: string }) =>
  api.post("/substitutions/assign", data);

export const removeSubstitution = (id: string) =>
  api.delete(`/substitutions/${id}`);
