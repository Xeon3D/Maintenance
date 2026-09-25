import type { Permission } from "@/lib/rbac";

export type NavItem = {
  href: string;
  labelKey: string; // key under "nav"
  icon: string; // lucide icon name, resolved in sidebar.tsx
  permission?: Permission;
  ready: boolean; // false = module not built yet (hidden)
};

export type NavGroup = { labelKey?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    items: [{ href: "/dashboard", labelKey: "dashboard", icon: "LayoutDashboard", ready: true }],
  },
  {
    labelKey: "operations",
    items: [
      { href: "/work-orders", labelKey: "workOrders", icon: "ClipboardList", permission: "internal.view", ready: false },
      { href: "/requests", labelKey: "requests", icon: "Inbox", ready: false },
      { href: "/preventive", labelKey: "preventive", icon: "CalendarClock", permission: "internal.view", ready: false },
      { href: "/procedures", labelKey: "procedures", icon: "ListChecks", permission: "internal.view", ready: false },
      { href: "/messages", labelKey: "messages", icon: "MessagesSquare", permission: "internal.view", ready: false },
    ],
  },
  {
    labelKey: "sites",
    items: [
      { href: "/clients", labelKey: "clients", icon: "Users", permission: "internal.view", ready: false },
      { href: "/villas", labelKey: "villas", icon: "House", permission: "internal.view", ready: false },
      { href: "/assets", labelKey: "assets", icon: "Cpu", permission: "internal.view", ready: false },
      { href: "/meters", labelKey: "meters", icon: "Gauge", permission: "internal.view", ready: false },
    ],
  },
  {
    labelKey: "supply",
    items: [
      { href: "/parts", labelKey: "parts", icon: "Package", permission: "internal.view", ready: false },
      { href: "/purchase-orders", labelKey: "purchaseOrders", icon: "ShoppingCart", permission: "purchasing.manage", ready: false },
      { href: "/vendors", labelKey: "vendors", icon: "Truck", permission: "internal.view", ready: false },
    ],
  },
  {
    labelKey: "insights",
    items: [{ href: "/reports", labelKey: "reports", icon: "ChartColumn", permission: "reports.view", ready: false }],
  },
  {
    labelKey: "settings",
    items: [
      { href: "/settings/organization", labelKey: "organization", icon: "Building2", permission: "org.manage", ready: true },
      { href: "/settings/users", labelKey: "users", icon: "UserCog", permission: "users.manage", ready: true },
      { href: "/settings/teams", labelKey: "teams", icon: "UsersRound", permission: "teams.manage", ready: true },
    ],
  },
];
