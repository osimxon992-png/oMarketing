import "server-only";
import { Prisma, type ConversationChannel, type OrderStatus, type Shop, type Plan } from "@prisma/client";
import { db } from "@/lib/db";
import { getEntitlements, getMonthlyUsage } from "@/lib/shop";
import { totalStock, variantLabel } from "@/lib/products";
import { normalizeSearch } from "@/lib/validation";
import { tashkentDate, tashkentDateTime, type Range } from "./period";

// Test chats from the playground and the landing demo are not real customers.
const TEST_CHANNELS: ConversationChannel[] = ["PLAYGROUND", "DEMO"];
// Orders that count as a sale (everything except cancelled).
const SALE_STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED"];

const inRange = (r: Range) => ({ gte: r.from, lt: r.to });
const sumOf = (rows: { total: number | null }[]) => rows.reduce((s, r) => s + (r.total ?? 0), 0);

export async function shopOverview(shop: Shop & { plan?: Plan | null }) {
  const [ent, usage, products, activeProducts, channels, payment, customers, orders, referrals] = await Promise.all([
    getEntitlements(shop),
    getMonthlyUsage(shop.id),
    db.product.count({ where: { shopId: shop.id } }),
    db.product.count({ where: { shopId: shop.id, active: true } }),
    db.channel.findMany({
      where: { shopId: shop.id },
      select: { type: true, status: true, username: true, displayName: true, lastError: true, createdAt: true },
    }),
    db.shopPaymentConfig.findUnique({ where: { shopId: shop.id }, select: { paymeEnabled: true, clickEnabled: true, paymeTestMode: true } }),
    db.customer.count({ where: { shopId: shop.id, channel: { notIn: TEST_CHANNELS } } }),
    db.order.count({ where: { shopId: shop.id, source: { notIn: TEST_CHANNELS } } }),
    db.shop.count({ where: { referredById: shop.id } }),
  ]);
  return {
    shop: { name: shop.name, createdAt: tashkentDate(shop.createdAt), aiEnabled: shop.aiEnabled, onboardingCompleted: shop.onboardingCompleted },
    subscription: {
      status: ent.status,
      plan: ent.planName,
      endsOn: tashkentDate(ent.endsAt),
      aiRepliesThisMonth: usage,
      aiRepliesMonthlyLimit: ent.monthlyReplies,
      instagramIncluded: ent.instagram,
      webWidgetIncluded: ent.webWidget,
    },
    catalog: { products, activeProducts },
    channels: channels.map((c) => ({
      type: c.type,
      status: c.status,
      account: c.username ? `@${c.username}` : c.displayName,
      lastError: c.lastError,
      connectedOn: tashkentDate(c.createdAt),
    })),
    payments: { payme: payment?.paymeEnabled ?? false, paymeTestMode: payment?.paymeTestMode ?? null, click: payment?.clickEnabled ?? false },
    allTime: { customers, orders },
    referredShops: referrals,
  };
}

