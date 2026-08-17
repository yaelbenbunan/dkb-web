# Fase 1 — Landing de captación y calculadora de coste por paciente

**Fecha:** 2026-08-17
**Repo:** `dkb-web`
**Documento padre:** [definición de producto](./2026-08-17-sistema-clinicas-producto.md)
**Estado:** spec pendiente de aprobación

Esta fase es independiente de las demás: no necesita el producto construido, no toca
Supabase nuevo y reutiliza toda la infraestructura de captación que ya existe.

---

## 1. Alcance

**Entra:**

- Landing en `/growth`, dentro del grupo `(landing)` (chrome reducido, sin navegación).
- Calculadora de coste por paciente, con resultado en pantalla tras dejar el contacto.
- Persistencia del lead en `imagina_leads` con canal y campaña atribuidos.
- Medición: GA4 vía GTM y Meta CAPI con `eventId` compartido.
- Email de seguimiento con el resultado.

**No entra:**

- El producto (CRM, agenda, dashboard). Fases 2 y 3.
- Web de clínica. Fase 4.
- Página de precios detallada. La landing menciona que hay cuota de alta, sin importe (§3
  del documento padre).
- Reserva de reunión con calendario. El CTA final es un formulario, no un `Calendly`.

---

## 2. Nombre comercial y ruta

El nombre está sin decidir y **no bloquea construir** (§14 del padre). Se resuelve así:

```ts
// src/lib/growth-config.ts
export const GROWTH = {
  /** Nombre comercial del producto. Cambiar aquí lo cambia en toda la landing. */
  name: "Growth",
  /** Ruta actual. Si cambia, añadir redirección 301 en next.config.ts. */
  path: "/growth",
} as const;
```

Ningún componente escribe el nombre literal. Cuando se decida, es una línea y un `redirect`
en [next.config.ts](../../next.config.ts), donde ya hay precedente con
`/kit-digital → /puesto-seguro`.

---

## 3. La landing

Rompe con el estilo de las anteriores (§11 del padre): no es un catálogo de servicios, es un
sistema de medición. Secciones, en orden:

1. **Hero — la pregunta.** *"¿Sabes cuánto te cuesta conseguir un paciente nuevo?"* Subtítulo
   que reconoce lo que sí sabe (inversión, leads) y señala lo que no (pacientes, dinero).
   CTA único: **"Calcúlalo gratis"**, ancla a la calculadora. Sin precio en el hero.
2. **El agujero negro.** Visualización del circuito `anuncio → web → formulario → ??? →
   paciente → facturación`, con el hueco marcado. Es la pieza que crea la necesidad: que vea
   que no está midiendo nada.
3. **Vídeo.** Hueco reservado. **No bloquea el lanzamiento**: si no hay vídeo, la sección no
   se renderiza y el resto de la página funciona. Detalle de implementación en §9.
4. **Qué verías.** Las cuatro cifras del dashboard con datos de muestra: invertido, leads,
   pacientes que acudieron, generado, y el retorno. Etiquetado visiblemente como ejemplo.
5. **Cómo funciona.** Las cuatro capas: captación, conversión, gestión, inteligencia.
6. **La oferta.** Desde 199 €/mes, sin permanencia, **y que hay una cuota de alta que
   depende de la inversión**. Esto último no es opcional: publicar solo el "desde 199 €" y
   soltar el alta en la llamada rompe la confianza en el momento de cerrar (§3 del padre).
7. **Calculadora.** El destino de todos los CTA de la página.
8. **Cierre.** *"Vas a querer quedarte por los resultados, no porque te obliguemos."*

Indexable (a diferencia de `/cuestionario/[nicho]`, que va con `robots: noindex`). Entra en
[sitemap.ts](../../src/app/sitemap.ts).

---

## 4. La calculadora

### 4.1 Pasos

Cuatro pasos y resultado. En el paso 1 se anuncia que al terminar verá su resultado, para que
pedir el contacto antes no se lea como cambiazo.

| # | Pregunta | Campo | Obligatorio |
|---|---|---|---|
| 1 | ¿Cuánto inviertes al mes en publicidad? | número € · o "no invierto todavía" | sí |
| 2 | ¿Cuántos pacientes nuevos te llegan al mes de esa publicidad? | número · o "no lo sé" | sí |
| 3 | ¿Cuál es tu ticket medio por paciente? | número € · o "prefiero no decirlo" | no |
| 4 | Contacto | nombre, email, teléfono, consentimiento | sí |

Tanto "no invierto todavía" como "no lo sé" son **respuestas de primera clase**, botones al
mismo nivel visual que el campo numérico. No son validaciones fallidas.

### 4.2 El cálculo

```
coste por paciente = inversión mensual ÷ pacientes nuevos al mes
generado           = pacientes nuevos × ticket medio        (si dio ticket)
retorno            = generado ÷ inversión mensual           (si dio ticket)
```

