# Sistema de captación medible para clínicas — definición de producto

**Fecha:** 2026-08-17
**Estado:** definición aprobada en conversación; pendiente de spec técnico por fase
**Ámbito:** cruza cuatro repos. Este documento es la fuente de verdad de las decisiones;
cada fase tendrá su propio spec técnico.

---

## 1. Qué vendemos

No vendemos web, ni campañas, ni CRM, ni dashboard. Esas son las piezas.

> **Vendemos saber cuánto cuesta conseguir un paciente y cuánto dinero genera cada canal.**

La clínica hoy tiene un agujero negro entre el anuncio y la caja:

```
Anuncio → web → formulario → ¿??? → paciente → facturación
```

Nosotros cerramos el circuito y respondemos, en una pantalla:

- Cuánto se ha invertido
- Cuántos leads han entrado, y de qué canal
- Cuántos han acabado con cita
- Cuántos **acudieron de verdad**
- Cuánto han generado
- Cuál es el retorno

La frase que resume el posicionamiento: **deja de medir leads, empieza a medir pacientes.**

### Por qué esto y no "otra agencia"

Una agencia que vende "web + SEO + redes + Google Ads" compite por precio contra cientos
iguales. Un sistema que le dice al dueño cuánto le cuesta un paciente cambia la
conversación de *"¿me estás llevando bien las campañas?"* a *"¿cómo consigo que el mes
que viene Google me traiga 25 pacientes?"*.

Eso además convierte la tecnología que ya tenemos internamente en el producto que hace
posible la propuesta, en lugar de ser una herramienta de uso interno.

---

## 2. A quién

**Fase de lanzamiento: clínicas en general** — dental, estética, fisioterapia, psicología,
medicina privada.

La segmentación por vertical se hará en las campañas, no en el producto. El mensaje y la
calculadora usan vocabulario genérico (**"paciente"**, no "paciente dental") porque el
cálculo del coste de adquisición es idéntico en todos los sectores. Eso permite una sola
landing y una sola calculadora para todos.

Requisito implícito del cliente ideal: que el valor de un paciente sea alto. Sin eso, el
retorno de la publicidad no da y el producto no tiene nada bueno que enseñar.

**Objetivo comercial inicial: 10 clínicas piloto**, no "vender suscripciones". Las diez
primeras existen para generar casos de éxito con cifras reales, detectar qué falla en el
producto y medir cuánto trabajo real cuesta atender a una clínica.

---

## 3. La oferta

| Concepto | Quién paga | Nota |
|---|---|---|
| Cuota de alta | la clínica, primer mes | Variable según inversión y número de canales |
| Suscripción mensual | la clínica | Punto de partida 199 €, sin permanencia |
| Inversión publicitaria | la clínica, siempre | Va directa a Google y Meta, nunca pasa por nosotros |

La mensualidad incluye web, CRM, agenda, dashboard y gestión de campañas. Fuera queda
únicamente lo que la clínica paga a las plataformas.

**Los 199 € son un punto de partida deliberadamente atractivo, no un precio definitivo.**
La cuota de alta existe porque el trabajo inicial es real y concentrado: web, configuración
de campañas, alta en el sistema. Sin ella, una clínica que se va al segundo mes nos deja
en pérdidas.

**La cuota de alta es variable, no una cifra fija**, porque el trabajo inicial no es el
mismo: una clínica con 200 € de presupuesto y un solo canal no da el mismo trabajo de
configuración que una con 2.000 € en Google y Meta. Se calcula sobre inversión prevista y
número de canales.

Consecuencia para la landing: **no podemos publicar un importe de alta, pero sí decir que
existe.** Anunciar "desde 199 €/mes" y soltar el pago inicial en la llamada es la peor
secuencia posible — mata la confianza justo en el momento de cerrar, y la confianza es el
producto. La landing dice que hay cuota de alta y que depende de la inversión.

### Dos modalidades: web nueva o landing paralela

**No integramos nunca con la web que ya tiene la clínica.** Si quiere conservarla, adelante:
le montamos una **landing paralela** en un subdominio suyo (`citas.suclinica.com`) y ahí
dirigimos todo el tráfico de campañas.

Los motivos, por orden de importancia:

1. **Nos haría responsables de un número que no podemos mover.** Vendemos resultados
   medibles. Si su web convierte mal y no podemos tocarla, cargamos con la mala cifra sin
   capacidad de arreglarla.
2. **No es una integración, son N.** Cada clínica tiene un stack distinto — WordPress con
   Elementor, Wix, Squarespace, algo a medida de hace diez años. Entrar en código ajeno con
   un equipo que no es de desarrollo puro es alcance sin fondo.
3. **Fragilidad operativa.** Una actualización de un plugin deja de mandarnos leads, y la
   culpa es nuestra aunque no lo sea.

