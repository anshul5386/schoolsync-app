import api from "./client";

export const getSchoolStudents = (classSectionId?: string) =>
  api.get("/school/students", { params: classSectionId ? { classSectionId } : {} });

export const getSchoolUsers = (role?: string) =>
  api.get("/school/users", { params: role ? { role } : {} });

export const updateRollNumber = (studentId: string, rollNumber: number) =>
  api.patch(`/school/students/${studentId}/roll-number`, { rollNumber });

export const resetSchoolUserPassword = (userId: string, newPassword: string) =>
  api.post(`/school/users/${userId}/reset-password`, { newPassword });

export const resetSuperAdminUserPassword = (userId: string, newPassword: string) =>
  api.post(`/super-admin/users/${userId}/reset-password`, { newPassword });
