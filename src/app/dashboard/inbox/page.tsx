import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { MessagesSquare, PauseCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Xabarlar" };

const CHANNEL_LABEL: Record<string, string> = {
  TELEGRAM: "Telegram",
  TELEGRAM_BUSINESS: "Telegram",
  INSTAGRAM: "Instagram",
  WEB_WIDGET: "Web",
  PLAYGROUND: "Test",
  DEMO: "Demo",
};

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ unread?: string }> }) {
  const { shop } = await requireShop();
  const { t, locale } = await getDict();
  const p = pagesDictionaries[locale].inbox;
  const unreadOnly = (await searchParams).unread === "1";
  const where: Prisma.ConversationWhereInput = { shopId: shop.id, ...(unreadOnly ? { unread: { gt: 0 } } : {}) };
  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: { customer: { select: { name: true, username: true, phone: true } } },
  });

  return (
    <>
      <PageHeader
        title={p.title}
        description={p.subtitle}
        action={
          <Link href={unreadOnly ? "?" : "?unread=1"} className={buttonClass(unreadOnly ? "primary" : "secondary", "md")}>
            {p.unreadOnly}
          </Link>
        }
      />
      {conversations.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessagesSquare className="h-7 w-7" />}
            title={unreadOnly ? t.common.noResults : p.empty}
            description={unreadOnly ? undefined : p.emptyText}
            action={
              !unreadOnly && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/dashboard/channels" className={buttonClass("primary")}>
                    {t.nav.channels}
                  </Link>
                  <Link href="/dashboard/playground" className={buttonClass("secondary")}>
                    {t.nav.testChat}
                  </Link>
                </div>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--glass-border)]">
            {conversations.map((c) => {
              const name = c.customer.name || (c.customer.username ? `@${c.customer.username}` : c.customer.phone ?? "—");
              return (
                <li key={c.id}>
                  <Link href={`/dashboard/inbox/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-glass sm:px-5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-glass-strong text-sm font-semibold text-fg">
                      {name.replace("@", "").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("truncate text-fg", c.unread > 0 ? "font-semibold" : "font-medium")}>{name}</span>
                        <Badge className="shrink-0">{CHANNEL_LABEL[c.channel] ?? c.channel}</Badge>
                        {c.aiPaused && <PauseCircle className="h-4 w-4 shrink-0 text-warning" aria-label={p.botPaused} />}
                      </span>
                      <span className={cn("block truncate text-sm", c.unread > 0 ? "text-fg" : "text-subtle")}>{c.lastMessagePreview || "…"}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-subtle">{formatDateTime(c.lastMessageAt, locale)}</span>
                      {c.unread > 0 && <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-bold text-page">{c.unread}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
