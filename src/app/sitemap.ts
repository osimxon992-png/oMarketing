import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const PAGES = ["", "/features", "/how-it-works", "/pricing", "/faq", "/register", "/login"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL;
  return PAGES.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));
}
