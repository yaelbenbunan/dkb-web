# Puesta en marcha: WhatsApp por marca (coexistencia)

Para Yael. Sigue los pasos en orden. No despliegues hasta terminar el paso 6.

## Antes de desplegar

1. **Vercel → dkb-web → Settings → Environment Variables.** Comprueba que en *Production* existen:
   - `WHATSAPP_PHONE_NUMBER_ID` (el número de Dinkbit, hoy `1385086741345422`). Si faltara, los mensajes de Dinkbit se ignorarían.
   - `WHATSAPP_APP_SECRET`.
2. **Crea la clave de cifrado.** En el terminal: `openssl rand -base64 32`. Copia el resultado y añádelo en Vercel como `WHATSAPP_CLAVE_TOKENS`, entorno *Production*, marcando la opción *Sensitive*. Guárdala también en un sitio seguro: sin ella no se pueden leer los números ya conectados.
3. **Ejecuta el SQL.** En Supabase (proyecto `wnboyesnlrbtwfmhcxmc`) → SQL Editor, pega y ejecuta `docs/sql/2026-10-20-whatsapp-por-marca.sql`.
4. **Mándame el resultado de la consulta de comprobación** (las dos últimas consultas del archivo). Debe salir la lista de columnas nuevas (15 filas) y la restricción `ventas_leads_origen_check` con `'whatsapp'` dentro. No despliegues hasta que lo haya revisado.
5. **En Meta for Developers → tu app → WhatsApp → Configuración → Webhooks**, suscribe estos campos: `account_update`, `history`, `smb_app_state_sync`, `smb_message_echoes`. Los que ya tenías (`messages`) se quedan.
6. **Prepara el móvil de Hydrup.** El Lebara de Hydrup debe tener WhatsApp Business versión 2.24.17 o superior, en un móvil (no en WhatsApp normal).

## Desplegar

7. Fusiona la rama `feat/whatsapp-coexistencia` en `main` (tras mi visto bueno del paso 4) y deja que Vercel despliegue producción automáticamente. Espera a que el despliegue de producción salga en verde antes de seguir.

## Conectar a Hydrup

8. Entra en `/panel/ventas/hydrup/whatsapp`. El botón «Conectar WhatsApp» lo ven los administradores y el cliente de esa marca; los demás ven el aviso «Solo la marca o un administrador pueden conectar el número».
9. Pulsa **«Conectar WhatsApp»**. Se abre una ventana de Meta: elige el número de la app de WhatsApp Business y completa los pasos. El número sigue funcionando en el móvil.
10. Al terminar debe verse «WhatsApp conectado…». Recarga la página y comprueba:
    - Estado: **Conectado**, con el número (ID) y la fecha.
    - Historial: **«Pedido a Meta: las conversaciones antiguas van llegando.»**
11. **El historial solo se puede pedir una vez**, en las 24 h siguientes a conectar. Si algo falla ese día, avísame antes de pulsar «Reconectar»: reconectar no vuelve a pedirlo si ya está pedido. Si sale «El negocio no compartió el historial…», hay que volver a hacerlo desde la app del móvil.

## Pruebas

12. Desde otro móvil, escribe un mensaje al número de Hydrup. Debe aparecer en **Conversaciones** de Hydrup.
13. Responde desde el panel. Debe llegar al otro móvil.
14. Responde desde el móvil de Hydrup. Debe aparecer en el panel con la etiqueta **«Desde el móvil»**.
15. Entra como Sidney y comprueba que ve **Conversaciones** (y solo las de su marca).
16. **Dinkbit sigue igual.** Escribe y recibe con +34 604 35 75 87. Recuerda: Dinkbit no se conecta desde el panel; su página (`/panel/ventas/dinkbit/whatsapp`) muestra «Conectado al número del canal de Dinkbit» y no tiene botón.

## Si algo falla

- «Falta WHATSAPP_CLAVE_TOKENS» o «Falta WHATSAPP_APP_SECRET»: revisa el paso 1 o 2 y vuelve a desplegar (las variables nuevas solo se leen tras un despliegue).
- «Desconectado» con un motivo: lo ha puesto Meta; reconecta con el botón.
- Cualquier otro error: mándame el texto exacto que sale en pantalla.
