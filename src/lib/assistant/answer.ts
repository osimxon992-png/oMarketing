import "server-only";
import type { Plan, Shop } from "@prisma/client";
import { normalizeSearch } from "@/lib/validation";
import { formatNumber } from "@/lib/utils/format";
import type { Locale } from "@/lib/i18n/config";
import { resolvePeriod, tashkentDayStart, tashkentDate, type PeriodInput, type Range } from "./period";
import * as q from "./queries";

/**
 * Answers the shop owner's questions without an external AI service:
 * keywords pick the period and the topics, the numbers come from `queries`.
 */

type Lang = "uz" | "ru";
type Topic = "subscribers" | "writers" | "sales" | "orders" | "top" | "stock" | "unread" | "overview" | "daily" | "customer" | "summary";

const TOPICS: { topic: Topic; words: string[] }[] = [
  { topic: "orders", words: ["songgi buyurtma", "oxirgi buyurtma", "buyurtmalar royxat", "buyurtmalarni korsat", "poslednie zakaz", "spisok zakaz", "pokazhi zakaz"] },
  { topic: "subscribers", words: ["obunachi", "yangi mijoz", "podpischik", "novyh klient", "novye klient", "novyy klient"] },
  { topic: "writers", words: ["yozdi", "yozgan", "xabar", "murojaat", "napisal", "soobshen", "obrashen"] },
  { topic: "sales", words: ["savdo", "sotuv", "sotildi", "tushum", "daromad", "pul tush", "buyurtma", "prodazh", "vyruchk", "zarabot", "dohod", "zakaz"] },
  { topic: "top", words: ["kop sotil", "eng kop", "top", "ommabop", "populyar", "luchshe vsego", "hity", "hit prodazh"] },
  { topic: "stock", words: ["tugab", "tugagan", "qoldiq", "kam qol", "ombor", "zakanchiva", "ostat", "sklad", "net v nalich"] },
  { topic: "unread", words: ["javobsiz", "javob beril", "oqilmagan", "korilmagan", "neprochit", "bez otveta", "ne otvet"] },
  { topic: "overview", words: ["tarif", "obuna", "limit", "kanal", "tarif", "podpisk", "limit", "nastroy"] },
  { topic: "daily", words: ["kunma kun", "kunlik", "dinamika", "kunlar boyicha", "po dnyam", "dinamik", "grafik"] },
  { topic: "summary", words: ["hisobot", "umumiy", "statistika", "natija", "otchet", "itog", "svodk"] },
];

