# Prospección: empresas recién constituidas (BORME)

Fecha: 2026-10-19 · Estado: aprobado para implementar (fase 1 concluye que hay vía legal)

## Objetivo

En Prospección (`/panel/ventas/[slug]/prospeccion`), encontrar empresas
constituidas en los últimos 30/90 días en un municipio o provincia para
ofrecerles una web de presentación. Requisito: todo por la vía legal y solo lo
necesario.

## 1. Fuente: BORME, sección A («Actos inscritos»)

- **Acceso**: API de datos abiertos del BOE,
  `GET https://www.boe.es/datosabiertos/api/borme/sumario/{aaaammdd}` con
  `Accept: application/json` (o XML). Devuelve, para la sección A, un documento
  por provincia (`BORME-A-2026-200-28` = Madrid) con su `url_pdf`, `url_html` y
  `url_xml`. Los días sin BORME (sábados, domingos, festivos) devuelven 404.
  Documentación: <https://www.boe.es/datosabiertos/api/api.php>,
  <https://www.boe.es/datosabiertos/documentos/APIsumarioBORME.pdf>,
  <https://www.boe.es/datosabiertos/faq/borme.php>.
- **Formato del XML por provincia** (`https://www.boe.es/diario_borme/xml.php?id=BORME-A-…`):
  pares `<p class="articulo">460946 - RAVAC BRANDS GROUP SL.</p>` +
  `<p class="parrafo">Constitución. Comienzo de operaciones: 4.09.26. Objeto social: … Domicilio: C/ BLAS CABRERA 13 4 IZ (MADRID). Capital: 3.009,35 Euros. Nombramientos. Adm. Unico: APELLIDOS NOMBRE. Datos registrales. …</p>`.
  El PDF firmado es el único texto oficial; el XML es la versión reutilizable.
- **Campos útiles**: número de anuncio, denominación, comienzo de operaciones,
  objeto social (truncado por el propio BORME), domicilio social con el
  municipio entre paréntesis, capital, provincia (la del documento). Los
  **nombramientos** (administradores, apoderados, consejeros) son datos
  personales y **no se guardan** (ver §3).
- **Volumen** (dry-run real del 5 al 16-10-2026, 9 días con BORME): 4.592
  constituciones, **~510 por día en España** (347–679) y **~110 por día en
  Madrid** (0–197; el registro de Madrid no publica todos los días). El 100 %
  trae objeto y capital y el 98 % domicilio con municipio (el resto viene con
  paréntesis descuadrados en el original y se recupera con una regla aparte);
  27 declaran ya una web.

## 2. Condiciones de reutilización

