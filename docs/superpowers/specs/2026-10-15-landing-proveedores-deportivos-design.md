# Landing «Pack Campaña + CRM» para proveedores deportivos

Fecha: 2026-10-15 · Estado: diseño aprobado en conversación, pendiente de revisión escrita

## Para qué

Captar marcas y distribuidores de material deportivo (pádel, equipaciones,
merchandising, consumibles de gimnasio, suelos, trofeos, nutrición) que quieren
vender a gimnasios, clubes de pádel, boxes, clubes y estudios, y venderles el
**Pack Campaña + CRM: 350 € + IVA/mes**. Este pack incluye la campaña en Meta Ads
con muestras gratuitas y el acceso al CRM de `/panel/ventas`.

La conversión es el formulario del hero. El tráfico viene casi todo de
Instagram y Facebook en el móvil.

Éxito: la página carga rápido en móvil, se ve deportiva y premium, y cada envío
del formulario:
- crea un lead en `/panel/ventas` con todas las respuestas;
- dispara `Lead` en el píxel de Meta y en CAPI con el mismo `eventId`;
- lleva a una página de gracias con botón de WhatsApp.

## Decisiones tomadas

- **Marca dinkbit, dirección `https://www.dinkbit.es/proveedores-deportivos`.**
- **Grupo de rutas propio `(deporte)`** con layout oscuro, sin el header claro de
  `(landing)`. Es el mismo patrón que `(growth)`: la página parece un producto, y
  la firma de dinkbit (logo y enlaces legales) va en el pie.
- **Los leads van al CRM de ventas B2B, en una marca nueva «Proveedores
  deportivos»** (slug `proveedores-deportivos`), no en `dinkbit`. En `dinkbit`
  están los leads de clínicas de Growth y de WhatsApp; mezclarlos estropearía
  el embudo y los tipos de negocio. La marca se crea a mano desde
  `/panel/ventas`; el código solo conoce el slug.
- **Precio mensual:** «350 € + IVA/mes» en toda la página, desde una sola
  constante.
- **Fotos libres** (Unsplash/Pexels) optimizadas a WebP. **Hero con collage
  animado, no vídeo**: carga antes en móvil y no hace falta imagen de respaldo.
- **No se inventa nada:** cifras, testimonios, logos de clientes, varias
  respuestas de FAQ, la inversión mínima recomendada y dos líneas del pack van
  como `[PLACEHOLDER]` visibles.

## Fuera de alcance

- Vídeo en el hero.
- Reenviar el lead al CRM general de `/panel`.
- Columnas nuevas en `ventas_leads` para las respuestas del formulario: van en
  la nota inicial.
- Tipos de negocio nuevos en el catálogo de ventas.
- Autorrespuesta por email al lead.

## 1. Estructura y estilo

**Rutas.**
- `src/app/(deporte)/layout.tsx`: fondo y fuente propios, pie con el logo de
  dinkbit, email, aviso legal, privacidad y cookies.
- `src/app/(deporte)/proveedores-deportivos/page.tsx`: la landing, con metadata,
  canonical, Open Graph y JSON-LD (`Service` con `Offer` y `FAQPage`).
- `src/app/(deporte)/proveedores-deportivos/gracias/page.tsx`: confirmación y
  botón de WhatsApp. Lleva `robots: noindex`.

**Contenido y constantes.** Todo el texto, las opciones del formulario, las FAQ y
el precio viven en `src/lib/proveedores-deportivos.ts`, para que la página, el
JSON-LD y la validación lean lo mismo. Los componentes van en
`src/components/proveedores-deportivos/`.

**Paleta y tipografía.**
- Fondo grafito `#0B0C0E`, superficies `#15171B`, texto `#FFFFFF` y
  `#B8BDC6`, acento verde lima `#C6FF3D`. El texto que va sobre el acento es
  negro `#0B0C0E`.
- Los colores se fijan en el layout, como hace `GROWTH_THEME`, y no con los
  tokens del tema del sitio.
- Titulares en **Anton** (`next/font/google`, cargada solo en este grupo) y
  texto en la Source Sans del sitio.
- Todo el texto sobre foto lleva una capa oscura que asegura contraste AA.

