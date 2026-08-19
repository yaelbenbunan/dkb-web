# Fase 4 — Plantilla de web para clínicas

**Fecha:** 2026-08-19
**Repo destino:** `dkb-clinicas` (nuevo, todavía sin crear)
**Documento padre:** [definición de producto](./2026-08-17-sistema-clinicas-producto.md)
**Estado:** diseño aprobado en conversación; pendiente de plan de implementación

---

## 1. Qué es y para qué

La web que se le entrega a cada clínica que contrata el sistema. Es una de las
cuatro piezas de la cuota (§4 del padre) y la primera que ve el cliente.

Su primera instancia es la **clínica dental ficticia de la demo**, así que hace
dos trabajos con un solo esfuerzo: prueba la plantilla de verdad y da el
material comercial para enseñar el producto antes de tener clientes.

**No es un proyecto en verde.** `instituto-fich` y `padel-marina` ya separan
todo el contenido en `content/copy.ts` —marca, contacto, navegación, secciones,
legales— y los componentes leen de ahí. Son 860 y 301 líneas de contenido puro.
Esta fase **formaliza ese patrón que ya funciona dos veces**, no inventa uno.

---

## 2. Arquitectura: un repo, un despliegue por clínica

Un solo repositorio, `dkb-clinicas`. Cada clínica es:

- un fichero de contenido en `content/clinicas/<slug>.ts`
- una carpeta de imágenes en `public/clinicas/<slug>/`
- un **proyecto propio de Vercel** apuntando al mismo repo, con su variable
  `NEXT_PUBLIC_CLINICA=<slug>` y su dominio

Las une un registro estático:

```ts
import dentalSonrisa from "./clinicas/dental-sonrisa";

const CLINICAS = { "dental-sonrisa": dentalSonrisa } as const;

export const clinica = CLINICAS[process.env.NEXT_PUBLIC_CLINICA as keyof typeof CLINICAS];
```

**Registro estático y no importación dinámica por variable.** Con
`import(\`./clinicas/${slug}\`)` el empaquetador no puede resolver la ruta en
compilación y acabas peleándote con el bundler para algo que aquí no aporta
nada: el conjunto de clínicas se conoce en el momento de desplegar.

### Por qué no un repo por clínica

Era la decisión del documento padre (§8) y **se cambia aquí**. El motivo es de
mantenimiento: con N repos clonados, cada arreglo y cada mejora hay que
aplicarlos N veces a mano, y con diez clínicas eso deja de hacerse. Con un solo
repo, se arregla una vez y lo reciben todas al desplegar.

**Lo que se pierde, dicho claro:** el documento padre justificaba el repo por
cliente porque hacía trivial venderle la web a quien deja la suscripción (§3).
Con esta arquitectura ya no es un traspaso de repo, sino **extraer su contenido
y los componentes a un repo propio**. Sigue siendo posible y sigue siendo un
trabajo puntual, pero es un día de trabajo y no diez minutos. Se acepta porque
irse comprando la web va a ser raro, y mantener diez repos es todos los días.

### Dos costes que se asumen

1. **El contenido de todas las clínicas viaja en el paquete de todas.** Son
   kilobytes de texto; irrelevante.
2. **Las imágenes de una clínica son accesibles desde el dominio de otra** si
   alguien adivina la ruta. No son datos secretos —son fotos de una web
   pública— pero conviene saberlo antes de que alguien lo descubra.

---

## 3. El modelo de contenido

Un único tipo `Clinica` con todo lo que cambia entre clientes:

```
identidad     slug, nombre, claim, logo, colores (acento y tinta)
contacto      teléfono, WhatsApp, email, dirección, coordenadas del mapa
horarios      por día, con festivos
tratamientos  nombre, descripción, precio desde (opcional)
equipo        nombre, puesto, foto, número de colegiado (opcional)
opiniones     texto, autor, fuente (opcional)
faq           pregunta y respuesta
legal         razón social, CIF, email de protección de datos
```

**Tipado estricto: si falta algo, no compila.** Es lo que impide publicar la
web de una clínica con el teléfono de otra, que es el fallo más caro y más
fácil de cometer al reciclar una plantilla.

