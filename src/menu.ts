/**
 * Role-aware navigation — keep in sync with schoolsync-web/src/lib/navigation.js
 */
export const SCHOOL_ROLES = [
  "PRINCIPAL",
  "SCHOOL_ADMIN",
  "COORDINATOR",
  "SUB_COORDINATOR",
  "TEACHER",
  "STUDENT",
] as const;

export type MenuItem = { path: string; title: string; desc: string; roles: string[] };

const SCHOOL_ADMINS = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN"];
const RECORDS_ROLES = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN", "TEACHER", "DIRECTOR", "CHAIRMAN"];
const LESSON_ROLES = ["PRINCIPAL", "COORDINATOR", "TEACHER", "DIRECTOR", "CHAIRMAN"];
const TIMETABLE_VIEW = [...SCHOOL_ROLES, "DIRECTOR", "CHAIRMAN"];

export const MENU: MenuItem[] = [
  { path: "/my-assignments", title: "My assignments", desc: "Work set for your class", roles: ["STUDENT"] },
  { path: "/my-results", title: "My results", desc: "Exam marks", roles: ["STUDENT"] },
  {
    path: "/attendance/students", title: "Student attendance", desc: "Mark and view attendance",
    roles: [...SCHOOL_ADMINS, "SUB_COORDINATOR", "TEACHER", "STUDENT"],
  },
  { path: "/attendance/teachers", title: "Staff attendance", desc: "Teacher attendance", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/timetable", title: "Timetable", desc: "Weekly periods", roles: TIMETABLE_VIEW },
  { path: "/timetable/manage", title: "Build timetable", desc: "Edit periods and copy week", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/teacher-calendar", title: "Teacher calendar", desc: "Who teaches when", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/substitution", title: "Substitution", desc: "Cover absent teachers", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/directory", title: "Directory", desc: "Students and teachers", roles: ["PRINCIPAL", "SCHOOL_ADMIN", "COORDINATOR"] },
  { path: "/records", title: "Records", desc: "Assignments, exams and results", roles: RECORDS_ROLES },
  { path: "/lesson-plans", title: "Lesson plans", desc: "Class lesson plans", roles: LESSON_ROLES },
  { path: "/approvals", title: "Account requests", desc: "Approve new accounts", roles: ["PRINCIPAL", "SCHOOL_ADMIN"] },
  { path: "/super-admin/requests", title: "Account requests", desc: "All schools", roles: ["SUPER_ADMIN"] },
  { path: "/teachers/manage", title: "Teachers", desc: "Responsibilities per class", roles: ["PRINCIPAL", "SCHOOL_ADMIN"] },
  { path: "/subjects", title: "Subjects", desc: "School subject list", roles: ["PRINCIPAL", "SCHOOL_ADMIN"] },
  { path: "/classes/manage", title: "Classes & sections", desc: "Add and rename sections", roles: SCHOOL_ADMINS },
  { path: "/super-admin/schools", title: "Schools", desc: "All schools", roles: ["SUPER_ADMIN"] },
  { path: "/super-admin/onboard", title: "Onboard a school", desc: "Set up a new school", roles: ["SUPER_ADMIN"] },
  { path: "/super-admin/users", title: "Platform users", desc: "Super-level accounts", roles: ["SUPER_ADMIN"] },
  { path: "/profile", title: "My profile", desc: "Your details", roles: ["*"] },
];

export const menuFor = (role?: string) =>
  MENU.filter((m) => m.roles.includes("*") || (role && m.roles.includes(role)));

export type TabDef = { name: string; title: string; icon: string; href: string };

/** Bottom tabs shown per role (mirrors web MOBILE_TABS_BY_ROLE). */
export function mobileTabsForRole(role?: string): TabDef[] {
  const r = role || "TEACHER";
  const map: Record<string, TabDef[]> = {
    STUDENT: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "assignments", title: "Work", icon: "✎", href: "/my-assignments" },
      { name: "results", title: "Results", icon: "★", href: "/my-results" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    TEACHER: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "attendance", title: "Attendance", icon: "✓", href: "/attendance/students" },
      { name: "records", title: "Records", icon: "▦", href: "/records" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    COORDINATOR: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "attendance", title: "Attendance", icon: "✓", href: "/attendance/students" },
      { name: "subs", title: "Subs", icon: "↻", href: "/substitution" },
      { name: "records", title: "Records", icon: "▦", href: "/records" },
    ],
    SUB_COORDINATOR: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "attendance", title: "Attendance", icon: "✓", href: "/attendance/students" },
      { name: "timetable", title: "Timetable", icon: "▥", href: "/timetable" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    PRINCIPAL: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "approvals", title: "Approvals", icon: "✓", href: "/approvals" },
      { name: "records", title: "Records", icon: "▦", href: "/records" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    SCHOOL_ADMIN: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "approvals", title: "Approvals", icon: "✓", href: "/approvals" },
      { name: "teachers", title: "Teachers", icon: "👤", href: "/teachers/manage" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    DIRECTOR: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "records", title: "Records", icon: "▦", href: "/records" },
      { name: "timetable", title: "Timetable", icon: "▥", href: "/timetable" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    CHAIRMAN: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "records", title: "Records", icon: "▦", href: "/records" },
      { name: "timetable", title: "Timetable", icon: "▥", href: "/timetable" },
      { name: "notices", title: "Notices", icon: "▤", href: "/notices" },
    ],
    SUPER_ADMIN: [
      { name: "index", title: "Home", icon: "⌂", href: "/" },
      { name: "schools", title: "Schools", icon: "🏫", href: "/super-admin/schools" },
      { name: "onboard", title: "Onboard", icon: "+", href: "/super-admin/onboard" },
      { name: "requests", title: "Requests", icon: "✓", href: "/super-admin/requests" },
    ],
  };
  return map[r] || map.TEACHER;
}
