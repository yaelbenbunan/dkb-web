// Catálogo de ordenadores disponibles con el Bono del Kit Digital.
// Fuente: computers.dinkbit.com (sitio de equipos de dinkbit).

export type DeviceKind = "laptop" | "desktop";

export interface KitDevice {
  brand: string;
  /** Nombre del modelo tal y como se ofrece. */
  name: string;
  /** Tamaño de pantalla, si aplica (p.ej. "14″"). */
  size?: string;
  kind: DeviceKind;
  blurb: string;
}

/** Equipos 100% subvencionados por el bono (valorados hasta 1.000€): gratis. */
export const FREE_DEVICES: KitDevice[] = [
  {
    brand: "Acer",
    name: "TravelMate P2",
    size: "14″",
    kind: "laptop",
    blurb: "Portátil profesional con certificación TCO. El mejor equilibrio entre rendimiento y precio.",
  },
  {
    brand: "Acer",
    name: "TravelMate P2",
    size: "16″",
    kind: "laptop",
    blurb: "La versión de 16″ del TravelMate P2: más pantalla para el día a día de tu negocio.",
  },
  {
    brand: "HP",
    name: "EliteBook 645 G11",
    kind: "laptop",
    blurb: "Equipo corporativo robusto y seguro, pensado para cubrir las necesidades de tu plantilla.",
  },
  {
    brand: "Lenovo",
    name: "ThinkPad L14 Gen 5",
    kind: "laptop",
    blurb: "Fiabilidad ThinkPad: eficiencia y resistencia allá donde trabajes.",
  },
  {
    brand: "Asus",
    name: "ExpertBook B34",
    size: "14″",
    kind: "laptop",
    blurb: "Diseñado para empresas: ligero, seguro y con la durabilidad ExpertBook.",
  },
  {
    brand: "Asus",
    name: "ExpertBook B36",
    size: "16″",
    kind: "laptop",
    blurb: "ExpertBook de 16″: pantalla amplia y rendimiento para tareas exigentes.",
  },
  {
    brand: "Dell",
    name: "Latitude 3550",
    kind: "laptop",
    blurb: "Portátil compacto y elegante en color carbón, ideal para la movilidad.",
  },
  {
    brand: "Dell",
    name: "Latitude 3450",
    kind: "laptop",
    blurb: "Máxima productividad con los procesadores Intel® Core™ de la serie U.",
  },
  {
    brand: "Lenovo",
    name: "ThinkBook 16 G7 ARP",
    size: "16″",
    kind: "laptop",
    blurb: "Portátil SMB de 16″ con teclado ergonómico y teclado numérico.",
  },
  {
    brand: "Lenovo",
    name: "ThinkCentre M75q Gen5 + Monitor Tiny-In-One24 Gen5 23,8″",
    kind: "desktop",
    blurb: "Sobremesa compacto y monitor de 23,8″: tu puesto de trabajo completo.",
  },
];

/** Equipos premium (por encima de 1.000€): amplías el bono pagando la diferencia. */
export const PREMIUM_DEVICES: KitDevice[] = [
  {
    brand: "Apple",
    name: "MacBook Air M-Series",
    size: "13″",
    kind: "laptop",
    blurb: "El compañero perfecto para trabajar y crear. Ligero, silencioso y con gran autonomía.",
  },
  {
    brand: "Apple",
    name: "MacBook Air M-Series",
    size: "15″",
    kind: "laptop",
    blurb: "Toda la potencia del Air con una pantalla más amplia de 15″.",
  },
  {
    brand: "Apple",
    name: "MacBook Pro 14″ M4",
    size: "14″",
    kind: "laptop",
    blurb: "La gama Pro con el chip M4: rendimiento de sobra para cualquier flujo de trabajo.",
  },
  {
    brand: "Apple",
    name: "MacBook Pro 14″ M4 Pro / M4 Max",
    size: "14″",
    kind: "laptop",
    blurb: "Configuraciones M4 Pro y M4 Max para tareas creativas y técnicas exigentes.",
  },
  {
    brand: "Apple",
    name: "MacBook Pro 16″ M4 Pro / M4 Max",
    size: "16″",
    kind: "laptop",
    blurb: "La máxima potencia de Apple en una pantalla de 16″ Negro Espacial.",
  },
  {
    brand: "Lenovo",
    name: "ThinkPad X1 Carbon Gen 12",
    kind: "laptop",
    blurb: "El ThinkPad insignia: ultraligero, potente y con acabados premium. Hasta 32 GB.",
  },
  {
    brand: "Lenovo",
    name: "ThinkPad X13 2-in-1 Gen 5",
    kind: "laptop",
    blurb: "Convertible 2-en-1 con enorme potencia. Disponible también en 32 GB.",
  },
  {
    brand: "Lenovo",
    name: "ThinkBook 14 2-in-1 G4",
    size: "14″",
    kind: "laptop",
    blurb: "Convertible profesional optimizado para un rendimiento superior.",
  },
  {
    brand: "Lenovo",
    name: "ThinkBook 16p G5",
    size: "16″",
    kind: "laptop",
    blurb: "Sumérgete en la informática profesional: estilo y potencia en 16″.",
  },
  {
    brand: "Lenovo",
    name: "ThinkPad P14s Gen 5",
    size: "14″",
    kind: "laptop",
    blurb: "Estación de trabajo móvil ultraligera para usuarios avanzados.",
  },
  {
    brand: "Lenovo",
    name: "ThinkPad P16s Gen 3",
    size: "16″",
    kind: "laptop",
    blurb: "Workstation profesional para flujos de trabajo intensivos.",
  },
  {
    brand: "Lenovo",
    name: "ThinkPad P1 Gen 7",
    kind: "laptop",
    blurb: "Ingeniería de precisión y tecnología avanzada en una workstation premium.",
  },
  {
    brand: "Lenovo",
    name: "ThinkCentre M70q / M75q Gen5 + Monitor Tiny-In-One24 23,8″ Táctil",
    kind: "desktop",
    blurb: "Sobremesa compacto con monitor táctil de 23,8″ integrable. Puesto completo premium.",
  },
];

/** Lista plana para el desplegable del formulario de solicitud. */
export const ALL_DEVICE_OPTIONS: string[] = [
  ...FREE_DEVICES,
  ...PREMIUM_DEVICES,
].map((d) => [d.brand, d.name, d.size].filter(Boolean).join(" "));

export const EMPLOYEE_RANGES = ["0-2", "3-9", "10-49", "Más de 50"] as const;

/** Términos y condiciones del servicio (resumen mostrado en la landing). */
export const KIT_TERMS: string[] = [
  "El dispositivo se entrega dentro de España.",
  "Servicio de soporte técnico incluido (avisos por email, atención de lunes a viernes de 09:00 a 17:00).",
  "Reparaciones en remoto o in situ por rotura, desperfectos o configuración, siempre con un uso correcto del equipo.",
  "Tiempo máximo de reparación de 5 días laborables o equipo de sustitución.",
  "Solo pueden beneficiarse quienes ya hayan validado otra solución de digitalización (art. 18.2 de las bases reguladoras).",
  "Una vez finalizada la fase II, podrás quedarte el ordenador por tan solo 1€.",
];