- **Aviso legal del BOE, condiciones de reutilización**
  (<https://www.boe.es/informacion/aviso_legal/index.php#reutilizacion>): se
  aplican a todos los documentos de la sede, BORME incluido, y **permiten la
  reutilización con fines comerciales y no comerciales** (condición tercera),
  incluida la transformación en servicios de valor añadido. Obligaciones
  (condición cuarta): no desnaturalizar la información; **citar la fuente** con
  enlace a boe.es («Basado en datos de la Agencia Estatal Boletín Oficial del
  Estado» para obras derivadas); no sugerir carácter oficial ni patrocinio;
  indicar la fecha de actualización; y, si hay datos personales, cumplir el
  RGPD y la LOPDGDD. La agencia puede cortar el acceso a quien incumpla.
- **Ley 37/2007, de reutilización de la información del sector público**
  (<https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814>): marco de esas
  condiciones; no deroga la normativa de protección de datos.
- **No aplica** la Instrucción DGRN de 17-2-1998
  (<https://www.boe.es/eli/es/ins/1998/02/17/(1)>), que prohíbe incorporar a
  bases de datos la *publicidad formal* del Registro Mercantil (notas simples y
  certificaciones pedidas en masa). Aquí no se pide nada al Registro: se
  reutiliza el diario oficial publicado, bajo las condiciones del BOE.

## 3. Datos personales

- El BORME contiene datos personales: los **nombres de administradores** y, a
  veces, de socios únicos o apoderados. Que sean públicos no legitima por sí
  solo cualquier uso (el RGPD ya no tiene la figura de «fuente accesible al
  público» de la LOPD de 1999; el TJUE en *Manni*, C-398/15,
  <https://curia.europa.eu/juris/liste.jsf?num=C-398/15>, recuerda que su
  publicidad registral tiene una finalidad concreta).
- Para la prospección de dinkbit **no hacen falta**: la carta va a la
  sociedad. Por minimización (art. 5.1.c RGPD) el importador **descarta los
  nombramientos al leer el XML y no los guarda nunca**. Solo se guardan datos de
  la persona jurídica: denominación, domicilio social, objeto, capital y
  fechas.
- Los datos de personas jurídicas no son datos personales (RGPD, considerando
  14, <https://eur-lex.europa.eu/eli/reg/2016/679/oj>), salvo que la
  denominación identifique a una persona física (TJUE *Volker und Markus
  Schecke*, C-92/09, <https://curia.europa.eu/juris/liste.jsf?num=C-92/09>), p.
  ej. «JUAN PÉREZ GARCÍA SL», o que el domicilio social sea la vivienda del
  socio único. Para esos casos límite la base es el interés legítimo (art.
  6.1.f RGPD), en línea con la presunción del art. 19 LOPDGDD para contactar
  con una empresa en su condición de tal
  (<https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673>), y la carta lleva
  igualmente la información del art. 14 RGPD (ver §5). La AEPD apercibió en
  2024 a una empresa que hizo prospección B2B con datos de fuentes públicas
  precisamente por **no dar la información del art. 14**, aunque aceptó el
  interés legítimo del art. 19 (EXP202411421,
  <https://www.aepd.es/documento/pa-00015-2024.pdf>). No he encontrado
  resoluciones de la AEPD específicas sobre BORME y marketing en el marco del
  RGPD (la E/00822/2014, <https://www.aepd.es/documento/e-00822-2014.pdf>, es
  anterior y versa sobre un servicio de información mercantil).

## 4. Autónomos recién dados de alta: no hay fuente reutilizable

- **RETA (Seguridad Social)**: los datos tienen carácter reservado (art. 77
  LGSS, <https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724>).
- **Censo de empresarios de la AEAT (036/037)**: datos tributarios reservados
  (art. 95 LGT, <https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186>).
- **IAE**: las personas físicas están exentas (art. 82.1.c del TRLRHL,
  <https://www.boe.es/buscar/act.php?id=BOE-A-2004-4214>) y las sociedades
  también durante sus dos primeros periodos; además, la exposición de la
  matrícula es para consulta, no para reutilización.
- **Censo público de las Cámaras de Comercio** (Ley 4/2014): se nutre de datos
  de la AEAT para las funciones de las cámaras; no es un conjunto de datos
  abierto. No he podido verificar el texto exacto de su art. 8, así que no se
  usa.
- Los autónomos no se inscriben en el Registro Mercantil (salvo excepciones),
  así que tampoco salen en el BORME.

**Conclusión**: no se implementa nada para autónomos.

## 5. Canal de contacto

- **Carta postal a la sociedad en su domicilio social**: es el canal legal y
  natural. La LSSI solo regula las comunicaciones comerciales **electrónicas**
  (art. 21 LSSI, <https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758>), así
  que no exige consentimiento previo para el correo postal. La carta va dirigida
  a «la dirección» de la sociedad, **sin nombre de persona**. Así tampoco aplica
  la consulta obligatoria de la Lista Robinson (art. 23.4 LOPDGDD), que es para
  personas físicas identificadas; si algún día se escribiera a un administrador
  por su nombre, habría que consultarla antes.
- **Aviso del art. 14 RGPD**: dirigida a una persona jurídica no sería
  estrictamente necesario, pero cuesta una línea y cubre los casos límite del
  §3. El pie de la carta dice: quién escribe (Dinkbit Marketing S.L., NIF y
  domicilio), de dónde salen los datos (BORME), para qué (ofrecer sus
  servicios), la base (interés legítimo), cómo oponerse (un email; se le
  descarta y no se le vuelve a escribir) y el enlace a la política de
  privacidad. Si alguien se opone se marca «Descartado».
- **Cruce con Overture (`prospect_lugares`) para sacar un teléfono**: legal
  (son teléfonos publicados por el propio negocio, con licencia abierta, igual
  que en la búsqueda normal), pero **poco útil y arriesgado**: Overture solo
  tiene importadas las categorías de Prospección, se actualiza una vez al mes y
  a partir de fichas de Meta/Foursquare que una empresa de semanas casi nunca
  tiene; además la denominación social («RICHARD SERVICIOS INTEGRALES SL») casi
  nunca coincide con el nombre comercial, y un cruce aproximado acabaría
  llamando a otro negocio. **No se implementa** en esta versión. Si una empresa
  del BORME ya está en Overture, saldrá en la búsqueda normal con su teléfono.
- **Email**: no. La empresa no ha publicado ninguno y deducirlo sería tratar
  datos sin base; además, por email sí aplica la LSSI.

## 6. Diseño (mínimo)

### Datos

Tabla nueva `prospect_borme` (SQL: `docs/sql/2026-10-19-prospeccion-borme.sql`),
una fila por constitución, upsert por `id` = `{año}-{número de anuncio}` (el
número de anuncio es correlativo en todo el BORME del año):

| columna | |
|---|---|
| `id` | `2026-460946` |
| `nombre` | denominación |
| `fecha_publicacion` | fecha del BORME |
| `inicio_operaciones` | «Comienzo de operaciones», si viene |
| `objeto` | objeto social (ya viene truncado del BORME) |
| `domicilio`, `municipio`, `municipio_clave`, `provincia` | domicilio social |
| `capital` | euros |
| `borme_id`, `url_pdf` | documento de origen, para citar la fuente |

Sin columnas de personas. RLS activa sin políticas, como el resto de
`prospect_*`. Los prospectos que salen de aquí usan `source = 'borme'`, que ya
admite el CHECK de `prospects` y `prospect_searches`.

### Importación

`scripts/prospeccion/importar-borme.ts`, como el de Overture: `--dias N`
(por defecto 7) o `--desde aaaa-mm-dd [--hasta aaaa-mm-dd]`, `--provincia`,
`--dry-run`, `--salida archivo.json`. Por cada día: sumario → documentos de la
sección A (menos el índice alfabético) → XML → constituciones. Peticiones en
serie y con pausa, con `User-Agent` identificable. Re-ejecutable.

### Pantalla

En Prospección, una segunda tarjeta «Empresas nuevas (BORME)»: municipio o
provincia, antigüedad (30 o 90 días) y, opcional, palabra del objeto social
(p. ej. «restaurante», «estética»). Guarda hasta 200 como prospectos
`source = 'borme'` en estado «Sin email» con la nota «Recién constituida: carta
al domicilio social», sin pasar por la revisión de webs. En la tabla, esas filas
tienen **«Preparar carta»**: abre un PDF A4 (ruta
`prospeccion/carta/[id]`, mismo acceso que la pestaña) con el remitente, la
sociedad «a la atención de la dirección» en la ventana del sobre, un texto fijo
(`src/lib/prospeccion/carta.ts`) y el pie del art. 14. El BORME casi nunca da
el código postal: hay que añadirlo a mano en el sobre. Debajo de la tarjeta, la
atribución del BOE.

### Fuera de alcance

Autónomos; cruce con Overture; envío postal automático; seguimiento de cartas
(se usa «Descartar» y, si contestan, se trabaja como cualquier lead).
