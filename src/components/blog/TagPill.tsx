import Link from "next/link";

interface TagPillProps {
  tag: string;
  href?: string;
  size?: "sm" | "md";
  variant?: "default" | "solid" | "ghost";
}

function formatTag(tag: string): string {
  return tag.replace(/-/g, " ");
}

export function TagPill({
  tag,
  href,
  size = "md",
  variant = "default",
}: TagPillProps) {
  const sizing =
    size === "sm"
      ? "h-6 px-2.5 text-[10px]"
      : "h-7 px-3.5 text-[11px]";
  const variantCls =
    variant === "solid"
      ? "bg-accent text-white ring-1 ring-accent"
      : variant === "ghost"
        ? "bg-transparent text-fg-muted ring-1 ring-white/[0.12] hover:bg-white/[0.04] hover:text-fg"
        : "bg-accent/15 text-accent-hover ring-1 ring-accent/35 hover:bg-accent/25 hover:text-accent";

  const cls = `inline-flex w-fit items-center rounded-full font-bold uppercase tracking-[0.18em] transition-colors ${sizing} ${variantCls}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {formatTag(tag)}
      </Link>
    );
  }
  return <span className={cls}>{formatTag(tag)}</span>;
}