export async function periodStats(shopId: string, r: Range) {
  const realConversation = { channel: { notIn: TEST_CHANNELS } };
  const [newCustomers, byChannel, newConversations, customerMessages, aiReplies, sellerReplies, writers, orders, paid] =
    await Promise.all([
      db.customer.count({ where: { shopId, createdAt: inRange(r), ...realConversation } }),
      db.customer.groupBy({
        by: ["channel"],
        where: { shopId, createdAt: inRange(r), ...realConversation },
        _count: { _all: true },
      }),
      db.conversation.count({ where: { shopId, createdAt: inRange(r), ...realConversation } }),
      db.message.count({ where: { shopId, role: "CUSTOMER", createdAt: inRange(r), conversation: realConversation } }),
      db.message.count({ where: { shopId, role: "AI", createdAt: inRange(r), conversation: realConversation } }),
      db.message.count({ where: { shopId, role: "SELLER", createdAt: inRange(r), conversation: realConversation } }),
      db.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(DISTINCT c."customerId") AS n
        FROM "Message" m JOIN "Conversation" c ON c."id" = m."conversationId"
        WHERE m."shopId" = ${shopId} AND m."role" = 'CUSTOMER'
          AND m."createdAt" >= ${r.from} AND m."createdAt" < ${r.to}
          AND c."channel" NOT IN ('PLAYGROUND', 'DEMO')`,
      db.order.groupBy({
        by: ["status"],
        where: { shopId, createdAt: inRange(r), source: { notIn: TEST_CHANNELS } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      db.order.aggregate({
        where: { shopId, paidAt: inRange(r), source: { notIn: TEST_CHANNELS } },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

  const sales = orders.filter((o) => SALE_STATUSES.includes(o.status));
  const salesCount = sales.reduce((s, o) => s + o._count._all, 0);
  const salesTotal = sumOf(sales.map((o) => ({ total: o._sum.total })));
  return {
    period: r.label,
    newSubscribers: { total: newCustomers, byChannel: Object.fromEntries(byChannel.map((c) => [c.channel, c._count._all])) },
    customersWhoWrote: Number(writers[0]?.n ?? 0),
    newConversations,
    messages: { fromCustomers: customerMessages, aiReplies, sellerReplies },
    orders: {
      created: salesCount,
      createdTotalSum: salesTotal,
      averageOrderValue: salesCount ? Math.round(salesTotal / salesCount) : 0,
      cancelled: orders.find((o) => o.status === "CANCELLED")?._count._all ?? 0,
      byStatus: Object.fromEntries(orders.map((o) => [o.status, { count: o._count._all, sum: o._sum.total ?? 0 }])),
    },
    paymentsReceived: { count: paid._count._all, sum: paid._sum.total ?? 0 },
    conversionRate: Number(writers[0]?.n ?? 0) ? `${Math.round((salesCount / Number(writers[0]!.n)) * 1000) / 10}%` : null,
    currency: "UZS (so'm)",
  };
}

export async function dailyBreakdown(shopId: string, r: Range) {
  const day = Prisma.sql`(("createdAt" + interval '5 hours')::date)`;
  const [customers, messages, orders] = await Promise.all([
    db.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT ${day} AS day, COUNT(*) AS n FROM "Customer"
      WHERE "shopId" = ${shopId} AND "createdAt" >= ${r.from} AND "createdAt" < ${r.to}
        AND "channel" NOT IN ('PLAYGROUND', 'DEMO')
      GROUP BY 1`,
    db.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT ((m."createdAt" + interval '5 hours')::date) AS day, COUNT(*) AS n
      FROM "Message" m JOIN "Conversation" c ON c."id" = m."conversationId"
      WHERE m."shopId" = ${shopId} AND m."role" = 'CUSTOMER'
        AND m."createdAt" >= ${r.from} AND m."createdAt" < ${r.to}
        AND c."channel" NOT IN ('PLAYGROUND', 'DEMO')
      GROUP BY 1`,
    db.$queryRaw<{ day: Date; n: bigint; sum: bigint | null }[]>`
      SELECT ${day} AS day, COUNT(*) AS n, SUM("total") AS sum FROM "Order"
      WHERE "shopId" = ${shopId} AND "createdAt" >= ${r.from} AND "createdAt" < ${r.to}
        AND "status" <> 'CANCELLED' AND "source" NOT IN ('PLAYGROUND', 'DEMO')
      GROUP BY 1`,
  ]);

  const key = (d: Date) => d.toISOString().slice(0, 10);
  const days = new Map<string, { date: string; newSubscribers: number; customerMessages: number; orders: number; salesSum: number }>();
  const row = (date: string) => {
    let v = days.get(date);
    if (!v) days.set(date, (v = { date, newSubscribers: 0, customerMessages: 0, orders: 0, salesSum: 0 }));
    return v;
  };
  // Emit every day of the range (capped) so quiet days show up as zeros.
  const first = tashkentDate(r.from);
  for (let t = Date.parse(`${first}T00:00:00Z`), i = 0; i < 92; i++, t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    if (Date.parse(`${date}T00:00:00Z`) - 5 * 3_600_000 >= r.to.getTime()) break;
    row(date);
  }
  for (const c of customers) row(key(c.day)).newSubscribers = Number(c.n);
  for (const m of messages) row(key(m.day)).customerMessages = Number(m.n);
  for (const o of orders) Object.assign(row(key(o.day)), { orders: Number(o.n), salesSum: Number(o.sum ?? 0) });
  return { period: r.label, days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export async function listOrders(shopId: string, r: Range, status: OrderStatus | undefined, limit: number) {
  const where: Prisma.OrderWhereInput = { shopId, createdAt: inRange(r), source: { notIn: TEST_CHANNELS } };
  if (status) where.status = status;
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { items: { select: { name: true, variantLabel: true, quantity: true, lineTotal: true } } },
    }),
    db.order.count({ where }),
  ]);
  return {
    period: r.label,
    totalMatching: total,
    shown: orders.length,
    orders: orders.map((o) => ({
      number: o.number,
      createdAt: tashkentDateTime(o.createdAt),
      status: o.status,
      customer: o.customerName,
      phone: o.phone,
      source: o.source,
      delivery: o.deliveryType === "PICKUP" ? "pickup" : `${o.deliveryAddress} (${o.deliveryPrice} so'm)`,
      total: o.total,
      paid: o.paidAt ? `${o.paymentProvider ?? ""} ${tashkentDateTime(o.paidAt)}`.trim() : null,
      items: o.items.map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} × ${i.quantity} = ${i.lineTotal}`),
    })),
  };
}

export async function topProducts(shopId: string, r: Range, limit: number) {
  const rows = await db.orderItem.groupBy({
    by: ["name"],
    where: { order: { shopId, createdAt: inRange(r), status: { in: SALE_STATUSES }, source: { notIn: TEST_CHANNELS } } },
    _sum: { quantity: true, lineTotal: true },
    _count: { _all: true },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: limit,
  });
  return {
    period: r.label,
    products: rows.map((p) => ({ name: p.name, unitsSold: p._sum.quantity ?? 0, revenue: p._sum.lineTotal ?? 0, orderLines: p._count._all })),
  };
}

export async function inventory(shopId: string, query: string | undefined, lowStockBelow: number | undefined, limit: number) {
  const where: Prisma.ProductWhereInput = { shopId };
  const tokens = query ? normalizeSearch(query).split(" ").filter(Boolean).slice(0, 6) : [];
  if (tokens.length) where.AND = tokens.map((tok) => ({ searchText: { contains: tok } }));
  const [products, total, active] = await Promise.all([
    db.product.findMany({ where, include: { variants: true }, orderBy: { updatedAt: "desc" }, take: 500 }),
    db.product.count({ where: { shopId } }),
    db.product.count({ where: { shopId, active: true } }),
  ]);
  const enriched = products.map((p) => ({ p, stock: totalStock(p) }));
  const filtered = lowStockBelow === undefined ? enriched : enriched.filter((e) => e.stock < lowStockBelow);
  filtered.sort((a, b) => (lowStockBelow === undefined ? 0 : a.stock - b.stock));
  return {
    catalogTotals: { products: total, active, outOfStock: enriched.filter((e) => e.stock === 0 && e.p.active).length },
    matching: filtered.length,
    products: filtered.slice(0, limit).map(({ p, stock }) => ({
      name: p.name,
      category: p.category || null,
      price: p.price,
      stock,
      active: p.active,
      variants: p.variants.map((v) => ({ variant: variantLabel(v), stock: v.stock, price: v.price ?? p.price })),
    })),
  };
}

export async function listConversations(shopId: string, r: Range, unreadOnly: boolean, limit: number) {
  const where: Prisma.ConversationWhereInput = { shopId, lastMessageAt: inRange(r), channel: { notIn: TEST_CHANNELS } };
  if (unreadOnly) where.unread = { gt: 0 };
  const [rows, total] = await Promise.all([
    db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      include: { customer: { select: { name: true, username: true, phone: true } }, _count: { select: { orders: true } } },
    }),
    db.conversation.count({ where }),
  ]);
  return {
    period: r.label,
    totalMatching: total,
    conversations: rows.map((c) => ({
      customer: c.customer.name || (c.customer.username ? `@${c.customer.username}` : "—"),
      phone: c.customer.phone,
      channel: c.channel,
      lastMessageAt: tashkentDateTime(c.lastMessageAt),
      lastMessage: c.lastMessagePreview,
      unread: c.unread,
      messages: c.messageCount,
      orders: c._count.orders,
      aiPaused: c.aiPaused,
    })),
  };
}

export async function findCustomers(shopId: string, query: string, limit: number) {
  const q = query.trim().replace(/^@/, "");
  const customers = await db.customer.findMany({
    where: {
      shopId,
      channel: { notIn: TEST_CHANNELS },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { phone: { contains: q.replace(/\D/g, "") || q } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      orders: { select: { number: true, total: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  return {
    customers: customers.map((c) => ({
      name: c.name || null,
      username: c.username ? `@${c.username}` : null,
      phone: c.phone,
      address: c.address,
      channel: c.channel,
      firstContact: tashkentDate(c.createdAt),
      orders: c.orders.length,
      totalSpent: c.orders.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + o.total, 0),
      recentOrders: c.orders.map((o) => ({ number: o.number, total: o.total, status: o.status, date: tashkentDate(o.createdAt) })),
    })),
  };
}