Y la landing paralela no es el premio de consolación, es **técnicamente mejor**: a esa
página solo llega tráfico de campañas, así que la atribución sale más limpia que mezclada
con el orgánico de su web. Control total de la conversión y posibilidad de test A/B. Además
el grupo `(landing)` de `dkb-web` existe exactamente para esto.

**Ventaja comercial:** elimina la objeción "ya tengo web", que iba a salir constantemente, y
baja mucho la barrera de entrada. La cuota de alta de esta modalidad es menor, porque una
landing es mucho menos trabajo que una web completa — encaja con que el alta ya sea variable.

**Y el límite que hay que decir en voz alta:** los pacientes que entren por su web de
siempre **no estarán en el CRM**. Ver §5.4.

### La economía mejora con cada cliente

El coste de atender a la clínica número diez es una fracción del de la primera, porque la
web se recicla (cambian logo, colores y contenido, no la arquitectura) y la configuración
se estandariza. Esto tiene dos consecuencias de gestión:

1. **Las primeras clínicas serán poco rentables o directamente no rentables.** Es una
   inversión en casos de éxito, y hay que entrar sabiéndolo.
2. **Hay que medir el coste real de atender a cada clínica** desde la primera, o no
   sabremos cuándo el precio deja de tener sentido. Es literalmente lo que le vendemos al
   cliente: aplicárnoslo a nosotros mismos no es opcional.

### El modelo "todo es nuestro"

La clínica usa el sistema mientras paga. Si deja de pagar, pierde el acceso, incluida la
web. El coste de una web para un solo mes es un riesgo asumido a cambio de que el precio
de entrada sea imbatible, y se mitiga reciclando el desarrollo.

**Límite legal de este modelo:** el software se puede apagar, pero **los datos de sus
pacientes son suyos**. La clínica es responsable del tratamiento y nosotros encargados. Hay
que poder exportarles sus datos cuando lo pidan, con o sin suscripción activa. Ver §9.

**El dominio es de la clínica.** Nosotros alojamos y servimos; ellos son dueños del dominio.
Al causar baja se rompe la conexión y el dominio se queda apuntando a nada hasta que lo
redirijan. Esto evita el conflicto de retenerle a alguien su propia marca, y no debilita el
modelo: lo que se apaga es el sistema, que es lo que tiene el valor.

### "Me quiero quedar la web pero no seguir pagando"

Esta objeción va a salir en **todas** las llamadas, así que conviene tener la respuesta
preparada en lugar de improvisarla: **se la vendemos.** Un precio de compra de la web,
puntual, y se la queda.

Tres cosas a tener en cuenta al fijar ese precio:

1. **Que no sea la vía de escape barata.** Si comprar la web sale más a cuenta que seguir
   suscrito, acabamos siendo un estudio de diseño con pasos extra. El precio de compra debe
   ser el coste real del desarrollo, no una fracción.
2. **Compran la web, no el sistema.** Se van sin CRM, sin agenda y sin dashboard, es decir,
   sin saber qué campaña les trae pacientes. Eso no es un castigo: es la propuesta de valor
   dicha en voz alta, y es el mejor argumento de retención que hay.
3. **Técnicamente es viable por una decisión ya tomada.** Al ser cada web un despliegue
   propio a partir de plantilla (§8) y no un multi-tenant, entregarla es traspasar un repo y
   un despliegue. Si la web fuera multi-tenant, extraer una sola clínica sería un proyecto.
   Esta objeción comercial es la segunda razón para mantener esa decisión.

---

## 4. El sistema, en cuatro capas

```
CAPTACIÓN        Google Ads + Meta Ads, creatividades, optimización
      ↓
CONVERSIÓN       Web/landing orientada a conversión, formularios, WhatsApp
      ↓
GESTIÓN          CRM de tres columnas + agenda
      ↓
INTELIGENCIA     Inversión → leads → citas → pacientes → facturación → retorno
```

La capa de inteligencia es el diferencial. Las otras tres las sabe hacer cualquiera.

---

## 5. Decisiones tomadas

### 5.1 El CRM tiene tres columnas y se arrastra

```
Lead recibido  →  Contactado  →  Cita agendada
```

Nada más. Sin campos obligatorios, sin embudos configurables, sin tareas, sin recordatorios
a treinta días.

**El porqué gobierna todo el diseño:** las secretarias de clínica no son comerciales.
Reciben el lead, llaman una o dos veces para informar y agendar, y ahí acaba su trabajo
comercial. No hacen seguimiento tres semanas después. Un CRM con siete estados y campos
obligatorios no se usa: se abandona, y con él muere todo el dato del embudo.

