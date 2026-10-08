/**
 * Tipos de negocio que se pueden buscar en OpenStreetMap.
 *
 * Lista cerrada y no texto libre porque OSM no entiende «restaurante»: cada
 * negocio lleva etiquetas (`amenity=restaurant`), y hay que saber cuáles pedir.
 * Sin `server-only`: el buscador del panel pinta el desplegable con esto.
 */
export interface CategoriaOsm {
  clave: string;
  texto: string;
  /** Filtros de Overpass; un negocio entra si cumple cualquiera. */
  filtros: string[];
}

export const CATEGORIAS: CategoriaOsm[] = [
  { clave: "restaurantes", texto: "Restaurantes", filtros: ['["amenity"="restaurant"]'] },
  { clave: "bares", texto: "Bares y cafeterías", filtros: ['["amenity"~"^(bar|cafe|pub)$"]'] },
  { clave: "hoteles", texto: "Hoteles y alojamientos", filtros: ['["tourism"~"^(hotel|guest_house|hostel|apartment)$"]'] },
  { clave: "dentistas", texto: "Clínicas dentales", filtros: ['["amenity"="dentist"]', '["healthcare"="dentist"]'] },
  { clave: "clinicas", texto: "Clínicas y consultas médicas", filtros: ['["amenity"~"^(clinic|doctors)$"]'] },
  { clave: "fisioterapia", texto: "Fisioterapia", filtros: ['["healthcare"="physiotherapist"]'] },
  { clave: "psicologia", texto: "Psicología", filtros: ['["healthcare"~"^(psychotherapist|psychologist)$"]'] },
  { clave: "veterinarios", texto: "Veterinarios", filtros: ['["amenity"="veterinary"]'] },
  { clave: "opticas", texto: "Ópticas", filtros: ['["shop"="optician"]'] },
  { clave: "peluquerias", texto: "Peluquerías", filtros: ['["shop"="hairdresser"]'] },
  { clave: "estetica", texto: "Centros de estética", filtros: ['["shop"="beauty"]'] },
  { clave: "gimnasios", texto: "Gimnasios", filtros: ['["leisure"="fitness_centre"]'] },
  { clave: "talleres", texto: "Talleres de coches", filtros: ['["shop"="car_repair"]'] },
  { clave: "inmobiliarias", texto: "Inmobiliarias", filtros: ['["office"="estate_agent"]'] },
  { clave: "abogados", texto: "Abogados", filtros: ['["office"="lawyer"]'] },
  { clave: "asesorias", texto: "Asesorías y gestorías", filtros: ['["office"~"^(accountant|tax_advisor)$"]'] },
  { clave: "academias", texto: "Academias y autoescuelas", filtros: ['["amenity"~"^(language_school|driving_school|music_school)$"]'] },
  { clave: "ropa", texto: "Tiendas de ropa", filtros: ['["shop"="clothes"]'] },
  { clave: "floristerias", texto: "Floristerías", filtros: ['["shop"="florist"]'] },
  { clave: "panaderias", texto: "Panaderías y pastelerías", filtros: ['["shop"~"^(bakery|pastry)$"]'] },
];

export function categoriaPorClave(clave: string): CategoriaOsm | null {
  return CATEGORIAS.find((c) => c.clave === clave) ?? null;
}
