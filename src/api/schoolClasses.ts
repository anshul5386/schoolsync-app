import api from "./client";

// Class and section management for a school's own administrators. Separate from the
// read-only /classes endpoints every role uses to populate dropdowns.
export const getManagedClasses = () => api.get("/school/classes");
export const createClass = (grade: string, section: string) => api.post("/school/classes", { grade, section });
export const createClassesBulk = (grades: { grade: string; sections: number }[]) =>
  api.post("/school/classes/bulk", { grades });
export const renameClass = (id: string, grade: string, section: string) =>
  api.put(`/school/classes/${id}`, { grade, section });
export const retireClass = (id: string) => api.post(`/school/classes/${id}/retire`);
export const restoreClass = (id: string) => api.post(`/school/classes/${id}/restore`);
export const deleteClass = (id: string) => api.delete(`/school/classes/${id}`);