Los estados del CRM interno de dinkbit (`propuesta`, `ganado`, `perdido`) **no aplican
aquí**. Eso es venta de agencia, no recepción de clínica.

Al mover un lead a "Cita agendada" se abre la agenda con los huecos reales y se elige
fecha. Ese gesto es el que elimina el doble proceso.

### 5.2 La agenda lee todo y escribe solo lo nuestro

**No tenemos agenda propia.** El calendario de la clínica es la única verdad de
disponibilidad, y nuestra pantalla es una *vista* sobre él más el contexto que Google no
sabe guardar: qué lead es, de qué campaña vino, si acudió y cuánto generó.

- **Lee** el Google Calendar u Outlook de la clínica y pinta **todas** sus citas, en modo
  solo lectura, para que se vean los huecos reales.
- **Escribe** las citas que nacen de un lead de campaña **dentro de su propio calendario**,
  no en una agenda paralela nuestra.

Ese segundo punto es el que evita el fallo grave: si la cita de campaña viviera solo en
nuestra base de datos, la secretaria vería ese hueco libre en su agenda de siempre y
agendaría encima a un paciente orgánico. Escribiendo en su calendario, dos segundos después
de agendar el hueco ya está ocupado en las dos vistas.

Cada lado es dueño de eventos distintos, así que **no hay conflictos de propiedad que
resolver** — y eso es el 90% de la dificultad de una sincronización bidireccional.

**Cómo se escribe, en concreto:** creamos un calendario propio dentro de su cuenta, del
tipo *"Pacientes de campaña · dinkbit"*. Así solo necesitamos **lectura** de su calendario
principal y **escritura** del nuestro, en lugar de pedir permiso para gestionar la agenda de
la que vive la clínica — un consentimiento de OAuth que asusta con razón. En su Google
Calendar los dos calendarios se superponen en la misma vista semanal con colores distintos,
así que ella ve el hueco ocupado igual. Y el día que se van, borran ese calendario y
desaparece nuestra huella, sin que hayamos tenido nunca permiso de escritura sobre sus
citas.

Esto resuelve la trampa que hunde el producto si se hace de otra forma:

- Agenda solo con citas de campaña → es una *segunda* agenda. La secretaria mira la suya,
  copia a mano en la nuestra, doble proceso, y lo abandona en tres semanas.
- Agenda con todos los pacientes gestionados por nosotros → deja de ser doble proceso, pero
  exige migrar toda su operativa. Una clínica vive de su agenda; es la petición más grande
  de todo el producto.

Con "leer todo, escribir lo nuestro" la secretaria ve la agenda completa en una pantalla,
con huecos reales, y agenda desde el CRM sin salir. Ni doble proceso ni migración.

**Y no la obliga a adoptar nuestra pantalla.** Las dos vistas están completas, así que puede
seguir trabajando con la suya. Lo que pasará de forma natural es que use la nuestra para los
leads de campaña, porque ahí tiene el teléfono, el anuncio de origen y el botón de
asistencia. Pero es una preferencia, no un requisito — y ésa es exactamente la diferencia
con "migra tu operativa a nuestro sistema".

La cita que viene de campaña sale **destacada**, y es la única en la que se pide `asistió`
e `importe`.

#### Revalidación y conflictos

Pintar la semana desde una caché es necesario para que la pantalla vaya rápida, pero abre
una carrera: si hace dos minutos metieron un paciente orgánico a mano y nuestra caché aún no
lo sabe, la secretaria puede agendar encima desde nuestro lado. Tres reglas lo cierran:

1. **Al confirmar una cita se revalida la disponibilidad contra el calendario en vivo**,
   nunca contra la caché. Si el hueco ya no está, se avisa antes de crear nada. La caché
   pinta; la verdad se consulta en el momento de escribir.
2. **Releemos también nuestros propios eventos.** Si mueven nuestra cita de hora o la borran
   dentro de Google, hay que detectarlo y actualizar el registro.
3. **En conflicto de horario gana el calendario externo.** Si no, nuestra hora queda
   obsoleta y el dato de asistencia se corrompe justo en la métrica que sostiene el producto.

### 5.3 La facturación se captura en cascada

```
importe_real  ??  ticket_medio_declarado
```

Tres niveles de fidelidad, y el dashboard **dice siempre cuál está usando**:

1. **Ticket medio declarado** (funciona el día uno, cero fricción). La clínica declara una
   vez su ticket medio. Facturación = pacientes que acudieron × ticket medio. Se etiqueta
   como *estimado*.
2. **Importe real por cita de campaña** (el objetivo realista). El sistema marca qué citas
   vinieron de campaña; la secretaria solo rellena el importe en ésas. Son unas pocas
   casillas al mes, no "registra todo siempre". Se etiqueta como *real*.
