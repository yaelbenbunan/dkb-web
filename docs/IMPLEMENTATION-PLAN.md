# dkb-web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 of `dinkbit.es` — a corporate informational website for the Spanish branch of dinkbit, with home, "nosotros", 7 service pages, filterable case studies, blog placeholder and a working contact form, deployed to Vercel.

**Architecture:** Next.js 16 App Router with React Server Components by default; MDX in `content/` for services and case studies (parsed at build time); Server Action + Zod + Resend for the contact form. No CMS, no auth, no DB in v1. Phase 2 adds Payload CMS on top.

**Tech Stack:** Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · `@next/mdx` · `gray-matter` · `zod` · `resend` · `next/font` · Vitest (tests) · Vercel (deploy)

**Reference codebase:** [/Users/yaelbenbunan/Documents/CLAUDE/dashboard-dkb](/Users/yaelbenbunan/Documents/CLAUDE/dashboard-dkb) — same stack, look here for Tailwind v4 setup, Resend usage, Server Action patterns, env conventions.

**Spec:** see [MASTERPLAN.md](./MASTERPLAN.md) in this folder.

---

## File Structure (target)

```
dkb-web/
  src/
    app/
      layout.tsx                       # Root layout (Header + Footer)
      page.tsx                         # Home
      globals.css                      # Tailwind v4 @theme tokens
      nosotros/page.tsx
      servicios/
        page.tsx                       # Index of 7 services
        [slug]/page.tsx                # Service detail (dynamic route)
      casos-de-exito/
        page.tsx                       # Index with filtering
        [slug]/page.tsx                # Case detail
      blog/page.tsx                    # Placeholder
      contacto/page.tsx                # Form
      sitemap.ts
      robots.ts
    components/
      layout/{Header,Footer,MobileMenu}.tsx
      ui/{Container,Button,Tag}.tsx
      home/{Hero,ServicesGrid,FeaturedCases,ContactCTA}.tsx
      servicios/ServiceCard.tsx
      casos/{CaseCard,CaseFilters}.tsx
      contacto/ContactForm.tsx
    content/
      servicios/{desarrollo-web,ecommerce,diseno-grafico,social-paid-media,sem,seo,email-mkt}.mdx
      casos-de-exito/<slugs>.mdx       # to be filled with real cases
    lib/
      content.ts                       # MDX loaders (typed)
      contact-action.ts                # Server Action
      validation.ts                    # Zod schemas
      types.ts                         # Service, CaseStudy
  public/img/...
  docs/{MASTERPLAN.md, IMPLEMENTATION-PLAN.md}
  vitest.config.ts
  next.config.ts (or .mjs)
  tsconfig.json
  package.json
  .env.example, .env.local (gitignored)
```

---

## Task 1: Bootstrap project

**Files:**
- Create: entire `dkb-web/` Next.js scaffold via `create-next-app`
- Create: `dkb-web/.gitignore` (extended), `dkb-web/README.md`

- [ ] **Step 1: Create the Next.js project**

Run from the parent of `dkb-web/`:
```bash
cd /Users/yaelbenbunan/Documents/CLAUDE
npx create-next-app@latest dkb-web --ts --tailwind --app --src-dir --import-alias "@/*" --no-eslint --use-npm --turbopack
```

If `create-next-app` complains because `dkb-web/` exists with `docs/`, answer "y" to overwrite (it preserves existing files unless they conflict). Re-place `docs/MASTERPLAN.md` and `docs/IMPLEMENTATION-PLAN.md` afterwards if they got moved.

- [ ] **Step 2: Verify it runs**

```bash
cd dkb-web
npm run dev
```

Open http://localhost:3000 — expect the Next.js welcome page.

- [ ] **Step 3: Init git + first commit**

```bash
cd dkb-web
git init
git add -A
git commit -m "chore: bootstrap Next.js 16 + Tailwind v4 + TypeScript"
```

- [ ] **Step 4: Create staging branch**

```bash
git checkout -b staging
```

(Convention: `staging` = dev, `main` = prod, mirroring dashboard-dkb.)

- [ ] **Step 5: Add minimal README**

Create `dkb-web/README.md`:
```markdown
# dkb-web

Web corporativa de dinkbit España (`dinkbit.es`). Stack: Next.js 16 · TypeScript · Tailwind v4. Spec en [docs/MASTERPLAN.md](./docs/MASTERPLAN.md).

## Comandos

```bash
npm run dev          # http://localhost:3000
npm run build
npm run typecheck
npm test             # vitest
```

## Variables de entorno

Ver `.env.example`.
```

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Task 2: Vitest + linting setup

**Files:**
- Create: `dkb-web/vitest.config.ts`, `dkb-web/eslint.config.mjs`
- Modify: `dkb-web/package.json` (scripts)
- Create: `dkb-web/src/lib/__tests__/sanity.test.ts`

- [ ] **Step 1: Install dev deps**

```bash
npm i -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom eslint @eslint/eslintrc eslint-config-next
```

