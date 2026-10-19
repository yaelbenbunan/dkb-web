# Prospección: solo por la vía legal (consentimiento por teléfono)

Fecha: 2026-10-19 · Rama: `feat/prospeccion-consentimiento`

## Por qué

LSSI art. 21: no se puede mandar una comunicación comercial por email sin
solicitud o autorización previa, tampoco a empresas, y presentarse ya lo es.
Pedir permiso por email tampoco vale. Lo legal es **llamar** (a sociedades,
libre; a autónomos con interés legítimo y tras comprobar la Lista Robinson) y,
si en la llamada aceptan recibir información, escribirles después.

## Qué cambia (y nada más)

1. **Consentimiento por prospecto.** Columnas nuevas en `prospects`
   (`consentimiento_at`, `consentimiento_por` → `ventas_usuarias`,
   `consentimiento_nota`, `consentimiento_retirado_at`;
   `docs/sql/2026-10-19-prospeccion-consentimiento.sql`, idempotente, lo
   ejecuta Yael). En cada fila: «Ha aceptado recibir información», que pide el
   email (prerrellenado) y una nota opcional; guarda cuándo y quién, deja el
   prospecto en «listo» y el email como dado por el negocio (`email_kind`
   null). Se puede retirar: «Ya no quiere recibir información».
   Vigente = `consentimiento_at` y sin `consentimiento_retirado_at`.
   Sin las columnas, nadie tiene consentimiento y no se envía nada.
2. **Envío solo con consentimiento**, decidido en el servidor
   (`motivoBloqueo` → `sin_consentimiento`, primer motivo). Todo lo demás
   igual: tope diario, baja firmada, supresiones, List-Unsubscribe. En la
   tabla, la casilla solo se habilita en prospectos con consentimiento vigente.
3. **Pie veraz:** «Le escribimos porque el {fecha} nos dijo por teléfono que
   le enviáramos información. Responsable: Dinkbit Marketing S.L. …
   https://www.dinkbit.es/privacidad … darse de baja aquí».
4. **Sin recogida masiva de emails.** Fuera la revisión automática de webs tras
   cada búsqueda y su acción de servidor. El código de enriquecimiento se
   queda; solo se usa a petición desde el formulario de consentimiento
   («Buscar en su web»), que rellena el campo sin guardar nada.
5. **Guion de llamada** (art. 14 RGPD) desplegable junto a «Llamar».
6. **Embudo:** con consentimiento vigente el lead se marca
   `consentimiento = true` y la nota del historial dice cuándo y quién lo
   obtuvo.
7. **Aviso de búsqueda:** «X ya las tenías» (ya eran prospectos) separado de
   «Y repetidas en los datos (mismo teléfono o web)».

## Fuera de alcance

Automatizar la Lista Robinson (servicio de pago de Adigital), campañas, otras
secciones de ventas.
