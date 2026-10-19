# Plan: Prospección con consentimiento

Spec: `docs/superpowers/specs/2026-10-19-prospeccion-consentimiento-design.md`

1. SQL idempotente `docs/sql/2026-10-19-prospeccion-consentimiento.sql`.
2. `src/lib/prospeccion/consentimiento.ts` (puro): `consentimientoVigente`,
   `fechaLarga`, `validarConsentimiento`, `GUION_LLAMADA`. Tests primero.
3. `tipos.ts`: campos opcionales de consentimiento en `ProspectRow`.
4. `reglas-envio.ts`: `sin_consentimiento` (test primero).
5. `enviar.ts`: pie nuevo con fecha del consentimiento (test primero).
6. `contacto.ts`: `separarDuplicados` (ya estaban / repetidas entre sí);
   `busqueda.ts` devuelve `yaTenias` y `repetidas` (tests primero).
7. `ventas/prospeccion.ts`: consentimiento → `consentimiento: true` + nota
   (tests primero).
8. `db.ts`: `registrarConsentimiento`, `retirarConsentimiento`.
9. Acciones: registrar / retirar / buscar email en su web; quitar
   `enriquecerTandaAction`; mensaje de búsqueda.
10. UI: Buscador sin revisión de webs; tabla con consentimiento, guion y
    casilla solo para consentidos; estado «nuevo» → «Por llamar».
11. `tsc`, eslint, vitest, `next build`; commits y push.