3. **Integración con su gestor** (Gesden, Clinic Cloud, Dentalink…). Mejora posterior, no
   requisito. Solo merece la pena cuando varias clínicas compartan gestor.

**Por qué la cascada y no exigir el dato real:** si el ROAS depende de que alguien rellene
un campo, el producto está vacío el primer mes y la promesa muere. Con la cascada el número
existe desde el principio y **mejora en precisión** a medida que lo alimentan.

Que el dashboard muestre la confianza de sus propias cifras no es una debilidad: en un
producto que vende transparencia, juega a favor. Y funciona como empujón silencioso hacia
el dato bueno.

**Corrección a una premisa inicial:** se asumía que la clínica no podría distinguir qué
paciente viene de campaña, y que por tanto o lo registran todo o no registran nada. **El
sistema lo sabe solo.** El lead de campaña entra por nuestro formulario con nuestro id y su
canal ya atribuido; la cita creada desde ese lead nace etiquetada. La secretaria no decide
nada: el sistema le marca las citas de campaña del mes y solo pone el importe en ésas.

### 5.4 Insights: cuatro números y una frase

Invertido · Leads · Pacientes que acudieron · Generado → y de ahí el retorno.

Sin tecnicismos. El destinatario es el dueño de la clínica, no un analista.

**Fuera de la primera versión: los tratamientos más vendidos.** Requiere que la secretaria
clasifique cada cita, y si ese dato no llega tendríamos una sección vacía en el producto
que vende transparencia. Entra cuando el nivel 2 de facturación esté consolidado.

#### Qué mide el dashboard, y qué no

**Mide el embudo de las campañas, no la facturación total de la clínica.** Un paciente que
llega por recomendación, por su web de siempre (§3) o porque pasaba por la puerta no está en
el CRM y no cuenta.

Se dice en la primera reunión y se deja escrito en el propio dashboard. Bien enmarcado no es
una limitación: responde a *"¿cuánto me devuelve lo que invierto?"*, que es más útil que
*"¿cuánto factura mi clínica?"* — ésa ya la sabe.

Un matiz operativo que conviene no sobrevender: de las citas que leemos de su calendario
externo **vemos el evento, no al paciente**. Nos sirven para calcular disponibilidad, pero
no tienen `lead_id`, ni canal, ni importe. No sabemos quién es ni de dónde vino.

#### La pregunta difícil: incrementalidad

Antes o después el dueño preguntará **"¿ese paciente no habría venido igual?"**. Es una
pregunta legítima, no una objeción de mala fe, y no se resuelve explicando el alcance del
dashboard.

El caso claro es el tráfico de marca: alguien busca el nombre de la clínica en Google, hace
clic en el anuncio y lo contamos como paciente de campaña, cuando habría llegado igual
escribiendo la dirección. Le hemos cobrado un clic por un paciente que ya era suyo.

**Sí pujamos por su marca.** Hay tres razones buenas y ninguna es discutible:

- **Agregadores.** Doctoralia o Top Doctors suelen posicionar por el nombre de la clínica
  por encima de la propia clínica y se quedan el clic. Ahí pujar no canibaliza: defiende
  ingresos reales.
- **Competidores** que pujen por su nombre.
- **Coste bajo y conversión alta.** El CPC de la marca propia es baratísimo, y una clínica
  con presupuesto pequeño necesita ver resultados el primer mes o se va en el segundo.

Si lo conseguimos nosotros, cuenta. Pero **va separado en el dashboard: marca y no-marca**.
No para restarle mérito, sino por dos motivos prácticos:

1. **Matemática de retención.** El tráfico de marca es el más fácil de capturar y se agota:
   hay tantas búsquedas del nombre de la clínica al mes y no más. El mes 1 sale
   espectacular, el mes 4 sale normal, y el dueño concluye "las campañas han dejado de
   funcionar" cuando lo que pasó es que el mes 1 venía prestado de su propio orgánico. Sin
   la separación no se puede explicar esa curva, y se pierde un cliente que iba bien.
2. **Nos lo van a decir.** Cualquier agencia que quiera la cuenta abrirá su Google Ads y
   dirá "te están cobrando por tus propios pacientes". Si ya está en nuestro dashboard con
   su nombre, es transparencia a nuestro favor. Si sale por primera vez en boca de un
   competidor, es un problema.

Y ante un "demuéstramelo", la única prueba real es un **test de apagado**: pausar un canal
un periodo y ver qué pasa con el total de citas. Requiere volumen, así que no sirve el primer
mes, pero conviene tenerlo nombrado de antemano en lugar de improvisarlo.

Contexto para calibrar: eBay apagó su publicidad de marca en un experimento a gran escala y
no midió pérdida apreciable de ventas — el resultado orgánico absorbía el clic. Una clínica no
es eBay, pero por su nombre exacto también posiciona primera. La incrementalidad de la marca
es baja, no nula.

