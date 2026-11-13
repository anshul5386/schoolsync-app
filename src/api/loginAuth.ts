import type { AxiosResponse } from "axios";
import { errorMessage } from "./client";

export type StudentLoginOption = {
  userId: string;
  name: string;
  schoolName?: string;
  classLabel?: string;
};

export type AuthPayload = {
  token: string;
  userId: string;
  schoolId: string;
  role: string;
  name: string;
  schoolName?: string;
};

export type LoginExtract =
  | { kind: "complete"; auth: AuthPayload }
  | { kind: "selectStudent"; selectionToken: string; studentOptions: StudentLoginOption[] };

export function extractLoginPayload(res: AxiosResponse): LoginExtract {
  const body = res?.data;
  if (!body || typeof body !== "object") {
    throw new Error("Unexpected response from login.");
  }
  if (!body.success) {
    throw new Error(body.message || "Login failed");
  }
  const data = body.data;
  if (data?.status === "SELECT_STUDENT") {
    return {
      kind: "selectStudent",
      selectionToken: data.selectionToken,
      studentOptions: data.studentOptions || [],
    };
  }
  const raw = data?.auth ?? data;
  if (!raw?.token) {
    throw new Error(body.message || "Login failed — no token in response.");
  }
  const auth: AuthPayload = {
    token: String(raw.token),
    userId: String(raw.userId ?? ""),
    schoolId: raw.schoolId != null ? String(raw.schoolId) : "",
    role: String(raw.role ?? ""),
    name: String(raw.name ?? ""),
    schoolName: raw.schoolName != null ? String(raw.schoolName) : undefined,
  };
  return { kind: "complete", auth };
}

/** Normalizes select-student or raw API auth objects (not wrapped in LoginResult). */
export function normalizeAuthPayload(raw: Record<string, unknown> | null | undefined): AuthPayload {
  if (!raw?.token) throw new Error("Sign-in failed — no token.");
  return {
    token: String(raw.token),
    userId: String(raw.userId ?? ""),
    schoolId: raw.schoolId != null ? String(raw.schoolId) : "",
    role: String(raw.role ?? ""),
    name: String(raw.name ?? ""),
    schoolName: raw.schoolName != null ? String(raw.schoolName) : undefined,
  };
}

export function loginErrorMessage(err: unknown): string {
  return errorMessage(err, "Login failed. Check your username and password.");
}
