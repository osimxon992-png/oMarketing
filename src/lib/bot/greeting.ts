/**
 * Splits a leading greeting off a customer message, so "Salom, ko'ylak bormi?"
 * is answered as a question and only a bare "Salom!" gets the greeting reply.
 * Works on text already passed through `normalizeSearch` (Latin, lowercase).
 */

// Words that open a greeting ("assalomu", "zdravstvuyte", "dobriy" …).
const OPENERS = ["assalom", "asalom", "zdravstv", "zdrastv", "dobr"];
const OPENER_WORDS = new Set(["salom", "salomlar", "salam", "hello", "hi", "hey", "privet", "xayrli", "hayrli"]);
// Words that may follow the opener and still be part of the greeting / small talk.
const TAIL_WORDS = new Set([
  "alaykum", "aleykum", "alaykumu", "alekum", "kun", "den", "dnya", "utro", "vecher",
  "yaxshimisiz", "yaxshimi", "qalaysiz", "qalesiz", "qandaysiz", "aka", "opa", "uka", "brat", "dost", "hammaga", "vsem", "vam",
]);

const isOpener = (w: string) => OPENER_WORDS.has(w) || OPENERS.some((o) => w.startsWith(o));

export function splitGreeting(normalized: string): { greeting: boolean; rest: string } {
  const words = normalized.split(" ").filter(Boolean);
  if (!words.length || !isOpener(words[0]!)) return { greeting: false, rest: normalized };
  let i = 1;
  while (i < words.length && (isOpener(words[i]!) || TAIL_WORDS.has(words[i]!))) i++;
  return { greeting: true, rest: words.slice(i).join(" ") };
}