### 5.5 Un solo Supabase nuevo, con `tenant_id` y RLS

**No un proyecto por clínica.** Diez clínicas serían diez juegos de migraciones que
mantener sincronizados y diez juegos de variables de entorno, y haría imposible cualquier
consulta transversal — que la necesitamos para nuestra supervisión y para poder decir *"tu
coste por paciente está un 30% por encima de la media de tu sector"*, que es oro comercial.
El aislamiento por proyecto solo se justifica si un cliente lo exige por contrato.

Tres reglas que no se negocian:

1. **La RLS deriva el tenant del usuario autenticado**, nunca de un parámetro que manda el
   cliente. Si el `clinica_id` viaja en la petición, se puede falsear.
2. **La clave `service_role` no toca ninguna ruta que sirva a usuarios de clínica.** Ese es
   el error que convierte un bug de RLS en una fuga entre clientes.
3. **dinkbit accede por un rol explícito**, con su propia política, no saltándose la RLS.

**Y proyecto separado del actual**, por dos razones concretas:

- `wnboyesnlrbtwfmhcxmc` (dinkbit-leads) está en plan gratuito y **se auto-pausa a los ~7
  días sin actividad**. Ya ha dejado el panel en blanco alguna vez. Inaceptable en un
  producto por el que alguien paga.
- Mezclar nuestros leads comerciales con datos de pacientes de nuestros clientes amplía el
  radio de daño justo donde hay un contrato de encargo firmado.

Plan de pago desde el día uno, con backups.

### 5.6 Separación conceptual: dos CRM distintos

| | Quién vende | Qué es un lead | Dónde vive |
|---|---|---|---|
| `dkb-web` + `imagina_leads` | dinkbit | una clínica interesada | Supabase actual |
| Producto nuevo | la clínica | un paciente potencial | Supabase nuevo |

Los leads que capte la landing `/growth` son **nuestros prospectos**: van al CRM actual, no
al producto.

### 5.7 Empezamos de cero, salvo dos módulos

El producto se construye nuevo. `dashboard-dkb-agency` (el dashboard de Adeslas) es
hipersofisticado para un cliente que invierte más de 30.000 € al mes: catorce secciones,
keywords, minutas, pipeline aplazado. Una clínica no tiene ni ese volumen ni esa necesidad,
y forzar aquella superficie sería un error de producto.

**Pero dos piezas de allí son lógica pura y costaría semanas rehacerlas:**

- **Los parsers de gasto de Google Ads y Meta**, con su reconciliación de campañas sin
  desglose por keyword (Performance Max, DSA). Es un problema real y sutil, ya resuelto y
  con tests.
- **La matemática del ROI.**

Copiar esos módulos no arrastra la complejidad de Adeslas. Todo lo demás, en verde.

`dashboard-dkb` (signaliq) tiene empezada la ingesta por API de Google Ads con su design
doc: material a revisar cuando toque sustituir el CSV por API, no antes.

---

## 6. Lo que NO hacemos en la versión 1

Explícito para no discutirlo tres veces:

- Tratamientos más vendidos (§5.4)
- Integración con gestores de clínica (§5.3)
- Sincronización bidireccional de agenda (§5.2)
- Ingesta de gasto por API — CSV primero (§5.7)
- Embudos o estados configurables por clínica (§5.1)
- Automatizaciones y secuencias de email al paciente
- App móvil
- Facturación y cobro automatizados de la suscripción
- Multi-idioma

---

## 7. Modelo de datos

Esquema mínimo del producto nuevo:

```
clinicas            id, slug, nombre, ticket_medio_defecto, zona_horaria, activa
clinica_usuarios    user_id → clinica_id, rol: secretaria | gerente | dinkbit
leads               clinica_id, nombre, telefono, email, canal, campaña,
                    estado (recibido|contactado|cita_agendada), creado_en
citas               clinica_id, lead_id (nullable), inicio, fin, origen_campaña (bool),
                    asistencia (sin_confirmar | acudio | no_acudio),
                    importe (nullable), calendario_externo_id
inversion           clinica_id, canal, campaña, fecha, gasto
```

Notas de diseño:

- `citas.lead_id` es nullable: las citas que leemos de su calendario externo no tienen lead.
- `citas.calendario_externo_id` es el evento correspondiente en su Google u Outlook. Toda
  cita de campaña tiene uno, porque se escribe allí y no en una agenda paralela (§5.2). Es
  también la clave para detectar que la han movido o borrado desde fuera.
- `citas.importe` nullable a propósito: si es nulo, el cálculo usa
  `clinicas.ticket_medio_defecto` y la cifra se marca como estimada.
