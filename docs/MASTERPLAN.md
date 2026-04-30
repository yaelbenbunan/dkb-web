# dkb-web — Plan maestro

**Fecha:** 2026-04-30
**Dominio destino:** `dinkbit.es`
**Repositorio:** `dkb-web` (a crear)

## 1. Qué es

Web corporativa de la sucursal española de **dinkbit**. Independiente de `dinkbit.com` (sede México) tanto en contenido como en léxico (es-ES) y diseño.

Función doble:
1. **Carta de presentación** online de la agencia.
2. **Captación de leads** vía formulario de contacto + tráfico orgánico y de campañas pagadas.

## 2. Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC por defecto = ~0 JS shipped en páginas de contenido |
| UI | React 19 + TypeScript strict | Mismo stack que dashboard SignalIQ |
| Estilos | Tailwind CSS v4 (`@theme`, sin `tailwind.config.ts`) | Control píxel a píxel sin builders |
| Contenido | `@next/mdx` para servicios y casos de éxito | Frontmatter + cuerpo MDX, sin CMS en v1 |
| Email | Resend (form de contacto) | Ya configurado en dashboard, mismo provider |
| Deploy | Vercel (preview en `staging`, prod en `main`) | Mismo flujo que dashboard |
| **Fase 2** | Payload CMS sobre el mismo repo | Admin para blog + casos de éxito sin re-plataforma |

## 3. Site map (v1)

```
/                              → Home
/nosotros                      → About — quiénes somos
/servicios                     → Index de servicios (grid de 7 cards)
/servicios/desarrollo-web
/servicios/ecommerce
/servicios/diseno-grafico
/servicios/social-paid-media
/servicios/sem
/servicios/seo
/servicios/email-mkt
/casos-de-exito                → Index filtrable por tags de servicio
/casos-de-exito/[slug]         → Detalle de caso
/blog                          → Placeholder "próximamente" (sin nav en v1)
/contacto                      → Formulario de contacto
```

## 4. Modelo de contenido

### Servicios
Un `.mdx` por servicio en `content/servicios/<slug>.mdx`:

```yaml
---
title: "Desarrollo web"
slug: "desarrollo-web"
shortDescription: "Webs y plataformas a medida con stack moderno..."
heroImage: "/img/servicios/desarrollo-web.jpg"
order: 1
---
```

Cuerpo del MDX = secciones libres (intro, qué incluye, proceso, FAQs, CTA).

### Casos de éxito
Un `.mdx` por caso en `content/casos-de-exito/<slug>.mdx`:

```yaml
---
title: "Multiplicamos x5 las leads de Adeslas"
slug: "adeslas-leads"
client: "Adeslas"
tags: ["sem", "seo", "social-paid-media"]   # slugs de servicios
heroImage: "/img/casos/adeslas.jpg"
metricHeadline: "500% leads"
publishedAt: "2026-04-01"
---
```

`tags` son los slugs de las páginas de servicio. La página índice `/casos-de-exito` los lee en build y construye los tabs de filtrado dinámicamente — un caso aparece en cada uno de sus tags.

### Blog (v1)
Ruta `/blog` con copy "próximamente". No aparece en nav principal hasta fase 2.

## 5. Lead capture

Form de contacto en `/contacto`:
- **Server Action** de Next.js (no API route) → llamada a Resend
- Validación en server con **Zod**
- **Honeypot** anti-spam + check de tiempo mínimo entre carga y submit (anti-bot básico). Si aparece spam real en producción, añadimos Cloudflare Turnstile o rate limit con Upstash Redis.
- Email destino: configurable vía env var `CONTACT_EMAIL_TO` (default a definir, sugerencia `hola@dinkbit.es`)
- Sin persistencia en DB para v1 — los leads llegan por email
- **Fase 2:** opción de duplicar copia en Supabase si entra CRM

## 6. Decisiones arquitectónicas

1. **RSC por defecto** — `"use client"` solo en componentes interactivos: filtros de casos de éxito, form de contacto, mobile menu.
2. **MDX en repo, no CMS en v1** — texto fijo gestionado por dev. La transición a Payload (fase 2) reescribe el data layer pero **no** los componentes de presentación.
3. **Imágenes** — `next/image` con archivos en `/public/img/<seccion>/<slug>.{jpg,webp}`. AVIF/WebP autogenerados por Next.
4. **SEO** — metadata API de App Router en cada `page.tsx`, `sitemap.xml` y `robots.txt` autogenerados con la API de Next 16.
5. **Idioma** — es-ES único. Si más adelante hace falta i18n, App Router lo soporta sin reescritura.
6. **Performance objetivo** — Lighthouse 95+ en mobile y desktop. CLS < 0.05. LCP < 2s.

## 7. Branding (a definir en la primera sesión de implementación)

Aterrizar antes de empezar a maquetar:
- Paleta: primary, neutrals (3-4 grises), accent
- Tipografía: heading + body (idealmente vía `next/font` con Google Fonts o Vercel hosting)
- Tono visual: corporativo serio / joven moderno / técnico minimalista — *a decidir según los textos que ya tenéis*
- Logo: archivo SVG (a aportar)

## 8. Plan de fases

### Fase 1 — v1 launchable (objetivo: lo antes posible)

1. Setup proyecto: `npx create-next-app@latest dkb-web --ts --tailwind --app --src-dir --import-alias "@/*"`
2. Tailwind v4 con `@theme` + tokens de marca
3. Layout global (Header con nav, Footer)
4. Home (hero + bloques principales: servicios destacados, casos de éxito destacados, CTA contacto)
5. `/servicios` index + 7 detalles (template único parametrizado por MDX)
6. `/casos-de-exito` index con filtro por tags + template de detalle
7. `/nosotros`
8. `/contacto` con Server Action funcional
9. Placeholder `/blog`
10. Deploy a Vercel + apuntar dinkbit.es cuando esté validado

### Fase 2 — admin para el equipo (1-2 semanas tras lanzar v1)

1. Instalar Payload CMS en `app/(admin)/admin`
2. Crear collections: `Posts` (blog), `CaseStudies`
3. Migrar casos de éxito de MDX a Payload (script one-shot)
4. Activar blog con editor markdown de Payload
5. Mantener servicios como MDX (cambian poco, edición por dev es OK)

## 9. Convenciones (idénticas a dashboard-dkb)

- **Branches:** `feat/`, `fix/`, `chore/`
- **Git workflow:** `staging` (dev) → PR → `main` (prod)
- **Code style:** ES modules, sin `any`, imports con `@/`
- **File naming:** `PascalCase` componentes, `camelCase` utilities
- **Comments:** mínimos, solo el "por qué" no obvio
- **Memorias del proyecto:** este `MASTERPLAN.md` se mantiene actualizado a medida que cambien decisiones

## 10. Inputs pendientes del cliente (para la primera sesión de implementación)

- [ ] Logo en SVG
- [ ] Email destino del form de contacto
- [ ] Textos finales (Home, Nosotros, 7 servicios, casos de éxito iniciales)
- [ ] Imágenes de servicios y casos
- [ ] Decisión de paleta y tipografías (o referencias visuales para que las propongamos)

---

**Próximo paso:** plan de implementación detallado (`writing-plans`) con tasks ordenadas, criterios de aceptación y dependencias.
