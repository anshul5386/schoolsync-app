import api from "./client";

export const getProfile = () => api.get("/profile");