- `citas.asistencia` tiene **tres** valores explícitos, no un booleano. "Sin confirmar" no
  es lo mismo que "no acudió": si se mezclan, el embudo cuenta como ausencias todas las
  citas que nadie ha revisado todavía, y hunde artificialmente la métrica que sostiene el
  producto. `sin_confirmar` es el valor por defecto y se excluye del cálculo, no se cuenta
  como negativo.
- **Ningún dato clínico.** Ni tratamiento, ni diagnóstico, ni historia. Ver §9.

---

## 8. Arquitectura de repos, y cuándo abrir carpeta nueva

| Fase | Dónde vive | Por qué |
|---|---|---|
| 1. Captación | **`dkb-web`** | La landing y la calculadora *son* nuestra web de marketing: mismo dominio, mismo tracking, mismo CRM, mismo despliegue |
| 2. CRM + agenda | **repo nuevo** | Otros usuarios, otra autenticación, otra base de datos, otro ritmo de despliegue, y un cliente que paga |
| 3. Insights | el repo de la fase 2 | Es la misma aplicación |
| 4. Web de clínica **o landing paralela** | **un repo por cliente** | Patrón que ya seguimos con `padel-marina`, `instituto-fich`… clonando plantilla. Las dos modalidades de §3 salen de la misma plantilla; la landing es un subconjunto |

**El disparador para abrir carpeta nueva es empezar la fase 2.** Antes de eso no hay nada
que poner en ella. Cuando se abra, la parte de producto de este documento se muda allí y
aquí queda un puntero.

Este documento vive en `dkb-web/docs/growth/` mientras la fase 1 sea el trabajo activo.

---

## 9. Protección de datos

**La decisión de diseño que resuelve el 90% del problema: no guardamos dato clínico.** Solo
`lead → asistió (sí/no) → importe (€)`. Ni tratamiento, ni diagnóstico, ni historia. Con eso
el dashboard funciona exactamente igual y nos salimos del artículo 9 del RGPD (categorías
especiales), que es donde están las obligaciones agravadas.

Lo que sí hay que tener, y no es opcional:

- **Contrato de encargo del tratamiento** firmado con cada clínica. Ellos responsables,
  nosotros encargados.
- **Export de sus datos a demanda**, con suscripción activa o no (§3).
- Registro de accesos y política de borrado a la baja.
- La base de datos en la UE.

**A confirmar con asesoría legal antes de la primera clínica:** si el mero hecho de
registrar que una persona es paciente de una clínica dental constituye ya dato de salud. La
lectura conservadora es que sí, y en ese caso el contrato de encargo y las medidas técnicas
son obligatorios desde el primer día, no recomendables. Diseñamos asumiendo que sí.

---

## 10. Riesgos reales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La secretaria no rellena el importe | El dashboard queda sin la cifra que lo justifica | Cascada de facturación (§5.3): el número existe igual, estimado |
| La clínica no adopta la agenda | Sin fecha de cita no hay embudo | Leer su calendario para que no sea un segundo sistema (§5.2) |
| Rotación al segundo mes | La web sale carísima por cliente | Cuota de alta + reciclar el desarrollo (§3) |
| Fuga de datos entre clínicas | Existencial, con contrato de encargo firmado | RLS derivada del usuario, sin `service_role` en rutas de cliente (§5.5) |
| Las primeras clínicas no son rentables | Quema de caja | Asumido y presupuestado; medir el coste real por clínica desde la primera (§3) |
| El precio ancla la percepción en "agencia barata" | Mata el posicionamiento | El precio nunca abre el mensaje; abre el problema (§11) |
| Sin volumen de datos, los insights son ruido | El producto no enseña nada útil | Ser honestos con los umbrales; no mostrar conclusiones sin muestra suficiente |
| "¿Ese paciente no habría venido igual?" — incrementalidad | Cuestiona el ROAS entero, y es una pregunta legítima | Marca y no-marca separados en el dashboard; test de apagado cuando haya volumen (§5.4) |
| El mes 1 sale espectacular por el tráfico de marca y luego se normaliza | El dueño cree que las campañas dejaron de funcionar y se va | La separación marca/no-marca permite explicar la curva en lugar de justificarse (§5.4) |

---

## 11. Captación: cómo se vende

### El mensaje

Nunca abrir con el precio. Abrir con el problema:

> **¿Sabes cuánto te cuesta conseguir un paciente nuevo?**
> Sabes cuánto inviertes. Sabes cuántos leads recibes. Pero ¿sabes cuántos acabaron en tu
> clínica, y cuánto dinero generaron?

Y solo al final: *desde 199 €/mes, sin permanencia.*

Si abrimos con "todo por 199 €", la percepción es *agencia barata*. Si abrimos con la
pregunta, la percepción es *negocio, control, inteligencia*. Esa diferencia es exactamente
el posicionamiento que buscamos.

