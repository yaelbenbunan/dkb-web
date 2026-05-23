# Imagina tu web — landing oculta con preview del home

## Objetivo

Crear una landing oculta (no enlazada desde menú ni footer) que permita a un usuario rellenar un cuestionario corto y recibir al momento un preview del home de su web/ecommerce. El objetivo principal es capturar leads: cada submission envía un mail al equipo comercial con todos los datos, y si el usuario además vota el preview con pulgar arriba/abajo, llega un segundo mail con el rating.

No se trata de generar una web real ni de impresionar técnicamente: es una herramienta comercial para arrancar conversaciones.

## Ruta y visibilidad

- Ruta: `/imagina-tu-web` (`src/app/imagina-tu-web/page.tsx`)
- `metadata.robots = { index: false, follow: false }` — no indexar
- **No** añadirla a `src/app/sitemap.ts` (que lista rutas a mano) — queda excluida
- **No** añadirla a `src/lib/nav.ts` (header) ni al footer — invisible desde la navegación
- Link compartible vía WhatsApp/anuncios; sin el link, no se descubre

## Stack y patrones existentes a reusar

- Next.js 16 App Router + React 19
- Server actions con Resend ya configurado (`RESEND_API_KEY`, `CONTACT_EMAIL_TO`, `CONTACT_EMAIL_FROM`)
- Validación con Zod, honeypot field `website` y `formLoadedAt` con check de 2s mínimo — patrón ya establecido en `src/lib/lead-action.ts`, `src/lib/call-request-action.ts`, `src/lib/validation.ts`
- GTM tracking via `track()` de `src/lib/gtm.ts`
- Tema dark/light vía `data-theme` y CSS variables (`globals.css`)

## Flujo del cuestionario (6 pasos)

Wizard cliente con barra de progreso ("Paso N de 6"), botones Atrás/Siguiente, validación al avanzar. Estado en `useState` — si se refresca, se reinicia.

| # | Paso | Inputs |
|---|---|---|
| 1 | Tipo de web | Cards radio: **Informativa** / **Ecommerce**. Si Ecommerce → sub-toggle **Productos** / **Servicios** |
| 2 | Identidad | Nombre del negocio (text) + Sector (select: Salud, Educación, Restauración, Moda, Tecnología, Servicios profesionales, Otro) |
| 3 | Oferta | 3–5 chips editables ("Asesoría fiscal", "Declaración de renta", …). Mínimo 1, máximo 6 |
| 4 | Paleta | 4 cards visuales con preview de franjas de color |
| 5 | Tipografía | 4 cards, cada una rendea "Tu marca" con esa fuente |
| 6 | Toque personal + datos | Textarea "¿Por qué eres bueno?" (≥20 chars) + Nombre + Email + Teléfono + checkbox de privacidad. Honeypot `website` + `formLoadedAt` |

Al enviar el paso 6 con éxito, el wizard desaparece y se renderiza el preview.

## Paletas (4)

Definidas en `src/lib/preview-themes.ts`:

| Slug | Nombre | bg | surface | text | accent | gradient hero |
|---|---|---|---|---|---|---|
| `pastel-suave` | Pastel suave | `#fef7f4` | `#ffffff` | `#2a2438` | `#c084fc` | rosa → lila |
| `oscuro-moderno` | Oscuro moderno | `#0a0a0f` | `#16161f` | `#f5f5f7` | `#22d3ee` | grafito → cyan |
| `azul-corporativo` | Azul corporativo | `#f4f7fc` | `#ffffff` | `#0c1c40` | `#187bef` | azul → celeste |
| `tierra-natural` | Tierra natural | `#faf6f0` | `#ffffff` | `#2d2419` | `#a16207` | beige → ocre |

Las paletas se aplican al preview mediante CSS variables locales en un wrapper — no tocan el tema global de dinkbit.es.

## Tipografías (4)

Cargadas con `next/font/google` en el layout de la landing (o en el `page.tsx`) y expuestas como CSS variables:

- `moderna-sans` → Inter
- `geometrica` → Space Grotesk
- `elegante-serif` → Playfair Display (display) + Source Sans (body)
- `friendly` → Fraunces

`WebPreview` consume `--prev-font-display` y `--prev-font-body`.

## Iconos por sector

Mapa en `preview-themes.ts`:

```
salud: '🩺', educacion: '🎓', restauracion: '🍽️',
moda: '👗', tecnologia: '💻', servicios: '💼', otro: '✨'
```

Mismo icono para todas las tarjetas del grid (no se intenta inferir por palabra clave — fuera de alcance).

## Componente del preview

`src/app/imagina-tu-web/_components/WebPreview.tsx`:

- Wrapper con CSS variables locales (paleta + tipografía) y borde redondeado tipo "ventana de navegador"
- Estructura del home:
  1. **Hero** — gradiente de la paleta, nombre del negocio como h1, valor agregado como subtítulo, CTA mock "Contáctanos"
  2. **Grid 3 cols** de la oferta — cada tarjeta con gradiente suave + icono del sector + título del producto/servicio. Si es **ecommerce → productos**, añade precio mock ("desde 19€")
  3. **Banda CTA** — "¿Hablamos?" + botón
  4. **Footer mock** — nombre del negocio + año + 3 links fake
