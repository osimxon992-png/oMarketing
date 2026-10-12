"use client";
import { useI18n } from "./client";
import { pagesDictionaries } from "./pages";

/** Dashboard section strings for the current locale (client components). */
export function usePages() {
  return pagesDictionaries[useI18n().locale];
}
