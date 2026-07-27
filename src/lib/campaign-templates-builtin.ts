import { Block, DEFAULT_FOOTER_BLOCK } from "./campaign-blocks";

export const BUILTIN_TEMPLATES = [
  {
    id: "anuncio",
    name: "Anuncio",
    description: "Plantilla con titular, punto de interés y botón de acción.",
    is_builtin: true,
    blocks: [
      {
        id: "anuncio-hero",
        type: "hero",
        props: {
          eyebrow: "dinkbit",
          title: "Título de tu anuncio",
          body: "Describe brevemente el contenido o la propuesta.",
        },
      },
      {
        id: "anuncio-checklist",
        type: "checklist",
        props: {
          items: ["Punto de interés 1", "Punto de interés 2", "Punto de interés 3"],
        },
      },
      {
        id: "anuncio-button",
        type: "button",
        props: {
          label: "Ver más",
          url: "https://www.dinkbit.es",
        },
      },
      DEFAULT_FOOTER_BLOCK,
    ] as Block[],
  },
  {
    id: "newsletter-simple",
    name: "Newsletter simple",
    description: "Plantilla de boletín con dos párrafos y botón de acción.",
    is_builtin: true,
    blocks: [
      {
        id: "newsletter-hero",
        type: "hero",
        props: {
          title: "Noticias de esta semana",
          body: "Lo más destacado en tu sector.",
        },
      },
      {
        id: "newsletter-paragraph-1",
        type: "paragraph",
        props: {
          text: "Primer párrafo con contenido relevante sobre las noticias o actualizaciones que quieres compartir.",
        },
      },
      {
        id: "newsletter-paragraph-2",
        type: "paragraph",
        props: {
          text: "Segundo párrafo con más detalles o información complementaria para enriquecer el mensaje.",
        },
      },
      {
        id: "newsletter-button",
        type: "button",
        props: {
          label: "Leer más",
          url: "https://www.dinkbit.es",
        },
      },
      {
        id: "newsletter-divider",
        type: "divider",
        props: {},
      },
      DEFAULT_FOOTER_BLOCK,
    ] as Block[],
  },
] as const;
