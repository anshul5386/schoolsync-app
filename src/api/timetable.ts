import api from "./client";

export type SlotPayload = {
  classSectionId: string;
  dayOfWeek: string;
  periodNumber: number;
  subject: string;
  teacherId: string | null;
  startTime: string | null;
  endTime: string | null;
};

export const getTimetable = (classSectionId: string, day?: string) =>
  api.get("/timetable", { params: { classSectionId, day } });

/** Creates or replaces one period. classSectionId, dayOfWeek and periodNumber together decide which. */
export const saveTimetableSlot = (payload: SlotPayload) => api.post("/timetable/slots", payload);

export const deleteTimetableSlot = (id: string) => api.delete(`/timetable/slots/${id}`);

export const upsertSlot = saveTimetableSlot;
export const deleteSlot = deleteTimetableSlot;

export const copyTimetableDay = (payload: {
  classSectionId: string;
  fromDay: string;
  toDays: string[];
}) => api.post("/timetable/copy/day", payload);

export const copyTimetableClass = (payload: {
  fromClassSectionId: string;
  toClassSectionId: string;
  days?: string[];
}) => api.post("/timetable/copy/class", payload);

export const seedTimetableTemplate = (classSectionId: string) =>
  api.post("/timetable/seed-template", null, { params: { classSectionId } });
