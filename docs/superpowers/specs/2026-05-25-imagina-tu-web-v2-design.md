# Imagina tu web v2 — landing oculta con preview generado por IA

## Cambio respecto a v1

Esta es una **reescritura completa** del componente de preview. La v1
(spec `2026-05-23-imagina-tu-web-design.md`, implementada en `staging` y
luego retirada de `main`) usaba plantilla pura sin IA con texto del
usuario tal cual y gradientes/iconos como imágenes. El resultado no
generaba suficiente "wow" para convertir.

Esta v2 introduce:
1. **Pulido de copy con IA** (OpenAI gpt-4o-mini) que reescribe el hero,
   genera tagline y mejora descripciones de productos/servicios.
2. **Imagen de hero generada con IA** (OpenAI gpt-image-1).
3. **Dos plantillas adaptativas** según el tipo de negocio:
   - `informativa-editorial` para webs informativas
   - `ecommerce-grid` para ecommerce (productos o servicios online)
4. **Pantalla de loading** intermedia mientras la IA genera (10-15s).

El wizard (6 pasos) y los dos server actions de email
(`sendPreviewLead`, `sendPreviewRating`) se mantienen tal cual estaban.

## Objetivo

El preview debe ser **lo suficientemente atractivo como para que el
visitante quiera contratar a dinkbit**. Es una herramienta de conversión,
no un demo técnico. Cada submission captura un lead vía mail; el rating
es opcional pero ayuda a entender qué funciona.

## Ruta y visibilidad

Sin cambios respecto a v1:
- Ruta: `/imagina-tu-web` (`src/app/imagina-tu-web/page.tsx`)
- `metadata.robots = { index: false, follow: false }`
- No en `src/app/sitemap.ts`
- No en `src/lib/nav.ts` ni footer

## Stack añadido

Sobre el stack de v1 (Next 16, React 19, Tailwind v4, Zod, Resend),
añadimos:

- **`openai` SDK** (npm package oficial) — texto e imagen con la misma key
- **`next/font/google`** ya estaba (no cambia)

Env vars nuevas:
- `OPENAI_API_KEY` — única clave necesaria

## Wizard (sin cambios)

| # | Paso | Inputs |
|---|---|---|
| 1 | Tipo de web | Cards: **Informativa** / **Ecommerce**. Si ecommerce → sub-toggle **Productos** / **Servicios** |
| 2 | Identidad | Nombre del negocio + Sector (select) |
| 3 | Oferta | 3-5 chips editables |
| 4 | Paleta | 4 cards visuales |
| 5 | Tipografía | 4 cards visuales |
| 6 | Toque personal + datos | Textarea + Nombre/Email/Teléfono + privacidad + honeypot |

Mismo flujo de validación, mismo estado, mismas paletas y tipografías
del catálogo `preview-themes.ts`.

## Flujo nuevo tras el paso 6

```
[Usuario pulsa "Ver mi preview"]
        │
        ▼
[sendPreviewLead] → mail #1 sale (lead capturado al instante)
        │
        ├── error? → mostrar error, fin
        │
        ▼ ok, recibimos leadId
        │
[Mostrar <PreviewLoading />] con mensajes rotando
        │
        ▼ (en paralelo)
[Promise.allSettled([
   generateCopy(state),     // OpenAI text  ~2-4s
   generateHeroImage(state) // OpenAI image ~8-15s
])]
        │
        ▼
[Cuando ambas terminan o fallan]
        │
        ▼
[Fade-in <WebPreview /> con la plantilla correcta + datos finales]
        │
        ▼
[RatingBar visible debajo]
```

**Reglas clave:**
- El lead se envía **antes** de llamar a la IA. Si la IA cae, ya tenemos
  el lead.
- Si IA de texto falla, usamos el texto del usuario tal cual.
- Si IA de imagen falla, usamos un gradiente bonito de la paleta.
- Nunca dejamos al usuario en pantalla de error después de haber dado
  sus datos.

## Dos plantillas

### `InformativaTemplate`