**Secciones opcionales de verdad.** Una clínica sin equipo que enseñar no
renderiza esa sección vacía: desaparece. Lo mismo con opiniones y con precios.

---

## 4. Las secciones

En orden:

1. **Hero** — qué clínica, dónde está y un CTA de llamada. La dirección arriba
   porque en una clínica la búsqueda es local.
2. **Tratamientos** — lo que se ofrece, con precio desde si la clínica quiere.
3. **Por qué nosotros** — confianza: años, instalaciones, certificaciones.
4. **Equipo** — opcional, con número de colegiado donde aplique.
5. **Opiniones** — opcional.
6. **Ubicación y horarios** — mapa, cómo llegar, cuándo abre.
7. **Preguntas frecuentes**.
8. **Formulario de cita**.

Más **teléfono y WhatsApp fijos en pantalla**, que en una clínica es por donde
entra la mayoría de las peticiones.

### Publicidad sanitaria

La publicidad sanitaria está regulada en España y las fotos de antes y después
tienen condiciones. El modelo lo contempla como **sección opcional con su
aviso**, no como algo que se activa alegremente. Antes de usarla con la primera
clínica que la pida, hay que confirmar los requisitos de su comunidad autónoma.

---

## 5. El formulario

Se construye **entero**: maquetación, validación, consentimiento informado con
enlace a la política de privacidad, honeypot y control de tiempo, siguiendo el
patrón que ya usa `dkb-web`.

**Lo único que queda pendiente es a dónde escribe.** Se decidió esperar al CRM
clínico de la fase 2 en vez de mandarlo de momento al CRM actual de dinkbit.

**Consecuencia, dicha una vez:** hasta que exista la fase 2, la demo comercial
del documento padre (§11) **no se puede hacer entera**, porque su guion es *web
→ lead → verlo entrar en el CRM → agendar → dashboard*. La web enseña el primer
paso; el resto espera.

El envío queda aislado en una sola función, de modo que reconectarlo cuando
exista el producto sea cambiar su cuerpo y nada más.

---

## 6. Qué NO lleva

Explícito para no discutirlo tres veces:

- Blog
- Multi-idioma (`instituto-fich` lo tiene; una clínica de barrio no lo necesita)
- Reserva de cita con calendario en vivo — eso es la agenda de la fase 2
- Panel para que la clínica se edite el contenido: lo edita dinkbit, y un CMS
  para diez clínicas es más trabajo del que ahorra
- Tienda, área de pacientes, chat

---

## 7. Cómo se pone en marcha una clínica nueva

El proceso que hay que dejar documentado en el README del repo:

1. Copiar `content/clinicas/_plantilla.ts` a `<slug>.ts` y rellenarlo.
2. Añadir la clínica al registro.
3. Poner sus imágenes en `public/clinicas/<slug>/`.
4. Crear el proyecto en Vercel apuntando al repo, con `NEXT_PUBLIC_CLINICA=<slug>`.
5. Apuntar su dominio.

**Objetivo de tiempo: una tarde**, no una semana. Si se acerca a la semana, la
economía de §3 del padre —que el coste baja con cada cliente— deja de cumplirse.

---

## 8. Verificación

- Tipos: una clínica a la que le falte un campo obligatorio no compila.
- Tests de las secciones opcionales: sin equipo, sin opiniones y sin precios, la
  página se renderiza sin huecos vacíos.
- Test del formulario: consentimiento obligatorio, honeypot y control de tiempo.
- Navegador: la clínica ficticia a 390 y a 1440, sin desbordamiento horizontal.
- Legibilidad: colores explícitos, sin depender de tokens que cambien con el
  tema. Es el fallo que ya se coló una vez en la fase 1.

---

## 9. Decisiones abiertas

1. **Nombre y marca de la clínica ficticia.** Que no coincida con ninguna real:
   conviene una búsqueda rápida antes de fijarlo.
2. **De dónde salen las fotos.** Un banco de imágenes con licencia comercial, o
   material propio. Afecta al presupuesto y al aspecto.
3. **Los requisitos de publicidad sanitaria** de la comunidad donde esté la
   primera clínica real (§4).
4. **Si el mapa lleva Google Maps embebido**, que implica cookies de terceros y
   por tanto pasa por el banner de consentimiento.
