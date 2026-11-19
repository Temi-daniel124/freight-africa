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
  type LucideProps,
} from "lucide-react";

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
  money: Wallet,
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
