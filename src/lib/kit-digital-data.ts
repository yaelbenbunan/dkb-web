// Catálogo de ordenadores disponibles con el Bono del Kit Digital.
// Fuente: computers.dinkbit.com (sitio de equipos de dinkbit). Fotos y precios
// extraídos de ese catálogo.

export type DeviceKind = "laptop" | "desktop";

export interface KitDevice {
  slug: string;
  brand: string;
  /** Nombre del modelo. */
  name: string;
  /** Tamaño de pantalla, si aplica (p.ej. "14″"). */
  size?: string;
  kind: DeviceKind;
  free: boolean;
  /** Frase corta para la tarjeta del catálogo. */
  blurb: string;
  /** Descripción más larga para la ficha individual. */
  description: string;
  /** Puntos destacados (cualitativos) para la ficha. */
  highlights: string[];
  /** Ruta de la imagen de producto. */
  image: string;
  /** Solo premium: precio total y cuánto pagas tras aplicar el bono (1.000€). */
  priceTotal?: number;
  pricePay?: number;
}

function img(slug: string) {
  return `/img/kit-digital/${slug}.webp`;
}

/** Equipos 100% subvencionados por el bono (valorados hasta 1.000€): gratis. */
export const FREE_DEVICES: KitDevice[] = [
  {
    slug: "acer-travelmate-p2-14",
    brand: "Acer",
    name: "TravelMate P2",
    size: "14″",
    kind: "laptop",
    free: true,
    blurb: "Portátil profesional con certificación TCO. El mejor equilibrio entre rendimiento y precio.",
    description:
      "El Acer TravelMate P2 de 14″ es un portátil profesional con certificación TCO, pensado para el día a día de autónomos y pequeñas empresas. Ofrece el mejor equilibrio entre rendimiento, autonomía y precio, con un diseño ligero y resistente.",
    highlights: ["Certificación TCO", "Formato compacto de 14″", "Pensado para empresa"],
    image: img("acer-travelmate-p2-14"),
  },
  {
    slug: "acer-travelmate-p2-16",
    brand: "Acer",
    name: "TravelMate P2",
    size: "16″",
    kind: "laptop",
    free: true,
    blurb: "La versión de 16″ del TravelMate P2: más pantalla para el día a día de tu negocio.",
    description:
      "La versión de 16″ del Acer TravelMate P2 mantiene la fiabilidad y certificación TCO del modelo, con una pantalla más amplia ideal para trabajar con varias ventanas y hojas de cálculo con comodidad.",
    highlights: ["Pantalla amplia de 16″", "Certificación TCO", "Productividad cómoda"],
    image: img("acer-travelmate-p2-16"),
  },
  {
    slug: "hp-elitebook-645-g11",
    brand: "HP",
    name: "EliteBook 645 G11",
    kind: "laptop",
    free: true,
    blurb: "Equipo corporativo robusto y seguro, pensado para cubrir las necesidades de tu plantilla.",
    description:
      "El HP EliteBook 645 G11 es un portátil corporativo robusto y seguro, diseñado para satisfacer las distintas necesidades de tu plantilla laboral. Construcción de calidad y funciones de seguridad pensadas para empresa.",
    highlights: ["Gama EliteBook profesional", "Seguridad corporativa", "Construcción robusta"],
    image: img("hp-elitebook-645-g11"),
  },
  {
    slug: "lenovo-thinkpad-l14-gen-5",
    brand: "Lenovo",
    name: "ThinkPad L14 Gen 5",
    kind: "laptop",
    free: true,
    blurb: "Fiabilidad ThinkPad: eficiencia y resistencia allá donde trabajes.",
    description:
      "El Lenovo ThinkPad L14 Gen 5 ofrece la eficiencia y confiabilidad inigualables de la gama ThinkPad, dondequiera que lo lleves. Teclado de referencia, durabilidad probada y todo el ecosistema de gestión empresarial de Lenovo.",
    highlights: ["Fiabilidad ThinkPad", "Teclado de referencia", "Durabilidad probada"],
    image: img("lenovo-thinkpad-l14-gen-5"),
  },
  {
    slug: "asus-expertbook-b34-14",
    brand: "Asus",
    name: "ExpertBook B34",
    size: "14″",
    kind: "laptop",
    free: true,
    blurb: "Diseñado para empresas: ligero, seguro y con la durabilidad ExpertBook.",
    description:
      "El ASUS ExpertBook B3 está ingeniosamente diseñado para que tu empresa rinda al máximo: ligero, seguro y con la durabilidad de grado militar característica de la gama ExpertBook. La versión de 14″ es ideal para la movilidad.",
    highlights: ["Durabilidad ExpertBook", "Ligero y portátil", "Seguridad empresarial"],
    image: img("asus-expertbook-b34-14"),
  },
  {
    slug: "asus-expertbook-b36-16",
    brand: "Asus",
    name: "ExpertBook B36",
    size: "16″",
    kind: "laptop",
    free: true,
    blurb: "ExpertBook de 16″: pantalla amplia y rendimiento para tareas exigentes.",
    description:
      "El ASUS ExpertBook B3 de 16″ combina la fiabilidad y seguridad de la gama con una pantalla más amplia, perfecta para multitarea y tareas más exigentes en tu negocio.",
    highlights: ["Pantalla de 16″", "Durabilidad ExpertBook", "Multitarea cómoda"],
    image: img("asus-expertbook-b36-16"),
  },
  {
    slug: "dell-latitude-3550",
    brand: "Dell",
    name: "Latitude 3550",
    kind: "laptop",
    free: true,
    blurb: "Portátil compacto y elegante en color carbón, ideal para la movilidad.",
    description:
      "El Dell Latitude 3550 es un portátil compacto y elegante, disponible en color carbón suave, ideal para profesionales en movimiento. Toda la fiabilidad de la gama Latitude en un formato manejable.",
    highlights: ["Gama Latitude", "Diseño compacto", "Ideal para movilidad"],
    image: img("dell-latitude-3550"),
  },
  {
    slug: "dell-latitude-3450",
    brand: "Dell",
    name: "Latitude 3450",
    kind: "laptop",
    free: true,
    blurb: "Máxima productividad con los procesadores Intel® Core™ de la serie U.",
    description:
      "El Dell Latitude 3450 está pensado para la máxima productividad: los procesadores Intel® Core™ de la serie U ofrecen un rendimiento eficiente para el trabajo diario, con la calidad y soporte de la gama Latitude.",
    highlights: ["Procesadores Intel® Core™ U", "Gama Latitude", "Rendimiento eficiente"],
    image: img("dell-latitude-3450"),
  },
  {
    slug: "lenovo-thinkbook-16-g7-arp",
    brand: "Lenovo",
    name: "ThinkBook 16 G7 ARP",
    size: "16″",
    kind: "laptop",
    free: true,
    blurb: "Portátil SMB de 16″ con teclado ergonómico y teclado numérico.",
    description:
      "El Lenovo ThinkBook 16 G7 ARP es un amplio portátil para pymes con pantalla de 16″, teclado ergonómico y teclado numérico. Diseño moderno y profesional para quienes necesitan espacio de trabajo y comodidad.",
    highlights: ["Pantalla de 16″", "Teclado numérico", "Diseño profesional"],
    image: img("lenovo-thinkbook-16-g7-arp"),
  },
  {
    slug: "lenovo-thinkcentre-m75q-monitor",
    brand: "Lenovo",
    name: "ThinkCentre M75q Gen5 + Monitor Tiny-In-One24 23,8″",
    kind: "desktop",
    free: true,
    blurb: "Sobremesa compacto y monitor de 23,8″: tu puesto de trabajo completo.",
    description:
      "El conjunto Lenovo ThinkCentre M75q Gen5 con monitor ThinkCentre Tiny-In-One24 de 23,8″ es un puesto de trabajo completo: un sobremesa ultracompacto que se integra con el monitor para un escritorio limpio y ordenado.",
    highlights: ["Sobremesa + monitor 23,8″", "Formato ultracompacto", "Puesto completo"],
    image: img("lenovo-thinkcentre-m75q-monitor"),
  },
];

