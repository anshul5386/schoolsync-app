/**
 * The app has no backend of its own: every call goes to the existing schoolsync-api, using the
 * same endpoints and the same JWT login as the website.
 */
const raw = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export const API_BASE_URL = raw.replace(/\/$/, "");

export const isApiConfigured = API_BASE_URL.length > 0 && !API_BASE_URL.includes("YOUR-SCHOOLSYNC");
