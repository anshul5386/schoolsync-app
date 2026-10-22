import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ATTACHMENT_ACCEPT_LIST, attachmentTypeError, StagedFile } from "../api/attachments";
import { colors } from "../theme";

export const formatSize = (bytes?: number) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

/**
 * A file staged in a create form, before the thing it will attach to even has an id.
 * The file only sits in the parent's state; the parent creates the assignment/exam first and
 * uploads it against the returned id. Showing the picked file name lets staff see what they are
 * about to publish.
 */
export default function StagedFileField({ label = "Attachment", file, onChange, error }: {
  label?: string;
  file: StagedFile | null;
  onChange: (file: StagedFile | null, error: string | null) => void;
  error?: string | null;
}) {
  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ATTACHMENT_ACCEPT_LIST,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const chosen: StagedFile = { uri: a.uri, name: a.name, type: a.mimeType || "", size: a.size };
    onChange(chosen, attachmentTypeError(chosen));
  };

  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.inkMuted, marginBottom: 5, textTransform: "uppercase" }}>
        {label} <Text style={{ color: colors.inkSubtle, textTransform: "none" }}>(optional)</Text>
      </Text>
      {file ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.canvas }}>
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, color: colors.ink }}>{file.name}</Text>
          <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{formatSize(file.size)}</Text>
          <Pressable onPress={() => onChange(null, null)} hitSlop={8}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.danger }}>Remove</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pick} style={{ borderWidth: 1, borderStyle: "dashed", borderColor: colors.inkSubtle,
          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.canvas }}>
          <Text style={{ fontSize: 13, color: colors.inkMuted }}>+ Attach a PDF, image or Word document</Text>
        </Pressable>
      )}
      {!!error && <Text style={{ marginTop: 4, fontSize: 11.5, color: colors.danger }}>{error}</Text>}
      <Text style={{ marginTop: 4, fontSize: 11, color: colors.inkSubtle }}>Up to 10 MB. Attached once you publish below.</Text>
    </View>
  );
}