- **Hero:** layout split 50/50 en desktop, stack en móvil
  - Izquierda: H1 oversized (clamp 40-80px) en tipografía display + tagline
    + CTA mock "Contáctanos"
  - Derecha: imagen IA en formato vertical/portrait con esquinas
    redondeadas y sombra
- **Sección "Lo que hacemos":** lista numerada elegante (no grid)
  - `01 — Servicio uno` con descripción breve (AI-polished)
  - `02 — Servicio dos` ...
  - Separadores delgados entre items
- **Banda CTA:** centro, "¿Hablamos?" + botón
- **Footer mini:** nombre + año + links fake

### `EcommerceTemplate`

- **Hero:** compacto, full-width
  - Imagen IA como banner detrás con overlay de la paleta
  - H1 sobre la imagen + tagline + CTA "Ver productos"
- **Sección "Nuestros productos" / "Nuestros servicios":**
  - Grid 2-col en tablet, 3-col en desktop
  - Cards grandes (aspect-ratio 4/5) con:
    - Imagen: SVG ilustración estilizada por sector (NO imagen IA por
      tarjeta)
    - Nombre del producto
    - Descripción breve (AI-polished)
    - Precio mock "desde 19€" (solo si es productos, no servicios)
- **Banda "Por qué nosotros":** value-prop del usuario polido por IA
- **Banda CTA:** "¿Hablamos?" + botón
- **Footer mini**

### Compartido

Ambas plantillas:
- Reciben las CSS variables de paleta como inline styles en el wrapper
- Aplican la tipografía display/body via `var(--font-prev-*)` cargada
  en `page.tsx`
- Bordeadas con un "browser chrome" arriba (3 puntos rojo/amarillo/verde
  + dominio mock `negocio.es`)
- Disclaimer fijo encima del preview con el mismo texto de v1:
  > "Esta es una vista rápida generada con tus respuestas. Tu web real
  > sería 100% personalizada: imágenes propias, copy adaptado a tu
  > marca, animaciones, más secciones y muchísimo más detalle."

## Llamadas a OpenAI

### Texto — `gpt-4o-mini`

**Función:** `generateCopy(state) → CopyResponse`

**Prompt aproximado:**
```
Eres copywriter web especializado en convertir. El usuario rellenó un
formulario para generar un preview de su web. Genera copy NATURAL Y
CONFIABLE en español de España para su home a partir de:

- Negocio: {businessName}
- Sector: {sectorLabel}
- Tipo: {businessType}{ecommerceKind ? ' - ' + ecommerceKind : ''}
- Oferta: {offerings.join(', ')}
- Valor agregado del usuario: "{valueProp}"

Reglas:
- NO inventes datos numéricos, certificaciones, años de experiencia,
  premios, ni clientes específicos.
- Usa el "valor agregado" del usuario como insumo pero reescríbelo
  mejor.
- Tono: profesional cercano, sin marketing-speak ("revolucionario",
  "líder", "best in class" prohibidos).
- Español de España (vosotros si toca, "ordenador" no "computadora").
```

**Response schema (Zod):**
```ts
{
  heroHeadline: string (10-70 chars),
  heroTagline: string (40-180 chars),
  ctaText: string (1-4 palabras),
  sectionTitle: string (2-6 palabras),
  offerings: Array<{ name: string, blurb: string (40-120 chars) }>
}
```

Usar `openai.chat.completions.parse` con `response_format: zodResponseFormat(schema, "copy")` (structured outputs nativos de OpenAI v5+ SDK con Zod adapter).

Coste estimado: ~$0.0001 por lead. Latencia: 2-4s.

### Imagen — `gpt-image-1`

**Función:** `generateHeroImage(state) → string | null` (URL temporal o
data URL)

**Prompt aproximado:**
```
Professional hero image for a {sectorLabel} business website.
Style: clean modern editorial photography, soft natural lighting,
muted but {palette.mood} color palette aligned with hex {palette.accent}.
Composition: {composition based on template}.
Subject: {sector-specific subject hints}.
Constraints: NO people faces visible, NO text in image, NO logos,
NO watermarks, NO UI elements.
{template === 'informativa' ? 'Portrait orientation, subject centered.'
                            : 'Landscape orientation 16:9, subject right-of-center for left text overlay.'}
```

