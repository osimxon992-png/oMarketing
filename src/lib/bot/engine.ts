import "server-only";
import type { Prisma, Shop, ShopPaymentConfig } from "@prisma/client";
import { db } from "@/lib/db";
import { orderPaymentLinks } from "@/lib/payments/links";
import { totalStock, variantLabel } from "@/lib/products";
import { notifyNewOrder } from "@/lib/telegram/notifier";
import { formatUzs } from "@/lib/utils/format";
import { normalizeSearch, normalizeUzPhone } from "@/lib/validation";

/**
 * Rule-based seller bot. It answers from the shop's own data (catalog, AI
 * settings, delivery zones, FAQ) and walks the customer through an order.
 * No external AI service is involved.
 */

type Lang = "uz" | "ru";
export type BotState = {
  step?: "variant" | "quantity" | "name" | "phone" | "delivery" | "zone" | "address" | "confirm";
  productId?: string;
  variantId?: string | null;
  quantity?: number;
  name?: string;
  phone?: string;
  deliveryType?: "DELIVERY" | "PICKUP";
  zone?: string;
  deliveryPrice?: number;
  address?: string;
  lastProductIds?: string[];
  lang?: Lang;
};
export type ProductCard = { id: string; name: string; price: number; stock: number; image: string | null };
export type BotReply = { text: string; products?: ProductCard[]; payLinks?: { provider: string; url: string }[]; orderNumber?: number };
type Zone = { name: string; price: number };
type Faq = { q: string; a: string };

