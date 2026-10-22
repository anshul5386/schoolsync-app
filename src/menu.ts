/**
 * The single list of destinations behind the Menu tab, with the roles allowed to open each.
 * Mirrors the route guards in the website's App.jsx exactly, so the app never offers a screen the
 * server would refuse. (The server still enforces every rule; this only decides what is shown.)
 */
export type MenuItem = { path: string; title: string; desc: string; roles: string[] };

const SCHOOL_ADMINS = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN"];

export const MENU: MenuItem[] = [
  { path: "/my-assignments", title: "My assignments", desc: "Work set for your class", roles: ["STUDENT"] },
  { path: "/attendance/students", title: "Student attendance", desc: "Mark and view attendance",
    roles: [...SCHOOL_ADMINS, "SUB_COORDINATOR", "TEACHER", "STUDENT"] },
  { path: "/attendance/teachers", title: "Teacher attendance", desc: "Staff attendance", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/timetable", title: "Timetable", desc: "Weekly periods",
    roles: [...SCHOOL_ADMINS, "SUB_COORDINATOR", "TEACHER", "STUDENT", "DIRECTOR", "CHAIRMAN"] },
  { path: "/timetable/manage", title: "Build timetable", desc: "Edit periods", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/teacher-calendar", title: "Teacher calendar", desc: "Who teaches when", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/substitution", title: "Substitution", desc: "Cover absent teachers", roles: ["PRINCIPAL", "COORDINATOR"] },
  { path: "/records", title: "Records", desc: "Assignments, exams and results",
    roles: ["PRINCIPAL", "COORDINATOR", "TEACHER", "DIRECTOR", "CHAIRMAN"] },
  { path: "/approvals", title: "Account requests", desc: "Approve new accounts", roles: ["PRINCIPAL", "SCHOOL_ADMIN", "SUPER_ADMIN"] },
  { path: "/teachers/manage", title: "Teachers", desc: "Responsibilities per class", roles: ["PRINCIPAL", "SCHOOL_ADMIN"] },
  { path: "/subjects", title: "Subjects", desc: "School subject list", roles: ["PRINCIPAL", "SCHOOL_ADMIN"] },
  { path: "/classes/manage", title: "Classes & sections", desc: "Add and rename sections", roles: SCHOOL_ADMINS },
  { path: "/super-admin/schools", title: "Schools", desc: "All schools", roles: ["SUPER_ADMIN"] },
  { path: "/super-admin/onboard", title: "Onboard a school", desc: "Set up a new school", roles: ["SUPER_ADMIN"] },
  { path: "/super-admin/users", title: "Platform users", desc: "Super-level accounts", roles: ["SUPER_ADMIN"] },
  { path: "/profile", title: "My profile", desc: "Your details", roles: ["*"] },
];

export const menuFor = (role?: string) => MENU.filter((m) => m.roles.includes("*") || (role && m.roles.includes(role)));
