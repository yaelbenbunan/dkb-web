import { cn } from "@/lib/cn";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}

export function Container({ children, className, size = "default" }: Props) {
  const max =
    size === "narrow" ? "max-w-3xl" : size === "wide" ? "max-w-7xl" : "max-w-6xl";
  return (
    <div className={cn("mx-auto w-full px-6 lg:px-8", max, className)}>
      {children}
    </div>
  );
}