const L = {
  uz: {
    period: "Davr",
    subscribers: "Yangi obunachilar",
    byChannel: "kanallar bo'yicha",
    writers: "Yozgan mijozlar",
    messages: "Mijoz xabarlari",
    botReplies: "bot javoblari",
    sellerReplies: "sizning javoblaringiz",
    newConvos: "Yangi suhbatlar",
    orders: "Buyurtmalar",
    ordersSum: "Buyurtmalar summasi",
    avg: "O'rtacha chek",
    paid: "Kelib tushgan to'lovlar",
    cancelled: "Bekor qilingan",
    conversion: "Konversiya (yozganlardan buyurtma)",
    noOrders: "Bu davrda buyurtma yo'q.",
    lastOrders: "So'nggi buyurtmalar",
    top: "Eng ko'p sotilganlar",
    noTop: "Bu davrda sotilgan mahsulot yo'q.",
    units: "dona",
    stockLow: "Tugab qolayotgan mahsulotlar (5 donadan kam)",
    stockOk: "Hammasi yetarli: 5 donadan kam qolgan mahsulot yo'q.",
    outOfStock: "tugagan",
    unread: "Javob kutayotgan suhbatlar",
    noUnread: "Javobsiz xabar yo'q — hammasi o'qilgan.",
    plan: "Tarif",
    until: "amal qiladi",
    replies: "Bot javoblari bu oy",
    products: "Mahsulotlar",
    active: "faol",
    channels: "Ulangan kanallar",
    none: "yo'q",
    payments: "To'lov tizimlari",
    customersAll: "Jami mijozlar",
    daily: "Kunma-kun",
    dayLine: "{d}: {s} obunachi, {m} xabar, {o} buyurtma ({sum})",
    compare: "Solishtirish",
    change: "o'zgarish",
    customerNotFound: "\"{q}\" bo'yicha mijoz topilmadi.",
    customers: "Topilgan mijozlar",
    spent: "jami",
    help:
      "Men do'koningiz ma'lumotlari bo'yicha javob beraman. Masalan:\n- Bugun nechta yangi obunachi keldi?\n- Kecha nechta kishi yozdi?\n- Shu oy qancha savdo qilindi?\n- Shu hafta va o'tgan haftani solishtiring\n- Eng ko'p sotilgan mahsulotlar\n- Qaysi mahsulotlar tugab qolyapti?\n- Javobsiz xabarlar bormi?\n- So'nggi buyurtmalar\n- Tarifim va limitim\n- Mijoz: +998901234567",
    sum: "so'm",
  },
  ru: {
    period: "Период",
    subscribers: "Новые подписчики",
    byChannel: "по каналам",
    writers: "Написали клиентов",
    messages: "Сообщений от клиентов",
    botReplies: "ответов бота",
    sellerReplies: "ваших ответов",
    newConvos: "Новых диалогов",
    orders: "Заказы",
    ordersSum: "Сумма заказов",
    avg: "Средний чек",
    paid: "Поступило оплат",
    cancelled: "Отменено",
    conversion: "Конверсия (из написавших в заказ)",
    noOrders: "За этот период заказов нет.",
    lastOrders: "Последние заказы",
    top: "Самые продаваемые",
    noTop: "За этот период продаж нет.",
    units: "шт.",
    stockLow: "Заканчиваются (меньше 5 шт.)",
    stockOk: "Всё в порядке: товаров с остатком меньше 5 нет.",
    outOfStock: "нет в наличии",
    unread: "Диалоги без ответа",
    noUnread: "Непрочитанных сообщений нет.",
    plan: "Тариф",
    until: "действует до",
    replies: "Ответов бота в этом месяце",
    products: "Товары",
    active: "активных",
    channels: "Подключённые каналы",
    none: "нет",
    payments: "Платёжные системы",
    customersAll: "Всего клиентов",
    daily: "По дням",
    dayLine: "{d}: {s} подписч., {m} сообщ., {o} заказ. ({sum})",
    compare: "Сравнение",
    change: "изменение",
    customerNotFound: "Клиент по запросу «{q}» не найден.",
    customers: "Найденные клиенты",
    spent: "всего",
    help:
      "Я отвечаю по данным вашего магазина. Например:\n- Сколько новых подписчиков сегодня?\n- Сколько человек написали вчера?\n- Сколько продаж в этом месяце?\n- Сравни эту и прошлую неделю\n- Самые продаваемые товары\n- Какие товары заканчиваются?\n- Есть сообщения без ответа?\n- Последние заказы\n- Мой тариф и лимит\n- Клиент: +998901234567",
    sum: "сум",
  },
} as const;

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));
const money = (n: number, lang: Lang) => `${formatNumber(n)} ${L[lang].sum}`;
const DAY = 86_400_000;

function detectPeriod(n: string): { input: PeriodInput; compare?: boolean } {
  const compare = /(solishtir|taqqosla|sravn|po sravneniyu)/.test(n);
  if (/(otgan hafta|oldingi hafta|proshl\w* nedel)/.test(n) && !compare) return { input: lastWeek() };
  if (/(otgan oy|oldingi oy|proshl\w* mesyac)/.test(n)) return { input: { period: "last_month" }, compare };
  if (/(bugun|segodnya|hozir|seychas)/.test(n)) return { input: { period: "today" }, compare };
  if (/(kecha|vchera)/.test(n)) return { input: { period: "yesterday" }, compare };
  if (/(shu hafta|bu hafta|hafta davomida|etoy nedel|na nedele)/.test(n)) return { input: { period: "this_week" }, compare };
  if (/(shu oy|bu oy|oy davomida|etom mesyac|za mesyac)/.test(n)) return { input: { period: "this_month" }, compare };
  if (/(30 kun|oxirgi oy|30 dn)/.test(n)) return { input: { period: "last_30_days" }, compare };
  if (/(7 kun|oxirgi hafta|7 dn|nedelyu)/.test(n)) return { input: { period: "last_7_days" }, compare };
  if (/(jami|hammasi|umuman|barcha vaqt|vsego|za vse vremya|vsyo vremya)/.test(n)) return { input: { period: "all_time" }, compare };
  if (/hafta|nedel/.test(n)) return { input: { period: "this_week" }, compare };
  if (/(oy\b|mesyac)/.test(n)) return { input: { period: "this_month" }, compare };
  return { input: { period: "today" }, compare };
}

