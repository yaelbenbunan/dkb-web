import Image from "next/image";
import { TEAM, type TeamMember } from "@/lib/team";

export interface TeamShowcaseEntry {
  /** Slug del miembro (coincide con el filename del avatar). Ej: "yael-benbunan" */
  member?: string;
  /** Si no hay member único (ej. "Las Paulas"), usa este nombre custom */
  name?: string;
  /** Lista alternativa de avatares para agrupaciones (ej. [paula-garcia, paula-lopez]) */
  members?: string[];
  /** Descripción de su rol en este contexto */
  desc: string;
}

function findMember(slug: string): TeamMember | undefined {
  return TEAM.find((m) => m.avatar.includes(`${slug}.png`));
}

export function TeamShowcase({ entries }: { entries: TeamShowcaseEntry[] }) {
  return (
    <div className="my-14 grid gap-4 sm:grid-cols-2 md:my-16">
      {entries.map((entry, i) => {
        const main = entry.member ? findMember(entry.member) : undefined;
        const groupMembers =
          entry.members
            ?.map((s) => findMember(s))
            .filter((m): m is TeamMember => Boolean(m)) ?? [];
        const displayName = main?.name ?? entry.name ?? "";

        return (
          <div
            key={i}
            className="surface flex items-start gap-4 rounded-3xl p-5 transition-colors hover:bg-white/[0.05] sm:p-6"
          >
            {/* Avatar(es) */}
            {groupMembers.length > 0 ? (
              <div className="relative flex shrink-0 -space-x-3">
                {groupMembers.map((m) => (
                  <Image
                    key={m.avatar}
                    src={m.avatar}
                    alt={m.name}
                    width={64}
                    height={64}
                    className="h-14 w-14 rounded-full bg-bg-subtle object-cover ring-2 ring-[var(--bg)]"
                  />
                ))}
              </div>
            ) : main ? (
              <Image
                src={main.avatar}
                alt={main.name}
                width={64}
                height={64}
                className="h-14 w-14 shrink-0 rounded-full bg-bg-subtle object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-hover ring-1 ring-accent/30"
              >
                ?
              </span>
            )}

            <div className="min-w-0">
              <p className="text-base font-bold leading-tight text-fg">
                {displayName}
              </p>
              {main?.role && (
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-fg-dim">
                  {main.role}
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {entry.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