Vive en `src/lib/growth-calc.ts`, como función pura sin React, para poder testearla sola.

### 4.3 Las tres salidas

La rama **B es la mayoritaria por volumen** y hay que diseñarla con el mismo cariño que la A
—no como caso residual—, porque quien no sabe sus números es más cliente ideal que quien los
sabe (§11 del padre).

**A · Sabe sus números.**
> "Cada paciente nuevo te está costando **87 €**."
> Con ticket medio: "Y cada uno te genera 400 €, así que por cada euro invertido recuperas
> 4,60 €."

Y a continuación, el gancho real: *esto es un cálculo de servilleta con tus medias. Lo que no
sabes es qué campaña trae los pacientes buenos.*

**B · No sabe cuántos pacientes le llegan.**
> "No se puede calcular — y eso es exactamente el hallazgo."

Se le enseña el ejemplo con cifras de muestra de lo que vería si lo midiera. El mensaje deja
de ser "tu coste es alto" y pasa a ser **"estás volando a ciegas"**, que cierra mejor porque
no le discute una cifra suya.

**C · No invierte todavía.**
> "Todavía no hay coste que medir. Pero tampoco hay pacientes que no estén llegando por
> recomendación."

Es un discurso distinto —crear demanda en lugar de arreglar medición— y por eso es rama
propia y no una variante de la B. Mismo ejemplo de dashboard al final.

En las tres, un único CTA de cierre: **solicitar el diagnóstico comentado**. No "contratar".

### 4.4 Casos límite

- **Cero pacientes con inversión > 0** → no es división por cero, es rama B con mensaje
  propio: *"inviertes y no llega nadie; eso es lo primero que hay que mirar"*.
- **Inversión 0 y pacientes > 0** → rama C, pero con nota de que esos pacientes son orgánicos.
- **Números absurdos** (inversión de 7 cifras, 5.000 pacientes) → se acepta y se calcula. No
  somos la policía del dato; y un número raro es señal comercial útil, no un error.
- **Decimales y separadores** (`1.500`, `1500,50`, `1 500 €`) → se normalizan. Ya existe
  `normalizePhoneE164` como precedente de normalización de entrada del usuario.

---

## 5. Persistencia del lead

Nuevo builder en [web-lead-origin.ts](../../src/lib/web-lead-origin.ts), siguiendo el patrón
exacto de `kitDigital2026Lead`:

```ts
export function growthLead(
  d: {
    name: string; email: string; phone: string;
    inversion: number | null;      // null = "no invierto todavía"
    pacientes: number | null;      // null = "no lo sé"
    ticket: number | null;         // null = no lo dio
    costePorPaciente: number | null;
    rama: "A" | "B" | "C";
  },
  utm?: UtmInput,
): WebhookLeadInput
```

Decisiones:

- **`campaign` fijo a `"Growth clínicas"`**, para poder filtrar todos sus leads juntos en el
  panel. Mismo criterio que `"Kit Digital 2026"`.
- **`channel` desde UTMs** con `attribution()`, por defecto `"Web"`. Ya funciona: normaliza
  `utm_source=google` → `"google ads"` y `meta/facebook/instagram` → `"Meta"`.
- **`status: "nuevo"`**, no un estado nuevo. Estos son leads comerciales de verdad y recorren
  el pipeline existente (`contactado → propuesta → ganado`). El caso `kit-digital` creó
  estado propio porque etiquetaba un *tipo de interés*, no una venta en curso.
- **`consent: true`**, exigido con `z.literal(true)` en el formulario.
- **Las respuestas de la calculadora van en `notes`**, en una línea estructurada. Son oro
  para la llamada: quien contesta "no lo sé" necesita otra conversación que quien contesta
  "87 €". Sin migración, y consistente con cómo el repo ya guarda contexto de formulario.

```
Origen: landing /growth · Inversión: 1.500 €/mes · Pacientes/mes: no lo sabe ·
Ticket: 400 € · Coste por paciente: no calculable · Rama: B
```

Server action en `src/lib/growth-action.ts`, con el patrón de `kit-digital-2026-action.ts`:
zod, honeypot `website` vacío, y `formLoadedAt` con más de 2000 ms desde la carga.

---

## 6. Medición

- **GA4 vía GTM** con `track()` de [gtm.ts](../../src/lib/gtm.ts): un evento por paso
  completado, para ver dónde abandonan, y el evento de lead al enviar.
- **Meta:** píxel en cliente y `sendMetaLead()` de [meta-capi.ts](../../src/lib/meta-capi.ts)
  en servidor, **con el mismo `eventId`**. Es obligatorio: sin él Meta cuenta dos
  conversiones por lead. `web-express-action.ts` ya lo hace así y sirve de referencia.
