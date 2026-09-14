// Cabecera `From` de los emails de campaña.
//
// Lo que ve quien recibe el correo en la bandeja no es la dirección, es el
// nombre: «Alicia de dinkbit» se lee y «hola@dinkbit.es» no. Por eso el
// remitente son dos cosas — un nombre editable y una dirección de la lista
// blanca — que aquí se juntan en la única forma que entiende el SMTP:
// `"Nombre" <email@dominio>`.
//
// El nombre lo escribe una persona en el panel, así que NUNCA se pega tal cual
// en la cabecera: un salto de línea dentro del `From` permitiría inyectar otras
// cabeceras (un Bcc, un Reply-To ajeno) en el correo saliente.

/** Nombre que se usa cuando el campo se deja vacío. */
export const DEFAULT_SENDER_NAME = "dinkbit";

/** Tope de longitud del nombre visible. Las cabeceras se pliegan a 78
 *  caracteres; por encima de eso algunos clientes lo cortan por su cuenta. */
export const MAX_SENDER_NAME_LENGTH = 64;

/**
 * Deja el nombre en algo que se puede meter en una cabecera sin romperla:
 * fuera los caracteres de control (ahí viven \r y \n, la inyección de
 * cabeceras), fuera las comillas y la barra invertida (rompen el
 * `quoted-string`) y fuera los delimitadores de dirección `<` y `>`.
 * Devuelve "" si no queda nada aprovechable.
 */
export function sanitizeSenderName(raw: string | null | undefined): string {
  return (raw ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/["\\<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SENDER_NAME_LENGTH)
    .trim();
}

/** ¿El nombre sobrevive entero a la limpieza? Sirve para avisar en el panel
 *  antes de guardar, no para decidir si se envía. */
export function isValidSenderName(raw: string | null | undefined): boolean {
  const v = (raw ?? "").trim();
  return v.length === 0 || sanitizeSenderName(v) === v;
}

/**
 * Cabecera `From` completa. El nombre siempre va entrecomillado: así da igual
 * que lleve una coma, un punto o un guion, que son caracteres especiales en una
 * lista de direcciones.
 */
export function formatFromHeader(
  name: string | null | undefined,
  email: string,
  fallback: string = DEFAULT_SENDER_NAME,
): string {
  const address = email.trim();
  const display = sanitizeSenderName(name) || sanitizeSenderName(fallback);
  if (!display) return address;
  return `"${display}" <${address}>`;
}
