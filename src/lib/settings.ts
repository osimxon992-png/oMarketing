import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

const defs = {
  trial_limits: {
    schema: z.object({
      days: z.number().int().min(1).max(60),
      monthlyReplies: z.number().int().min(0),
      instagram: z.boolean(),
      webWidget: z.boolean(),
    }),
    default: { days: 7, monthlyReplies: 500, instagram: true, webWidget: true },
  },
  commission_percent: {
    schema: z.number().min(0).max(50),
    default: 0,
  },
  referral_bonus_days: {
    schema: z.number().int().min(0).max(90),
    default: 7,
  },
} as const;

type Defs = typeof defs;
export type SettingKey = keyof Defs;
export type SettingValue<K extends SettingKey> = z.infer<Defs[K]["schema"]>;

/** Admin-editable platform settings with typed defaults. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const row = await db.platformSetting.findUnique({ where: { key } });
  const def = defs[key];
  if (!row) return def.default as SettingValue<K>;
  const parsed = def.schema.safeParse(row.value);
  return (parsed.success ? parsed.data : def.default) as SettingValue<K>;
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void> {
  const parsed = defs[key].schema.parse(value);
  await db.platformSetting.upsert({
    where: { key },
    update: { value: parsed as never },
    create: { key, value: parsed as never },
  });
}

export const settingSchemas = Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, v.schema])) as {
  [K in SettingKey]: Defs[K]["schema"];
};
