import api from "./client";

// Active subjects only - this is what every subject dropdown binds to.
export const getSubjects = () => api.get("/subjects");

// Includes retired subjects, for the management screen.
export const getAllSubjects = () => api.get("/subjects/all");

export const createSubject = (name: string) => api.post("/subjects", { name });
export const renameSubject = (id: string, name: string) => api.put(`/subjects/${id}`, { name });
export const retireSubject = (id: string) => api.post(`/subjects/${id}/retire`);
export const restoreSubject = (id: string) => api.post(`/subjects/${id}/restore`);
