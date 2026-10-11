import { z } from "zod";

/** Normalizes Uzbek phone numbers to +998XXXXXXXXX. Returns null if invalid. */
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local: string;
  if (digits.length === 12 && digits.startsWith("998")) local = digits.slice(3);
  else if (digits.length === 9) local = digits;
  else return null;
  // Valid Uzbek operator / city codes start with these digits.
  if (!/^(33|50|55|61|62|65|66|67|69|70|71|72|73|74|75|76|77|78|79|88|90|91|93|94|95|97|98|99|20)\d{7}$/.test(local)) {
    return null;
  }
  return `+998${local}`;
}

export const uzPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeUzPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Phone must be a valid Uzbek number in +998 XX XXX XX XX format" });
      return z.NEVER;
    }
    return n;
  });

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const passwordSchema = z.string().min(8).max(200);

export function slugify(input: string): string {
  const map: Record<string, string> = { "'": "", "ʻ": "", "ʼ": "", "‘": "", "’": "" };
  return (
    translitCyrillic(input)
      .toLowerCase()
      .replace(/['ʻʼ‘’]/g, (c) => map[c] ?? "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "shop"
  );
}

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o'", қ: "q", ғ: "g'", ҳ: "h",
};

/** Uzbek/Russian Cyrillic → Uzbek Latin (lowercase-preserving, approximate). */
export function translitCyrillic(input: string): string {
  let out = "";
  for (const ch of input) {
    const lower = ch.toLowerCase();
    const mapped = CYR[lower];
    if (mapped === undefined) out += ch;
    else out += ch === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
  }
  return out;
}

/** Text normalization used for product search on both the index and the query. */
export function normalizeSearch(input: string): string {
  return translitCyrillic(input)
    .toLowerCase()
    .replace(/[ʻʼ‘’`']/g, "'")
    .replace(/o'|g'/g, (m) => m[0] ?? "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
