import Link from "next/link";
import type { CaseStudy } from "@/lib/types";
import { Tag } from "@/components/ui/Tag";

export function CaseCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <Link
      href={`/casos-de-exito/${caseStudy.slug}`}
      className="group block overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] transition-colors hover:border-[--color-accent]"
    >
      <div className="aspect-[16/10] bg-[--color-bg-subtle]" />
      <div className="p-6">
        <div className="flex flex-wrap gap-1.5">
          {caseStudy.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <p className="mt-3 text-lg font-semibold text-[--color-fg]">
          {caseStudy.title}
        </p>
        {caseStudy.metricHeadline && (
          <p className="mt-1 text-sm font-medium text-[--color-accent]">
            {caseStudy.metricHeadline}
          </p>
        )}
        <p className="mt-2 text-sm text-[--color-fg-muted]">{caseStudy.client}</p>
      </div>
    </Link>
  );
}
