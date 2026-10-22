import api from "./client";

export type ClassSection = { id: string; grade: string; section: string; subjects?: string; classLabel?: string; label?: string };

export const getMyClasses = () => api.get("/classes/mine");
export const getAllClasses = () => api.get("/classes");
