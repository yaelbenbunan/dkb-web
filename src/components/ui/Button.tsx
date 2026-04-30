import { cn } from "@/lib/cn";
import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-bg]";
const variants: Record<Variant, string> = {
  primary: "bg-[#187bef] text-white hover:bg-[#3a90f2]",
  secondary: "bg-[--color-bg-elevated] text-[--color-fg] hover:bg-[--color-border-strong]",
  ghost: "text-[--color-accent] hover:bg-[--color-accent-soft]",
  outline:
    "bg-[#1a1d27] text-[--color-fg] ring-1 ring-[#187bef]/40 hover:bg-[#187bef]/15 hover:ring-[#187bef] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_-2px_rgba(0,0,0,0.3)]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}
