"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShopStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { useAdminDict } from "@/lib/i18n/use-admin";

function useAdminRequest() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send(url: string, init: RequestInit, success: string) {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error();
      toast(success);
      router.refresh();
    } catch {
      toast(t.errors.generic, "error");
    } finally {
      setBusy(false);
    }
  }

  return { busy, send };
}

export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const { t } = useI18n();
  const a = useAdminDict().common;
  const { busy, send } = useAdminRequest();
  return (
    <ConfirmButton
      size="sm"
      variant="secondary"
      loading={busy}
      confirmLabel={t.common.yes}
      onConfirm={() => send(`/api/admin/invoices/${invoiceId}`, { method: "POST" }, a.markedPaid)}
    >
      {a.markPaid}
    </ConfirmButton>
  );
}

export function ShopStatusButton({ shopId, status }: { shopId: string; status: ShopStatus }) {
  const { t } = useI18n();
  const a = useAdminDict().common;
  const { busy, send } = useAdminRequest();
  const next: ShopStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  const run = () =>
    send(
      `/api/admin/shops/${shopId}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) },
      a.updated,
    );

  if (next === "ACTIVE") {
    return (
      <Button size="sm" variant="secondary" loading={busy} onClick={run}>
        {a.activate}
      </Button>
    );
  }
  return (
    <ConfirmButton size="sm" variant="ghost" loading={busy} confirmLabel={t.common.yes} onConfirm={run}>
      {a.suspend}
    </ConfirmButton>
  );
}