const T = {
  uz: {
    greet: "Assalomu alaykum! {shop} do'koniga xush kelibsiz. Qaysi mahsulot qiziqtiradi? Nomini yozing, men narxi va borligini aytaman.",
    notFound: "Kechirasiz, \"{q}\" bo'yicha mahsulot topilmadi. Boshqacha yozib ko'ring yoki \"katalog\" deb yozing.",
    fallback: "Kechirasiz, savolni tushunmadim. Mahsulot nomini yozing, yoki \"katalog\", \"yetkazib berish\", \"buyurtma\" deb yozing.",
    found: "Mana topganlarim:",
    item: "{name} — {price}{stock}",
    inStock: " (bor: {n} dona)",
    outStock: " (hozir tugagan)",
    variants: "   Variantlar: {list}",
    orderHint: "Buyurtma berish uchun \"buyurtma\" deb yozing.",
    catalog: "Bizda bor: {cats}.\nEng so'nggi mahsulotlar:",
    emptyCatalog: "Hozircha katalog bo'sh. Tez orada mahsulotlar qo'shiladi.",
    deliveryZones: "Yetkazib berish narxlari:\n{zones}",
    noDelivery: "Yetkazib berish shartlari bo'yicha sotuvchi tez orada javob beradi.",
    pickup: "Olib ketish manzili: {addr}",
    hours: "Ish vaqtimiz: {h}",
    noHours: "Biz onlayn buyurtmalarni istalgan vaqtda qabul qilamiz.",
    address: "Manzilimiz: {addr}",
    noAddress: "Hozircha faqat yetkazib berish orqali ishlaymiz.",
    returns: "Qaytarish va almashtirish: {p}",
    noReturns: "Qaytarish shartlari bo'yicha sotuvchi aniq javob beradi.",
    payment: "To'lov usullari: {p}. Buyurtma rasmiylashtirilgach to'lov havolasini yuboraman.",
    cash: "naqd pul (qabul qilishda)",
    whichProduct: "Qaysi mahsulotni buyurtma qilasiz? Nomini yozing.",
    chooseVariant: "{name} — qaysi variant? Raqamini yozing:\n{list}",
    badVariant: "Iltimos, ro'yxatdagi raqamni yozing.",
    noStock: "Kechirasiz, {name} hozir tugagan. Boshqa mahsulot tanlaysizmi?",
    quantity: "Nechta kerak? (omborda {n} dona bor)",
    badQuantity: "Iltimos, 1 dan {n} gacha son yozing.",
    name: "Ismingizni yozing.",
    phone: "Telefon raqamingizni yozing (masalan: 90 123 45 67).",
    badPhone: "Raqam noto'g'ri ko'rinadi. Masalan: +998 90 123 45 67",
    delivery: "Qanday olasiz?\n1) Yetkazib berish\n2) O'zim olib ketaman ({addr})",
    zone: "Qaysi hudud?\n{zones}",
    addressAsk: "Yetkazib berish manzilini yozing (tuman, ko'cha, uy).",
    confirm: "Buyurtmani tekshiring:\n{item} × {qty} = {sub}\n{delivery}\nJami: {total}\nIsm: {name}, tel: {phone}\n\nTasdiqlaysizmi? (ha / yo'q)",
    deliveryLine: "Yetkazib berish ({zone}): {price}\nManzil: {addr}",
    pickupLine: "Olib ketish: {addr}",
    confirmAsk: "Iltimos, \"ha\" yoki \"yo'q\" deb yozing.",
    created: "Rahmat! Buyurtma #{n} qabul qilindi. Jami: {total}.",
    payWith: "To'lov uchun havola:",
    payLater: "Sotuvchi to'lov bo'yicha siz bilan bog'lanadi.",
    cancelled: "Buyurtma bekor qilindi. Yana nimadir kerak bo'lsa, yozing.",
    stockChanged: "Kechirasiz, bu mahsulot qoldig'i o'zgardi. Iltimos, qaytadan buyurtma bering.",
    free: "bepul",
  },
  ru: {
    greet: "Здравствуйте! Добро пожаловать в {shop}. Какой товар вас интересует? Напишите название — подскажу цену и наличие.",
    notFound: "К сожалению, по запросу «{q}» ничего не нашлось. Попробуйте иначе или напишите «каталог».",
    fallback: "Извините, не понял вопрос. Напишите название товара или «каталог», «доставка», «заказ».",
    found: "Вот что нашлось:",
    item: "{name} — {price}{stock}",
    inStock: " (в наличии: {n} шт.)",
    outStock: " (нет в наличии)",
    variants: "   Варианты: {list}",
    orderHint: "Чтобы оформить заказ, напишите «заказ».",
    catalog: "У нас есть: {cats}.\nНовые товары:",
    emptyCatalog: "Каталог пока пуст. Скоро добавим товары.",
    deliveryZones: "Стоимость доставки:\n{zones}",
    noDelivery: "По условиям доставки скоро ответит продавец.",
    pickup: "Адрес самовывоза: {addr}",
    hours: "Время работы: {h}",
    noHours: "Онлайн-заказы принимаем в любое время.",
    address: "Наш адрес: {addr}",
    noAddress: "Пока работаем только с доставкой.",
    returns: "Возврат и обмен: {p}",
    noReturns: "По условиям возврата ответит продавец.",
    payment: "Способы оплаты: {p}. После оформления заказа пришлю ссылку на оплату.",
    cash: "наличными при получении",
    whichProduct: "Какой товар хотите заказать? Напишите название.",
    chooseVariant: "{name} — какой вариант? Напишите номер:\n{list}",
    badVariant: "Пожалуйста, напишите номер из списка.",
    noStock: "К сожалению, {name} закончился. Выберете другой товар?",
    quantity: "Сколько штук? (в наличии {n})",
    badQuantity: "Пожалуйста, напишите число от 1 до {n}.",
    name: "Как вас зовут?",
    phone: "Напишите номер телефона (например: 90 123 45 67).",
    badPhone: "Номер выглядит неверно. Например: +998 90 123 45 67",
    delivery: "Как получите заказ?\n1) Доставка\n2) Самовывоз ({addr})",
    zone: "Какой район?\n{zones}",
    addressAsk: "Напишите адрес доставки (район, улица, дом).",
    confirm: "Проверьте заказ:\n{item} × {qty} = {sub}\n{delivery}\nИтого: {total}\nИмя: {name}, тел: {phone}\n\nПодтверждаете? (да / нет)",
    deliveryLine: "Доставка ({zone}): {price}\nАдрес: {addr}",
    pickupLine: "Самовывоз: {addr}",
    confirmAsk: "Пожалуйста, ответьте «да» или «нет».",
    created: "Спасибо! Заказ #{n} принят. Итого: {total}.",
    payWith: "Ссылка на оплату:",
    payLater: "Продавец свяжется с вами по оплате.",
    cancelled: "Заказ отменён. Если что-то понадобится — пишите.",
    stockChanged: "Извините, остаток товара изменился. Пожалуйста, оформите заказ заново.",
    free: "бесплатно",
  },
} as const;

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

