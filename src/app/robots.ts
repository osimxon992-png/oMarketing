import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Reads APP_URL at request time so `next build` works without secrets.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/onboarding", "/api/", "/r/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
