import messages from "@/messages/en.json";
import type { ShellIcon } from "./icons";

// One shell for every signed-in role (Gate 4, ux-conventions §2). A role's shell is only this config:
// the base route, the phone tabs, the desktop sidebar and its main action. Pages are keys of
// messages.shell.pages; "home" is the base route itself and has no title (the greeting takes its place).

export type PageKey = keyof typeof messages.shell.pages;
export type ShellRole = "shipper" | "owner" | "ownerDriver" | "driver" | "agent";

export type NavItem = { page: PageKey; icon: ShellIcon };
export type TabItem = NavItem & { raised?: boolean };

export type ShellConfig = {
  role: ShellRole;
  base: string;
  /** The first tab; it shows the greeting instead of a title. */
  home: PageKey;
  /** The role's main action, at the top of the desktop sidebar (and the raised tab on phones). */
  action?: NavItem;
  tabs: TabItem[];
  sidebar: NavItem[];
  /** Pinned to the bottom of the desktop sidebar, above the signed-in person. */
  footer: NavItem[];
  /** Drivers get bigger tabs: 72 px bar, 28 px icons, 13 px labels (ux-driver §1.4). */
  largeTabs?: boolean;
};

const shipper: ShellConfig = {
  role: "shipper",
  base: "/app/ship",
  home: "home",
  action: { page: "book", icon: "plus" },
  tabs: [
    { page: "home", icon: "home" },
    { page: "trips", icon: "trips" },
    { page: "book", icon: "plus", raised: true },
    { page: "payments", icon: "money" },
    { page: "more", icon: "menu" },
  ],
  // Desktop icons follow sender D02b: Trips is the truck there.
  sidebar: [
    { page: "home", icon: "home" },
    { page: "trips", icon: "truck" },
    { page: "payments", icon: "money" },
    { page: "places", icon: "places" },
    { page: "team", icon: "people" },
    { page: "help", icon: "help" },
  ],
  footer: [{ page: "settings", icon: "settings" }],
};

const ownerSidebar: NavItem[] = [
  { page: "home", icon: "home" },
  { page: "loads", icon: "loads" },
  { page: "trips", icon: "trips" },
  { page: "earnings", icon: "earnings" },
  { page: "trucks", icon: "truck" },
  { page: "drivers", icon: "people" },
  { page: "documents", icon: "documents" },
  { page: "record", icon: "trust" },
  { page: "team", icon: "settings" },
  { page: "help", icon: "help" },
];

const owner: ShellConfig = {
  role: "owner",
  base: "/app/haul",
  home: "home",
  action: { page: "findLoads", icon: "loads" },
  tabs: [
    { page: "home", icon: "home" },
    { page: "loads", icon: "loads" },
    { page: "trips", icon: "trips" },
    { page: "earnings", icon: "earnings" },
    { page: "more", icon: "menu" },
  ],
  sidebar: ownerSidebar,
  footer: [{ page: "settings", icon: "settings" }],
};

// An owner who also drives: Drive replaces Trips and is raised (ux-owner-driver.md).
const ownerDriver: ShellConfig = {
  ...owner,
  role: "ownerDriver",
  action: { page: "drive", icon: "drive" },
  tabs: [
    { page: "home", icon: "home" },
    { page: "loads", icon: "loads" },
    { page: "drive", icon: "drive", raised: true },
    { page: "earnings", icon: "earnings" },
    { page: "more", icon: "menu" },
  ],
  sidebar: [{ page: "home", icon: "home" }, { page: "drive", icon: "drive" }, ...ownerSidebar.slice(1)],
};

const driver: ShellConfig = {
  role: "driver",
  base: "/app/drive",
  home: "trip",
  tabs: [
    { page: "trip", icon: "drive" },
    { page: "next", icon: "loads" },
    { page: "history", icon: "history" },
    { page: "me", icon: "user" },
  ],
  sidebar: [
    { page: "trip", icon: "navigate" },
    { page: "next", icon: "loads" },
    { page: "history", icon: "history" },
    { page: "me", icon: "user" },
  ],
  footer: [{ page: "help", icon: "help" }],
  largeTabs: true,
};

const agent: ShellConfig = {
  role: "agent",
  base: "/app/agent",
  home: "home",
  action: { page: "invite", icon: "plus" },
  tabs: [
    { page: "home", icon: "home" },
    { page: "people", icon: "people" },
    { page: "invite", icon: "plus", raised: true },
    { page: "earnings", icon: "earnings" },
    { page: "me", icon: "user" },
  ],
  sidebar: [
    { page: "home", icon: "home" },
    { page: "people", icon: "people" },
    { page: "earnings", icon: "naira" },
    { page: "bookings", icon: "book" },
    { page: "help", icon: "help" },
  ],
  footer: [{ page: "settings", icon: "settings" }],
};

