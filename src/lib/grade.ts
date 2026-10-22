/**
 * Grade code helpers, mirroring GradeOrder on the server (port of web src/lib/grade.js).
 * Pre-primary years are stored as codes (PG, NUR, LKG, UKG) rather than words.
 */
const PRE_PRIMARY: Record<string, number> = { PG: -4, NUR: -3, LKG: -2, UKG: -1 };
const LABELS: Record<string, string> = { PG: "Playgroup", NUR: "Nursery", LKG: "LKG", UKG: "UKG" };

export function gradeRank(grade?: string | null): number {
  if (!grade) return 999;
  const code = String(grade).trim().toUpperCase();
  if (code in PRE_PRIMARY) return PRE_PRIMARY[code];
  const n = parseInt(code, 10);
  return Number.isNaN(n) ? 999 : n;
}

export function gradeLabel(grade?: string | null): string {
  if (!grade) return "";
  const code = String(grade).trim().toUpperCase();
  return LABELS[code] || String(grade).trim();
}

export function classLabel(grade?: string | null, section?: string | null): string {
  const code = String(grade || "").trim().toUpperCase();
  const prefix = code in PRE_PRIMARY ? "" : "Class ";
  return `${prefix}${gradeLabel(grade)}-${String(section || "").trim().toUpperCase()}`;
}

/** Every grade a school might run, in school order. Drives the onboarding grid. */
export const ALL_GRADES: string[] = [
  "PG", "NUR", "LKG", "UKG",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
];

export function compareClasses(a: { grade?: string | null; section?: string | null }, b: { grade?: string | null; section?: string | null }): number {
  const r = gradeRank(a.grade) - gradeRank(b.grade);
  if (r !== 0) return r;
  return String(a.section || "").localeCompare(String(b.section || ""));
}
