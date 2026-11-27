import type { ReactNode } from "react";
import {
  Banknote,
  BookOpen,
  ChartColumn,
  CircleHelp,
  FileText,
  History,
  House,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListTodo,
  Map,
  MapPin,
  Menu,
  Navigation,
  Package,
  Plus,
  Route,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Siren,
  Truck,
  Undo2,
  User,
  UserCog,
  Users,
  Wallet,
  type LucideProps, Ellipsis } from "lucide-react";

/** The steering wheel from the Gate 4 target (Lucide has none), drawn the Lucide way. */
function SteeringWheel({ strokeWidth = 1.75, ...props }: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 14v8" />
      <path d="M10 12H2" />
      <path d="M14 12h8" />
    </svg>
  );
}

// Shell config names icons by key (it is shared by server and client components); this maps them.
export const shellIcons = {
  approvals: ListTodo,
  audit: ScrollText,
  book: BookOpen,
  catalogue: Package,
  dashboard: LayoutDashboard,
  disputes: Scale,
  documents: FileText,
  drive: SteeringWheel,
  earnings: Banknote,
  escrow: Landmark,
  help: CircleHelp,
  history: History,
  home: House,
  inbox: Inbox,
  loads: Package,
  map: Map,
  menu: Menu,
  more: Ellipsis,
  money: Wallet,
  naira: Banknote,
  navigate: Navigation,
  people: Users,
  places: MapPin,
  plus: Plus,
  refunds: Undo2,
  reports: ChartColumn,
  settings: Settings,
  sos: Siren,
  staff: UserCog,
  trips: Route,
  truck: Truck,
  trust: ShieldCheck,
  user: User,
} as const;

export type ShellIcon = keyof typeof shellIcons;

/** A sidebar icon drawn from the mockup's own path data: 24 px box, 1.8 stroke, round caps (mockup .side .nav svg). */
function mockupIcon(children: ReactNode) {
  function Icon(props: LucideProps) {
    const { strokeWidth = 1.8, ...rest } = props;
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
        {children}
      </svg>
    );
  }
  return Icon;
}

const users = mockupIcon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
  </>,
);
const parcel = mockupIcon(
  <>
    <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </>,
);
const card = mockupIcon(
  <>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 10h18" />
  </>,
);
const truck = mockupIcon(
  <>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>,
);

/**
 * Desktop sidebar icons, path for path from the role mockups (sender D02b/D02c, owner OD01, driver DVD01,
 * agent GD01). Keys not listed fall back to the Lucide icon in `shellIcons`.
 */
export const sidebarIcons: Partial<Record<ShellIcon, (props: LucideProps) => ReactNode>> = {
  home: mockupIcon(<path d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />),
  truck,
  trips: mockupIcon(
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>,
  ),
  money: card,
  earnings: card,
  naira: mockupIcon(
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 15V9l5 6V9M7 11h7M7 13h7" />
    </>,
  ),
  people: users,
  places: mockupIcon(
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>,
  ),
  help: mockupIcon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.01" />
    </>,
  ),
  loads: parcel,
  book: parcel,
  documents: mockupIcon(
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>,
  ),
  trust: mockupIcon(<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9z" />),
  settings: mockupIcon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    </>,
  ),
  navigate: mockupIcon(<path d="M3 11 21 3l-8 18-2-8z" />),
  history: mockupIcon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
  ),
  user: mockupIcon(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
};
