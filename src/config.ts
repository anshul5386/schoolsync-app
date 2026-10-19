/**
 * The app has no backend of its own: every call goes to the existing schoolsync-api, using the
 * same endpoints and the same JWT login as the website.
 *
 * The default is the production API. Override with EXPO_PUBLIC_API_BASE_URL in .env to point a
 * development build at a staging API. (A phone has no same-origin /api proxy like the website's,
 * so it talks to the API service directly; native apps are not subject to CORS.)
 */
const DEFAULT_API = "https://schoolsync-api-production.up.railway.app";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API).replace(/\/$/, "");

export const isApiConfigured = API_BASE_URL.length > 0 && !API_BASE_URL.includes("YOUR-SCHOOLSYNC");
