export function Tag({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${
        active ? "bg-[--color-accent] text-white" : "bg-slate-100 text-slate-700"
      }`}
    >
      {children}
    </span>
  );
}
