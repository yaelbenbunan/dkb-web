import { initBotId } from "botid/client/core";

// BotID (Vercel) para los formularios públicos. Los formularios son server
// actions, que hacen POST a la URL de la página en la que están, así que se
// protege cualquier POST del sitio: si una página con formulario quedara fuera,
// `checkBotId()` tomaría a sus visitantes por bots y se perderían leads reales.
// El servidor solo lo comprueba en las acciones de formulario (src/lib/antispam.ts);
// en el resto de POST (el panel) la cabecera viaja y nadie la mira.
initBotId({
  protect: [{ path: "/*", method: "POST" }],
});