**Imágenes.**
- De 10 a 12 fotos de Unsplash/Pexels: pistas de pádel, gimnasio, box,
  producto, cajas llegando a un club y manos abriendo un paquete.
- Van en `public/img/deporte/` en WebP, con un ancho máximo de 1600 px y un
  peso de unos 200 KB cada una.
- `public/img/deporte/FUENTES.md` apunta la URL y la licencia de cada foto.
- Se sirven con `next/image` y con `priority` solo en el hero.

**Movimiento.**
- Un componente cliente `AlAparecer` (IntersectionObserver) para la aparición
  escalonada.
- `Contador`, para que los números suban al entrar en pantalla. Con un
  placeholder no anima: muestra el texto tal cual.
- Collage del hero con desplazamiento lento en CSS.
- Todo se desactiva con `prefers-reduced-motion`.

**Iconos.** SVG en línea de trazo grueso (2,25 px), en un solo fichero
`Iconos.tsx`. Sin dependencias nuevas.

**Móvil primero.** La página está pensada primero para 360–430 px. Un botón fijo
abajo en móvil lleva al formulario; se oculta mientras el formulario está en
pantalla.

## 2. Secciones

Por orden y con los textos del brief:

1. **Hero** a pantalla completa:
   - badge «PACK CAMPAÑA + CRM · 350 € + IVA/MES»;
   - titular, subtítulo y tres bullets con icono;
   - formulario en una tarjeta con borde y brillo de acento;
   - collage de producto detrás.
2. **Cifras:** tres contadores con `[X]` como placeholder.
3. **El problema:** tres tarjetas con foto e icono.
4. **Cómo funciona:** cuatro pasos numerados, en línea horizontal en
   escritorio y vertical en móvil.
5. **Para quién es:** seis tarjetas con foto y capa oscura, que se iluminan en
   acento al pasar el ratón o al tocarlas.
6. **Ejemplo de anuncio:** un móvil con un post de Instagram («¿Tienes un club
   de pádel? Te enviamos una caja de pelotas…») y el formulario de muestra.
   Hecho en HTML y CSS, de frente y sin perspectiva.
7. **Casos:** tres tarjetas con `[LOGO CLIENTE]`, `[TESTIMONIO REAL]` y
   `[RESULTADO]`.
8. **Precio:**
   - tarjeta destacada con «350 €» y «+ IVA/mes»;
   - seis puntos con check; los dos del brief que van entre corchetes se quedan
     como placeholder;
   - la nota sobre la inversión en Meta, con su `[X €/mes]`;
   - el botón «EMPEZAR AHORA»;
   - al lado, un mockup de portátil con el kanban del CRM, con las columnas
     Muestra solicitada → Muestra enviada → Seguimiento → Pedido y tarjetas de
     centros deportivos inventados que se ven claramente como ejemplo.
9. **FAQ:** acordeón con `<details>`. El JSON-LD solo incluye las preguntas
   con respuesta real: cuánto cuesta y cómo se filtra a los curiosos.
10. **CTA final** con el precio, y pie.

Los placeholders se pintan con un estilo visible (fondo de acento tenue y
borde discontinuo), para que no se publiquen sin rellenar por despiste.

## 3. Formulario

**Campos** (`FormularioPack`, componente cliente, dos pasos con barra de
progreso):

| Paso | Campo | Tipo | Obligatorio |
|---|---|---|---|
| 1 | Nombre y apellidos | texto | sí |
| 1 | Empresa | texto | sí |
| 1 | Web o Instagram | texto | sí |
| 1 | Email | email | sí |
| 1 | Teléfono / WhatsApp | tel | sí |
| 2 | ¿Qué vendes? | select (8 opciones del brief) | sí |
| 2 | ¿A quién quieres vender? | chips, selección múltiple (6), al menos uno | sí |
| 2 | Facturación anual | select (4) | sí |
| 2 | ¿Podéis enviar muestras gratuitas? | Sí / No / Depende | sí |
| 2 | Presupuesto mensual en publicidad | select (4) | sí |
| 2 | Acepto la política de privacidad | checkbox con enlace | sí |

Además, el campo trampa oculto `website_url` y el `eventId`.