function lastWeek(now = new Date()): PeriodInput {
  const today = tashkentDayStart(now);
  const weekday = (new Date(today.getTime() + 5 * 3_600_000).getUTCDay() + 6) % 7;
  const monday = new Date(today.getTime() - weekday * DAY);
  return { period: "custom", from: tashkentDate(new Date(monday.getTime() - 7 * DAY)), to: tashkentDate(new Date(monday.getTime() - DAY)) };
}

/** The range just before `r`, of the same length (for comparisons). */
function previousRange(input: PeriodInput): Range {
  if (input.period === "this_week") return resolvePeriod(lastWeek());
  if (input.period === "this_month") return resolvePeriod({ period: "last_month" });
  const r = resolvePeriod(input);
  const len = r.to.getTime() - r.from.getTime();
  const from = new Date(r.from.getTime() - len);
  return { from, to: r.from, label: `${tashkentDate(from)} — ${tashkentDate(new Date(r.from.getTime() - 1))}` };
}

const pct = (now: number, before: number) => (before === 0 ? (now === 0 ? "0%" : "+∞") : `${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}%`);

export async function answerQuestion(shop: Shop & { plan?: Plan | null }, question: string, locale: Locale): Promise<string> {
  const lang: Lang = /[а-яё]/i.test(question) ? "ru" : locale === "ru" && !/[a-z]/i.test(question) ? "ru" : /[a-z]/i.test(question) ? "uz" : locale;
  const t = L[lang];
  const n = normalizeSearch(question);
  const { input, compare } = detectPeriod(n);
  const range = resolvePeriod(input);

  const phone = question.match(/\+?\d[\d\s-]{6,}\d/)?.[0];
  const customerQuery = phone ?? question.match(/(?:mijoz|klient|покупател|клиент)\s*[:\-]?\s*(@?[\p{L}\d_]{2,})/iu)?.[1];
  const topics = new Set<Topic>(TOPICS.filter((x) => x.words.some((w) => n.includes(w))).map((x) => x.topic));
  if (customerQuery) topics.add("customer");
  if (/(songgi|oxirgi|ohirgi|poslednie|poslednih).*(buyurtma|zakaz)/.test(n)) topics.add("orders");
  // "buyurtmalar ro'yxati" is a list, not a sales total.
  if (topics.has("orders")) topics.delete("sales");
  // "javobsiz xabarlar" asks for the unanswered list, not message counts.
  if (topics.has("unread")) topics.delete("writers");
  if (compare && !topics.size) topics.add("summary");
  if (!topics.size) return t.help;

  const parts: string[] = [];
  const stats = topics.has("subscribers") || topics.has("writers") || topics.has("sales") || topics.has("summary") ? await q.periodStats(shop.id, range) : null;
  const before = compare && stats ? await q.periodStats(shop.id, previousRange(input)) : null;
  const header = `${t.period}: **${range.label}**`;
  if (stats) parts.push(header);

  const line = (label: string, now: number, prev: number | undefined, fmt: (x: number) => string = (x) => formatNumber(x)) =>
    `- ${label}: **${fmt(now)}**${prev !== undefined ? ` (${t.compare.toLowerCase()}: ${fmt(prev)}, ${t.change} ${pct(now, prev)})` : ""}`;

  if (stats && (topics.has("subscribers") || topics.has("summary"))) {
    const ch = Object.entries(stats.newSubscribers.byChannel).map(([k, v]) => `${k.toLowerCase().replace("_", " ")}: ${v}`).join(", ");
    parts.push(line(t.subscribers, stats.newSubscribers.total, before?.newSubscribers.total) + (ch ? ` — ${t.byChannel}: ${ch}` : ""));
  }
  if (stats && (topics.has("writers") || topics.has("summary"))) {
    parts.push(line(t.writers, stats.customersWhoWrote, before?.customersWhoWrote));
    parts.push(
      `- ${t.messages}: **${formatNumber(stats.messages.fromCustomers)}**, ${t.botReplies}: ${formatNumber(stats.messages.aiReplies)}, ${t.sellerReplies}: ${formatNumber(stats.messages.sellerReplies)}`,
    );
    parts.push(line(t.newConvos, stats.newConversations, before?.newConversations));
  }
  if (stats && (topics.has("sales") || topics.has("summary"))) {
    parts.push(line(t.orders, stats.orders.created, before?.orders.created));
    parts.push(line(t.ordersSum, stats.orders.createdTotalSum, before?.orders.createdTotalSum, (x) => money(x, lang)));
    if (stats.orders.created) parts.push(`- ${t.avg}: ${money(stats.orders.averageOrderValue, lang)}`);
    parts.push(line(t.paid, stats.paymentsReceived.sum, before?.paymentsReceived.sum, (x) => money(x, lang)));
    if (stats.orders.cancelled) parts.push(`- ${t.cancelled}: ${stats.orders.cancelled}`);
    if (stats.conversionRate) parts.push(`- ${t.conversion}: ${stats.conversionRate}`);
  }

  if (topics.has("orders")) {
    const res = await q.listOrders(shop.id, input.period === "today" ? resolvePeriod({ period: "all_time" }) : range, undefined, 10);
    parts.push(
      res.orders.length
        ? `**${t.lastOrders}** (${res.shown}/${res.totalMatching}):\n${res.orders.map((o) => `- #${o.number} · ${o.createdAt} · ${o.customer} · **${money(o.total, lang)}** · ${o.status}`).join("\n")}`
        : t.noOrders,
    );
  }
  if (topics.has("top")) {
    const res = await q.topProducts(shop.id, input.period === "today" ? resolvePeriod({ period: "this_month" }) : range, 5);
    parts.push(
      res.products.length
        ? `**${t.top}** (${res.period}):\n${res.products.map((p, i) => `- ${i + 1}. ${p.name} — ${p.unitsSold} ${t.units}, **${money(p.revenue, lang)}**`).join("\n")}`
        : t.noTop,
    );
  }
  if (topics.has("stock")) {
    const res = await q.inventory(shop.id, undefined, 5, 15);
    parts.push(
      res.products.length
        ? `**${t.stockLow}**:\n${res.products.map((p) => `- ${p.name}: ${p.stock === 0 ? t.outOfStock : `**${p.stock}** ${t.units}`}`).join("\n")}`
        : t.stockOk,
    );
  }
  if (topics.has("unread")) {
    const res = await q.listConversations(shop.id, resolvePeriod({ period: "all_time" }), true, 10);
    parts.push(
      res.conversations.length
        ? `**${t.unread}** (${res.totalMatching}):\n${res.conversations.map((c) => `- ${c.customer} (${c.channel.toLowerCase()}) · ${c.lastMessageAt}: "${c.lastMessage.slice(0, 60)}"`).join("\n")}`
        : t.noUnread,
    );
  }
  if (topics.has("overview")) {
    const o = await q.shopOverview(shop);
    parts.push(
      [
        `- ${t.plan}: **${o.subscription.plan}** (${o.subscription.status}), ${t.until} ${o.subscription.endsOn}`,
        `- ${t.replies}: **${formatNumber(o.subscription.aiRepliesThisMonth)}** / ${formatNumber(o.subscription.aiRepliesMonthlyLimit)}`,
        `- ${t.products}: ${o.catalog.products} (${t.active}: ${o.catalog.activeProducts})`,
        `- ${t.channels}: ${o.channels.length ? o.channels.map((c) => `${c.type} ${c.account ?? ""} (${c.status})`).join(", ") : t.none}`,
        `- ${t.payments}: ${[o.payments.payme && "Payme", o.payments.click && "Click"].filter(Boolean).join(", ") || t.none}`,
        `- ${t.customersAll}: ${o.allTime.customers}`,
      ].join("\n"),
    );
  }
  if (topics.has("daily")) {
    const dailyInput = input.period === "today" || input.period === "yesterday" ? ({ period: "last_7_days" } as const) : input;
    const res = await q.dailyBreakdown(shop.id, resolvePeriod(dailyInput));
    parts.push(
      `**${t.daily}** (${res.period}):\n${res.days
        .slice(-14)
        .map((d) => `- ${fill(t.dayLine, { d: d.date, s: d.newSubscribers, m: d.customerMessages, o: d.orders, sum: money(d.salesSum, lang) })}`)
        .join("\n")}`,
    );
  }
  if (topics.has("customer") && customerQuery) {
    const res = await q.findCustomers(shop.id, customerQuery, 5);
    parts.push(
      res.customers.length
        ? `**${t.customers}**:\n${res.customers
            .map((c) => `- ${c.name ?? c.username ?? "—"} ${c.phone ?? ""} · ${c.channel.toLowerCase()} · ${c.orders} ${t.orders.toLowerCase()}, ${t.spent} **${money(c.totalSpent, lang)}**`)
            .join("\n")}`
        : fill(t.customerNotFound, { q: customerQuery }),
    );
  }
  return parts.join("\n");
}
