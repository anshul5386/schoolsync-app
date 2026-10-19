import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";

export const TOKEN_KEY = "ss_token";
export const USER_KEY = "ss_user";

let onUnauthorized: (() => void) | null = null;
/** AuthContext registers this so an expired token signs the user out wherever it is noticed. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) onUnauthorized?.();
    return Promise.reject(err);
  }
);

/** A message safe to show a person, whatever went wrong. */
export function errorMessage(err: any, fallback = "Something went wrong. Please try again."): string {
  if (err?.response?.data?.message) return String(err.response.data.message);
  if (err?.code === "ECONNABORTED") return "The server took too long to respond. Check your connection.";
  if (!err?.response) return "Cannot reach the server. Check your internet connection.";
  return fallback;
}

export default api;
