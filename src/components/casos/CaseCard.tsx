import Link from "next/link";
import type { CaseStudy } from "@/lib/types";
import { Tag } from "@/components/ui/Tag";

export function CaseCard({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <Link
      href={`/casos-de-exito/${caseStudy.slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 transition-colors hover:border-[--color-accent]"
    >
      <div className="aspect-[16/10] bg-slate-100" />
      <div className="p-6">
        <div className="flex flex-wrap gap-1.5">
          {caseStudy.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
        <p className="mt-3 text-lg font-semibold">{caseStudy.title}</p>
        {caseStudy.metricHeadline && (
          <p className="mt-1 text-sm font-medium text-[--color-accent]">
            {caseStudy.metricHeadline}
          </p>
        )}
        <p className="mt-2 text-sm text-slate-600">{caseStudy.client}</p>
      </div>
    </Link>
  );
}
