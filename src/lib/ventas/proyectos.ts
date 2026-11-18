/**
 * Servicios que se le pueden contratar a dinkbit y la plantilla de tareas de
 * cada uno. En la ficha del cliente se marcan sus servicios; en su pestaña
 * Tareas se eligen las tareas de la plantilla y se añaden como un lote
 * (columnas `proyecto`, `fase` y `orden` de `ventas_tareas`).
 *
 * Las plantillas viven aquí y no en la base: añadir o cambiar una tarea es un
 * cambio de código, y las tareas ya añadidas a un cliente no cambian. La
 * `clave` de un servicio se guarda en la base: **no se cambia** una vez usada.
 * Puro: sin red ni entorno.
 */

export interface FasePlantilla {
  nombre: string;
  tareas: readonly string[];
}

export interface Servicio {
  clave: string;
  nombre: string;
  fases: readonly FasePlantilla[];
}

/** Borrador de plantillas (2026-11-18). Revisarlas con el equipo y ajustarlas aquí. */
export const SERVICIOS: readonly Servicio[] = [
  {
    clave: "web",
    nombre: "Web",
    fases: [
      { nombre: "Arranque", tareas: ["Revisar el alta y los archivos del cliente", "Reunión de arranque", "Mapa de páginas aprobado"] },
      { nombre: "Diseño", tareas: ["Diseño de la home", "Diseño de las páginas interiores", "Aprobación del cliente"] },
      { nombre: "Desarrollo", tareas: ["Maquetación", "Formularios y aviso de leads", "Textos y SEO básico"] },
      { nombre: "Lanzamiento", tareas: ["Dominio y correo", "Analítica y píxel", "Pruebas en móvil", "Publicar y avisar al cliente"] },
    ],
  },
  {
    clave: "rrss",
    nombre: "Redes sociales",
    fases: [
      { nombre: "Arranque", tareas: ["Accesos a Instagram y Facebook", "Línea visual de las publicaciones"] },
      { nombre: "Contenido", tareas: ["Calendario del primer mes", "Primeras publicaciones", "Aprobación del cliente"] },
      { nombre: "Publicación", tareas: ["Programar las publicaciones", "Informe del mes"] },
    ],
  },
  {
    clave: "campanas_meta",
    nombre: "Campañas Meta",
    fases: [
      { nombre: "Arranque", tareas: ["Acceso al Business Manager", "Cuenta publicitaria y forma de pago", "Píxel y conversiones"] },
      { nombre: "Creatividades", tareas: ["Creatividades", "Titulares y textos", "Aprobación del cliente"] },
      { nombre: "Lanzamiento", tareas: ["Público y presupuesto", "Publicar las campañas", "Revisión a los 7 días"] },
    ],
  },
  {
    clave: "google_ads",
    nombre: "Campañas Google Ads",
    fases: [
      { nombre: "Arranque", tareas: ["Acceso a la cuenta de Google Ads", "Forma de pago", "Etiqueta de Google y conversiones"] },
      { nombre: "Configuración", tareas: ["Palabras clave y negativas", "Anuncios y recursos", "Aprobación del cliente"] },
      { nombre: "Lanzamiento", tareas: ["Presupuesto y pujas", "Publicar las campañas", "Revisión a los 7 días"] },
    ],
  },
  {
    clave: "whatsapp",
    nombre: "Integración con WhatsApp",
    fases: [
      { nombre: "Arranque", tareas: ["Número de WhatsApp Business del cliente", "Conectar el número en el panel", "Plantillas de mensajes aprobadas por Meta"] },
      { nombre: "Puesta en marcha", tareas: ["Secuencia de bienvenida", "Prueba con un lead real", "Explicar la bandeja al cliente"] },
    ],
  },
  {
    clave: "ventas_b2b",
    nombre: "Ventas B2B",
    fases: [
      { nombre: "Arranque", tareas: ["Condiciones y comisión firmadas", "Tipos de negocio", "Número de WhatsApp conectado", "Entrada de leads de anuncios"] },
      { nombre: "Captación", tareas: ["Secuencias de WhatsApp", "Primer lote de leads"] },
    ],
  },
];

const POR_CLAVE = new Map(SERVICIOS.map((s) => [s.clave, s]));

