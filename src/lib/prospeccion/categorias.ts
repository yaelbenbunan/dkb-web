/**
 * Tipos de negocio que se pueden buscar, con cómo los clasifica cada fuente.
 *
 * Lista cerrada y no texto libre porque ninguna fuente entiende «restaurante»:
 * OpenStreetMap usa etiquetas (`amenity=restaurant`) y Overture una taxonomía
 * (`food_and_drink > restaurant > …`). Sin `server-only` ni imports: la usan el
 * desplegable del panel y el script de importación de Overture.
 */
export interface CategoriaOverture {
  /** Nodos de `taxonomy.hierarchy` (o de `alternates`): entra todo lo que cuelga de ellos. */
  nodos: string[];
  /** Nodos genéricos que solo cuentan como `taxonomy.primary` exacta: sus hijos
   *  no son todos de la categoría (de `real_estate_service` cuelgan promotoras). */
  exactas?: string[];
}

export interface CategoriaOsm {
  clave: string;
  texto: string;
  /** Filtros de Overpass; un negocio entra si cumple cualquiera. */
  filtros: string[];
  /** Nodos de la taxonomía de Overture Places (esquema v2, release 2026-09-23.1). */
  overture: CategoriaOverture;
}

export const CATEGORIAS: CategoriaOsm[] = [
  { clave: "restaurantes", texto: "Restaurantes", filtros: ['["amenity"="restaurant"]'], overture: { nodos: ["restaurant"] } },
  { clave: "bares", texto: "Bares y cafeterías", filtros: ['["amenity"~"^(bar|cafe|pub)$"]'], overture: { nodos: ["bar", "cafe", "coffee_shop", "tapas_bar"] } },
  { clave: "hoteles", texto: "Hoteles y alojamientos", filtros: ['["tourism"~"^(hotel|guest_house|hostel|apartment)$"]'], overture: { nodos: ["hotel", "hostel", "bed_and_breakfast", "guest_house", "service_apartment", "resort"], exactas: ["lodging"] } },
  { clave: "dentistas", texto: "Clínicas dentales", filtros: ['["amenity"="dentist"]', '["healthcare"="dentist"]'], overture: { nodos: ["dental_clinic"] } },
  { clave: "clinicas", texto: "Clínicas y consultas médicas", filtros: ['["amenity"~"^(clinic|doctors)$"]'], overture: { nodos: ["doctors_office", "specialized_health_care", "reproductive_perinatal_and_womens_care"], exactas: ["outpatient_care_facility"] } },
  { clave: "fisioterapia", texto: "Fisioterapia", filtros: ['["healthcare"="physiotherapist"]'], overture: { nodos: ["physical_therapy"] } },
  { clave: "psicologia", texto: "Psicología", filtros: ['["healthcare"~"^(psychotherapist|psychologist)$"]'], overture: { nodos: ["psychiatry_or_psychology_service", "counseling"] } },
  { clave: "veterinarios", texto: "Veterinarios", filtros: ['["amenity"="veterinary"]'], overture: { nodos: ["veterinary_care"] } },
  { clave: "opticas", texto: "Ópticas", filtros: ['["shop"="optician"]'], overture: { nodos: ["eyewear_store", "vision_or_eye_care_clinic"] } },
  { clave: "peluquerias", texto: "Peluquerías", filtros: ['["shop"="hairdresser"]'], overture: { nodos: ["hair_salon", "barber"] } },
  { clave: "estetica", texto: "Centros de estética", filtros: ['["shop"="beauty"]'], overture: { nodos: ["beauty_salon", "nail_salon", "skin_care_and_makeup", "hair_removal"] } },
  { clave: "gimnasios", texto: "Gimnasios", filtros: ['["leisure"="fitness_centre"]'], overture: { nodos: ["gym", "fitness_studio"] } },
  { clave: "talleres", texto: "Talleres de coches", filtros: ['["shop"="car_repair"]'], overture: { nodos: ["automotive_repair", "auto_body_shop"] } },
  { clave: "inmobiliarias", texto: "Inmobiliarias", filtros: ['["office"="estate_agent"]'], overture: { nodos: ["real_estate_agent"], exactas: ["real_estate_service"] } },
  { clave: "abogados", texto: "Abogados", filtros: ['["office"="lawyer"]'], overture: { nodos: ["attorney_or_law_firm"], exactas: ["legal_service"] } },
  { clave: "asesorias", texto: "Asesorías y gestorías", filtros: ['["office"~"^(accountant|tax_advisor)$"]'], overture: { nodos: ["accountant", "tax_service"] } },
  { clave: "academias", texto: "Academias y autoescuelas", filtros: ['["amenity"~"^(language_school|driving_school|music_school)$"]'], overture: { nodos: ["language_school", "driving_school", "music_school", "tutoring_service"] } },
  { clave: "ropa", texto: "Tiendas de ropa", filtros: ['["shop"="clothes"]'], overture: { nodos: ["clothing_store", "fashion_boutique"] } },
  { clave: "floristerias", texto: "Floristerías", filtros: ['["shop"="florist"]'], overture: { nodos: ["florist"], exactas: ["flowers_and_gifts_store"] } },
  { clave: "panaderias", texto: "Panaderías y pastelerías", filtros: ['["shop"~"^(bakery|pastry)$"]'], overture: { nodos: ["bakery"] } },
];

export function categoriaPorClave(clave: string): CategoriaOsm | null {
  return CATEGORIAS.find((c) => c.clave === clave) ?? null;
}