// Words that carry no product meaning in a shopping question.
const STOP = new Set(
  (
    "bormi bor yoq yo'q narxi narx qancha necha nechpul pul razmer razmeri olcham rang rangi kerak menga sizda sizlarda " +
    "bu shu u qanaqa qanday qaysi va yoki ham bilan uchun dan ga ni da mi edi ekan iltimos rahmat salom " +
    "est li u vas cena skolko stoit razmer nuzhen nuzhna mne a i ili pozhaluysta spasibo kakoy kakaya eto"
  ).split(" "),
);

function detectLang(text: string, prev?: Lang): Lang {
  if (/[а-яё]/i.test(text) && !/[қғўҳ]/i.test(text)) return "ru";
  if (/[a-z]/i.test(text)) return "uz";
  return prev ?? "uz";
}

const has = (n: string, words: string[]) => words.some((w) => n.includes(w));
const YES = ["ha", "xa", "ok", "tasdiq", "albatta", "da", "konechno", "podtverzh", "yes"];
const NO = ["yoq", "yo q", "net", "bekor", "otmen", "no"];

async function searchProducts(shopId: string, text: string) {
  const tokens = normalizeSearch(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t))
    .slice(0, 6);
  if (!tokens.length) return { tokens, items: [] };
  const candidates = await db.product.findMany({
    where: { shopId, active: true, OR: tokens.map((t) => ({ searchText: { contains: t } })) },
    include: { variants: true, images: { select: { id: true, url: true }, orderBy: { position: "asc" }, take: 1 } },
    take: 50,
  });
  const scored = candidates
    .map((p) => ({ p, score: tokens.filter((t) => p.searchText.includes(t)).length + (normalizeSearch(p.name).includes(tokens.join(" ")) ? 2 : 0) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  return { tokens, items: scored.filter((s) => s.score === best || s.score >= 2).slice(0, 3).map((s) => s.p) };
}

type ProductWithVariants = Prisma.ProductGetPayload<{ include: { variants: true; images: { select: { id: true; url: true } } } }>;

function card(p: ProductWithVariants): ProductCard {
  const img = p.images[0];
  return { id: p.id, name: p.name, price: p.price, stock: totalStock(p), image: img ? img.url ?? `/api/media/${img.id}` : null };
}

function describe(p: ProductWithVariants, lang: Lang): string {
  const t = T[lang];
  const stock = totalStock(p);
  let line = fill(t.item, {
    name: p.name,
    price: formatUzs(p.price, lang),
    stock: stock > 0 ? fill(t.inStock, { n: stock }) : t.outStock,
  });
  const vs = p.variants.filter((v) => v.stock > 0).map(variantLabel).filter(Boolean);
  if (vs.length) line += `\n${fill(t.variants, { list: vs.join(", ") })}`;
  return line;
}

export async function botReply(
  shop: Shop,
  payment: ShopPaymentConfig | null,
  convo: { id: string; customerId: string; channel: Prisma.ConversationCreateInput["channel"] },
  text: string,
  state: BotState,
): Promise<{ reply: BotReply; state: BotState }> {
  const lang = detectLang(text, state.lang);
  const t = T[lang];
  const n = normalizeSearch(text);
  const zones = (Array.isArray(shop.deliveryZones) ? shop.deliveryZones : []) as Zone[];
  const reset = (extra: BotState = {}): BotState => ({ lang, lastProductIds: state.lastProductIds, ...extra });

  // Cancel works at any step.
  if (state.step && (has(n, ["bekor", "otmen", "отмен"]) || n === "stop")) {
    return { reply: { text: t.cancelled }, state: reset() };
  }
  if (state.step) return orderStep(shop, payment, convo, text, n, { ...state, lang }, zones);

  // Greeting
  if (/^(salom|assalom|asalom|assalomu|hello|hi|privet|zdravstv|dobryy|добрый|привет|здравств)/.test(n) && n.split(" ").length <= 4) {
    const greet = shop.greeting.trim() || fill(t.greet, { shop: shop.name });
    return { reply: { text: greet }, state: { ...state, lang } };
  }

  // Shop-defined FAQ: answer when most of the question's words appear.
  const faq = (Array.isArray(shop.faq) ? shop.faq : []) as Faq[];
  for (const item of faq) {
    const qTokens = normalizeSearch(item.q).split(" ").filter((w) => w.length > 2 && !STOP.has(w));
    if (qTokens.length && qTokens.filter((w) => n.includes(w)).length / qTokens.length >= 0.6) {
      return { reply: { text: item.a }, state: { ...state, lang } };
    }
  }

  if (has(n, ["yetkaz", "dostav", "kuryer", "kurer", "eltib"])) {
    const lines = zones.length
      ? fill(t.deliveryZones, { zones: zones.map((z) => `• ${z.name}: ${z.price ? formatUzs(z.price, lang) : t.free}`).join("\n") })
      : t.noDelivery;
    const pickup = shop.pickupAddress ? `\n${fill(t.pickup, { addr: shop.pickupAddress })}` : "";
    return { reply: { text: lines + pickup }, state: { ...state, lang } };
  }
  if (has(n, ["ish vaqt", "soat nech", "qachon och", "grafik", "vremya rabot", "rabotaete", "otkryt"])) {
    return { reply: { text: shop.workingHours ? fill(t.hours, { h: shop.workingHours }) : t.noHours }, state: { ...state, lang } };
  }
  if (has(n, ["manzil", "qayerda", "adres", "gde vy", "gde nahod"])) {
    return { reply: { text: shop.pickupAddress ? fill(t.address, { addr: shop.pickupAddress }) : t.noAddress }, state: { ...state, lang } };
  }
  if (has(n, ["qaytar", "almashtir", "vozvrat", "obmen"])) {
    return { reply: { text: shop.returnPolicy ? fill(t.returns, { p: shop.returnPolicy }) : t.noReturns }, state: { ...state, lang } };
  }
  if (has(n, ["tolov", "payme", "click", "oplat", "karta", "naqd", "nalich"])) {
    const methods = [payment?.paymeEnabled && "Payme", payment?.clickEnabled && "Click", t.cash].filter(Boolean).join(", ");
    return { reply: { text: fill(t.payment, { p: methods }) }, state: { ...state, lang } };
  }

  const wantsOrder = has(n, ["buyurtma", "olaman", "sotib ol", "zakaz", "oformi", "kupit", "beru", "olmoqchi"]);
  const wantsCatalog = has(n, ["katalog", "nima bor", "nimalar bor", "assortiment", "chto est", "chto u vas"]);

  if (wantsCatalog && !wantsOrder) {
    const [cats, latest] = await Promise.all([
      db.product.findMany({ where: { shopId: shop.id, active: true, category: { not: "" } }, distinct: ["category"], select: { category: true }, take: 12 }),
      db.product.findMany({
        where: { shopId: shop.id, active: true },
        include: { variants: true, images: { select: { id: true, url: true }, orderBy: { position: "asc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        take: 3,
      }),
    ]);
    if (!latest.length) return { reply: { text: t.emptyCatalog }, state: { ...state, lang } };
    const head = cats.length ? fill(t.catalog, { cats: cats.map((c) => c.category).join(", ") }) : t.found;
    return {
      reply: { text: `${head}\n${latest.map((p) => describe(p, lang)).join("\n")}\n\n${t.orderHint}`, products: latest.map(card) },
      state: { ...state, lang, lastProductIds: latest.map((p) => p.id) },
    };
  }

  const { tokens, items } = await searchProducts(shop.id, text);

  if (wantsOrder) {
    const target = items.length === 1 ? items[0]!.id : !items.length && state.lastProductIds?.length === 1 ? state.lastProductIds[0] : undefined;
    if (!target) {
      if (items.length > 1) {
        return {
          reply: { text: `${t.found}\n${items.map((p) => describe(p, lang)).join("\n")}\n\n${t.whichProduct}`, products: items.map(card) },
          state: { ...state, lang, lastProductIds: items.map((p) => p.id) },
        };
      }
      return { reply: { text: t.whichProduct }, state: { ...state, lang, step: undefined, lastProductIds: [] } };
    }
    return startOrder(target, { lang, lastProductIds: [target] });
  }

  if (items.length) {
    // Answering "buyurtma" right after a single match should start the order for it.
    return {
      reply: { text: `${t.found}\n${items.map((p) => describe(p, lang)).join("\n")}\n\n${t.orderHint}`, products: items.map(card) },
      state: { ...state, lang, lastProductIds: items.map((p) => p.id) },
    };
  }
  if (tokens.length) return { reply: { text: fill(t.notFound, { q: text.trim().slice(0, 60) }) }, state: { ...state, lang } };
  return { reply: { text: t.fallback }, state: { ...state, lang } };
}

async function startOrder(productId: string, base: BotState): Promise<{ reply: BotReply; state: BotState }> {
  const lang = base.lang ?? "uz";
  const t = T[lang];
  const p = await db.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!p || totalStock(p) <= 0) return { reply: { text: fill(t.noStock, { name: p?.name ?? "" }) }, state: { ...base, step: undefined } };
  const variants = p.variants.filter((v) => v.stock > 0);
  if (variants.length) {
    const list = variants.map((v, i) => `${i + 1}) ${variantLabel(v) || "—"}${v.price ? ` — ${formatUzs(v.price, lang)}` : ""}`).join("\n");
    return { reply: { text: fill(t.chooseVariant, { name: p.name, list }) }, state: { ...base, step: "variant", productId: p.id } };
  }
  return { reply: { text: fill(t.quantity, { n: p.stock }) }, state: { ...base, step: "quantity", productId: p.id, variantId: null } };
}

async function orderStep(
  shop: Shop,
  payment: ShopPaymentConfig | null,
  convo: { id: string; customerId: string; channel: Prisma.ConversationCreateInput["channel"] },
  text: string,
  n: string,
  state: BotState,
  zones: Zone[],
): Promise<{ reply: BotReply; state: BotState }> {
  const lang = state.lang ?? "uz";
  const t = T[lang];
  const product = state.productId ? await db.product.findFirst({ where: { id: state.productId, shopId: shop.id }, include: { variants: true } }) : null;
  if (!product) return { reply: { text: t.whichProduct }, state: { lang } };
  const variant = state.variantId ? product.variants.find((v) => v.id === state.variantId) ?? null : null;
  const available = variant ? variant.stock : product.variants.length ? 0 : product.stock;
  const unitPrice = variant?.price ?? product.price;
  const num = Number(n.match(/\d+/)?.[0]);

  switch (state.step) {
    case "variant": {
      const options = product.variants.filter((v) => v.stock > 0);
      const byNum = Number.isInteger(num) && num >= 1 && num <= options.length ? options[num - 1] : undefined;
      const byText = options.find((v) => {
        const label = normalizeSearch(variantLabel(v));
        return label && (n === label || label.split(" ").every((w) => n.includes(w)));
      });
      const chosen = byNum ?? byText;
      if (!chosen) return { reply: { text: t.badVariant }, state };
      return { reply: { text: fill(t.quantity, { n: chosen.stock }) }, state: { ...state, step: "quantity", variantId: chosen.id } };
    }
    case "quantity": {
      const qty = /^(bitta|bir|odin|odna)$/.test(n) ? 1 : num;
      if (!Number.isInteger(qty) || qty < 1 || qty > available) return { reply: { text: fill(t.badQuantity, { n: available }) }, state };
      return { reply: { text: t.name }, state: { ...state, step: "name", quantity: qty } };
    }
    case "name": {
      const name = text.trim().slice(0, 80);
      if (name.length < 2) return { reply: { text: t.name }, state };
      return { reply: { text: t.phone }, state: { ...state, step: "phone", name } };
    }
    case "phone": {
      const phone = normalizeUzPhone(text);
      if (!phone) return { reply: { text: t.badPhone }, state };
      if (!zones.length && !shop.pickupAddress) {
        return { reply: { text: t.addressAsk }, state: { ...state, step: "address", phone, deliveryType: "DELIVERY", deliveryPrice: 0, zone: "" } };
      }
      if (!shop.pickupAddress) return askZone({ ...state, phone, deliveryType: "DELIVERY" }, zones, t, lang);
      return { reply: { text: fill(t.delivery, { addr: shop.pickupAddress }) }, state: { ...state, step: "delivery", phone } };
    }
    case "delivery": {
      const pickup = num === 2 || has(n, ["olib ket", "ozim", "samovyv", "sam zaber"]);
      const delivery = num === 1 || has(n, ["yetkaz", "dostav"]);
      if (pickup) return confirm(product.name, variant, unitPrice, { ...state, step: "confirm", deliveryType: "PICKUP", deliveryPrice: 0, address: shop.pickupAddress }, t, lang);
      if (delivery) return askZone({ ...state, deliveryType: "DELIVERY" }, zones, t, lang);
      return { reply: { text: fill(t.delivery, { addr: shop.pickupAddress }) }, state };
    }
    case "zone": {
      const byNum = Number.isInteger(num) && num >= 1 && num <= zones.length ? zones[num - 1] : undefined;
      const byText = zones.find((z) => n.includes(normalizeSearch(z.name)));
      const zone = byNum ?? byText;
      if (!zone) return askZone(state, zones, t, lang);
      return { reply: { text: t.addressAsk }, state: { ...state, step: "address", zone: zone.name, deliveryPrice: zone.price } };
    }
    case "address": {
      const address = text.trim().slice(0, 300);
      if (address.length < 4) return { reply: { text: t.addressAsk }, state };
      return confirm(product.name, variant, unitPrice, { ...state, step: "confirm", address }, t, lang);
    }
    case "confirm": {
      if (YES.some((w) => n === w || n.startsWith(`${w} `))) return createOrder(shop, payment, convo, product.id, variant?.id ?? null, state, lang);
      if (NO.some((w) => n === w || n.startsWith(w))) return { reply: { text: t.cancelled }, state: { lang, lastProductIds: state.lastProductIds } };
      return { reply: { text: t.confirmAsk }, state };
    }
    default:
      return { reply: { text: t.fallback }, state: { lang } };
  }
}

function askZone(state: BotState, zones: Zone[], t: (typeof T)[Lang], lang: Lang) {
  if (!zones.length) return { reply: { text: t.addressAsk }, state: { ...state, step: "address" as const, zone: "", deliveryPrice: 0 } };
  const list = zones.map((z, i) => `${i + 1}) ${z.name} — ${z.price ? formatUzs(z.price, lang) : t.free}`).join("\n");
  return { reply: { text: fill(t.zone, { zones: list }) }, state: { ...state, step: "zone" as const } };
}

function confirm(
  productName: string,
  variant: { size: string; color: string } | null,
  unitPrice: number,
  state: BotState,
  t: (typeof T)[Lang],
  lang: Lang,
) {
  const qty = state.quantity ?? 1;
  const sub = unitPrice * qty;
  const deliveryPrice = state.deliveryPrice ?? 0;
  const label = variant ? `${productName} (${variantLabel(variant)})` : productName;
  const deliveryText =
    state.deliveryType === "PICKUP"
      ? fill(t.pickupLine, { addr: state.address ?? "" })
      : fill(t.deliveryLine, { zone: state.zone || "—", price: deliveryPrice ? formatUzs(deliveryPrice, lang) : t.free, addr: state.address ?? "" });
  return {
    reply: {
      text: fill(t.confirm, {
        item: label,
        qty,
        sub: formatUzs(sub, lang),
        delivery: deliveryText,
        total: formatUzs(sub + deliveryPrice, lang),
        name: state.name ?? "",
        phone: state.phone ?? "",
      }),
    },
    state,
  };
}

async function createOrder(
  shop: Shop,
  payment: ShopPaymentConfig | null,
  convo: { id: string; customerId: string; channel: Prisma.ConversationCreateInput["channel"] },
  productId: string,
  variantId: string | null,
  state: BotState,
  lang: Lang,
): Promise<{ reply: BotReply; state: BotState }> {
  const t = T[lang];
  const qty = state.quantity ?? 1;
  try {
    const order = await db.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: true } });
      const variant = variantId ? product.variants.find((v) => v.id === variantId) ?? null : null;
      // Reserve stock; the conditional update fails if someone bought it meanwhile.
      const updated = variant
        ? await tx.productVariant.updateMany({ where: { id: variant.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })
        : await tx.product.updateMany({ where: { id: product.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
      if (updated.count === 0) throw new Error("stock_changed");
      const unitPrice = variant?.price ?? product.price;
      const subtotal = unitPrice * qty;
      const deliveryPrice = state.deliveryPrice ?? 0;
      const last = await tx.order.aggregate({ where: { shopId: shop.id }, _max: { number: true } });
      await tx.customer.update({
        where: { id: convo.customerId },
        data: { name: state.name, phone: state.phone, ...(state.deliveryType === "DELIVERY" ? { address: state.address } : {}) },
      });
      return tx.order.create({
        data: {
          shopId: shop.id,
          number: (last._max.number ?? 1000) + 1,
          customerId: convo.customerId,
          conversationId: convo.id,
          source: convo.channel,
          customerName: state.name ?? "",
          phone: state.phone ?? "",
          deliveryType: state.deliveryType ?? "DELIVERY",
          deliveryAddress: state.deliveryType === "DELIVERY" ? state.address ?? "" : "",
          deliveryZone: state.zone ?? "",
          deliveryPrice,
          subtotal,
          total: subtotal + deliveryPrice,
          items: {
            create: [{ productId: product.id, variantId: variant?.id, name: product.name, variantLabel: variant ? variantLabel(variant) : "", unitPrice, quantity: qty, lineTotal: subtotal }],
          },
        },
      });
    });
    // Test-chat orders are the seller's own, so they don't need an alert.
    if (convo.channel !== "PLAYGROUND" && convo.channel !== "DEMO") await notifyNewOrder(order);
    const payLinks = orderPaymentLinks(payment, order.id, order.total);
    const text = `${fill(t.created, { n: order.number, total: formatUzs(order.total, lang) })}\n${payLinks.length ? t.payWith : t.payLater}`;
    return { reply: { text, payLinks, orderNumber: order.number }, state: { lang } };
  } catch (err) {
    if (err instanceof Error && err.message === "stock_changed") return { reply: { text: t.stockChanged }, state: { lang } };
    throw err;
  }
}
