/**
 * Nombre de un servicio tal y como debe leerse DENTRO de una frase
 * («Nuestro enfoque de …», «Preguntas frecuentes sobre …»).
 *
 * La página de servicio pasaba el título por `toLowerCase()`, y eso destroza
 * las siglas y las marcas: «SEM» se leía «sem» y «ChatGPT» habría quedado
 * «chatgpt». La regla es sencilla: si el título lleva mayúsculas más allá de
 * la primera letra, es una sigla o un nombre propio y se deja tal cual; si no,
 * se pasa a minúscula como antes.
 */
export function tituloEnFrase(titulo: string): string {
  const resto = titulo.slice(1);
  const tieneMayusculasInternas = resto !== resto.toLowerCase();
  return tieneMayusculasInternas ? titulo : titulo.toLowerCase();
}