Frase a conservar tal cual: **"vas a querer quedarte por los resultados, no porque te
obliguemos."**

### La landing

Debe romper con el estilo de nuestras landings anteriores. No un catálogo de servicios: un
sistema de medición, análisis y transparencia. El objetivo emocional es que el dueño se dé
cuenta de que **no está midiendo nada** y de que tiene un potencial enorme sin explotar —
incluso si ya trabaja con una agencia, porque tampoco tiene el embudo completo a la vista.

Vídeo como pieza central, y visualización del circuito completo de anuncio a paciente.

### El gancho: la calculadora

El CTA principal **no** es "contrata". Es **"descubre cuánto te cuesta conseguir un
paciente"**.

El cálculo tiene que ser **simple de verdad**, no un cuestionario de auditoría:

```
inversión mensual en publicidad ÷ pacientes nuevos al mes = coste por paciente
```

Y una pregunta opcional de **ticket medio**, que permite añadir cuánto generan esos
pacientes y por tanto el retorno. Nada más. El cálculo es idéntico en cualquier sector, así
que una sola calculadora sirve para todos los nichos.

**"No lo sé" es una respuesta de primera clase, no un error de validación.** Quien no sabe
cuántos pacientes le llegan es *más* cliente ideal que quien lo sabe, porque es exactamente
el problema que vendemos. Así que la calculadora tiene dos salidas:

- **Sabe sus números** → "cada paciente te está costando 87 €". Y si dio ticket medio,
  el retorno.
- **No los sabe** → *"no puedes calcularlo, y eso es justo el hallazgo"*. Se le enseña el
  ejemplo de lo que vería si lo midiera, con cifras de muestra. Es un cierre **más** potente
  que un número, porque el mensaje deja de ser "tu coste es alto" y pasa a ser "estás
  volando a ciegas".

Diseñar esa rama con cariño, no como caso residual: por volumen, va a ser la mayoritaria.

**El resultado se muestra después de dejar el contacto**, no antes. Email y teléfono, y
entonces el resultado en pantalla. Si se enseña primero, no hay razón para dejar los datos y
perdemos el lead — que es el objetivo entero de la pieza. Dos condiciones para que esto no
se sienta a cambiazo: decirle desde el principio que al terminar ve su resultado, y que sean
pocas preguntas. Y el resultado se enseña **en pantalla al momento**, no "te lo mandamos por
email", que se lee como excusa para no dárselo.

Da leads muchísimo más cualificados que "déjanos tus datos y te llamamos", y ya sabemos
construir este tipo de embudo: hay tres wizards en producción.

### El embudo

```
Google Search + Meta
      ↓
Anuncio: "¿sabes cuánto te cuesta conseguir un paciente?"
      ↓
Landing /growth
      ↓
Calculadora  →  lead al CRM de dinkbit (imagina_leads)
      ↓
Demo
      ↓
Alta + onboarding
```

### La demo

**No es un artefacto aparte: es el producto corriendo con datos sembrados.** El guion:

1. Se abre la web de una clínica dental inventada.
2. Delante del dentista, se manda un lead de prueba por el formulario.
3. Se abre el CRM y se ve entrar el lead en la primera columna.
4. Se agenda, se marca que acudió, se pone un importe.
5. Se abre el dashboard y ahí está el retorno.

Eso vende el producto entero en cinco minutos, y es la razón por la que la clínica ficticia
de la demo es la primera instancia de la plantilla de web (fase 4), no trabajo extra.

### Campañas

**Google Search** es donde está el lead más valioso, porque hay intención explícita:
"agencia marketing clínicas", "captar pacientes clínica", "marketing dental". Separar por
vertical en grupos distintos, sin mezclar.

**Meta** para generar demanda, con tres líneas: abierta, por intereses de gestión de
negocio, y remarketing a quien visitó la landing o empezó la calculadora.

Creatividades: vídeo **y** estáticos. Nada de vídeo corporativo. El concepto más potente es
el de la pizarra — inversión → leads → citas → pacientes → facturación — cerrando con
*"esto es lo que debería poder decirte tu agencia. ¿Puede la tuya?"*.

Presupuesto de prueba: en el entorno de 1.000 €/mes por plataforma durante seis u ocho
semanas, para tener volumen suficiente con el que concluir algo. **Y no juzgar por coste
por lead**, que es la trampa que este producto existe para evitar: un canal con leads más
caros puede salir más barato por cliente. Medir hasta cliente, no hasta lead — nosotros
primero, y con nuestro propio sistema.

**No invertir fuerte hasta tener el embudo y el seguimiento montados**, porque la propuesta
comercial consiste precisamente en demostrar que sabemos medir eso.

