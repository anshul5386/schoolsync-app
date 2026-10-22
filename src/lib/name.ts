const TITLES = /^(dr|mr|mrs|ms|miss|prof|smt|shri|sri|md)\.?$/i;

function meaningfulParts(name?: string | null): string[] {
  if (!name) return [];
  return name.trim().split(/\s+/).filter((p) => p && !TITLES.test(p));
}

export function initials(name?: string | null): string {
  const parts = meaningfulParts(name);
  if (parts.length === 0) return (name || "?").charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name?: string | null): string {
  const parts = meaningfulParts(name);
  return parts[0] || name || "";
}

/** Honorific kept, so "Dr. Meena Sharma" stays respectful in the greeting. */
export const displayName = (name?: string | null): string => (name || "").trim();

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export const longDate = (date: Date = new Date()): string =>
  date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
