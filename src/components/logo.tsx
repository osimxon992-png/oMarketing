import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Clay coin mark + wordmark. On leaf-green grounds pass `onDark`. */
export function Logo({ className, href = "/", onDark }: { className?: string; href?: string; onDark?: boolean }) {
  return (
    <Link
      href={href}
      aria-label="oMarketing"
      className={cn("inline-flex items-center gap-2.5", onDark ? "text-paper-hi" : "text-fg", className)}
    >
      <span className="clay-btn grid h-9 w-9 -rotate-6 place-items-center rounded-full bg-mango text-charcoal">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden="true">
          <circle cx="11" cy="13" r="6" stroke="currentColor" strokeWidth="3" />
          <path d="M15.5 6.5c1.2-2.2 3.3-3 5-2.6-.4 1.9-2.3 3.4-5 2.6Z" fill="#1f5a2e" />
        </svg>
      </span>
      <span className="font-display text-[1.2rem] leading-none tracking-[-0.01em]" aria-hidden="true">
        <span className={onDark ? "text-mango" : "text-anor"}>o</span>Marketing
      </span>
    </Link>
  );
}
