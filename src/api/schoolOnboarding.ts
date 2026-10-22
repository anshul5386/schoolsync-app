import api from "./client";

// Super-admin school onboarding. Shares the /super-admin/schools path with the listing in superAdmin.ts.
export const getSubjectCatalogue = () => api.get("/super-admin/subject-catalogue");

export const createSchool = (payload: Record<string, any>) => api.post("/super-admin/schools", payload);
export const updateSchool = (schoolId: string, payload: Record<string, any>) =>
  api.put(`/super-admin/schools/${schoolId}`, payload);
export const activateSchool = (schoolId: string) => api.post(`/super-admin/schools/${schoolId}/activate`);
export const deactivateSchool = (schoolId: string) => api.post(`/super-admin/schools/${schoolId}/deactivate`);

/** grades: [{ grade: "10", sections: 3 }] — one call creates every section. */
export const createSchoolClasses = (schoolId: string, grades: { grade: string; sections: number }[]) =>
  api.post(`/super-admin/schools/${schoolId}/classes`, { grades });

export const getSchoolClasses = (schoolId: string) => api.get(`/super-admin/schools/${schoolId}/classes`);

export const renameSchoolClass = (schoolId: string, classId: string, grade: string, section: string) =>
  api.put(`/super-admin/schools/${schoolId}/classes/${classId}`, { grade, section });

export const createSchoolSubjects = (schoolId: string, names: string[]) =>
  api.post(`/super-admin/schools/${schoolId}/subjects`, { names });

export const getSchoolSetup = (schoolId: string) => api.get(`/super-admin/schools/${schoolId}/setup`);

/** Read-only. What a deletion would destroy, and whether it is permitted yet. */
export const getDeletionPreview = (schoolId: string) =>
  api.get(`/super-admin/schools/${schoolId}/deletion-preview`);

/** Deletion. confirmName must match the school's name exactly. POST (not DELETE) because the confirmation is in the body. */
export const deleteSchool = (schoolId: string, confirmName: string) =>
  api.post(`/super-admin/schools/${schoolId}/delete`, { confirmName });