export const shells: Record<ShellRole, ShellConfig> = { shipper, owner, ownerDriver, driver, agent };

/** The address of a page in a shell: the home page is the base route itself. */
export function pageHref(config: ShellConfig, page: PageKey) {
  return page === config.home ? config.base : `${config.base}/${page}`;
}

/**
 * Every page a shell can open, for its [page] route. Includes the top bar's bell and search pages
 * (each shell's own notifications and search).
 */
export function shellPages(config: ShellConfig): PageKey[] {
  const all = [...config.tabs, ...config.sidebar, ...config.footer, ...(config.action ? [config.action] : [])].map((item) => item.page);
  return [...new Set([...all, "notifications", "search", "more", "settings"] as PageKey[])].filter((page) => page !== config.home);
}

/** The staff console's sidebar (ux-admin.md §1): grouped, desktop first. Every item opens a placeholder for now. */
export type StaffPage = keyof typeof messages.shell.staff.pages;
type StaffGroup = { group?: keyof typeof messages.shell.staff.groups; items: { page: StaffPage; icon: ShellIcon }[] };

export const staffNav: StaffGroup[] = [
  { items: [{ page: "work", icon: "approvals" }, { page: "tasks", icon: "approvals" }, { page: "overview", icon: "dashboard" }] },
  { group: "operations", items: [{ page: "map", icon: "map" }, { page: "sos", icon: "sos" }, { page: "trips", icon: "trips" }, { page: "loads", icon: "loads" }] },
  { group: "trust", items: [{ page: "verification", icon: "trust" }, { page: "disputes", icon: "disputes" }, { page: "fraud", icon: "sos" }] },
  { group: "people", items: [{ page: "users", icon: "people" }, { page: "agents", icon: "user" }, { page: "support", icon: "inbox" }] },
  {
    group: "money",
    items: [
      { page: "escrow", icon: "escrow" },
      { page: "payouts", icon: "earnings" },
      { page: "refunds", icon: "refunds" },
      { page: "reconciliation", icon: "approvals" },
      { page: "approvals", icon: "approvals" },
    ],
  },
  {
    group: "setup",
    items: [
      { page: "catalogue", icon: "catalogue" },
      { page: "corridors", icon: "trips" },
      { page: "fees", icon: "money" },
      { page: "messages", icon: "inbox" },
      { page: "website", icon: "documents" },
      { page: "settings", icon: "settings" },
    ],
  },
  { group: "insights", items: [{ page: "reports", icon: "reports" }] },
  { group: "admin", items: [{ page: "staff", icon: "staff" }, { page: "audit", icon: "audit" }] },
];

export type StaffRole = "super_admin" | "operations" | "verification" | "finance" | "support" | "field_agent";

const ALL: StaffRole[] = ["super_admin", "operations", "verification", "finance", "support", "field_agent"];
const OFFICE: StaffRole[] = ["super_admin", "operations", "verification", "finance", "support"];

/**
 * Who sees each console page in the sidebar (ROLES-AND-PERMISSIONS.md §7, "view" counts as seeing).
 * The interface only hides: every read and action is checked again in the database.
 */
export const staffPageRoles: Record<StaffPage, readonly StaffRole[]> = {
  work: OFFICE,
  overview: OFFICE,
  tasks: ["super_admin", "operations", "field_agent"],
  map: ["super_admin", "operations", "support"],
  sos: ["super_admin", "operations", "support"],
  trips: OFFICE,
  loads: OFFICE,
  users: ALL,
  verification: ["super_admin", "operations", "verification", "field_agent"],
  disputes: ["super_admin", "operations", "finance", "support"],
  fraud: ["super_admin", "operations", "verification", "finance"],
  escrow: ["super_admin", "operations", "finance", "support"],
  payouts: ["super_admin", "operations", "finance", "support"],
  refunds: ["super_admin", "operations", "finance", "support"],
  reconciliation: ["super_admin", "operations", "finance", "support"],
  approvals: ["super_admin", "finance"],
  support: ["super_admin", "operations", "support"],
  agents: ["super_admin", "operations", "finance", "support"],
  catalogue: ["super_admin", "operations"],
  corridors: ["super_admin", "operations"],
  fees: ["super_admin", "finance"],
  messages: ["super_admin", "operations", "support"],
  website: ["super_admin", "operations"],
  reports: ["super_admin", "operations", "finance"],
  settings: ["super_admin"],
  staff: ["super_admin"],
  audit: ["super_admin"],
  playbooks: ALL,
  help: ALL,
};

/** The sidebar for one staff role: groups keep their order, empty groups drop out. */
export function staffNavFor(role: StaffRole | null): StaffGroup[] {
  if (!role) return staffNav;
  return staffNav.map((group) => ({ ...group, items: group.items.filter((item) => staffPageRoles[item.page].includes(role)) })).filter((group) => group.items.length);
}
