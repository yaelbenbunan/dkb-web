/**
 * Mini-parser markdown a JSX para el blog editorial.
 *
 * Cubre exactamente las construcciones que usamos en src/content/blog/*.mdx:
 *   - Headings h2/h3 (con ID anchor para TOC)
 *   - Párrafos
 *   - Blockquote (renderizado como pull quote grande)
 *   - Listas con `- `
 *   - Imágenes `![alt](src)` como break-out
 *   - Inline: **strong**, *em*, `code`, [text](href)
 *
 * No es un parser markdown completo — está acotado a propósito para tener
 * control total del look sin instalar nuevas dependencias.
 */
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  TeamShowcase,
  type TeamShowcaseEntry,
} from "@/components/blog/TeamShowcase";

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

type ImageSize = "sm" | "md" | "lg";
type ImageAlign = "left" | "right" | "center";

interface ImageOptions {
  size: ImageSize;
  align: ImageAlign;
  tilt: boolean;
}

interface Block {
  kind: "h2" | "h3" | "p" | "quote" | "ul" | "image" | "embed-team";
  text?: string;
  items?: string[];
  src?: string;
  alt?: string;
  id?: string;
  imageOpts?: ImageOptions;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseImageOptions(raw?: string): ImageOptions {
  const opts: ImageOptions = { size: "lg", align: "center", tilt: false };
  if (!raw) return opts;
  for (const part of raw.split(",").map((s) => s.trim())) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k === "size" && (v === "sm" || v === "md" || v === "lg")) opts.size = v;
    else if (
      k === "align" &&
      (v === "left" || v === "right" || v === "center")
    )
      opts.align = v;
    else if (k === "tilt" && v === "true") opts.tilt = true;
  }
  return opts;
}

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Embed: [[team]] en su propia línea → showcase del equipo
    if (line.trim() === "[[team]]") {
      blocks.push({ kind: "embed-team" });
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      blocks.push({ kind: "h3", text, id: slugify(text) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      blocks.push({ kind: "h2", text, id: slugify(text) });
      i++;
      continue;
    }

    // Imagen block: ![alt](src) o ![alt](src "size=md,align=right,tilt=true")
    const imgMatch = line.match(
      /^!\[(.*?)\]\(([^"\s]+?)(?:\s+"([^"]*)")?\)\s*$/,
    );
    if (imgMatch) {
      blocks.push({
        kind: "image",
        alt: imgMatch[1],
        src: imgMatch[2],
        imageOpts: parseImageOptions(imgMatch[3]),
      });
      i++;
      continue;
    }

    // Blockquote — toma todas las líneas consecutivas con `> `
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }

    // Lista — toma líneas consecutivas con `- `
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Párrafo — acumula líneas hasta blanco o nuevo bloque
    const buf: string[] = [line.trim()];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("- ") &&
      !lines[i].match(/^!\[(.*?)\]\((.+?)\)\s*$/)
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

interface InlinePattern {
  regex: RegExp;
  render: (m: RegExpMatchArray, key: string) => ReactNode;
}

const INLINE_PATTERNS: InlinePattern[] = [
  {
    regex: /\[([^\]]+)\]\(([^)]+)\)/,
    render: (m, key) => {
      const [, label, href] = m;
      const isInternal = href.startsWith("/");
      return isInternal ? (
        <Link
          key={key}
          href={href}
          className="text-accent underline-offset-4 hover:underline"
        >
          {label}
        </Link>
      ) : (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-4 hover:underline"
        >
          {label}
        </a>
      );
    },
  },
  {
    regex: /\*\*([^*]+)\*\*/,
    render: (m, key) => (
      <strong key={key} className="font-bold text-fg">
        {m[1]}
      </strong>
    ),
  },
  {
    regex: /\*([^*]+)\*/,
    render: (m, key) => (
      <em key={key} className="italic">
        {m[1]}
      </em>
    ),
  },
  {
    regex: /`([^`]+)`/,
    render: (m, key) => (
      <code
        key={key}
        className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.9em]"
      >
        {m[1]}
      </code>
    ),
  },
];

/** Render inline markdown buscando el patrón más temprano y haciendo recursión. */
function renderInline(text: string, keyBase = "i"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let counter = 0;

  while (remaining.length) {
    let earliest: {
      idx: number;
      match: RegExpMatchArray;
      pattern: InlinePattern;
    } | null = null;
    for (const p of INLINE_PATTERNS) {
      const m = remaining.match(p.regex);
      if (m && typeof m.index === "number") {
        if (earliest === null || m.index < earliest.idx) {
          earliest = { idx: m.index, match: m, pattern: p };
        }
      }
    }
    if (!earliest) {
      nodes.push(remaining);
      break;
    }
    if (earliest.idx > 0) {
      nodes.push(remaining.slice(0, earliest.idx));
    }
    nodes.push(
      earliest.pattern.render(earliest.match, `${keyBase}-${counter++}`),
    );
    remaining = remaining.slice(earliest.idx + earliest.match[0].length);
  }
  return nodes;
}

export function extractHeadings(body: string): Heading[] {
  return parseBlocks(body)
    .filter((b) => b.kind === "h2" || b.kind === "h3")
    .map((b) => ({
      id: b.id!,
      text: b.text!,
      level: b.kind === "h2" ? 2 : 3,
    }));
}

export function PostBody({
  body,
  team,
}: {
  body: string;
  team?: TeamShowcaseEntry[];
}) {
  const blocks = parseBlocks(body);
  let paragraphCount = 0;

  return (
    <div className="post-body">
      {blocks.map((b, i) => {
        const key = `${b.kind}-${i}`;
        if (b.kind === "h2") {
          return (
            <h2
              key={key}
              id={b.id}
              className="mt-16 scroll-mt-28 font-black tracking-tight first:mt-0"
              style={{ fontSize: "var(--text-display-sm)", lineHeight: 1.15 }}
            >
              {b.text}
            </h2>
          );
        }
        if (b.kind === "h3") {
          return (
            <h3
              key={key}
              id={b.id}
              className="mt-10 scroll-mt-28 text-xl font-bold tracking-tight md:text-2xl"
            >
              <span className="mr-3 text-accent">#</span>
              {b.text}
            </h3>
          );
        }
        if (b.kind === "quote") {
          return (
            <blockquote
              key={key}
              className="my-12 border-l-4 border-accent/50 pl-6 md:my-16 md:pl-10"
            >
              <p className="font-serif text-2xl italic leading-snug text-fg md:text-3xl">
                <span aria-hidden className="mr-1 text-accent">
                  “
                </span>
                {renderInline(b.text!, key)}
                <span aria-hidden className="ml-1 text-accent">
                  ”
                </span>
              </p>
            </blockquote>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={key} className="my-6 space-y-3">
              {b.items!.map((item, j) => (
                <li
                  key={`${key}-${j}`}
                  className="flex items-start gap-3 text-base leading-relaxed text-fg-muted md:text-lg"
                >
                  <span
                    aria-hidden
                    className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  />
                  <span>{renderInline(item, `${key}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.kind === "image") {
          const opts = b.imageOpts ?? {
            size: "lg" as const,
            align: "center" as const,
            tilt: false,
          };
          const isFloat =
            (opts.align === "left" || opts.align === "right") &&
            opts.size !== "lg";

          // Tamaños y wrappers según opciones
          const figureCls =
            opts.size === "lg"
              ? "my-14 md:-mx-12 md:my-20 lg:-mx-24"
              : opts.size === "md"
                ? isFloat
                  ? opts.align === "right"
                    ? "my-8 md:float-right md:my-3 md:ml-8 md:mr-0 md:w-[60%]"
                    : "my-8 md:float-left md:my-3 md:mr-8 md:ml-0 md:w-[60%]"
                  : "mx-auto my-10 max-w-[520px]"
                : // sm
                  isFloat
                  ? opts.align === "right"
                    ? "my-8 md:float-right md:my-3 md:ml-8 md:mr-0 md:w-[40%] md:max-w-[300px]"
                    : "my-8 md:float-left md:my-3 md:mr-8 md:ml-0 md:w-[40%] md:max-w-[300px]"
                  : "mx-auto my-10 max-w-[320px]";

          const rotation = opts.tilt
            ? opts.align === "right"
              ? "md:rotate-[1.5deg]"
              : "md:-rotate-[1.5deg]"
            : "";

          const sizesAttr = isFloat
            ? "(max-width: 768px) 100vw, 480px"
            : opts.size === "lg"
              ? "(max-width: 768px) 100vw, 900px"
              : opts.size === "md"
                ? "(max-width: 768px) 100vw, 520px"
                : "(max-width: 768px) 100vw, 320px";

          return (
            <figure key={key} className={figureCls}>
              <div
                className={`overflow-hidden rounded-3xl shadow-[0_25px_50px_-15px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] transition-transform ${rotation}`}
              >
                <Image
                  src={b.src!}
                  alt={b.alt ?? ""}
                  width={2000}
                  height={1300}
                  sizes={sizesAttr}
                  className="h-auto w-full"
                />
              </div>
              {b.alt && (
                <figcaption className="mt-3 text-center text-sm text-fg-dim">
                  {b.alt}
                </figcaption>
              )}
            </figure>
          );
        }
        if (b.kind === "embed-team") {
          if (!team || team.length === 0) return null;
          return <TeamShowcase key={key} entries={team} />;
        }
        // párrafo
        paragraphCount++;
        const isFirst = paragraphCount === 1;
        return (
          <p
            key={key}
            className={
              isFirst
                ? "post-first-p mt-0 text-lg leading-relaxed text-fg md:text-xl"
                : "mt-6 text-base leading-relaxed text-fg-muted md:text-lg"
            }
          >
            {renderInline(b.text!, key)}
          </p>
        );
      })}
    </div>
  );
}
