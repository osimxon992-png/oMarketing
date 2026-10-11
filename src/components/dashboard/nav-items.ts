import {
  Bot,
  BrainCircuit,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Radio,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { Dict } from "@/lib/i18n/dictionaries";

export const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/assistant", key: "assistant", icon: BrainCircuit },
  { href: "/dashboard/inbox", key: "inbox", icon: MessagesSquare },
  { href: "/dashboard/products", key: "products", icon: Package },
  { href: "/dashboard/orders", key: "orders", icon: ShoppingBag },
  { href: "/dashboard/ai", key: "aiSettings", icon: Sparkles },
  { href: "/dashboard/playground", key: "testChat", icon: Bot },
  { href: "/dashboard/channels", key: "channels", icon: Radio },
  { href: "/dashboard/payments", key: "payments", icon: Wallet },
  { href: "/dashboard/billing", key: "billing", icon: CreditCard },
  { href: "/dashboard/referral", key: "referral", icon: Gift },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
] as const satisfies readonly { href: string; key: keyof Dict["nav"]; icon: unknown }[];

export const ADMIN_ITEM = { href: "/admin", key: "admin", icon: Receipt } as const;
