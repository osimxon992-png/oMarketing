import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { DataTable, Empty, Pager, SearchBox, TD, withQuery } from "@/components/admin/ui";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { PAGE_SIZE, pageParam, searchParam } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Users" };

type Search = Promise<{ q?: string; page?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: Search }) {
  const { a, locale } = await adminContext();
  const u = a.users;
  const sp = await searchParams;
  const q = searchParam(sp.q);
  const page = pageParam(sp.page);

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { telegramUsername: { contains: q.replace(/^@/, ""), mode: "insensitive" } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        shops: { select: { id: true, name: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title={a.nav.users} description={`${u.subtitle} · ${formatNumber(total)}`} />
      <Card>
        <div className="mb-4">
          <SearchBox q={q} placeholder={u.searchPlaceholder} button={a.common.search} />
        </div>
        {users.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable columns={[u.name, u.contact, u.shops, u.locale, u.notifier, u.registered, u.lastLogin]}>
            {users.map((user) => (
              <tr key={user.id}>
                <td className={TD}>
                  <p className="font-medium text-fg">{user.name}</p>
                </td>
                <td className={TD}>
                  <p className="text-fg">{user.email ?? "—"}</p>
                  {user.telegramUsername && <p className="text-xs text-subtle">@{user.telegramUsername}</p>}
                  {user.telegramId && !user.telegramUsername && <p className="text-xs text-subtle">tg:{String(user.telegramId)}</p>}
                </td>
                <td className={TD}>
                  {user.shops.length === 0 ? (
                    <span className="text-subtle">{u.noShop}</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {user.shops.map((s) => (
                        <Link key={s.id} href={`/admin/shops/${s.id}`} className="text-fg hover:underline">
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </td>
                <td className={`${TD} uppercase text-muted`}>{user.locale}</td>
                <td className={TD}>
                  <Badge tone={user.notifyChatId ? "success" : "neutral"}>{user.notifyChatId ? a.common.yes : a.common.no}</Badge>
                </td>
                <td className={`${TD} whitespace-nowrap text-muted`}>{formatDate(user.createdAt, locale)}</td>
                <td className={`${TD} whitespace-nowrap text-muted`}>
                  {user.sessions[0] ? formatDateTime(user.sessions[0].createdAt, locale) : a.common.never}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pager
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          labels={a.common}
          href={(p) => withQuery("/admin/users", { q, page: p > 1 ? p : undefined })}
        />
      </Card>
    </>
  );
}
