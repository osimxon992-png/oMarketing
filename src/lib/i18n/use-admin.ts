"use client";
import { adminDictionaries } from "./admin";
import { useI18n } from "./client";

/** Admin panel strings for the current locale (client components). */
export function useAdminDict() {
  return adminDictionaries[useI18n().locale];
}