---

## 12. Plan de acción

### Fase 0 — Cimientos comerciales (antes de escribir código)

1. Nombre comercial del producto y del dominio o ruta.
2. Precio de la cuota de alta, calculado sobre el coste real de la primera web.
3. Propiedad del dominio de la clínica, fijada por contrato.
4. Contrato de encargo del tratamiento y consulta legal sobre dato de salud (§9).

**Salida:** se puede vender sin mentir y sin exposición legal.

### Fase 1 — Captación · en `dkb-web`

1. Landing `/growth` en el grupo `(landing)`, con chrome reducido.
2. Calculadora de coste por paciente, con el patrón de wizard ya existente.
3. Lead a `imagina_leads` con canal y campaña por UTMs — la atribución ya funciona.
4. Meta CAPI y GA4, que ya están.
5. Campañas de Google Search y Meta según §11.

**Salida:** entran leads cualificados de clínicas y sabemos cuánto cuesta cada uno.
**Dependencias:** ninguna. Se puede empezar ya.

### Fase 2 — CRM clínico y agenda · repo nuevo

1. Repo, Supabase de pago, autenticación multi-tenant con RLS (§5.5).
2. CRM de tres columnas (§5.1).
3. Agenda: lectura del calendario externo, escritura de citas de campaña (§5.2).
4. Captura de `asistió` e `importe` en las citas de campaña.
5. Datos sembrados de la clínica ficticia para la demo.

**Salida:** la demo del guion de §11 se puede hacer de principio a fin.
**Dependencias:** fase 0.

### Fase 3 — Insights · mismo repo que la fase 2

1. Ingesta de gasto por CSV, levantando los parsers de Adeslas (§5.7).
2. Los cuatro números y el retorno, con etiqueta de real o estimado (§5.4).
3. Vista para dinkbit con todas las clínicas.

**Salida:** la clínica entra sola y entiende su retorno sin que se lo expliquemos.
**Dependencias:** fase 2.

### Fase 4 — Web de clínica reciclable · un repo por cliente

1. Plantilla orientada a conversión, con formularios que escriben en el producto.
2. Proceso de personalización documentado: logo, colores, contenido.
3. Primera instancia = la clínica ficticia de la demo.

**Salida:** una clínica nueva se pone en marcha en días, no semanas.
**Dependencias:** el formulario necesita la fase 2. La maqueta se puede empezar antes.

### Orden

Fases **1 y 4 en paralelo** — desbloquean vender y demostrar. Luego **2**, y **3** encima.
La fase 0 va antes de todo y no es negociable.

---

## 13. Cómo sabremos si funciona

Del producto:

- Porcentaje de citas de campaña con importe real. Es el indicador de adopción que más
  importa: si baja, el producto se está quedando ciego.
- Porcentaje de clínicas que entran al dashboard al menos una vez a la semana.
- Días desde el alta hasta el primer paciente atribuido.

Del negocio:

- Coste de adquisición de una clínica, medido hasta cliente y no hasta lead.
- Coste real de atender a una clínica al mes, y su evolución de la primera a la décima.
- Retención a los tres y seis meses. Es la prueba de "te quedas porque funciona".

---

## 14. Decisiones abiertas

Ordenadas por lo que bloquean. Las tres primeras son de fase 1; el resto no impide construir.

1. **Nombre comercial.** Bloquea *lanzar anuncios*, no construir: en la landing vive como
   una constante en un solo fichero, y la ruta arranca como `/growth` con redirección
   posterior. Sigue siendo la primera que hay que cerrar.
2. **Los tramos de la cuota de alta.** Que existe y que es variable según inversión y
   canales ya está decidido (§3); falta la tabla de importes. La landing no publica cifra,
   así que no bloquea el desarrollo, sí la primera llamada de venta.
3. **Precio de compra de la web** para quien quiera quedársela y dejar la suscripción (§3).
   Sale en todas las llamadas; conviene tenerlo antes de la primera.
4. **Si el dato de "paciente de clínica" es dato de salud** (§9). Diseñamos asumiendo que
   sí; hay que confirmarlo.
5. **Qué proveedor de calendario primero**, Google u Outlook. Google es más sencillo y más
   habitual en clínicas pequeñas. Y a validar en la primera integración: que el calendario
   propio dentro de su cuenta (§5.2) se superpone en su vista por defecto, sin que tengan que
   activarlo a mano. Si no fuera así, el refinamiento de permisos pierde su ventaja y habría
   que escribir en su calendario principal.
6. **Cómo se cobra la suscripción.** Fuera de la versión 1, pero hay que decidir con qué se
   cobra desde la primera clínica.
7. **Umbral de datos mínimo** para mostrar conclusiones en el dashboard sin que sean ruido.
