# Plantilla de web para clínicas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un repositorio del que sale la web de cada clínica cambiando un fichero de contenido y una carpeta de imágenes, con la clínica dental ficticia Aralia como primera instancia.

**Architecture:** Repo único `dkb-clinicas`. Cada clínica es un fichero tipado en `content/clinicas/<slug>.ts` y una carpeta en `public/clinicas/<slug>/`. Un registro estático las une y `NEXT_PUBLIC_CLINICA` selecciona cuál se sirve, de modo que cada clínica es un proyecto de Vercel apuntando al mismo repo. Los componentes no conocen ninguna clínica: leen del tipo `Clinica`.

**Tech Stack:** Next.js 16.2.9 (App Router, carpeta `app/` en la raíz), React 19.2.4, TypeScript, Tailwind CSS 4 vía `@tailwindcss/postcss`, Vitest + Testing Library, lucide-react para iconos. Mismas versiones que `instituto-fich` y `padel-marina`, que son las webs de cliente ya en producción.

**Spec:** [docs/growth/2026-08-19-fase-4-plantilla-web-clinicas-design.md](../../growth/2026-08-19-fase-4-plantilla-web-clinicas-design.md)

**Ubicación del repo:** `~/Documents/CLAUDE/dkb-clinicas`, hermano de `dkb-web`. Este plan vive de momento en `dkb-web` porque el repo destino todavía no existe; cuando exista, se mueve con el diseño.

## Global Constraints

- **Convenciones de las webs de cliente ya existentes**, no las de `dkb-web`: carpeta `app/` en la raíz (no `src/app`), y tests **colocados junto al fuente** (`lib/foo.test.ts`, no `__tests__/foo.test.ts`).
- **Los componentes nunca escriben datos de ninguna clínica.** Todo sale del objeto `clinica`. Un nombre, un teléfono o un tratamiento escritos a mano en un componente son un defecto: es lo que hace que la web de un cliente acabe con el teléfono de otro.
- **Tipado estricto: una clínica a la que le falte un campo obligatorio no compila.**
- **Colores explícitos.** Nada de `prefers-color-scheme` ni de tokens que cambien solos. `instituto-fich` lo usa y en la fase 1 ese patrón dejó una calculadora ilegible sobre su propio fondo.
- **Las secciones opcionales desaparecen**, no se renderizan vacías.
- Todo el texto de cara al usuario en **español de España**. Comentarios de código en español, explicando el *por qué*.
- **El formulario se construye entero pero no envía a ningún sitio todavía** (§5 del diseño). El envío queda aislado en una función para reconectarlo en la fase 2.
- Verificación de cada tarea: `npm test` en verde y `npx tsc --noEmit` limpio.

---

### Task 1: Repo, tipo `Clinica` y registro

La pieza que decide todo lo demás: el contrato que cumplen las clínicas y el mecanismo que elige cuál se sirve.

**Files:**
- Create: repo `~/Documents/CLAUDE/dkb-clinicas` (scaffold)
- Create: `content/tipos.ts`
- Create: `content/registro.ts`
- Test: `content/registro.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface Clinica` con los campos de abajo
  - `export const clinica: Clinica` — la clínica activa, resuelta por `NEXT_PUBLIC_CLINICA`
  - `export function resolverClinica(slug: string | undefined, registro: Record<string, Clinica>): Clinica`

- [ ] **Step 1: Crear el repo**

```bash
cd ~/Documents/CLAUDE
npx create-next-app@16.2.9 dkb-clinicas \
  --typescript --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-npm
cd dkb-clinicas
npm i lucide-react
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
git add -A && git commit -m "chore: scaffold del repo"
```

- [ ] **Step 2: Configurar Vitest**

Crear `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Crear `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";

