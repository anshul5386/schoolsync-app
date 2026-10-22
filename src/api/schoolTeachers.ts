import api from "./client";

export type TeacherAssignment = { id?: string; classSectionId: string; subject: string; canWrite?: boolean };

export const getSchoolTeachers = () => api.get("/school/teachers");
export const getSchoolTeacherClasses = () => api.get("/school/teachers/classes");
export const getSchoolTeacher = (teacherId: string) => api.get(`/school/teachers/${teacherId}`);
export const updateTeacherAssignments = (teacherId: string, assignments: TeacherAssignment[]) =>
  api.put(`/school/teachers/${teacherId}/class-subjects`, { assignments });
