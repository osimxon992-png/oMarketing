import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="oMarketing"
      className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight text-fg", className)}
    >
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-fg text-page shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2.6" />
          <circle cx="17.6" cy="6.4" r="1.9" fill="currentColor" />
        </svg>
      </span>
      <span className="text-lg" aria-hidden="true">
        <span className="text-subtle">o</span>Marketing
      </span>
    </Link>
  );
}
