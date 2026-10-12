import type { OrderStatus } from "@prisma/client";
import { Badge, type Tone } from "@/components/ui/card";

const TONES: Record<OrderStatus, Tone> = {
  NEW: "accent",
  CONFIRMED: "cyan",
  PAID: "success",
  SHIPPED: "cyan",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export function OrderStatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return <Badge tone={TONES[status]}>{label}</Badge>;
}
