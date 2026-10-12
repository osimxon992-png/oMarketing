import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { adminDictionaries } from "@/lib/i18n/admin";
import { getDict } from "@/lib/i18n/server";
import { currentPeriod } from "@/lib/utils/format";

/**
 * Every admin page starts here. The auth check runs per page on purpose: layouts are
 * not re-rendered on client-side navigation, so the layout check alone is not enough.
 */
export async function adminContext() {
  await requireAdmin();
  const { locale, t } = await getDict();
  const now = new Date();
  // Tashkent is UTC+5 with no DST.
  const monthStart = new Date(`${currentPeriod(now)}-01T00:00:00+05:00`);
  return { locale, t, a: adminDictionaries[locale], now, monthStart };
}