/** Equipos premium (por encima de 1.000€): aplicas el bono y pagas la diferencia. */
export const PREMIUM_DEVICES: KitDevice[] = [
  {
    slug: "macbook-air-13",
    brand: "Apple",
    name: "MacBook Air 13″",
    kind: "laptop",
    free: false,
    blurb: "El compañero perfecto para trabajar y crear. Ligero, silencioso y con gran autonomía.",
    description:
      "El MacBook Air de 13″ es el compañero perfecto para trabajar y crear: ultraligero, completamente silencioso y con una autonomía de día completo. La potencia del chip de Apple en el portátil más portátil de la gama.",
    highlights: ["Ultraligero y silencioso", "Gran autonomía", "Chip Apple"],
    image: img("macbook-air-13"),
    priceTotal: 1569,
    pricePay: 569,
  },
  {
    slug: "macbook-air-15",
    brand: "Apple",
    name: "MacBook Air 15″",
    kind: "laptop",
    free: false,
    blurb: "Toda la potencia del Air con una pantalla más amplia de 15″.",
    description:
      "El MacBook Air de 15″ ofrece toda la ligereza y autonomía del Air con una pantalla más amplia, ideal si quieres más espacio de trabajo sin renunciar a la portabilidad ni al silencio.",
    highlights: ["Pantalla amplia de 15″", "Ligero y silencioso", "Gran autonomía"],
    image: img("macbook-air-15"),
    priceTotal: 1849,
    pricePay: 849,
  },
  {
    slug: "macbook-pro-14-m4",
    brand: "Apple",
    name: "MacBook Pro 14″ M4",
    kind: "laptop",
    free: false,
    blurb: "La gama Pro con el chip M4: rendimiento de sobra para cualquier flujo de trabajo.",
    description:
      "El MacBook Pro de 14″ con chip M4 incorpora la gama más avanzada de chips de Apple, con potencia de sobra para cualquier flujo de trabajo profesional, pantalla Liquid Retina XDR y una autonomía excepcional.",
    highlights: ["Chip M4", "Pantalla Liquid Retina XDR", "Rendimiento profesional"],
    image: img("macbook-pro-14-m4"),
    priceTotal: 1949,
    pricePay: 949,
  },
  {
    slug: "macbook-pro-14-pro-max",
    brand: "Apple",
    name: "MacBook Pro 14″ M4 Pro / M4 Max",
    kind: "laptop",
    free: false,
    blurb: "Configuraciones M4 Pro y M4 Max para tareas creativas y técnicas exigentes.",
    description:
      "El MacBook Pro de 14″ en sus configuraciones M4 Pro y M4 Max está pensado para las tareas más exigentes: edición de vídeo, desarrollo, 3D o ciencia de datos. La máxima potencia de Apple en un formato de 14″.",
    highlights: ["Chips M4 Pro / M4 Max", "Para tareas exigentes", "Negro Espacial"],
    image: img("macbook-pro-14-pro-max"),
    priceTotal: 2399,
    pricePay: 1399,
  },
  {
    slug: "macbook-pro-16-pro-max",
    brand: "Apple",
    name: "MacBook Pro 16″ M4 Pro / M4 Max",
    kind: "laptop",
    free: false,
    blurb: "La máxima potencia de Apple en una pantalla de 16″ Negro Espacial.",
    description:
      "El MacBook Pro de 16″ con M4 Pro o M4 Max es la cima de la gama: la máxima potencia de Apple en una gran pantalla Liquid Retina XDR de 16″, para profesionales que no aceptan límites.",
    highlights: ["Pantalla de 16″ XDR", "Chips M4 Pro / M4 Max", "Tope de gama"],
    image: img("macbook-pro-16-pro-max"),
    priceTotal: 3599,
    pricePay: 2599,
  },
  {
    slug: "lenovo-thinkpad-x1-carbon-gen-12",
    brand: "Lenovo",
    name: "ThinkPad X1 Carbon Gen 12",
    kind: "laptop",
    free: false,
    blurb: "El ThinkPad insignia: ultraligero, potente y con acabados premium. Hasta 32 GB.",
    description:
      "El Lenovo ThinkPad X1 Carbon Gen 12 es el portátil insignia de la gama: ultraligero en fibra de carbono, con potentes procesadores de última generación y acabados premium. Disponible con hasta 32 GB de memoria.",
    highlights: ["Insignia ThinkPad X1", "Chasis de fibra de carbono", "Hasta 32 GB"],
    image: img("lenovo-thinkpad-x1-carbon-gen-12"),
    priceTotal: 1859,
    pricePay: 859,
  },
  {
    slug: "lenovo-thinkpad-x13-2in1-gen-5",
    brand: "Lenovo",
    name: "ThinkPad X13 2-in-1 Gen 5",
    kind: "laptop",
    free: false,
    blurb: "Convertible 2-en-1 con enorme potencia. Disponible también en 32 GB.",
    description:
      "El Lenovo ThinkPad X13 2-in-1 Gen 5 es un convertible que da rienda suelta a una enorme potencia en un formato versátil: úsalo como portátil o como tablet. Disponible también en configuración de 32 GB.",
    highlights: ["Convertible 2-en-1", "Fiabilidad ThinkPad", "Hasta 32 GB"],
    image: img("lenovo-thinkpad-x13-2in1-gen-5"),
    priceTotal: 2179,
    pricePay: 1179,
  },
  {
    slug: "lenovo-thinkbook-14-2in1-g4",
    brand: "Lenovo",
    name: "ThinkBook 14 2-in-1 G4",
    size: "14″",
    kind: "laptop",
    free: false,
    blurb: "Convertible profesional optimizado para un rendimiento superior.",
    description:
      "El Lenovo ThinkBook 14 2-in-1 G4 está optimizado para un rendimiento superior en un formato convertible profesional. Versatilidad y estilo para quienes necesitan adaptarse a cualquier situación de trabajo.",
    highlights: ["Convertible 2-en-1", "Rendimiento superior", "Diseño profesional"],
    image: img("lenovo-thinkbook-14-2in1-g4"),
    priceTotal: 1279,
    pricePay: 279,
  },
  {
    slug: "lenovo-thinkbook-16p-g5",
    brand: "Lenovo",
    name: "ThinkBook 16p G5",
    size: "16″",
    kind: "laptop",
    free: false,
    blurb: "Sumérgete en la informática profesional: estilo y potencia en 16″.",
    description:
      "El Lenovo ThinkBook 16p G5 te sumerge en el futuro de la informática profesional, combinando estilo y potencia en una pantalla de 16″. Pensado para creadores y profesionales que exigen rendimiento.",
    highlights: ["Pantalla de 16″", "Estilo y potencia", "Para creadores"],
    image: img("lenovo-thinkbook-16p-g5"),
    priceTotal: 2439,
    pricePay: 1439,
  },
  {
    slug: "lenovo-thinkpad-p14s-gen-5",
    brand: "Lenovo",
    name: "ThinkPad P14s Gen 5",
    size: "14″",
    kind: "laptop",
    free: false,
    blurb: "Estación de trabajo móvil ultraligera para usuarios avanzados.",
    description:
      "El Lenovo ThinkPad P14s Gen 5 es una estación de trabajo móvil ultraligera con el rendimiento que se desplaza contigo. Certificación profesional y potencia para usuarios avanzados en un formato de 14″.",
    highlights: ["Workstation móvil", "Ultraligera", "Certificación profesional"],
    image: img("lenovo-thinkpad-p14s-gen-5"),
    priceTotal: 2149,
    pricePay: 1149,
  },
  {
    slug: "lenovo-thinkpad-p16s-gen-3",
    brand: "Lenovo",
    name: "ThinkPad P16s Gen 3",
    size: "16″",
    kind: "laptop",
    free: false,
    blurb: "Workstation profesional para flujos de trabajo intensivos.",
    description:
      "El Lenovo ThinkPad P16s Gen 3 es un equipo profesional para usuarios avanzados, con la potencia necesaria para flujos de trabajo intensivos en una pantalla de 16″. Fiabilidad y certificaciones de estación de trabajo.",
    highlights: ["Workstation de 16″", "Para flujos intensivos", "Uso profesional"],
    image: img("lenovo-thinkpad-p16s-gen-3"),
    priceTotal: 2109,
    pricePay: 1109,
  },
  {
    slug: "lenovo-thinkpad-p1-gen-7",
    brand: "Lenovo",
    name: "ThinkPad P1 Gen 7",
    kind: "laptop",
    free: false,
    blurb: "Ingeniería de precisión y tecnología avanzada en una workstation premium.",
    description:
      "El Lenovo ThinkPad P1 Gen 7 está elaborado con ingeniería de precisión y tecnología avanzada. Es la estación de trabajo premium de la gama, para los proyectos más exigentes sin renunciar a la portabilidad.",
    highlights: ["Workstation premium", "Ingeniería de precisión", "Máximo rendimiento"],
    image: img("lenovo-thinkpad-p1-gen-7"),
    priceTotal: 3829,
    pricePay: 2829,
  },
  {
    slug: "lenovo-thinkcentre-premium-monitor",
    brand: "Lenovo",
    name: "ThinkCentre M70q / M75q Gen5 + Monitor Tiny-In-One24 23,8″ Táctil",
    kind: "desktop",
    free: false,
    blurb: "Sobremesa compacto con monitor táctil de 23,8″ integrable. Puesto completo premium.",
    description:
      "Conjunto de sobremesa Lenovo ThinkCentre (M70q / M75q Gen5) con monitor ThinkCentre Tiny-In-One24 de 23,8″ táctil. El Tiny in One integra el ordenador en el propio monitor para un puesto de trabajo completo, limpio y táctil.",
    highlights: ["Sobremesa + monitor táctil", "Monitor 23,8″ integrable", "Puesto premium"],
    image: img("lenovo-thinkcentre-premium-monitor"),
    priceTotal: 1250,
    pricePay: 250,
  },
];

export const ALL_DEVICES: KitDevice[] = [...FREE_DEVICES, ...PREMIUM_DEVICES];

/** Etiqueta legible y única para desplegables y para preseleccionar el modelo. */
export function deviceLabel(d: KitDevice): string {
  return [d.brand, d.name, d.size].filter(Boolean).join(" ");
}

export function getDevice(slug: string): KitDevice | undefined {
  return ALL_DEVICES.find((d) => d.slug === slug);
}

/** Lista para el desplegable del formulario de solicitud. */
export const ALL_DEVICE_OPTIONS: string[] = ALL_DEVICES.map(deviceLabel);

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