**Validación.**
- Un esquema zod en `src/lib/proveedores-deportivos.ts`. Lo usan el cliente,
  para validar cada paso antes de avanzar, y el servidor.
- Los selects y los chips solo admiten los valores del catálogo.
- El teléfono pasa por `normalizarTelefono` del módulo de ventas.

**Envío.** La server action `enviarSolicitudPack(formData)` en
`src/lib/proveedores-deportivos-action.ts`:

1. Si es un bot (`esEnvioBot`), responde `ok` sin guardar nada.
2. Aplica el límite por IP con `crearLimitador`: 5 envíos cada 10 minutos.
3. Valida con zod. Si algo no cuadra, devuelve los errores por campo.
4. Llama a `recibirLeadFormulario` con el slug `proveedores-deportivos` y:
   - `contacto` = nombre;
   - `negocio` = empresa;
   - `email`, `telefono`;
   - `web` = web o Instagram.

   Las respuestas del paso 2 van en `nota`, montada por la función pura
   `notaSolicitudPack` como «Desde la landing de proveedores deportivos.» más
   una línea por respuesta.

   `recibirLeadFormulario` hoy solo pasa a la nota los campos de Hydrup
   (socios, reparto, comentarios). Se amplía para aceptar una nota que le pase
   quien llama, y la ruta pública no cambia de comportamiento.
5. Envía `Lead` por CAPI con el `eventId` usando `sendMetaLead` (`meta-capi.ts`), como web-299.
6. Si la marca no existe o está pausada, lo registra en el log y devuelve un
   error genérico («No hemos podido enviar tu solicitud. Escríbenos por
   WhatsApp.») con el enlace de WhatsApp. El lead no se pierde en silencio.
7. Si todo va bien, devuelve `ok`.
8. Un lead duplicado (mismo email o teléfono) cuenta como éxito para el
   visitante, porque así ya lo hace `guardarLeadEntrante`.

**En el navegador**, cuando el envío va bien:
- se lanzan `trackMetaLead(eventId)` y `trackChatGptLead(eventId)`;
- se navega a `/proveedores-deportivos/gracias`.

Mientras se envía, el botón queda deshabilitado; si falla, se muestra un
mensaje accesible (`role="alert"`).

## 4. Página de gracias

- Titular de confirmación y «Te respondemos en menos de 24 h».
- Botón de WhatsApp con el texto ya escrito: «Hola, acabo de pedir el Pack
  Campaña + CRM».
- Enlace para volver.
- Misma estética y `noindex`.

## Despliegue

1. Crear en `/panel/ventas` la marca «Proveedores deportivos» con el slug
   `proveedores-deportivos` y el estado «activa». Hay que hacerlo antes de
   anunciar la página: sin la marca, el formulario da error y remite a
   WhatsApp.
2. Desplegar el código. No hay migración SQL.

## Errores

- Validación: un mensaje en cada campo, y en el paso 2 no se envía hasta que
  todo cuadra.
- Límite superado: «Has enviado varias solicitudes seguidas. Prueba en unos
  minutos o escríbenos por WhatsApp.»
- Fallo del CRM o falta de la marca: error genérico con enlace a WhatsApp.
  CAPI no se envía.

## Pruebas

- `proveedores-deportivos.test.ts`:
  - el esquema exige los obligatorios, al menos un chip y el RGPD;
  - rechaza valores fuera del catálogo;
  - `notaSolicitudPack` monta las líneas con etiquetas legibles.
- `proveedores-deportivos-action.test.ts`, con `recibirLeadFormulario` y CAPI
  simulados:
  - un envío válido crea el lead con la nota y manda CAPI;
  - un bot no crea nada;
  - con datos inválidos devuelve los errores;
  - si la marca no existe, devuelve el error con WhatsApp y no manda CAPI;
  - se respeta el límite por IP.
- `ventas-servicios`: la nota que llega de fuera se guarda, y la ruta pública
  sigue igual.
- Render: el precio sale idéntico en el badge, los bullets, la tarjeta de
  precio, el CTA final y el JSON-LD, y los placeholders se ven.
- Typecheck, lint, build y la suite completa.
- Revisión visual con Playwright a 390 px y 1440 px:
  - contraste sobre las fotos;
  - el botón fijo en móvil;
  - los dos pasos del formulario.
