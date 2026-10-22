import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Assignment } from "../api/studentRecords";
import AttachmentBar from "./AttachmentBar";
import { colors } from "../theme";

/**
 * The full view of one assignment, opened by tapping its title or a notification about it.
 * The phone equivalent of the website's popup: full description, nothing truncated.
 * Attachments are listed and opened with the signed-in token; staff (canUpload) can also attach files.
 */
export default function AssignmentDetailModal({
  assignment,
  onClose,
  canUpload = false,
}: {
  assignment: Assignment | null;
  onClose: () => void;
  canUpload?: boolean;
}) {
  return (
    <Modal visible={!!assignment} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {/* Inner Pressable swallows taps so touching the card does not dismiss it. */}
        <Pressable style={s.card} onPress={() => {}}>
          {assignment && (
            <ScrollView>
              <View style={s.head}>
                <Text style={s.chip}>{assignment.subject}</Text>
                <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                  <Text style={s.close}>×</Text>
                </Pressable>
              </View>
              <Text style={s.title}>{assignment.title}</Text>
              <Text style={s.meta}>
                {[assignment.classLabel, pretty(assignment.type), assignment.teacherName && `set by ${assignment.teacherName}`,
                  `due ${new Date(assignment.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`]
                  .filter(Boolean).join(" · ")}
              </Text>
              {!!assignment.description && <Text style={s.body}>{assignment.description}</Text>}
              <View style={s.attach}>
                <AttachmentBar entityType="ASSIGNMENT" entityId={assignment.id} canUpload={canUpload} />
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function pretty(v?: string) {
  if (!v) return "";
  return v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, maxHeight: "80%" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  chip: { backgroundColor: colors.navy50, color: colors.navy, fontSize: 10, fontWeight: "700", paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 99, overflow: "hidden", textTransform: "uppercase" },
  close: { fontSize: 28, lineHeight: 28, color: colors.inkSubtle },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.inkSubtle, marginTop: 6, marginBottom: 14 },
  attach: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 8 },
  body: { fontSize: 14, lineHeight: 21, color: colors.inkMuted },
});