Modelo: `gpt-image-1`
Tamaño: `1024x1536` para informativa (portrait), `1536x1024` para ecommerce (landscape)
Calidad: `medium` (más rápido y barato que `high`, suficiente para preview)

**Storage de la imagen:** OpenAI devuelve la imagen como **base64** en
la response. La devolvemos al cliente como `data:image/png;base64,...`
URL. Sin Vercel Blob, sin nada externo. La imagen vive solo en la
sesión del cliente (perfecto para un preview efímero).

Coste estimado: ~$0.04 por lead. Latencia: 8-15s.

## Server action `preview-generate-action.ts` (nueva)

Una sola server action que orquesta ambas llamadas IA en paralelo y
devuelve `{ copy, heroImageDataUrl }`.

```ts
"use server";

export interface PreviewGenerateResult {
  copy: CopyResponse | null;        // null si IA texto falló
  heroImageDataUrl: string | null;  // null si IA imagen falló
  error?: string;                    // solo si TODO falló
}

export async function generatePreview(
  input: PreviewGenerateInput  // mismos campos que validar lead, sin honeypot
): Promise<PreviewGenerateResult>
```

- Valida input con Zod
- `Promise.allSettled([generateCopy, generateHeroImage])`
- Loggea cualquier rejection pero no aborta
- Devuelve lo que haya conseguido
- Si OpenAI key no está configurada, devuelve ambos null + error
  (el cliente cae al fallback)

## Pantalla de loading — `PreviewLoading.tsx` (nueva)

Componente cliente. Visible mientras `generatePreview` está pendiente.

- Centro de pantalla, fondo translúcido del wizard
- Animación: spinner o dots
- Mensaje principal: "Creando tu preview…"
- Mensaje secundario: rota cada 2.5s entre 5 mensajes:
  1. "Eligiendo la paleta perfecta…"
  2. "Maquetando el hero…"
  3. "Generando la imagen…"
  4. "Puliendo los textos…"
  5. "Casi listo, prometido…"
- Sin barra de progreso (no sabemos cuánto falta)
- Total visible ~10-15s

## Cambios en `WebPreview.tsx`

- Recibe ahora `data: WebPreviewData & { generatedCopy: CopyResponse | null, heroImageDataUrl: string | null }`
- Mira `data.businessType` y renderiza `<InformativaTemplate />` o
  `<EcommerceTemplate />`
- Si `generatedCopy` viene, usa sus campos; si es null, fallback al
  texto del usuario
- Si `heroImageDataUrl` viene, lo usa como `<img>`; si es null, fallback
  a gradiente de la paleta

## Cambios en `PreviewWizard.tsx`

- Después de `sendPreviewLead` exitoso, en lugar de pasar directo al
  preview, entra en estado `generating`
- Mientras `generating`, muestra `<PreviewLoading />`
- Llama `generatePreview(state)` en paralelo
- Cuando termina, monta `<WebPreview />` con los datos AI + state

## SVG ilustraciones por sector

Para las tarjetas del grid de ecommerce, NO se usa imagen IA (decisión
explícita por coste/latencia). Se usan SVG ilustraciones estilizadas
en color de la paleta elegida. Crearemos un componente
`SectorIllustration.tsx` con 7 variantes (una por sector) que recibe
`palette` y colorea el SVG.

Las ilustraciones son geométricas y abstractas (no scenes complejas):
- `salud`: cruz médica abstracta
- `educacion`: birrete o libros estilizados
- `restauracion`: utensilios o copa
- `moda`: percha o silueta abstracta
- `tecnologia`: nodos conectados
- `servicios`: maletín o diagrama
- `otro`: forma geométrica neutra

Estilo: flat, mono-color con la paleta accent, sobre fondo del gradient
de la paleta. Se generan a mano (no IA) para garantizar consistencia.

## Manejo de errores

