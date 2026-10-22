import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  ATTACHMENT_ACCEPT_LIST, Attachment, AttachmentEntityType, attachmentTypeError, getAttachments,
  uploadAttachment, viewAttachment,
} from "../api/attachments";
import { errorMessage } from "../api/client";
import { formatSize } from "./StagedFileField";
import { colors } from "../theme";

/**
 * Files (PDF, JPEG, PNG or Word) for one assignment, exam or result row that already exists.
 * Collapsed by default and loaded on demand: a list can have dozens of rows and fetching every
 * row's attachments on mount would be a request per row for files most people never open.
 */
export default function AttachmentBar({ entityType, entityId, canUpload = false }: {
  entityType: AttachmentEntityType;
  entityId: string;
  canUpload?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<Attachment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAttachments(entityType, entityId);
      setFiles((res.data?.data as Attachment[]) || []);
    } catch (err) {
      setError(errorMessage(err, "Could not load attachments."));
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && files === null) load();
  };

  const onAttach = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ATTACHMENT_ACCEPT_LIST,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const file = { uri: a.uri, name: a.name, type: a.mimeType || "", size: a.size };
    const typeError = attachmentTypeError(file);
    if (typeError) {
      setError(typeError);
      return;
    }
    setUploading(true);
    setError("");
    try {
      await uploadAttachment(entityType, entityId, file);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Could not upload that file."));
    } finally {
      setUploading(false);
    }
  };

  const onView = async (f: Attachment) => {
    setError("");
    try {
      await viewAttachment(f.id, f.fileName);
    } catch (err) {
      setError(errorMessage(err, "Could not open that file."));
    }
  };

  return (
    <View style={{ marginTop: 6 }}>
      <Pressable onPress={toggle} hitSlop={6}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.navy }}>
          {open ? "Hide attachments" : "Attachments"}
          {files !== null && files.length > 0 ? ` (${files.length})` : ""}
        </Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.line, gap: 6 }}>
          {loading ? (
            <Text style={{ fontSize: 12, color: colors.inkSubtle }}>Loading…</Text>
          ) : files !== null && files.length === 0 && !error ? (
            <Text style={{ fontSize: 12, color: colors.inkSubtle }}>No files attached yet.</Text>
          ) : (
            (files || []).map((f) => (
              <View key={f.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: colors.inkMuted }}>{f.fileName}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{formatSize(f.fileSize)}</Text>
                <Pressable onPress={() => onView(f)} hitSlop={8}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.navy }}>View</Text>
                </Pressable>
              </View>
            ))
          )}
          {!!error && <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text>}

          {canUpload && (
            <Pressable onPress={onAttach} disabled={uploading} hitSlop={6} style={{ opacity: uploading ? 0.5 : 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.inkMuted }}>
                {uploading ? "Uploading…" : "+ Attach a file"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
