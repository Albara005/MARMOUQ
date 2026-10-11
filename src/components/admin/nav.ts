import {
  CircleUser,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  Shirt,
  ShoppingBag,
  TicketPercent,
  Truck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AdminRole = "owner" | "manager" | "staff";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: AdminRole;
  /** keyboard hint shown in the command palette */
  keywords?: string;
  badge?: "pending";
};

export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "المتجر",
    items: [
      { href: "/admin", label: "لوحة القيادة", icon: LayoutDashboard, keywords: "dashboard الرئيسية ملخص" },
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag, badge: "pending", keywords: "orders مبيعات" },
      { href: "/admin/customers", label: "العملاء", icon: Users, keywords: "customers زبائن" },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: Package, keywords: "products قطع مخزون" },
      { href: "/admin/categories", label: "التصنيفات", icon: FolderTree, keywords: "categories أقسام" },
      { href: "/admin/looks", label: "الإطلالات", icon: Shirt, keywords: "looks أطقم تنسيق" },
    ],
  },
  {
    label: "التسويق والشحن",
    items: [
      { href: "/admin/coupons", label: "كوبونات الخصم", icon: TicketPercent, keywords: "coupons خصومات" },
      { href: "/admin/shipping", label: "مناطق الشحن", icon: Truck, keywords: "shipping توصيل محافظات" },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { href: "/admin/settings", label: "الإعدادات", icon: Settings, minRole: "manager", keywords: "settings واتساب دفع" },
      { href: "/admin/team", label: "الفريق", icon: UsersRound, minRole: "owner", keywords: "team موظفين صلاحيات" },
      { href: "/admin/account", label: "حسابي", icon: CircleUser, keywords: "account كلمة المرور" },
    ],
  },
];

const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function navForRole(role: AdminRole): AdminNavGroup[] {
  return ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.minRole || RANK[role] >= RANK[i.minRole]) })).filter((g) => g.items.length);
}

/** Most specific nav item for a pathname. */
export function activeNavItem(pathname: string): AdminNavItem | null {
  let best: AdminNavItem | null = null;
  for (const g of ADMIN_NAV) {
    for (const item of g.items) {
      const match = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match && (!best || item.href.length > best.href.length)) best = item;
    }
  }
  return best;
}
