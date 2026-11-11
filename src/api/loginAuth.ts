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
  const auth = data?.auth ?? data;
  if (!auth?.token) {
    throw new Error(body.message || "Login failed — no token in response.");
  }
  return { kind: "complete", auth };
}

export function loginErrorMessage(err: unknown): string {
  return errorMessage(err, "Login failed. Check your phone number and password.");
}
