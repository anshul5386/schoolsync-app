import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import api, { TOKEN_KEY } from "./client";
import { API_BASE_URL } from "../config";

/**
 * One list so the picker filter, the client-side pre-check and the error copy can never say
 * something different from what the server allows (PDF, JPEG, PNG, DOC, DOCX).
 */
export const ATTACHMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const ATTACHMENT_ACCEPT_LIST: string[] = ATTACHMENT_ACCEPT.split(",");

/** Size is also enforced by the server; this only gives an early, friendly message. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** A file picked on the phone, not yet uploaded. */
export type StagedFile = { uri: string; name: string; type: string; size?: number };

export type Attachment = { id: string; fileName: string; fileSize?: number; contentType?: string };

export type AttachmentEntityType = "ASSIGNMENT" | "EXAM" | "EXAM_RESULT";

export function attachmentTypeError(file?: { type?: string; size?: number } | null): string | null {
  if (!file) return null;
  if (!file.type || !ATTACHMENT_ACCEPT_LIST.includes(file.type)) {
    return "Only PDF, JPG, PNG or Word documents can be attached.";
  }
  if (file.size != null && file.size > MAX_ATTACHMENT_BYTES) {
    return "That file is larger than the 10 MB limit.";
  }
  return null;
}

export const getAttachments = (entityType: AttachmentEntityType, entityId: string) =>
  api.get("/attachments", { params: { entityType, entityId } });

export const uploadAttachment = (entityType: AttachmentEntityType, entityId: string, file: StagedFile) => {
  const form = new FormData();
  form.append("entityType", entityType);
  form.append("entityId", entityId);
  // React Native's FormData accepts a {uri, name, type} object in place of a browser File.
  form.append("file", { uri: file.uri, name: file.name, type: file.type } as any);
  return api.post("/attachments", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

/**
 * Downloads the file with the signed-in user's token, then opens it.
 *
 * Like the website, a plain link to /attachments/{id}/view would carry no Authorization header,
 * so the file is fetched with the token into the cache directory and handed to the share sheet
 * ("Open in...") or, if sharing is unavailable, the in-app browser.
 * Throws an error shaped like an axios error so errorMessage() shows the server's message.
 */
export const viewAttachment = async (id: string, fileName?: string): Promise<void> => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const base = FileSystem.cacheDirectory ?? "";
  const safeName = (fileName || "").replace(/[^A-Za-z0-9._-]/g, "_");
  const tmp = `${base}attachment-${id}${safeName ? "-" + safeName : ""}`;
  const res = await FileSystem.downloadAsync(`${API_BASE_URL}/attachments/${id}/view`, tmp, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status < 200 || res.status >= 300) {
    let message = "";
    try {
      const body = await FileSystem.readAsStringAsync(res.uri);
      message = JSON.parse(body)?.message || "";
    } catch {
      // body was not JSON; fall through to the generic message
    }
    try { await FileSystem.deleteAsync(res.uri, { idempotent: true }); } catch { /* ignore */ }
    if (res.status === 401) throw { response: { status: 401, data: { message: message || "Your session has expired." } } };
    throw { response: { status: res.status, data: { message: message || "Could not open that file." } } };
  }

  const contentType: string =
    (res.headers && (res.headers["Content-Type"] || res.headers["content-type"])) || "";
  const mimeType = contentType.split(";")[0].trim() || undefined;

  // Make sure the file has an extension so the receiving app recognises it.
  let finalUri = res.uri;
  if (!/\.[A-Za-z0-9]{2,5}$/.test(finalUri)) {
    const ext = (mimeType && EXT_BY_TYPE[mimeType]) || "";
    if (ext) {
      const renamed = finalUri + ext;
      try {
        await FileSystem.moveAsync({ from: finalUri, to: renamed });
        finalUri = renamed;
      } catch {
        // keep the original uri
      }
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, { mimeType, dialogTitle: fileName || "Attachment" });
  } else {
    await WebBrowser.openBrowserAsync(finalUri);
  }
};