/** El servicio que enseña la pestaña WhatsApp de un cliente (Conversaciones, Conexión, Secuencias). */
export const SERVICIO_WHATSAPP = "whatsapp";

export function servicio(clave: string): Servicio | null {
  return POR_CLAVE.get(clave) ?? null;
}

export function nombreServicio(clave: string): string {
  return servicio(clave)?.nombre ?? clave;
}

/** Solo las claves que existen, sin repetir y en el orden del catálogo. */
export function limpiarServicios(claves: readonly unknown[]): string[] {
  const elegidas = new Set(claves.filter((c): c is string => typeof c === "string"));
  return SERVICIOS.filter((s) => elegidas.has(s.clave)).map((s) => s.clave);
}

export interface TareaDePlantilla {
  proyecto: string;
  fase: string;
  titulo: string;
  orden: number;
  /** Identifica la tarea dentro de la plantilla, para los checkboxes del formulario. */
  clave: string;
}

export function tareasDePlantilla(claveServicio: string): TareaDePlantilla[] {
  const s = servicio(claveServicio);
  if (!s) return [];
  const tareas: TareaDePlantilla[] = [];
  s.fases.forEach((f) => f.tareas.forEach((titulo) => tareas.push({ proyecto: s.clave, fase: f.nombre, titulo, orden: tareas.length, clave: `${s.clave}:${tareas.length}` })));
  return tareas;
}

/** Las tareas de la plantilla que el cliente aún no tiene (mismo proyecto y mismo título). */
export function pendientesDePlantilla(claveServicio: string, existentes: readonly { proyecto?: string | null; titulo: string }[]): TareaDePlantilla[] {
  const ya = new Set(existentes.filter((t) => t.proyecto === claveServicio).map((t) => t.titulo));
  return tareasDePlantilla(claveServicio).filter((t) => !ya.has(t.titulo));
}

/** De las claves marcadas en el formulario, las tareas que hay que crear. Ignora claves inventadas y repetidas. */
export function elegirDePlantilla(claveServicio: string, marcadas: readonly unknown[], existentes: readonly { proyecto?: string | null; titulo: string }[]): TareaDePlantilla[] {
  const set = new Set(marcadas.filter((c): c is string => typeof c === "string"));
  return pendientesDePlantilla(claveServicio, existentes).filter((t) => set.has(t.clave));
}

export interface TareaDeProyecto {
  id: string;
  proyecto?: string | null;
  fase?: string | null;
  orden?: number | null;
  titulo: string;
  hecha_at: string | null;
}

export interface Proyecto<T extends TareaDeProyecto> {
  clave: string;
  nombre: string;
  total: number;
  hechas: number;
  fases: { nombre: string; total: number; hechas: number; tareas: T[] }[];
}

/** Las tareas de proyecto de un cliente, por proyecto (en el orden del catálogo) y por fase (en el orden de la plantilla). */
export function agruparProyectos<T extends TareaDeProyecto>(tareas: readonly T[]): Proyecto<T>[] {
  const porProyecto = new Map<string, T[]>();
  for (const t of tareas) {
    if (!t.proyecto) continue;
    porProyecto.set(t.proyecto, [...(porProyecto.get(t.proyecto) ?? []), t]);
  }
  const orden = (clave: string) => {
    const i = SERVICIOS.findIndex((s) => s.clave === clave);
    return i < 0 ? SERVICIOS.length : i;
  };
  return [...porProyecto.entries()]
    .sort(([a], [b]) => orden(a) - orden(b) || a.localeCompare(b))
    .map(([clave, lista]) => {
      const ordenadas = [...lista].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
      const fases: Proyecto<T>["fases"] = [];
      for (const t of ordenadas) {
        const nombre = t.fase ?? "Otras";
        let f = fases.find((x) => x.nombre === nombre);
        if (!f) fases.push((f = { nombre, total: 0, hechas: 0, tareas: [] }));
        f.tareas.push(t);
        f.total++;
        if (t.hecha_at) f.hechas++;
      }
      return { clave, nombre: nombreServicio(clave), total: lista.length, hechas: lista.filter((t) => t.hecha_at).length, fases };
    });
}