// jsdom no implementa IntersectionObserver y cualquier animación al hacer
// scroll lo necesita. Sin el stub, montar un componente que lo use revienta.
if (!("IntersectionObserver" in globalThis)) {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
```

Añadir a `package.json`: `"test": "vitest run"` y `"typecheck": "tsc --noEmit"`.

- [ ] **Step 3: Escribir el test del registro (falla)**

Crear `content/registro.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { resolverClinica } from "./registro";
import type { Clinica } from "./tipos";

const falsa = { slug: "falsa", marca: { nombre: "Falsa" } } as unknown as Clinica;
const otra = { slug: "otra", marca: { nombre: "Otra" } } as unknown as Clinica;
const registro = { falsa, otra };

describe("resolverClinica", () => {
  test("devuelve la clínica que pide la variable de entorno", () => {
    expect(resolverClinica("otra", registro).slug).toBe("otra");
  });

  test("sin variable, devuelve la primera del registro", () => {
    // Comodidad para desarrollar en local sin tener que exportar nada.
    expect(resolverClinica(undefined, registro).slug).toBe("falsa");
  });

  test("un slug desconocido revienta en vez de servir otra clínica", () => {
    // Es el fallo más caro posible: publicar la web de un cliente con el
    // contenido de otro. Mejor que el despliegue falle a que salga mal.
    expect(() => resolverClinica("inexistente", registro)).toThrow(/inexistente/);
  });
});
```

- [ ] **Step 4: Ejecutar y comprobar que falla**

Run: `npx vitest run content/registro.test.ts`
Expected: FAIL — no existe `./registro`.

- [ ] **Step 5: Escribir el tipo `Clinica`**

Crear `content/tipos.ts`:

```ts
/**
 * El contrato que cumple cada clínica.
 *
 * Estricto a propósito: si a una clínica le falta un campo obligatorio, no
 * compila. Es lo único que impide publicar la web de un cliente con el
 * teléfono o la dirección de otro, que al reciclar una plantilla es el error
 * más fácil de cometer y el más caro.
 *
 * Los campos opcionales son opcionales DE VERDAD: su sección entera
 * desaparece si no están, en vez de renderizarse vacía.
 */

export interface Tratamiento {
  nombre: string;
  descripcion: string;
  /** Precio de partida. Sin él, no se enseña precio en esa tarjeta. */
  desde?: number;
}

export interface Profesional {
  nombre: string;
  puesto: string;
  /** Ruta dentro de public/, p. ej. "/clinicas/aralia/equipo/ana.jpg". */
  foto: string;
  /** Obligatorio por ley para sanitarios; opcional para el resto del equipo. */
  colegiado?: string;
}

export interface Opinion {
  texto: string;
  autor: string;
  fuente?: string;
}

export interface Pregunta {
  pregunta: string;
  respuesta: string;
}

export interface HorarioDia {
  dia: string;
  horas: string;
}

export interface Clinica {
  slug: string;

  marca: {
    nombre: string;
    claim: string;
    logo: string;
    logoNegativo: string;
    /** Color de acento. Explícito: nada de tokens que cambien con el tema. */
    acento: string;
    /** Color del texto principal sobre fondo claro. */
    tinta: string;
  };

  contacto: {
    telefono: string;
    /** Internacional sin "+", como lo quiere el enlace de WhatsApp. */
    whatsapp: string;
    email: string;
    direccion: string;
    ciudad: string;
    /** Para el enlace "cómo llegar". */
    mapaUrl: string;
  };

  horarios: HorarioDia[];

  /**
   * Los mismos horarios en el formato de schema.org: "Mo-Fr 09:00-20:00".
   *
   * Se escriben a mano en vez de traducirlos desde `horarios` porque aquello
   * es texto libre: cualquier intento de interpretarlo se rompe con la primera
   * clínica que escriba "L-V" o "de lunes a viernes". Y si esto sale mal, la
   * ficha de Google se queda sin horarios sin que se entere nadie.
   */
  horariosSchema: string[];

  hero: {
    titulo: string;
    subtitulo: string;
    imagen: string;
    cta: string;
  };

  tratamientos: Tratamiento[];

  porQue: {
    titulo: string;
    motivos: { titulo: string; texto: string }[];
  };

  /** Opcional: sin equipo, la sección no existe. */
  equipo?: Profesional[];
  /** Opcional. */
  opiniones?: Opinion[];
  /** Opcional: fotos de las instalaciones. */
  instalaciones?: string[];

  faq: Pregunta[];

  legal: {
    razonSocial: string;
    cif: string;
    emailProteccionDatos: string;
  };

  seo: {
    titulo: string;
    descripcion: string;
    /** 1200x630. */
    imagenCompartir: string;
  };
}
```

- [ ] **Step 6: Escribir el registro**

Crear `content/registro.ts`:

```ts
import type { Clinica } from "./tipos";

/**
 * Resuelve qué clínica se sirve.
 *
 * Un slug desconocido lanza en vez de caer en una clínica por defecto: servir
 * el contenido de otro cliente por una variable mal escrita sería mucho peor
 * que un despliegue fallido, y un despliegue fallido se ve enseguida.
 */
export function resolverClinica(
  slug: string | undefined,
  registro: Record<string, Clinica>,
): Clinica {
  const slugs = Object.keys(registro);
  if (slugs.length === 0) throw new Error("El registro de clínicas está vacío");

  // Sin variable definida se sirve la primera, para poder levantar el entorno
  // de desarrollo sin exportar nada.
  if (!slug) return registro[slugs[0]];

  const encontrada = registro[slug];
  if (!encontrada) {
    throw new Error(
      `NEXT_PUBLIC_CLINICA="${slug}" no está en el registro. Disponibles: ${slugs.join(", ")}`,
    );
  }
  return encontrada;
}
```

- [ ] **Step 7: Ejecutar y comprobar que pasa**

Run: `npx vitest run content/registro.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 8: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: tipo Clinica y registro que resuelve cuál se sirve"
```

---

### Task 2: El contenido de la clínica ficticia Aralia

**Files:**
- Create: `content/clinicas/aralia.ts`
- Create: `content/clinicas/_plantilla.ts`
- Modify: `content/registro.ts` (añadir el export de la clínica activa)
- Test: `content/clinicas/aralia.test.ts`

**Interfaces:**
- Consumes: `Clinica` de `content/tipos.ts` (Task 1).
- Produces:
  - `content/clinicas/aralia.ts` → `export default aralia: Clinica`
  - `content/registro.ts` → `export const clinica: Clinica`

- [ ] **Step 1: Escribir el test (falla)**

Crear `content/clinicas/aralia.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import aralia from "./aralia";

describe("clínica Aralia", () => {
  test("tiene los datos de contacto completos", () => {
    expect(aralia.contacto.telefono).toBeTruthy();
    expect(aralia.contacto.whatsapp).toMatch(/^\d+$/);
    expect(aralia.contacto.direccion).toBeTruthy();
  });

  test("el WhatsApp va en formato internacional sin el signo más", () => {
    // El enlace wa.me lo exige así; con "+" delante no abre la conversación.
    expect(aralia.contacto.whatsapp.startsWith("+")).toBe(false);
    expect(aralia.contacto.whatsapp.startsWith("34")).toBe(true);
  });

  test("tiene tratamientos, preguntas frecuentes y horarios", () => {
    expect(aralia.tratamientos.length).toBeGreaterThanOrEqual(4);
    expect(aralia.faq.length).toBeGreaterThanOrEqual(4);
    expect(aralia.horarios.length).toBeGreaterThanOrEqual(2);
  });

  test("los sanitarios del equipo llevan número de colegiado", () => {
    // Es obligatorio en publicidad sanitaria: un profesional presentado sin
    // colegiado no puede publicarse.
    for (const p of aralia.equipo ?? []) {
      if (/odont|dent|ortodon|higien/i.test(p.puesto)) {
        expect(p.colegiado, `${p.nombre} sin colegiado`).toBeTruthy();
      }
    }
  });

  test("los colores de marca son valores explícitos", () => {
    // Nada de variables CSS ni tokens: es lo que evita que el texto se vuelva
    // ilegible cuando cambia el tema del visitante.
    expect(aralia.marca.acento).toMatch(/^#[0-9a-f]{6}$/i);
    expect(aralia.marca.tinta).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run content/clinicas/aralia.test.ts`
Expected: FAIL — no existe `./aralia`.

- [ ] **Step 3: Escribir el contenido de Aralia**

Crear `content/clinicas/aralia.ts`. **Todos los datos son inventados** — así debe quedar escrito en el propio fichero:

```ts
import type { Clinica } from "../tipos";

/**
 * Clínica dental ficticia, primera instancia de la plantilla y material de la
 * demo comercial.
 *
 * TODOS LOS DATOS SON INVENTADOS: nombre, dirección, teléfono, colegiados y
 * precios. Antes de enseñar esta web fuera hay que comprobar que el nombre no
 * coincide con una clínica real, porque entonces parecería una suplantación.
 */
const aralia: Clinica = {
  slug: "aralia",

  marca: {
    nombre: "Clínica Dental Aralia",
    claim: "Odontología sin prisas, en el centro de Madrid",
    logo: "/clinicas/aralia/logo.svg",
    logoNegativo: "/clinicas/aralia/logo-negativo.svg",
    acento: "#0f766e",
    tinta: "#0b1b2b",
  },

  contacto: {
    telefono: "910 000 000",
    whatsapp: "34600000000",
    email: "hola@clinicaaralia.example",
    direccion: "Calle del Olivar 12, bajo",
    ciudad: "Chamberí, Madrid",
    mapaUrl: "https://maps.google.com/?q=Chamberi+Madrid",
  },

  horarios: [
    { dia: "Lunes a viernes", horas: "9:00 – 20:00" },
    { dia: "Sábados", horas: "9:00 – 14:00" },
    { dia: "Domingos y festivos", horas: "Cerrado" },
  ],

  horariosSchema: ["Mo-Fr 09:00-20:00", "Sa 09:00-14:00"],

  hero: {
    titulo: "Tu dentista de confianza en Chamberí",
    subtitulo:
      "Primera visita sin coste, diagnóstico explicado con calma y un presupuesto cerrado antes de empezar.",
    imagen: "/clinicas/aralia/portada.jpg",
    cta: "Pide tu cita",
  },

  tratamientos: [
    {
      nombre: "Revisión y limpieza",
      descripcion:
        "Revisión completa con radiografía y limpieza profesional. Te explicamos qué vemos y qué haríamos, sin vendértelo.",
      desde: 45,
    },
    {
      nombre: "Ortodoncia invisible",
      descripcion:
        "Alineadores transparentes, con seguimiento cada seis semanas y el plan de tratamiento a la vista desde el primer día.",
      desde: 2900,
    },
    {
      nombre: "Implantes",
      descripcion:
        "Implante y corona con garantía por escrito. Estudio previo con escáner 3D incluido.",
      desde: 950,
    },
    {
      nombre: "Estética dental",
      descripcion: "Blanqueamiento y carillas, con simulación previa del resultado.",
      desde: 250,
    },
    {
      nombre: "Endodoncia",
      descripcion: "Tratamiento de conductos en una sola sesión siempre que es posible.",
      desde: 180,
    },
    {
      nombre: "Odontopediatría",
      descripcion:
        "Primeras visitas sin miedo, en una sala pensada para que los niños se lo tomen bien.",
    },
  ],

  porQue: {
    titulo: "Por qué la gente del barrio repite",
    motivos: [
      {
        titulo: "Presupuesto cerrado",
        texto:
          "Lo que te decimos al principio es lo que pagas al final. Sin extras a mitad de tratamiento.",
      },
      {
        titulo: "Citas de verdad",
        texto:
          "Media hora por paciente. Ni salas llenas ni esperas de cuarenta minutos con la cita dada.",
      },
      {
        titulo: "Te explicamos lo que ves",
        texto:
          "Miramos juntos la radiografía. Si algo puede esperar, te lo decimos en vez de tratarlo.",
      },
      {
        titulo: "Urgencias en el día",
        texto: "Si te duele, te vemos hoy. Reservamos huecos cada mañana para eso.",
      },
    ],
  },

  equipo: [
    {
      nombre: "Dra. Ana Belmonte",
      puesto: "Directora médica · Odontología general",
      foto: "/clinicas/aralia/equipo/ana.jpg",
      colegiado: "COEM 28001234",
    },
    {
      nombre: "Dr. Marcos Iriarte",
      puesto: "Ortodoncista",
      foto: "/clinicas/aralia/equipo/marcos.jpg",
      colegiado: "COEM 28005678",
    },
    {
      nombre: "Lucía Fernández",
      puesto: "Higienista dental",
      foto: "/clinicas/aralia/equipo/lucia.jpg",
      colegiado: "COEM 28009012",
    },
  ],

  opiniones: [
    {
      texto:
        "Me hicieron un presupuesto y fue exactamente lo que pagué. Después de lo que me pasó en otra clínica, eso ya es motivo suficiente para volver.",
      autor: "Marta R.",
      fuente: "Google",
    },
    {
      texto:
        "Llevé a mi hijo de seis años muerto de miedo y salió pidiendo volver. No sé cómo lo hicieron.",
      autor: "Javier P.",
      fuente: "Google",
    },
    {
      texto:
        "La doctora se sentó conmigo a mirar la radiografía y me dijo que dos de las cosas que me habían dicho en otro sitio no hacían falta.",
      autor: "Elena G.",
      fuente: "Google",
    },
  ],

  instalaciones: [
    "/clinicas/aralia/instalaciones/recepcion.jpg",
    "/clinicas/aralia/instalaciones/gabinete.jpg",
    "/clinicas/aralia/instalaciones/sala-espera.jpg",
  ],

  faq: [
    {
      pregunta: "¿La primera visita se paga?",
      respuesta:
        "No. La primera visita incluye revisión, radiografía y presupuesto, y no cuesta nada aunque después decidas no tratarte con nosotros.",
    },
    {
      pregunta: "¿Se puede financiar?",
      respuesta:
        "Sí, hasta en doce meses sin intereses. Te decimos la cuota exacta antes de empezar, no después.",
    },
    {
      pregunta: "¿Trabajáis con mutuas?",
      respuesta:
        "Trabajamos con las principales. Llámanos con tu póliza a mano y te lo confirmamos en un minuto.",
    },
    {
      pregunta: "¿Qué pasa si me duele hoy?",
      respuesta:
        "Reservamos huecos de urgencia cada mañana. Llama en cuanto puedas y te damos hora para el mismo día.",
    },
    {
      pregunta: "¿Hay aparcamiento cerca?",
      respuesta:
        "Hay zona azul en la misma calle y un aparcamiento público a dos minutos andando.",
    },
  ],

  legal: {
    razonSocial: "Clínica Dental Aralia S.L.",
    cif: "B00000000",
    emailProteccionDatos: "privacidad@clinicaaralia.example",
  },

  seo: {
    titulo: "Clínica Dental Aralia — Dentista en Chamberí, Madrid",
    descripcion:
      "Primera visita sin coste, presupuesto cerrado y citas de media hora. Ortodoncia invisible, implantes y odontopediatría en Chamberí.",
    imagenCompartir: "/clinicas/aralia/compartir.jpg",
  },
};

export default aralia;
```

- [ ] **Step 4: Crear la plantilla en blanco**

Copiar `aralia.ts` a `content/clinicas/_plantilla.ts`, cambiar el `slug` a `"_plantilla"`, vaciar los textos dejando la estructura, y encabezarlo con:

```ts
/**
 * Punto de partida para una clínica nueva.
 *
 * Cópialo a <slug>.ts, rellénalo, añádelo al registro y crea su proyecto en
 * Vercel con NEXT_PUBLIC_CLINICA=<slug>. NO lo añadas al registro tal cual:
 * está vacío a propósito.
 */
```

- [ ] **Step 5: Exponer la clínica activa**

Añadir al final de `content/registro.ts`:

```ts
import aralia from "./clinicas/aralia";

/** Todas las clínicas que sirve este repo. Añadir aquí las nuevas. */
export const CLINICAS: Record<string, Clinica> = { aralia };

/** La que sirve este despliegue. */
export const clinica = resolverClinica(process.env.NEXT_PUBLIC_CLINICA, CLINICAS);
```

- [ ] **Step 6: Ejecutar y comprobar que pasa**

Run: `npx vitest run`
Expected: PASS, 8 tests.

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: contenido de la clínica ficticia Aralia y plantilla en blanco"
```

---

### Task 3: Chrome del sitio — layout, cabecera, pie y CTA fijos

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/SiteHeader.tsx`
- Create: `components/SiteFooter.tsx`
- Create: `components/CtaFijo.tsx`
- Test: `components/CtaFijo.test.tsx`

**Interfaces:**
- Consumes: `clinica` de `content/registro.ts` (Task 2).
- Produces: `<SiteHeader />`, `<SiteFooter />`, `<CtaFijo />`, todos sin props.

- [ ] **Step 1: Escribir el test del CTA fijo (falla)**

Crear `components/CtaFijo.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CtaFijo } from "./CtaFijo";
import { clinica } from "@/content/registro";

describe("CtaFijo", () => {
  test("ofrece llamar y escribir por WhatsApp", () => {
    render(<CtaFijo />);
    const tel = screen.getByRole("link", { name: /llamar/i });
    const wa = screen.getByRole("link", { name: /whatsapp/i });
    expect(tel).toHaveAttribute("href", `tel:${clinica.contacto.telefono.replace(/\s/g, "")}`);
    expect(wa.getAttribute("href")).toContain(clinica.contacto.whatsapp);
  });

  test("el teléfono sale del contenido y no está escrito a mano", () => {
    // Es el defecto que hace que la web de un cliente acabe con el número de
    // otro, y no lo detecta nadie hasta que llama un paciente equivocado.
    render(<CtaFijo />);
    expect(screen.getByRole("link", { name: /llamar/i }).getAttribute("href")).toContain(
      clinica.contacto.telefono.replace(/\s/g, ""),
    );
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run components/CtaFijo.test.tsx`
Expected: FAIL — no existe `./CtaFijo`.

- [ ] **Step 3: Escribir el CTA fijo**

Crear `components/CtaFijo.tsx`:

```tsx
import { Phone, MessageCircle } from "lucide-react";
import { clinica } from "@/content/registro";

/**
 * Llamar y WhatsApp siempre a mano.
 *
 * En una clínica la inmensa mayoría de las peticiones entran por teléfono o
 * por WhatsApp, no por formulario. Tenerlos fijos en pantalla es la decisión
 * de conversión más rentable de toda la web.
 */
export function CtaFijo() {
  const tel = clinica.contacto.telefono.replace(/\s/g, "");
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 p-3 md:hidden">
      <a
        href={`tel:${tel}`}
        aria-label={`Llamar al ${clinica.contacto.telefono}`}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold text-white shadow-lg"
        style={{ background: clinica.marca.acento }}
      >
        <Phone size={18} aria-hidden /> Llamar
      </a>
      <a
        href={`https://wa.me/${clinica.contacto.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribir por WhatsApp"
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-bold text-white shadow-lg"
      >
        <MessageCircle size={18} aria-hidden /> WhatsApp
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Escribir cabecera y pie**

`components/SiteHeader.tsx`: logo (`clinica.marca.logo`), nombre, y en pantallas grandes el teléfono como botón de acento. Sin navegación a otras páginas: es una sola página, así que los enlaces son anclas a las secciones.

`components/SiteFooter.tsx`: sobre fondo oscuro (`clinica.marca.tinta`), con `clinica.marca.logoNegativo`, dirección, horarios, teléfono, email y los enlaces a aviso legal, privacidad y cookies. Todo desde `clinica`.

El pie es lo que justifica que `logoNegativo` sea obligatorio: si no lo pintara nadie, estaríamos pidiéndole a cada clínica un archivo que no sale en ninguna parte.

- [ ] **Step 5: Fijar el layout y los colores**

En `app/globals.css`, **borrar el bloque `@media (prefers-color-scheme: dark)` que trae la plantilla de create-next-app**. La web de una clínica tiene una identidad fija; que se invierta según la configuración del visitante es cómo se acaba con texto ilegible.

En `app/layout.tsx`, envolver con `<SiteHeader />`, `{children}`, `<SiteFooter />` y `<CtaFijo />`, y aplicar los colores de marca como variables en el elemento raíz:

```tsx
<html lang="es">
  <body
    style={{
      ["--acento" as string]: clinica.marca.acento,
      ["--tinta" as string]: clinica.marca.tinta,
      background: "#ffffff",
      color: clinica.marca.tinta,
    }}
  >
```

- [ ] **Step 6: Ejecutar y commitear**

```bash
npx vitest run && npx tsc --noEmit
git add -A
git commit -m "feat: chrome del sitio con los CTA de llamada y WhatsApp fijos"
```

---

### Task 4: Secciones principales — Hero, Tratamientos y Por qué nosotros

**Files:**
- Create: `components/sections/Hero.tsx`
- Create: `components/sections/Tratamientos.tsx`
- Create: `components/sections/PorQue.tsx`
- Modify: `app/page.tsx`
- Test: `components/sections/Tratamientos.test.tsx`

**Interfaces:**
- Consumes: `clinica` (Task 2).
- Produces: `<Hero />`, `<Tratamientos />`, `<PorQue />`, sin props.

- [ ] **Step 1: Escribir el test de tratamientos (falla)**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Tratamientos } from "./Tratamientos";
import { clinica } from "@/content/registro";

describe("Tratamientos", () => {
  test("pinta todos los tratamientos de la clínica", () => {
    render(<Tratamientos />);
    for (const t of clinica.tratamientos) {
      expect(screen.getByText(t.nombre)).toBeInTheDocument();
    }
  });

  test("el precio solo sale cuando la clínica lo ha puesto", () => {
    // Hay tratamientos cuyo precio depende del caso, y enseñar "desde 0 €" o
    // un hueco vacío en esos es peor que no enseñar nada.
    render(<Tratamientos />);
    const sinPrecio = clinica.tratamientos.filter((t) => t.desde === undefined);
    for (const t of sinPrecio) {
      const tarjeta = screen.getByText(t.nombre).closest("article");
      expect(tarjeta?.textContent).not.toMatch(/desde/i);
    }
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run components/sections/Tratamientos.test.tsx`
Expected: FAIL — no existe `./Tratamientos`.

- [ ] **Step 3: Escribir las tres secciones**

`Tratamientos.tsx` va entero, porque es **el modelo del que copian las demás secciones**: cómo se lee del contenido, cómo se aplica el acento y cómo se trata un campo opcional.

```tsx
import { clinica } from "@/content/registro";

export function Tratamientos() {
  return (
    <section id="tratamientos" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h2 className="text-3xl font-bold md:text-4xl">Tratamientos</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {clinica.tratamientos.map((t) => (
          <article
            key={t.nombre}
            className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold">{t.nombre}</h3>
            <p className="mt-2 text-sm leading-relaxed text-black/70">{t.descripcion}</p>
            {/* Solo si la clínica ha puesto precio: hay tratamientos cuyo
                importe depende del caso, y un "desde 0 €" es peor que nada. */}
            {t.desde !== undefined && (
              <p className="mt-4 text-sm font-semibold" style={{ color: clinica.marca.acento }}>
                Desde {t.desde} €
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
```

`Hero.tsx`: `clinica.hero.titulo`, subtítulo, la imagen de portada con `next/image` y `priority`, la ciudad visible, y el botón de `clinica.hero.cta` anclado a `#cita`.

`PorQue.tsx`: `clinica.porQue.titulo` y la rejilla de motivos.

- [ ] **Step 4: Montar la página**

En `app/page.tsx`, componer `<Hero />`, `<Tratamientos />`, `<PorQue />`.

- [ ] **Step 5: Ejecutar y commitear**

```bash
npx vitest run && npx tsc --noEmit
git add -A
git commit -m "feat: hero, tratamientos y por qué nosotros"
```

---

### Task 5: Secciones opcionales — Equipo, Opiniones e Instalaciones

Lo que hace reciclable la plantilla: una clínica sin equipo que enseñar no debe tener un hueco vacío donde iría.

**Files:**
- Create: `components/sections/Equipo.tsx`
- Create: `components/sections/Opiniones.tsx`
- Create: `components/sections/Instalaciones.tsx`
- Modify: `app/page.tsx`
- Test: `components/sections/opcionales.test.tsx`

**Interfaces:**
- Consumes: `Clinica` (Task 1), `clinica` (Task 2).
- Produces: `<Equipo clinica={...} />`, `<Opiniones clinica={...} />`, `<Instalaciones clinica={...} />`.

**Nota de diseño:** estas tres reciben la clínica **por props** y no la importan, precisamente para poder probarlas con una clínica sin esos campos. Las de la Task 4 no lo necesitan porque sus campos son obligatorios.

- [ ] **Step 1: Escribir el test (falla)**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Equipo } from "./Equipo";
import { Opiniones } from "./Opiniones";
import { Instalaciones } from "./Instalaciones";
import { clinica } from "@/content/registro";
import type { Clinica } from "@/content/tipos";

const sinExtras: Clinica = {
  ...clinica,
  equipo: undefined,
  opiniones: undefined,
  instalaciones: undefined,
};

describe("secciones opcionales", () => {
  test("con datos, se pintan", () => {
    expect(render(<Equipo clinica={clinica} />).container).not.toBeEmptyDOMElement();
    expect(render(<Opiniones clinica={clinica} />).container).not.toBeEmptyDOMElement();
    expect(render(<Instalaciones clinica={clinica} />).container).not.toBeEmptyDOMElement();
  });

  test("sin datos, desaparecen enteras", () => {
    // No un contenedor vacío con su margen y su título: nada en absoluto. Un
    // hueco en blanco a mitad de la página es de las cosas que más cantan.
    expect(render(<Equipo clinica={sinExtras} />).container).toBeEmptyDOMElement();
    expect(render(<Opiniones clinica={sinExtras} />).container).toBeEmptyDOMElement();
    expect(render(<Instalaciones clinica={sinExtras} />).container).toBeEmptyDOMElement();
  });

  test("con una lista vacía tampoco se pintan", () => {
    const vacias: Clinica = { ...clinica, equipo: [], opiniones: [], instalaciones: [] };
    expect(render(<Equipo clinica={vacias} />).container).toBeEmptyDOMElement();
    expect(render(<Opiniones clinica={vacias} />).container).toBeEmptyDOMElement();
    expect(render(<Instalaciones clinica={vacias} />).container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run components/sections/opcionales.test.tsx`
Expected: FAIL — no existen los módulos.

- [ ] **Step 3: Escribir las tres secciones**

Las tres empiezan con la misma guarda, y ésa es la pieza que importa. `Equipo.tsx` va entero como modelo de las otras dos:

```tsx
import Image from "next/image";
import type { Clinica } from "@/content/tipos";

export function Equipo({ clinica }: { clinica: Clinica }) {
  // La guarda va antes de cualquier marcado, envoltorio incluido: si se
  // devolviera la <section> vacía quedaría su margen y su título en mitad de
  // la página, que es exactamente lo que se quiere evitar.
  if (!clinica.equipo?.length) return null;

  return (
    <section id="equipo" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h2 className="text-3xl font-bold md:text-4xl">El equipo</h2>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {clinica.equipo.map((p) => (
          <figure key={p.nombre}>
            <Image
              src={p.foto}
              alt={p.nombre}
              width={800}
              height={1000}
              className="aspect-[4/5] w-full rounded-2xl object-cover"
            />
            <figcaption className="mt-4">
              <p className="font-semibold">{p.nombre}</p>
              <p className="text-sm text-black/70">{p.puesto}</p>
              {/* Obligatorio en publicidad sanitaria para quien lo tenga. */}
              {p.colegiado && (
                <p className="mt-1 text-xs text-black/50">Nº colegiado {p.colegiado}</p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
```

`Opiniones` y `Instalaciones` siguen el mismo patrón, cambiando solo la guarda
(`clinica.opiniones?.length`, `clinica.instalaciones?.length`) y el contenido:
la primera pinta el texto entrecomillado con su autor y su fuente si la hay; la
segunda, una rejilla de fotos con `next/image`.

- [ ] **Step 4: Ejecutar, montar en la página y commitear**

```bash
npx vitest run && npx tsc --noEmit
git add -A
git commit -m "feat: equipo, opiniones e instalaciones, que desaparecen si no hay datos"
```

---

### Task 6: Ubicación, horarios y preguntas frecuentes

**Files:**
- Create: `components/sections/Ubicacion.tsx`
- Create: `components/sections/Faq.tsx`
- Modify: `app/page.tsx`
- Test: `components/sections/Faq.test.tsx`

**Interfaces:**
- Consumes: `clinica` (Task 2).
- Produces: `<Ubicacion />`, `<Faq />`.

- [ ] **Step 1: Escribir el test (falla)**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { Faq } from "./Faq";
import { clinica } from "@/content/registro";

describe("Faq", () => {
  test("pinta todas las preguntas", () => {
    render(<Faq />);
    for (const p of clinica.faq) {
      expect(screen.getByText(p.pregunta)).toBeInTheDocument();
    }
  });

  test("las respuestas se despliegan al pulsar", async () => {
    const user = userEvent.setup();
    render(<Faq />);
    const primera = clinica.faq[0];
    await user.click(screen.getByText(primera.pregunta));
    expect(screen.getByText(primera.respuesta)).toBeVisible();
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run components/sections/Faq.test.tsx`
Expected: FAIL — no existe `./Faq`.

- [ ] **Step 3: Escribir las secciones**

`Faq.tsx` con `<details>`/`<summary>` nativos: se despliegan sin JavaScript, son accesibles de serie y no hay estado que mantener.

`Ubicacion.tsx`: dirección, ciudad, la tabla de horarios de `clinica.horarios` y un enlace "cómo llegar" a `clinica.contacto.mapaUrl`.

**Sin mapa embebido de Google.** Mete cookies de terceros y arrastra el banner de consentimiento a una web que si no, no lo necesitaría. Está en las decisiones abiertas del diseño; hasta que se decida, un enlace.

- [ ] **Step 4: Ejecutar, montar y commitear**

```bash
npx vitest run && npx tsc --noEmit
git add -A
git commit -m "feat: ubicación con horarios y preguntas frecuentes"
```

---

### Task 7: Formulario de cita

Se construye entero. Lo único pendiente es a dónde escribe.

**Files:**
- Create: `components/sections/FormularioCita.tsx`
- Create: `lib/enviar-cita.ts`
- Modify: `app/page.tsx`
- Test: `components/sections/FormularioCita.test.tsx`
- Test: `lib/enviar-cita.test.ts`

**Interfaces:**
- Consumes: `clinica` (Task 2).
- Produces:
  - `interface SolicitudCita { nombre: string; telefono: string; email?: string; motivo?: string; consentimiento: true }`
  - `function validarCita(d: Partial<SolicitudCita>): { ok: boolean; error?: string }`
  - `async function enviarCita(datos: SolicitudCita): Promise<{ ok: boolean; error?: string }>`
  - `<FormularioCita />`

- [ ] **Step 1: Escribir los tests (fallan)**

`lib/enviar-cita.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { enviarCita, validarCita } from "./enviar-cita";

describe("validarCita", () => {
  test("exige nombre, teléfono y consentimiento", () => {
    expect(validarCita({ nombre: "", telefono: "600111222", consentimiento: true }).ok).toBe(false);
    expect(validarCita({ nombre: "Ana", telefono: "", consentimiento: true }).ok).toBe(false);
    expect(
      validarCita({ nombre: "Ana", telefono: "600111222", consentimiento: false as never }).ok,
    ).toBe(false);
  });

  test("acepta una solicitud completa", () => {
    expect(validarCita({ nombre: "Ana", telefono: "600111222", consentimiento: true }).ok).toBe(true);
  });
});

describe("enviarCita", () => {
  test("no pierde la solicitud en silencio mientras no hay destino", async () => {
    // El destino llega con el CRM de la fase 2. Hasta entonces esto NO puede
    // devolver ok:true: le diría al paciente que su cita está pedida cuando
    // no la ha recibido nadie.
    const r = await enviarCita({ nombre: "Ana", telefono: "600111222", consentimiento: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no está conectado/i);
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run lib/enviar-cita.test.ts`
Expected: FAIL — no existe `./enviar-cita`.

- [ ] **Step 3: Escribir el envío**

```ts
export interface SolicitudCita {
  nombre: string;
  telefono: string;
  email?: string;
  motivo?: string;
  consentimiento: true;
}

export function validarCita(d: Partial<SolicitudCita>): { ok: boolean; error?: string } {
  if (!d.nombre?.trim()) return { ok: false, error: "Falta el nombre" };
  if (!d.telefono?.trim() || d.telefono.replace(/\D/g, "").length < 9) {
    return { ok: false, error: "El teléfono no parece correcto" };
  }
  if (d.consentimiento !== true) return { ok: false, error: "Falta aceptar la política" };
  return { ok: true };
}

/**
 * Envía la solicitud de cita.
 *
 * PENDIENTE DE CONECTAR: el destino es el CRM clínico de la fase 2. Se decidió
 * esperar a él en vez de mandarlo de momento al CRM de dinkbit.
 *
 * Devuelve un error a propósito en vez de fingir que ha ido bien: decirle a un
 * paciente que su cita está pedida cuando no la ha recibido nadie es mucho peor
 * que decirle que llame por teléfono.
 */
export async function enviarCita(datos: SolicitudCita): Promise<{ ok: boolean; error?: string }> {
  const validacion = validarCita(datos);
  if (!validacion.ok) return validacion;
  return { ok: false, error: "El formulario todavía no está conectado" };
}
```

- [ ] **Step 4: Escribir el formulario**

`FormularioCita.tsx` con `id="cita"`: nombre, teléfono, email opcional, motivo opcional, casilla de consentimiento **con enlace a `/privacidad`**, honeypot oculto y control de tiempo desde la carga. Al fallar el envío, enseña el error **y el teléfono de la clínica como salida**, para que quien quiera cita la consiga igual.

`FormularioCita.test.tsx` comprueba: que el consentimiento es obligatorio, que el honeypot existe y está oculto, y que al enviar sale el teléfono de la clínica como alternativa.

- [ ] **Step 5: Ejecutar, montar y commitear**

```bash
npx vitest run && npx tsc --noEmit
git add -A
git commit -m "feat: formulario de cita, con el envío pendiente de conectar al CRM"
```

---

### Task 8: Legales, SEO y datos estructurados

**Files:**
- Create: `app/aviso-legal/page.tsx`
- Create: `app/privacidad/page.tsx`
- Create: `app/cookies/page.tsx`
- Create: `components/JsonLd.tsx`
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `app/layout.tsx`
- Test: `components/JsonLd.test.tsx`

**Interfaces:**
- Consumes: `clinica` (Task 2).
- Produces: `<JsonLd />`.

- [ ] **Step 1: Escribir el test (falla)**

```tsx
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { JsonLd } from "./JsonLd";
import { clinica } from "@/content/registro";

describe("JsonLd", () => {
  test("declara la clínica como negocio local con sus datos", () => {
    // Es lo que hace que Google enseñe dirección, teléfono y horarios en la
    // ficha. En una clínica, donde la búsqueda es local, es de lo que más
    // rinde de toda la web.
    const { container } = render(<JsonLd />);
    const datos = JSON.parse(container.querySelector("script")?.textContent ?? "{}");
    expect(datos["@type"]).toBe("Dentist");
    expect(datos.name).toBe(clinica.marca.nombre);
    expect(datos.telephone).toBe(clinica.contacto.telefono);
    expect(datos.address.streetAddress).toBe(clinica.contacto.direccion);
    // Y en el formato que entiende Google, no en español. Comprobar solo que
    // sea una lista dejaría pasar "Lunes a viernes", que Google ignora: la
    // ficha saldría sin horarios y no se enteraría nadie.
    expect(datos.openingHours).toEqual(clinica.horariosSchema);
    for (const h of datos.openingHours) {
      expect(h).toMatch(/^(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))? \d{2}:\d{2}-\d{2}:\d{2}$/);
    }
  });
});
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run components/JsonLd.test.tsx`
Expected: FAIL — no existe `./JsonLd`.

- [ ] **Step 3: Escribir el JSON-LD**

```tsx
import { clinica } from "@/content/registro";

/**
 * Datos estructurados de negocio local.
 *
 * Es lo que hace que Google enseñe dirección, teléfono y horarios en la ficha
 * de resultados. En una clínica, donde la búsqueda es local, rinde más que
 * casi cualquier otra cosa de la web.
 */
export function JsonLd() {
  const datos = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: clinica.marca.nombre,
    description: clinica.seo.descripcion,
    telephone: clinica.contacto.telefono,
    email: clinica.contacto.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: clinica.contacto.direccion,
      addressLocality: clinica.contacto.ciudad,
      addressCountry: "ES",
    },
    openingHours: clinica.horariosSchema,
  };

  return (
    <script
      type="application/ld+json"
      // Escapar "<" evita que un texto del contenido pueda cerrar la etiqueta
      // y colar marcado. Mismo tratamiento que en dkb-web.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(datos).replace(/</g, "\\u003c"),
      }}
    />
  );
}
```

- [ ] **Step 4: Escribir las páginas legales**

Las tres leen de `clinica.legal` y `clinica.contacto`. **Aviso: son plantillas, no asesoramiento legal** — hay que dejarlo escrito en el README para que nadie las publique sin que las revise quien corresponda.

- [ ] **Step 5: SEO y metadatos**

`app/layout.tsx` con `metadata` desde `clinica.seo`, `sitemap.ts` con las cuatro rutas y `robots.ts`.

**La clínica ficticia va con `noindex`.** Es una demo: si se indexa, compite en Google con clínicas reales y puede parecer una web falsa. Condicionarlo a `clinica.slug === "aralia"`.

- [ ] **Step 6: Ejecutar, construir y commitear**

```bash
npx vitest run && npx tsc --noEmit && npm run build
git add -A
git commit -m "feat: legales, metadatos y datos estructurados de negocio local"
```

---

### Task 9: README con el proceso de alta

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Escribir el proceso**

Los cinco pasos del §7 del diseño, con los comandos exactos: copiar `_plantilla.ts`, rellenar, añadir al registro, poner las imágenes con **sus tamaños concretos**, crear el proyecto de Vercel con `NEXT_PUBLIC_CLINICA` y apuntar el dominio.

Incluir la lista de imágenes que hace falta pedirle a cada clínica:

| Imagen | Tamaño | Notas |
|---|---|---|
| Logo | SVG o PNG transparente | Dos versiones: sobre claro y sobre oscuro |
| Portada | ≥1600px de ancho, horizontal | Interior o recepción |
| Retratos del equipo | ≥800×1000, vertical | Mismo estilo entre ellos |
| Instalaciones | ≥1200px de ancho | 2 o 3 |
| Compartir en redes | 1200×630 | |

Y las dos advertencias: no usar las fotos de banco más conocidas, y que las caras reconocibles necesitan licencia comercial.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: proceso de alta de una clínica nueva"
```

---

## Verificación final

- [ ] `npm test` en verde.
- [ ] `npx tsc --noEmit` limpio.
- [ ] `npm run build` correcto.
- [ ] `NEXT_PUBLIC_CLINICA=inexistente npm run build` **falla** con un mensaje claro.
- [ ] En el navegador a 390 y 1440: sin desbordamiento horizontal, y los CTA de llamada y WhatsApp accesibles en móvil.
- [ ] Quitar `equipo`, `opiniones` e `instalaciones` de Aralia a mano y comprobar que la página no deja huecos. Devolverlos después.

## Lo que queda fuera y por qué

- **El destino del formulario**, que espera al CRM de la fase 2 (§5 del diseño).
- **Las imágenes reales.** Se monta con huecos del tamaño exacto y se sustituyen ficheros cuando lleguen.
- **El mapa embebido**, decisión abierta por las cookies de terceros.
- **Blog, multi-idioma, reserva con calendario y panel de edición** (§6 del diseño).
- **La sección de antes y después.** El diseño la contempla (§4), pero sus
  requisitos son una decisión abierta (§9.3) y cambian según la comunidad
  autónoma. Se añade cuando la pida la primera clínica real y se sepan sus
  condiciones, no antes: publicar publicidad sanitaria mal es sancionable.