- **Identificadores de primera parte** para Enhanced Conversions con `pushUserData()`.
- **Consentimiento:** nada de medición antes de aceptar cookies. El sistema de consentimiento
  ya existe y se respeta sin código nuevo.

---

## 7. Email de seguimiento

Autoresponder con `sendLeadAutoresponder()` y plantilla nueva en
[lead-emails.ts](../../src/lib/lead-emails.ts), con la misma maquetación que el resto.

Contenido: su resultado por escrito (o el "no es calculable" de la rama B), qué mide el
sistema, y una respuesta directa para agendar. Le deja el número a mano y abre hilo de
conversación, que es lo que convierte.

---

## 8. Panel

**No requiere ningún cambio.** Verificado en
[LeadsTable.tsx](../../src/app/(site)/panel/LeadsTable.tsx):

- `CHANNEL_OPTIONS` ya contiene los valores que produce `attribution()` — `Web`,
  `google ads`, `Meta`, `landing`… así que el canal se pinta con su color y filtra solo.
- `campaign` es un campo de texto libre editable, no un desplegable cerrado. `"Growth
  clínicas"` entra sin tocar nada.

El detalle de la calculadora se lee en la columna de notas.

Un aviso para el futuro: hay **una** conducta del panel que depende del texto de la campaña
—el botón de reenvío de email está condicionado a `campaign === "Kit Digital 2026"`—. Si
algún día se quiere un reenvío para los leads de Growth, ése es el sitio. Hoy no hace falta.

---

## 9. Ficheros

**Nuevos**

| Fichero | Qué |
|---|---|
| `src/app/(landing)/growth/page.tsx` | La landing, servidor |
| `src/app/(landing)/growth/_components/CalculadoraWizard.tsx` | Wizard, cliente |
| `src/app/(landing)/growth/_components/steps/` | Un componente por paso + resultado |
| `src/lib/growth-config.ts` | Nombre comercial y ruta |
| `src/lib/growth-calc.ts` | Cálculo y decisión de rama, función pura |
| `src/lib/growth-action.ts` | Server action |

**Modificados**

| Fichero | Cambio |
|---|---|
| `src/lib/web-lead-origin.ts` | Builder `growthLead()` |
| `src/lib/lead-emails.ts` | Plantilla del autoresponder |
| `src/app/sitemap.ts` | Ruta `/growth` |

**Sobre el vídeo:** la sección se renderiza solo si hay una fuente configurada en
`growth-config.ts`. Sin vídeo, no aparece hueco vacío ni bloquea el lanzamiento.

---

## 10. Tests

TDD, como el resto del repo. Vitest con jsdom, y el stub de `IntersectionObserver` ya está en
`vitest.setup.ts`.

**`growth-calc.test.ts`** — el núcleo, y donde está el riesgo real:

- Coste por paciente con números normales.
- Retorno con ticket medio, y su ausencia cuando no se dio.
- `pacientes = 0` → rama B, no división por cero ni `Infinity` en pantalla.
- `inversion = null` → rama C.
- `pacientes = null` → rama B.
- Normalización de `"1.500"`, `"1500,50"`, `"1 500 €"`.
- Números absurdos no rompen ni devuelven `NaN`.

**`web-lead-origin.test.ts`** (extender) — canal desde UTMs, campaña fija, `status: "nuevo"`,
`consent: true`, y que las notas reflejen la rama y los valores, incluido "no lo sabe".

**`growth-action.test.ts`** — consentimiento obligatorio, honeypot relleno se rechaza, envío
antes de 2000 ms se rechaza, email inválido se rechaza.

**`CalculadoraWizard.test.tsx`** — que "no lo sé" avanza sin meter número, que el resultado
**no** se muestra antes del paso de contacto, y que cada rama pinta su mensaje.

Ese segundo caso es el que protege el modelo de negocio de la pieza: si una refactorización
enseña el resultado antes del contacto, dejamos de capturar leads y nadie se daría cuenta
mirando la pantalla.

---

## 11. Criterio de salida

- La landing convierte visitas en leads con canal y campaña correctos en el panel.
- Las tres ramas funcionan y el resultado nunca aparece antes del contacto.
- El lead llega a Meta una sola vez, no dos.
- Suite completa en verde, typecheck y build limpios.
- Se puede lanzar tráfico de pago sin cambiar código, solo etiquetando anuncios con UTMs.

---

## 12. Decisiones abiertas de esta fase

1. **Nombre comercial.** No bloquea construir; bloquea lanzar anuncios (§2).
2. **Cifras de muestra del dashboard de ejemplo.** Tienen que ser creíbles para una clínica
   pequeña. Conviene sacarlas de un caso real vuestro en lugar de inventarlas.
3. **Si el CTA de cierre pide reunión o solo "te llamamos".** Afecta al copy, no a la
   arquitectura.
4. **Vídeo:** quién lo graba y cuándo. La landing sale sin él.