- [ ] **Step 2: Write vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Create `vitest.setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add scripts to package.json**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Write sanity test**

Create `src/lib/__tests__/sanity.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("test runner", () => {
  it("works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

```bash
npm test
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: vitest + jsdom + testing-library"
```

---

## Task 3: Brand tokens + typography

**Files:**
- Modify: `src/app/globals.css` (Tailwind `@theme` block)
- Modify: `src/app/layout.tsx` (next/font + body class)

**Decisions to make in this session:**
- Paleta primary (1 color), accent (1 color), neutrals scale (slate works as default until they bring brand)
- Font: heading + body (default to `Inter` for body, `Geist` for headings — easily swappable later)

- [ ] **Step 1: Pick brand tokens** (ask user for hex codes; use these placeholders if not provided yet)

```
primary:    #0F172A  (deep slate — placeholder)
accent:     #2563EB  (vivid blue — placeholder)
neutrals:   slate-50 → slate-900 (Tailwind default)
```

Record agreed values in a short note inside `globals.css` so future edits are easy.

- [ ] **Step 2: Replace `globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: #0F172A;
  --color-accent: #2563EB;
  --color-bg: #FFFFFF;
  --color-fg: #0F172A;

  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-geist), var(--font-inter), system-ui, sans-serif;
}

@layer base {
  html { color-scheme: light; }
  body {
    @apply bg-[--color-bg] text-[--color-fg] font-sans antialiased;
  }
  h1, h2, h3 { @apply font-display tracking-tight; }
}
```

- [ ] **Step 3: Wire fonts in `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "dinkbit — agencia digital",
  description: "Agencia de marketing digital en España. Desarrollo web, ecommerce, paid media, SEO y más.",
  metadataBase: new URL("https://dinkbit.es"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Open `/`. Expected: Inter for body, no console errors. Welcome page still there but with the new font.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: brand tokens + typography (Inter + Geist via next/font)"
```

---

## Task 4: UI primitives (Container, Button)

**Files:**
- Create: `src/components/ui/Container.tsx`, `src/components/ui/Button.tsx`

- [ ] **Step 1: Container**

```tsx
// src/components/ui/Container.tsx
import { cn } from "@/lib/cn";
import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}

export function Container({ children, className, size = "default" }: Props) {
  const max = size === "narrow" ? "max-w-3xl" : size === "wide" ? "max-w-7xl" : "max-w-6xl";
  return (
    <div className={cn("mx-auto w-full px-6 lg:px-8", max, className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: cn helper**

Create `src/lib/cn.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

```bash
npm i clsx tailwind-merge
```

- [ ] **Step 3: Button**

```tsx
// src/components/ui/Button.tsx
import { cn } from "@/lib/cn";
import Link from "next/link";
import { type ComponentProps, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2";
const variants: Record<Variant, string> = {
  primary: "bg-[--color-accent] text-white hover:opacity-90",
  secondary: "bg-[--color-primary] text-white hover:opacity-90",
  ghost: "text-[--color-primary] hover:bg-slate-100",
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
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck && git add -A && git commit -m "feat: UI primitives (Container, Button, cn helper)"
```

---

## Task 5: Header + Footer + root layout

**Files:**
- Create: `src/components/layout/Header.tsx`, `Footer.tsx`, `MobileMenu.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Define nav items in one place**

Create `src/lib/nav.ts`:
```typescript
export const NAV_ITEMS = [
  { label: "Servicios", href: "/servicios" },
  { label: "Casos de éxito", href: "/casos-de-exito" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
] as const;
```

- [ ] **Step 2: Header (server component, with a small client island for mobile menu)**

```tsx
// src/components/layout/Header.tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { NAV_ITEMS } from "@/lib/nav";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          dinkbit
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.filter((i) => i.href !== "/contacto").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-700 transition-colors hover:text-[--color-primary]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <ButtonLink href="/contacto" size="sm">Contacto</ButtonLink>
        </div>
        <MobileMenu />
      </Container>
    </header>
  );
}
```

- [ ] **Step 3: MobileMenu (client component)**

```tsx
// src/components/layout/MobileMenu.tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        aria-label="Abrir menú"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-100"
      >
        <span className="sr-only">Menú</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white">
          <nav className="flex flex-col p-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Footer**

```tsx
// src/components/layout/Footer.tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-slate-50">
      <Container className="grid gap-8 py-12 md:grid-cols-3">
        <div>
          <Link href="/" className="text-lg font-bold">dinkbit</Link>
          <p className="mt-2 text-sm text-slate-600">Agencia digital en España.</p>
        </div>
        <nav>
          <p className="text-sm font-semibold text-slate-900">Navegación</p>
          <ul className="mt-3 space-y-2">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-sm text-slate-600 hover:text-slate-900">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-slate-900">Contacto</p>
          <p className="mt-3 text-sm text-slate-600">hola@dinkbit.es</p>
        </div>
      </Container>
      <Container className="border-t border-slate-200 py-6 text-xs text-slate-500">
        © {new Date().getFullYear()} dinkbit. Todos los derechos reservados.
      </Container>
    </footer>
  );
}
```

- [ ] **Step 5: Wire into layout**

Modify `src/app/layout.tsx` body:
```tsx
<body>
  <Header />
  <main className="min-h-[calc(100vh-4rem)]">{children}</main>
  <Footer />
</body>
```
(Add the imports.)

- [ ] **Step 6: Replace default home with placeholder**

`src/app/page.tsx`:
```tsx
import { Container } from "@/components/ui/Container";

export default function Home() {
  return (
    <Container className="py-24">
      <h1 className="text-4xl font-bold">Hola.</h1>
      <p className="mt-4 text-slate-600">Trabajando en la home…</p>
    </Container>
  );
}
```

- [ ] **Step 7: Verify + commit**

```bash
npm run dev
```

Expected: Header + Footer visible, mobile menu toggles.

```bash
git add -A
git commit -m "feat: header + footer + mobile menu + root layout"
```

---

## Task 6: Home page sections

**Files:**
- Create: `src/components/home/{Hero,ServicesGrid,FeaturedCases,ContactCTA}.tsx`
- Modify: `src/app/page.tsx`

This task is intentionally taste-driven. The structure is:
- Hero: H1 + subhead + 2 CTA buttons (Contacto + Ver servicios) + headline metric trio
- ServicesGrid: 7 service cards in a responsive grid (uses content loader from Task 7 — for now, hardcoded array; we'll switch to MDX in Task 8)
- FeaturedCases: top 3 case studies (also hardcoded array for now, swapped later)
- ContactCTA: full-width band with one big "Hablemos" button

- [ ] **Step 1: Hero**

```tsx
// src/components/home/Hero.tsx
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function Hero() {
  return (
    <section className="bg-slate-50">
      <Container className="py-24 md:py-32">
        <p className="text-sm font-medium text-[--color-accent]">dinkbit · España</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">
          Marketing digital que <span className="text-[--color-accent]">convierte</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          Diseño, desarrollo y campañas para marcas que quieren resultados medibles.
          Llevamos más de [N] años haciendo crecer negocios online.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/contacto" size="lg">Hablemos</ButtonLink>
          <ButtonLink href="/servicios" size="lg" variant="ghost">Ver servicios</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: ServicesGrid (provisional, with hardcoded list — replaced by MDX loader in Task 8)**

```tsx
// src/components/home/ServicesGrid.tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";

const SERVICES = [
  { title: "Desarrollo web", slug: "desarrollo-web" },
  { title: "Ecommerce", slug: "ecommerce" },
  { title: "Diseño gráfico", slug: "diseno-grafico" },
  { title: "Social & Paid Media", slug: "social-paid-media" },
  { title: "SEM", slug: "sem" },
  { title: "SEO", slug: "seo" },
  { title: "Email mkt", slug: "email-mkt" },
];

export function ServicesGrid() {
  return (
    <section className="py-24">
      <Container>
        <h2 className="text-3xl font-bold tracking-tight">Servicios</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Todo lo que necesita una marca para crecer en digital.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group rounded-2xl border border-slate-200 p-6 transition-colors hover:border-[--color-accent]"
            >
              <p className="text-lg font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-slate-600 group-hover:text-slate-900">
                Conocer más →
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: FeaturedCases (provisional)**

```tsx
// src/components/home/FeaturedCases.tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function FeaturedCases() {
  return (
    <section className="bg-slate-50 py-24">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Casos de éxito</h2>
          <Link href="/casos-de-exito" className="text-sm font-medium text-[--color-accent]">
            Ver todos →
          </Link>
        </div>
        <p className="mt-4 text-slate-600">Próximamente, una selección de los proyectos que más nos han marcado.</p>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: ContactCTA**

```tsx
// src/components/home/ContactCTA.tsx
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function ContactCTA() {
  return (
    <section className="bg-[--color-primary] py-24 text-white">
      <Container className="text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          ¿Tienes un proyecto en mente?
        </h2>
        <p className="mt-4 text-slate-300">Te respondemos en menos de 24 horas.</p>
        <div className="mt-8">
          <ButtonLink href="/contacto" size="lg">Hablemos</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Wire into home**

```tsx
// src/app/page.tsx
import { Hero } from "@/components/home/Hero";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { FeaturedCases } from "@/components/home/FeaturedCases";
import { ContactCTA } from "@/components/home/ContactCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesGrid />
      <FeaturedCases />
      <ContactCTA />
    </>
  );
}
```

- [ ] **Step 6: Verify + commit**

```bash
npm run dev
# manual: visit /, scroll, check responsive
git add -A && git commit -m "feat: home page (Hero + ServicesGrid + FeaturedCases + ContactCTA)"
```

---

## Task 7: Content loader (TDD)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/content.ts`
- Create: `src/lib/__tests__/content.test.ts`
- Create: `src/content/servicios/desarrollo-web.mdx` (single fixture for the test)

- [ ] **Step 1: Install gray-matter**

```bash
npm i gray-matter
```

- [ ] **Step 2: Define types**

```typescript
// src/lib/types.ts
export interface Service {
  slug: string;
  title: string;
  shortDescription: string;
  heroImage?: string;
  order: number;
  body: string;             // raw MDX body
}

export interface CaseStudy {
  slug: string;
  title: string;
  client: string;
  tags: string[];           // service slugs
  heroImage?: string;
  metricHeadline?: string;
  publishedAt: string;      // ISO date
  body: string;
}
```

- [ ] **Step 3: Create one MDX fixture**

```mdx
---
title: "Desarrollo web"
slug: "desarrollo-web"
shortDescription: "Webs y plataformas a medida."
heroImage: "/img/servicios/desarrollo-web.jpg"
order: 1
---

# Desarrollo web

Cuerpo de prueba.
```

- [ ] **Step 4: Write the failing test**

```typescript
// src/lib/__tests__/content.test.ts
import { describe, it, expect } from "vitest";
import { getAllServices, getServiceBySlug } from "@/lib/content";

describe("content loader (services)", () => {
  it("loads all services from /content/servicios", () => {
    const services = getAllServices();
    expect(services.length).toBeGreaterThan(0);
    expect(services[0]).toMatchObject({
      slug: expect.any(String),
      title: expect.any(String),
      order: expect.any(Number),
    });
  });

  it("getServiceBySlug returns the right one", () => {
    const s = getServiceBySlug("desarrollo-web");
    expect(s?.title).toBe("Desarrollo web");
  });

  it("getServiceBySlug returns undefined for unknown slug", () => {
    expect(getServiceBySlug("does-not-exist")).toBeUndefined();
  });

  it("services are sorted by `order` ascending", () => {
    const services = getAllServices();
    const orders = services.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 5: Run — expect failure**

```bash
npm test
```

Expected: error "Cannot find module '@/lib/content'".

- [ ] **Step 6: Implement content loader**

```typescript
// src/lib/content.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { Service, CaseStudy } from "./types";

const ROOT = join(process.cwd(), "src/content");

function readMdx(dir: string): Array<{ data: Record<string, unknown>; body: string; filename: string }> {
  const fullDir = join(ROOT, dir);
  return readdirSync(fullDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((filename) => {
      const raw = readFileSync(join(fullDir, filename), "utf8");
      const { data, content } = matter(raw);
      return { data, body: content, filename };
    });
}

export function getAllServices(): Service[] {
  return readMdx("servicios")
    .map(({ data, body }) => ({
      slug: String(data.slug),
      title: String(data.title),
      shortDescription: String(data.shortDescription ?? ""),
      heroImage: data.heroImage as string | undefined,
      order: Number(data.order ?? 999),
      body,
    }))
    .sort((a, b) => a.order - b.order);
}

export function getServiceBySlug(slug: string): Service | undefined {
  return getAllServices().find((s) => s.slug === slug);
}

export function getAllCaseStudies(): CaseStudy[] {
  return readMdx("casos-de-exito")
    .map(({ data, body }) => ({
      slug: String(data.slug),
      title: String(data.title),
      client: String(data.client ?? ""),
      tags: (data.tags as string[]) ?? [],
      heroImage: data.heroImage as string | undefined,
      metricHeadline: data.metricHeadline as string | undefined,
      publishedAt: String(data.publishedAt ?? new Date().toISOString()),
      body,
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return getAllCaseStudies().find((c) => c.slug === slug);
}
```

- [ ] **Step 7: Run tests — expect pass**

```bash
npm test
```

Expected: all 4 tests pass. (The "casos-de-exito" folder doesn't exist yet — `readdirSync` will throw. To handle empty folder gracefully, see step 8.)

- [ ] **Step 8: Make `readMdx` resilient to missing folder**

Wrap the `readdirSync` call:
```typescript
import { existsSync } from "node:fs";
// ...
function readMdx(dir: string) {
  const fullDir = join(ROOT, dir);
  if (!existsSync(fullDir)) return [];
  // rest unchanged
}
```

Re-run: `npm test` → all pass.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(content): MDX loader for services + case studies (TDD)"
```

---

## Task 8: Servicios pages (index + detail, all 7 MDX)

**Files:**
- Create: 6 more `src/content/servicios/*.mdx`
- Create: `src/app/servicios/page.tsx`
- Create: `src/app/servicios/[slug]/page.tsx`
- Create: `src/components/servicios/ServiceCard.tsx`
- Modify: `src/components/home/ServicesGrid.tsx` (use loader)

- [ ] **Step 1: Create stubs for the remaining 6 services**

For each of `ecommerce`, `diseno-grafico`, `social-paid-media`, `sem`, `seo`, `email-mkt`, create `src/content/servicios/<slug>.mdx`:

```mdx
---
title: "<Title>"
slug: "<slug>"
shortDescription: "Texto pendiente."
heroImage: "/img/servicios/<slug>.jpg"
order: <2-7 in nav order>
---

# <Title>

Cuerpo a redactar.

## Qué incluye

- Punto 1
- Punto 2
- Punto 3

## Proceso

1. Briefing
2. Propuesta
3. Implementación
4. Medición
```

(Title list: Ecommerce / Diseño gráfico / Social & Paid Media / SEM / SEO / Email mkt. Order values 2-7 in that order.)

- [ ] **Step 2: ServiceCard component**

```tsx
// src/components/servicios/ServiceCard.tsx
import Link from "next/link";
import type { Service } from "@/lib/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="group block rounded-2xl border border-slate-200 p-6 transition-colors hover:border-[--color-accent]"
    >
      <p className="text-lg font-semibold">{service.title}</p>
      <p className="mt-2 text-sm text-slate-600">{service.shortDescription}</p>
      <p className="mt-4 text-sm font-medium text-[--color-accent]">Conocer más →</p>
    </Link>
  );
}
```

- [ ] **Step 3: Servicios index page**

```tsx
// src/app/servicios/page.tsx
import { Container } from "@/components/ui/Container";
import { ServiceCard } from "@/components/servicios/ServiceCard";
import { getAllServices } from "@/lib/content";

export const metadata = {
  title: "Servicios — dinkbit",
  description: "Desarrollo web, ecommerce, diseño gráfico, paid media, SEM, SEO y email marketing.",
};

export default function ServiciosPage() {
  const services = getAllServices();
  return (
    <Container className="py-24">
      <h1 className="text-4xl font-bold tracking-tight">Servicios</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Todo lo que necesita una marca para crecer en digital.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => <ServiceCard key={s.slug} service={s} />)}
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: Configure MDX in next.config**

Replace `next.config.ts` (or `.mjs`):
```typescript
import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({});

const config: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

export default withMDX(config);
```

```bash
npm i @next/mdx @types/mdx
```

- [ ] **Step 5: Service detail page**

```tsx
// src/app/servicios/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getAllServices, getServiceBySlug } from "@/lib/content";
import { MDXRemote } from "next-mdx-remote-client/rsc";

export async function generateStaticParams() {
  return getAllServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.title} — dinkbit`,
    description: service.shortDescription,
  };
}

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <article>
      <header className="bg-slate-50 py-24">
        <Container>
          <p className="text-sm font-medium text-[--color-accent]">Servicio</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{service.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">{service.shortDescription}</p>
        </Container>
      </header>
      <Container className="prose prose-slate max-w-3xl py-16">
        <MDXRemote source={service.body} />
      </Container>
    </article>
  );
}
```

```bash
npm i next-mdx-remote-client
```

- [ ] **Step 6: Add prose styles**

```bash
npm i -D @tailwindcss/typography
```

Add to `globals.css` after `@import "tailwindcss";`:
```css
@plugin "@tailwindcss/typography";
```

- [ ] **Step 7: Replace home `ServicesGrid` to read from loader**

```tsx
// src/components/home/ServicesGrid.tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getAllServices } from "@/lib/content";

export function ServicesGrid() {
  const services = getAllServices();
  return (
    <section className="py-24">
      <Container>
        <h2 className="text-3xl font-bold tracking-tight">Servicios</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Todo lo que necesita una marca para crecer en digital.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group rounded-2xl border border-slate-200 p-6 transition-colors hover:border-[--color-accent]"
            >
              <p className="text-lg font-semibold">{s.title}</p>
              <p className="mt-2 text-sm text-slate-600">{s.shortDescription}</p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 8: Verify**

```bash
npm run dev
# manual: visit /servicios → 7 cards; click each → detail page renders MDX body
npm run typecheck
git add -A && git commit -m "feat: /servicios index + 7 MDX detail pages"
```

---

## Task 9: Casos de éxito (index with filters + detail)

**Files:**
- Create: `src/content/casos-de-exito/ejemplo-1.mdx` (placeholder so the section isn't empty)
- Create: `src/components/casos/{CaseCard,CaseFilters,Tag}.tsx`
- Create: `src/app/casos-de-exito/page.tsx`
- Create: `src/app/casos-de-exito/[slug]/page.tsx`
- Modify: `src/components/home/FeaturedCases.tsx`

- [ ] **Step 1: Placeholder case**

```mdx
---
title: "Caso de ejemplo"
slug: "ejemplo-1"
client: "Cliente demo"
tags: ["sem", "seo"]
heroImage: "/img/casos/ejemplo-1.jpg"
metricHeadline: "+250% leads"
publishedAt: "2026-04-01"
---

# Caso de ejemplo

Cuerpo de prueba mientras se redactan los casos reales.
```

- [ ] **Step 2: Tag and CaseCard**

```tsx
// src/components/ui/Tag.tsx
export function Tag({ children, active }: { children: React.ReactNode; active?: boolean }) {
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
```

```tsx
// src/components/casos/CaseCard.tsx
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
          {caseStudy.tags.map((t) => <Tag key={t}>{t}</Tag>)}
        </div>
        <p className="mt-3 text-lg font-semibold">{caseStudy.title}</p>
        {caseStudy.metricHeadline && (
          <p className="mt-1 text-sm font-medium text-[--color-accent]">{caseStudy.metricHeadline}</p>
        )}
        <p className="mt-2 text-sm text-slate-600">{caseStudy.client}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: CaseFilters (client component)**

```tsx
// src/components/casos/CaseFilters.tsx
"use client";

import { useState } from "react";
import type { CaseStudy } from "@/lib/types";
import { CaseCard } from "./CaseCard";

interface Props {
  caseStudies: CaseStudy[];
  serviceTags: { slug: string; title: string }[];
}

export function CaseFilters({ caseStudies, serviceTags }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active
    ? caseStudies.filter((c) => c.tags.includes(active))
    : caseStudies;

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={`h-9 rounded-full px-4 text-sm font-medium ${
            active === null ? "bg-[--color-primary] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todos
        </button>
        {serviceTags.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActive(t.slug)}
            className={`h-9 rounded-full px-4 text-sm font-medium ${
              active === t.slug ? "bg-[--color-primary] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-slate-600">No hay casos para este filtro.</p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <CaseCard key={c.slug} caseStudy={c} />)}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Casos index page**

```tsx
// src/app/casos-de-exito/page.tsx
import { Container } from "@/components/ui/Container";
import { CaseFilters } from "@/components/casos/CaseFilters";
import { getAllCaseStudies, getAllServices } from "@/lib/content";

export const metadata = {
  title: "Casos de éxito — dinkbit",
  description: "Selección de proyectos y resultados conseguidos para nuestros clientes.",
};

export default function CasosPage() {
  const caseStudies = getAllCaseStudies();
  const serviceTags = getAllServices().map((s) => ({ slug: s.slug, title: s.title }));

  return (
    <Container className="py-24">
      <h1 className="text-4xl font-bold tracking-tight">Casos de éxito</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Resultados reales de marcas con las que hemos trabajado.
      </p>
      <CaseFilters caseStudies={caseStudies} serviceTags={serviceTags} />
    </Container>
  );
}
```

- [ ] **Step 5: Caso detail page**

```tsx
// src/app/casos-de-exito/[slug]/page.tsx
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { getAllCaseStudies, getCaseStudyBySlug } from "@/lib/content";
import { Tag } from "@/components/ui/Tag";
import { MDXRemote } from "next-mdx-remote-client/rsc";

export async function generateStaticParams() {
  return getAllCaseStudies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCaseStudyBySlug(slug);
  if (!c) return {};
  return { title: `${c.title} — dinkbit`, description: c.client };
}

export default async function CaseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);
  if (!caseStudy) notFound();

  return (
    <article>
      <header className="bg-slate-50 py-24">
        <Container>
          <div className="flex flex-wrap gap-1.5">
            {caseStudy.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{caseStudy.title}</h1>
          <p className="mt-4 text-lg text-slate-600">{caseStudy.client}</p>
          {caseStudy.metricHeadline && (
            <p className="mt-6 text-2xl font-bold text-[--color-accent]">{caseStudy.metricHeadline}</p>
          )}
        </Container>
      </header>
      <Container className="prose prose-slate max-w-3xl py-16">
        <MDXRemote source={caseStudy.body} />
      </Container>
    </article>
  );
}
```

- [ ] **Step 6: Replace home FeaturedCases to use loader**

```tsx
// src/components/home/FeaturedCases.tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CaseCard } from "@/components/casos/CaseCard";
import { getAllCaseStudies } from "@/lib/content";

export function FeaturedCases() {
  const cases = getAllCaseStudies().slice(0, 3);
  if (cases.length === 0) return null;
  return (
    <section className="bg-slate-50 py-24">
      <Container>
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Casos de éxito</h2>
          <Link href="/casos-de-exito" className="text-sm font-medium text-[--color-accent]">
            Ver todos →
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => <CaseCard key={c.slug} caseStudy={c} />)}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 7: Verify + commit**

```bash
npm run dev
# manual: /casos-de-exito → filters work; /casos-de-exito/ejemplo-1 → renders
npm run typecheck
git add -A && git commit -m "feat: /casos-de-exito with tag filter + detail page"
```

---

## Task 10: Nosotros + Blog placeholder

**Files:**
- Create: `src/app/nosotros/page.tsx`
- Create: `src/app/blog/page.tsx`

- [ ] **Step 1: Nosotros**

```tsx
// src/app/nosotros/page.tsx
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Nosotros — dinkbit",
  description: "Quiénes somos. Agencia digital con sede en España.",
};

export default function NosotrosPage() {
  return (
    <article>
      <header className="bg-slate-50 py-24">
        <Container>
          <p className="text-sm font-medium text-[--color-accent]">Nosotros</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Una agencia digital, hecha para construir.
          </h1>
        </Container>
      </header>
      <Container className="prose prose-slate max-w-3xl py-16">
        <p>Texto provisional. A redactar con los textos reales del cliente.</p>
        <h2>Cómo trabajamos</h2>
        <p>Texto provisional.</p>
        <h2>Equipo</h2>
        <p>Texto provisional.</p>
      </Container>
    </article>
  );
}
```

- [ ] **Step 2: Blog placeholder**

```tsx
// src/app/blog/page.tsx
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Blog — dinkbit",
  description: "El blog de dinkbit. Próximamente.",
  robots: { index: false }, // no indexar mientras está vacío
};

export default function BlogPage() {
  return (
    <Container className="py-32 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Próximamente</h1>
      <p className="mt-4 text-slate-600">Estamos preparando el blog. Vuelve pronto.</p>
    </Container>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: /nosotros + /blog placeholder"
```

---

## Task 11: Contact form — Server Action with Zod + Resend (TDD on validation)

**Files:**
- Create: `src/lib/validation.ts`
- Create: `src/lib/__tests__/validation.test.ts`
- Create: `src/lib/contact-action.ts`
- Create: `src/components/contacto/ContactForm.tsx`
- Create: `src/app/contacto/page.tsx`
- Modify: `.env.example`, create `.env.local`

- [ ] **Step 1: Install Resend**

```bash
npm i resend
```

- [ ] **Step 2: Define env vars**

`.env.example`:
```
RESEND_API_KEY=
CONTACT_EMAIL_TO=hola@dinkbit.es
CONTACT_EMAIL_FROM="dinkbit <onboarding@resend.dev>"
```

User must populate `.env.local` (instructions in step 13).

- [ ] **Step 3: Write the failing validation test**

```typescript
// src/lib/__tests__/validation.test.ts
import { describe, it, expect } from "vitest";
import { contactSchema } from "@/lib/validation";

describe("contactSchema", () => {
  it("accepts valid input", () => {
    const ok = contactSchema.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      company: "Acme",
      message: "Hola, quiero más info.",
      website: "",            // honeypot
      formLoadedAt: Date.now() - 5000,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = contactSchema.safeParse({
      name: "", email: "a@b.com", message: "hola hola hola hola", website: "", formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = contactSchema.safeParse({
      name: "x", email: "not-an-email", message: "hola hola hola hola", website: "", formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects too-short message", () => {
    const r = contactSchema.safeParse({
      name: "x", email: "a@b.com", message: "hi", website: "", formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects when honeypot is filled", () => {
    const r = contactSchema.safeParse({
      name: "x", email: "a@b.com", message: "hola hola hola hola", website: "spammer", formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects submissions faster than 2s", () => {
    const r = contactSchema.safeParse({
      name: "x", email: "a@b.com", message: "hola hola hola hola", website: "", formLoadedAt: Date.now() - 500,
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run — expect failure**

```bash
npm test
```

- [ ] **Step 5: Implement validation**

```typescript
// src/lib/validation.ts
import { z } from "zod";

export const contactSchema = z
  .object({
    name: z.string().min(2, "Demasiado corto"),
    email: z.string().email("Email inválido"),
    company: z.string().optional().default(""),
    message: z.string().min(10, "Mensaje demasiado corto"),
    website: z.string().max(0, "Honeypot field must be empty"),  // honeypot
    formLoadedAt: z.number(),
  })
  .refine((d) => Date.now() - d.formLoadedAt > 2000, {
    message: "Submission too fast",
    path: ["formLoadedAt"],
  });

export type ContactInput = z.infer<typeof contactSchema>;
```

```bash
npm i zod
```

- [ ] **Step 6: Run — expect pass**

```bash
npm test
```

- [ ] **Step 7: Commit validation**

```bash
git add -A && git commit -m "feat(contact): zod validation with honeypot + time check (TDD)"
```

- [ ] **Step 8: Implement Server Action**

```typescript
// src/lib/contact-action.ts
"use server";

import { Resend } from "resend";
import { contactSchema } from "./validation";

export interface ContactActionResult {
  ok: boolean;
  error?: string;
}

export async function sendContactEmail(formData: FormData): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisa los campos." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const resend = new Resend(apiKey);
  const { name, email, company, message } = parsed.data;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Nuevo contacto desde dinkbit.es — ${name}`,
    text: [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Empresa: ${company || "-"}`,
      "",
      "Mensaje:",
      message,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar el mensaje. Inténtalo más tarde." };
  }
  return { ok: true };
}
```

- [ ] **Step 9: Form component**

```tsx
// src/components/contacto/ContactForm.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendContactEmail } from "@/lib/contact-action";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loadedAt = useRef(Date.now());

  // refresh timestamp when form mounts on client
  useEffect(() => {
    loadedAt.current = Date.now();
  }, []);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("formLoadedAt", String(loadedAt.current));
        startTransition(async () => {
          const r = await sendContactEmail(fd);
          setResult(r);
          if (r.ok) formRef.current?.reset();
        });
      }}
      className="space-y-4"
    >
      <Field name="name" label="Nombre" required />
      <Field name="email" label="Email" type="email" required />
      <Field name="company" label="Empresa (opcional)" />
      <Field name="message" label="Mensaje" textarea required />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Enviando…" : "Enviar"}
      </Button>
      {result && (
        <p className={result.ok ? "text-emerald-700" : "text-red-700"}>
          {result.ok ? "¡Enviado! Te respondemos en menos de 24h." : result.error}
        </p>
      )}
    </form>
  );
}

function Field({
  name, label, type = "text", required, textarea,
}: { name: string; label: string; type?: string; required?: boolean; textarea?: boolean }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-900">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <Tag
        name={name}
        type={textarea ? undefined : type}
        required={required}
        rows={textarea ? 5 : undefined}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
      />
    </label>
  );
}
```

- [ ] **Step 10: Contacto page**

```tsx
// src/app/contacto/page.tsx
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/contacto/ContactForm";

export const metadata = {
  title: "Contacto — dinkbit",
  description: "Cuéntanos tu proyecto. Te respondemos en menos de 24 horas.",
};

export default function ContactoPage() {
  return (
    <Container className="py-24" size="narrow">
      <h1 className="text-4xl font-bold tracking-tight">Hablemos</h1>
      <p className="mt-4 text-slate-600">Te respondemos en menos de 24 horas.</p>
      <div className="mt-10">
        <ContactForm />
      </div>
    </Container>
  );
}
```

- [ ] **Step 11: Verify locally**

Add `RESEND_API_KEY` and `CONTACT_EMAIL_TO` to `.env.local` (test key from resend.com).

```bash
npm run dev
# manual: visit /contacto, submit form, check inbox
```

- [ ] **Step 12: Typecheck + commit**

```bash
npm run typecheck
git add -A && git commit -m "feat(contact): server action + Resend integration + form"
```

---

## Task 12: SEO — sitemap + robots + per-page metadata audit

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`

- [ ] **Step 1: sitemap**

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getAllServices, getAllCaseStudies } from "@/lib/content";

const SITE = "https://dinkbit.es";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/nosotros", "/servicios", "/casos-de-exito", "/contacto"].map(
    (path) => ({ url: `${SITE}${path}`, lastModified: new Date() }),
  );
  const services = getAllServices().map((s) => ({
    url: `${SITE}/servicios/${s.slug}`,
    lastModified: new Date(),
  }));
  const cases = getAllCaseStudies().map((c) => ({
    url: `${SITE}/casos-de-exito/${c.slug}`,
    lastModified: new Date(c.publishedAt),
  }));
  return [...staticRoutes, ...services, ...cases];
}
```

- [ ] **Step 2: robots**

```typescript
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/blog"] }],
    sitemap: "https://dinkbit.es/sitemap.xml",
  };
}
```

- [ ] **Step 3: Verify**

```bash
npm run dev
# visit /sitemap.xml and /robots.txt
git add -A && git commit -m "feat(seo): sitemap + robots"
```

---

## Task 13: Deploy to Vercel

**Files:** none (Vercel UI + DNS)

This task requires user action.

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin git@github.com:<user>/dkb-web.git
git push -u origin staging
git checkout -b main && git push -u origin main && git checkout staging
```

(Repo creation in GitHub UI first.)

- [ ] **Step 2: Import in Vercel**

1. New Project → Import dkb-web repo
2. Framework: Next.js (auto-detected)
3. Production branch: `main`
4. Environment Variables:
   - `RESEND_API_KEY` = (real Resend prod key)
   - `CONTACT_EMAIL_TO` = `hola@dinkbit.es` (or final destination)
   - `CONTACT_EMAIL_FROM` = `dinkbit <hola@dinkbit.es>` (after DNS verification in Resend) or `onboarding@resend.dev` (test fallback)
5. Deploy.

- [ ] **Step 3: Configure custom domain**

1. In Vercel project → Settings → Domains, add `dinkbit.es` and `www.dinkbit.es`.
2. Vercel will give DNS records (typically `A 76.76.21.21` for apex + `CNAME cname.vercel-dns.com` for www). Add them at the registrar of `dinkbit.es`.
3. Wait for DNS propagation + automatic SSL.

- [ ] **Step 4: Verify Resend domain**

1. In Resend dashboard, add `dinkbit.es` as a sending domain.
2. Add DNS records (SPF, DKIM, DMARC) at the registrar.
3. Wait for Resend to verify, then update `CONTACT_EMAIL_FROM` to `hola@dinkbit.es` in Vercel env.
4. Redeploy.

- [ ] **Step 5: Smoke test in production**

Visit `https://dinkbit.es` — check all routes, submit contact form, verify email arrives.

---

## Self-review checklist

After completing all tasks:

- [ ] All routes from MASTERPLAN section 3 are reachable.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] Lighthouse on `/` (mobile + desktop) ≥ 95 in Performance, Accessibility, SEO.
- [ ] Contact form actually delivers an email in production.
- [ ] sitemap.xml and robots.txt accessible.
- [ ] All 7 services have an MDX file with the agreed slug.
- [ ] Phase 2 (Payload CMS) and missing assets (real logo, real texts, real cases) are tracked outside this plan.

---

## Open inputs from the user (resolve at start of execution session)

These are the same as MASTERPLAN section 10. The execution session should ask for them in the first interaction:

1. **Brand tokens** — exact hex values for primary/accent or "use the placeholders for now and we'll iterate"
2. **Logo SVG** (or text-only logo for v1)
3. **Real fonts** if not Inter/Geist
4. **Email destination** for the contact form (default `hola@dinkbit.es`)
5. **GitHub repo name + owner** for the deploy step
6. **Real texts** for Home, Nosotros, the 7 services, and any case studies ready to publish
