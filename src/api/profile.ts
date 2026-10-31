import api from "./client";

export type ProfileData = {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  schoolName?: string;
  student?: {
    classLabel?: string;
    rollNumber?: number;
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
};

export const getProfile = () => api.get("/profile");
