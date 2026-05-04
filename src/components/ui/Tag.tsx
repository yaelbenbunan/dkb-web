export function Tag({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "surface text-fg-muted"
      }`}
    >
      {children}
    </span>
  );
}
