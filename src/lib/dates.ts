/**
 * Local-calendar date helpers ("YYYY-MM-DD" in the phone's time zone). Never use
 * toISOString() for a day: it is UTC, so before 5:30 AM in India it gives yesterday.
 */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayISO = () => toISODate(new Date());

export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;

export const monthEnd = (iso: string) => {
  const d = fromISODate(monthStart(iso));
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

export function relativeDayLabel(iso: string) {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return fromISODate(iso).toLocaleDateString("en-IN", { weekday: "long" });
}

export const longDate = (iso: string) =>
  fromISODate(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export const monthTitle = (iso: string) =>
  fromISODate(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
