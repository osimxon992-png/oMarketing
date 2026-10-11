import "server-only";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { isSafeImageUrl } from "@/lib/images";
import type { ProductInput } from "@/lib/products";

export const IMPORT_FIELDS = ["name", "description", "price", "category", "stock", "sku", "size", "color", "photo_url", "active"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const MAX_IMPORT_ROWS = 5000;

const SYNONYMS: Record<ImportField, string[]> = {
  name: ["name", "nomi", "nom", "mahsulot", "product", "title", "наименование", "название", "товар"],
  description: ["description", "tavsif", "izoh", "desc", "описание"],
  price: ["price", "narx", "narxi", "цена", "стоимость", "price uzs", "narx (so'm)"],
  category: ["category", "kategoriya", "toifa", "turkum", "категория"],
  stock: ["stock", "qoldiq", "soni", "miqdor", "quantity", "qty", "остаток", "количество", "склад"],
  sku: ["sku", "artikul", "article", "code", "kod", "артикул", "код"],
  size: ["size", "o'lcham", "olcham", "razmer", "размер"],
  color: ["color", "colour", "rang", "rangi", "цвет"],
  photo_url: ["photo", "photo_url", "image", "image_url", "rasm", "surat", "фото", "изображение"],
  active: ["active", "faol", "status", "активен", "активный"],
};

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`]/g, "'").replace(/[_\-]+/g, " ").trim();

export function autoMap(headers: string[]): Partial<Record<ImportField, string>> {
  const mapping: Partial<Record<ImportField, string>> = {};
  for (const field of IMPORT_FIELDS) {
    const match = headers.find((h) => SYNONYMS[field].includes(norm(h))) ?? headers.find((h) => SYNONYMS[field].some((s) => norm(h).startsWith(s)));
    if (match && !Object.values(mapping).includes(match)) mapping[field] = match;
  }
  return mapping;
}

export type ParsedSheet = { headers: string[]; rows: Record<string, string>[] };

export async function parseImportFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[];
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") {
    const text = buf.toString("utf8").replace(/^﻿/, "");
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
    rows = result.data;
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer", cellDates: false, dense: true });
    const sheetName = wb.SheetNames[0];
    const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
    if (!sheet) return { headers: [], rows: [] };
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  } else {
    throw new Error("unsupported_file");
  }
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((h) => h && !h.startsWith("__EMPTY"));
  const clean = rows.slice(0, MAX_IMPORT_ROWS).map((r) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = String(r[h] ?? "").trim();
    return out;
  });
  return { headers, rows: clean };
}

export const mappingSchema = z.object(
  Object.fromEntries(IMPORT_FIELDS.map((f) => [f, z.string().max(200).optional()])) as Record<ImportField, z.ZodOptional<z.ZodString>>,
);
export type Mapping = z.infer<typeof mappingSchema>;

function parseNumber(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/\s|so'm|сум|uzs|sum/gi, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseBool(v: string): boolean {
  if (!v) return true;
  return !["0", "false", "no", "yo'q", "нет", "inactive", "nofaol", "неактивен"].includes(v.toLowerCase());
}

export type RowError = { row: number; field: string; message: string };
export type ImportPlan = { products: (ProductInput & { photoUrls: string[] })[]; errors: RowError[]; rowCount: number };

/**
 * Validates mapped rows and groups them into products. Rows sharing a name
 * (and category) with size/color become variants of one product.
 */
export function buildImportPlan(rows: Record<string, string>[], mapping: Mapping): ImportPlan {
  const errors: RowError[] = [];
  const get = (r: Record<string, string>, f: ImportField) => (mapping[f] ? (r[mapping[f]!] ?? "").trim() : "");
  const groups = new Map<string, ProductInput & { photoUrls: string[] }>();

  if (!mapping.name) errors.push({ row: 0, field: "name", message: "Map the product name column" });
  if (!mapping.price) errors.push({ row: 0, field: "price", message: "Map the price column" });
  if (errors.length) return { products: [], errors, rowCount: rows.length };

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const name = get(r, "name");
    if (!name) {
      if (Object.values(r).some((v) => v)) errors.push({ row: rowNo, field: "name", message: "Name is empty" });
      return;
    }
    if (name.length > 200) return errors.push({ row: rowNo, field: "name", message: "Name is longer than 200 characters" });
    const price = parseNumber(get(r, "price"));
    if (price === null || price < 0 || price > 1_000_000_000)
      return errors.push({ row: rowNo, field: "price", message: `Invalid price "${get(r, "price")}"` });
    const stockRaw = get(r, "stock");
    const stock = stockRaw ? parseNumber(stockRaw) : 0;
    if (stock === null || stock < 0 || !Number.isInteger(stock))
      return errors.push({ row: rowNo, field: "stock", message: `Invalid stock "${stockRaw}"` });
    const photo = get(r, "photo_url");
    const photoUrls = photo
      .split(/[,\s]+/)
      .filter(Boolean)
      .filter((u) => {
        const ok = isSafeImageUrl(u);
        if (!ok) errors.push({ row: rowNo, field: "photo_url", message: `Skipped non-https photo URL` });
        return ok;
      });

    const category = get(r, "category").slice(0, 100);
    const size = get(r, "size").slice(0, 40);
    const color = get(r, "color").slice(0, 40);
    const key = `${name.toLowerCase()}|${category.toLowerCase()}`;
    const existing = groups.get(key);
    const priceInt = Math.round(price);

    if (existing) {
      if (size || color) {
        existing.variants.push({ size, color, stock, price: priceInt !== existing.price ? priceInt : null, sku: get(r, "sku") || null });
      } else {
        errors.push({ row: rowNo, field: "name", message: `Duplicate product "${name}" without size/color — skipped` });
      }
      for (const u of photoUrls) if (!existing.photoUrls.includes(u)) existing.photoUrls.push(u);
      return;
    }
    groups.set(key, {
      name,
      description: get(r, "description").slice(0, 5000),
      price: priceInt,
      category,
      sku: size || color ? null : get(r, "sku") || null,
      stock,
      active: parseBool(get(r, "active")),
      variants: size || color ? [{ size, color, stock, price: null, sku: get(r, "sku") || null }] : [],
      photoUrls: photoUrls.slice(0, 8),
    });
  });

  return { products: Array.from(groups.values()), errors, rowCount: rows.length };
}