| Fallo | Comportamiento |
|---|---|
| `sendPreviewLead` falla | Mostrar error, NO mostrar preview. Lead no capturado. |
| `OPENAI_API_KEY` ausente | Console.error en server, preview con todos los fallbacks (texto del usuario + gradiente). |
| `generateCopy` lanza | Console.error, copy = null, preview usa texto del usuario. |
| `generateHeroImage` lanza | Console.error, image = null, preview usa gradiente. |
| OpenAI tarda más de 30s | Timeout en server action, devuelve null para lo que no llegó. |
| Usuario abandona durante loading | Lead ya capturado, no pasa nada. |

## Analytics nuevos (GTM)

Sobre los eventos de v1 (`preview_wizard_start`,
`preview_step_advance`, `preview_lead_submit`, `preview_rating`,
`preview_cta_click`):

- `preview_generate_start` con `{ leadId }`
- `preview_generate_success` con `{ leadId, hadCopy: bool, hadImage: bool, durationMs }`
- `preview_generate_fail` con `{ leadId, reason }`

## Estructura de archivos final

```
src/app/imagina-tu-web/
├── page.tsx                              # KEEP from v1 (noindex + fonts)
└── _components/
    ├── PreviewWizard.tsx                 # MODIFY: añadir estado generating
    ├── PreviewLoading.tsx                # NEW
    ├── WebPreview.tsx                    # REWRITE: switch entre 2 templates
    ├── templates/
    │   ├── InformativaTemplate.tsx       # NEW
    │   └── EcommerceTemplate.tsx         # NEW
    ├── SectorIllustration.tsx            # NEW
    ├── RatingBar.tsx                     # KEEP from v1
    └── steps/                             # KEEP all 6 from v1

src/lib/
├── openai-client.ts                      # NEW: wrapper OpenAI
├── preview-prompts.ts                    # NEW: builders de prompts
├── preview-generate-action.ts            # NEW: server action IA
├── preview-themes.ts                     # KEEP from v1
├── preview-lead-action.ts                # KEEP from v1
├── preview-rating-action.ts              # KEEP from v1
├── preview-validation.ts                 # MODIFY: añadir copy schema
├── preview-lead-id.ts                    # KEEP from v1
└── __tests__/                             # KEEP all 3, añadir tests nuevos
```

## Decisiones explícitas (qué dejamos fuera)

- **Streaming progresivo del preview**: el preview se monta cuando AMBAS
  llamadas IA terminan. No mostramos el preview parcial con la imagen
  llegando después. Razón: simplicidad de implementación y mejor UX
  ("aparece entero ya hecho" en lugar de "saltos visibles").
- **Imágenes IA en las tarjetas**: solo el hero usa IA. Tarjetas usan
  SVG. Razón: coste/latencia/predictibilidad (4 imágenes IA = $0.16 y
  30s+).
- **Cache de imágenes IA**: cada submission genera nueva imagen, aunque
  el sector/paleta sea igual al de otro lead. Razón: alta probabilidad
  de inputs ligeramente distintos no justifica el coste de implementar
  cache + storage compartido.
- **Editor del preview generado**: el usuario no puede editar el copy
  ni regenerar la imagen. Si no le gusta, vota 👎 y comenta. Razón:
  YAGNI para una herramienta de conversión.
- **Persistencia entre sesiones**: si refresca durante el wizard,
  vuelve a empezar (igual que v1).

## Riesgos y mitigaciones

- **OpenAI devuelve copy raro o desalineado** → prompt explícito + Zod
  validation + fallback a texto usuario.
- **OpenAI devuelve imagen con manos/textos basura** → prompt explícito
  "NO people faces, NO text, NO logos" reduce riesgo. Si pasa, el
  usuario vota 👎 y vemos en mail #2. Para v3 podríamos añadir botón
  "regenerar imagen".
- **OPENAI_API_KEY se queda sin saldo** → server action devuelve error
  IA pero lead ya capturado, preview con fallback. Mail interno con
  warning automático fuera de alcance (lo monitoreáis manualmente al
  principio).
- **Coste sale de control por spam** → honeypot + formLoadedAt ≥ 2s ya
  protegen el submit. La generación IA solo se dispara después de un
  submit válido. Rate limiting fuera de alcance para v2.
- **Latencia >30s** → timeout, fallbacks. Usuario ve mensajes rotando,
  no se queda colgado.