- **Disclaimer** fijo arriba del preview:
  > "Esta es una vista rápida generada con tus respuestas. Tu web real sería 100% personalizada: imágenes, textos propios, animaciones, más secciones y muchísimo más detalle."

## Rating + segunda captura

`src/app/imagina-tu-web/_components/RatingBar.tsx`, sticky al final del preview:

- Texto: "¿Qué te parece?"
- Botones 👍 / 👎
- Al votar → fade-in de textarea opcional "¿Algo que cambiarías?" + botón **Enviar feedback**
- Al enviar → toast "¡Gracias por tu feedback!" + CTA prominente **"Quiero mi web de verdad"** que va a `/contacto?servicio=desarrollo-web`

El rating es opcional. Si el usuario no vota, el lead ya está capturado por el mail #1.

## Server actions y emails

Dos server actions nuevas en `src/lib/`:

### `preview-lead-action.ts` (mail #1)

- Recibe `FormData` con todas las respuestas de los 6 pasos + datos de contacto
- Valida con Zod (schema en `preview-validation.ts`): honeypot vacío, `Date.now() - formLoadedAt > 2000`, todos los campos requeridos
- Genera `leadId` corto: `${timestamp.toString(36)}-${randomBase36(4)}` (ej. `m7k2-a9f3`)
- Envía mail a `CONTACT_EMAIL_TO` con `replyTo: email`:
  ```
  Asunto: Preview Web — {Nombre} ({Tipo}) [#m7k2-a9f3]
  Cuerpo:
    ID lead: m7k2-a9f3
    --- Contacto ---
    Nombre, Email, Teléfono
    --- Respuestas ---
    Tipo de web, Negocio + sector, Oferta, Paleta, Tipografía, Toque personal
  ```
- Devuelve `{ ok: true, leadId }` para que el cliente lo guarde y lo pase al rating

### `preview-rating-action.ts` (mail #2)

- Recibe `FormData` con `leadId` + `rating` ("up"|"down") + `comment` opcional + todas las respuestas del lead (el cliente las tiene en memoria, se mandan de nuevo para no necesitar storage)
- Valida con Zod
- Envía mail a `CONTACT_EMAIL_TO`:
  ```
  Asunto: Rating Preview — 👍 — {Nombre} [#m7k2-a9f3]
  Cuerpo:
    Rating: 👍 / 👎
    Comentario: «...»
    --- Datos del lead (repetidos) ---
    [igual que mail #1]
  ```

### Por qué reenvíar datos en lugar de almacenarlos

No queremos meter base de datos para esto. Los datos viven solo en la memoria del navegador entre submit y rating. Si el usuario cierra la pestaña, perdemos el rating pero ya tenemos el lead. Trade-off aceptable.

## Analytics (GTM)

Eventos disparados con `track()`:

- `preview_wizard_start` — al cargar la landing
- `preview_step_advance` — `{ step: number }`
- `preview_lead_submit` — `{ leadId, businessType }`
- `preview_rating` — `{ leadId, rating: 'up' | 'down' }`
- `preview_cta_click` — al pulsar "Quiero mi web de verdad"

## Estructura de archivos final

```
src/app/imagina-tu-web/
├── page.tsx                     # landing wrapper + metadata noindex
└── _components/
    ├── PreviewWizard.tsx        # state machine de 6 pasos
    ├── steps/
    │   ├── StepBusinessType.tsx
    │   ├── StepIdentity.tsx
    │   ├── StepOfferings.tsx
    │   ├── StepPalette.tsx
    │   ├── StepTypography.tsx
    │   └── StepFinal.tsx        # textarea + datos contacto + honeypot
    ├── WebPreview.tsx           # render del home mock
    └── RatingBar.tsx            # 👍/👎 + comentario + CTA

src/lib/
├── preview-lead-action.ts       # server action mail #1
├── preview-rating-action.ts     # server action mail #2
├── preview-themes.ts            # paletas + tipografías + iconos
└── preview-validation.ts        # schemas Zod compartidos
```

## Decisiones explícitas (qué dejamos fuera)

- **Sin IA**: el copy del hero viene tal cual del usuario (campo "valor agregado"). Si más adelante se quiere enriquecer con LLM es un cambio puntual en `WebPreview.tsx`
- **Sin base de datos**: los datos viajan por server action y solo se envían por email
- **Sin upload de imágenes**: gradientes + emojis como iconos
- **Sin persistencia entre sesiones**: si el usuario refresca durante el wizard, vuelve a empezar
- **Una sola plantilla de home**: la misma estructura se adapta al tipo de web mediante condicionales menores (precio mock solo en ecommerce-productos)
- **Inferencia de iconos por palabra clave**: fuera de alcance, usamos el icono del sector

## Riesgos y mitigaciones

- **Spam de submissions falsas** → honeypot + `formLoadedAt` ≥ 2s, igual que el resto de formularios
- **Rating sin lead previo** (request manipulada): el server action valida `leadId` presente; si falta, rechaza
- **Usuario abandona en el preview**: ya tenemos el lead del mail #1, no pasa nada
- **Tema dark/light del site contaminando el preview**: el `WebPreview` aplica sus propias CSS vars en un wrapper local que sobreescribe las globales
