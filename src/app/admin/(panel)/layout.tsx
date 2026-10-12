import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [pendingInvoices, channelErrors] = await Promise.all([
    db.billingInvoice.count({ where: { status: "PENDING" } }),
    db.channel.count({ where: { status: "ERROR" } }),
  ]);
  return <AdminShell badges={{ payments: pendingInvoices, channels: channelErrors }}>{children}</AdminShell>;
}
