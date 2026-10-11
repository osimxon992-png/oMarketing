import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg border border-accent shadow-[0_8px_30px_-8px_color-mix(in_srgb,var(--fg)_45%,transparent)] hover:bg-accent-strong hover:shadow-[0_10px_40px_-6px_color-mix(in_srgb,var(--fg)_60%,transparent)]",
  secondary: "glass text-fg hover:bg-glass-strong",
  ghost: "text-fg hover:bg-glass",
  danger: "bg-danger text-page hover:brightness-110 border border-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-sm rounded-full gap-1.5",
  md: "h-10 px-5 text-sm rounded-full gap-2",
  lg: "h-12 px-7 text-base rounded-full gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-200 select-none",
    "active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed disabled:active:scale-100",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
