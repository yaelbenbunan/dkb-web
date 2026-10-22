"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { aceptAttr, CAMPOS_ARCHIVO, validarArchivo, type NombreCampoArchivo } from "@/lib/altas/archivos";
import { CAMPOS_ALTA, SECCIONES_ALTA, cumpleCondicion, leerRespuestasAlta, type CampoAlta, type RespuestasAlta } from "@/lib/altas/preguntas";
import { borrarBorrador, guardarBorrador, interpretarBorrador, leerBorradorCrudo } from "@/lib/altas/borrador";
import { enviarAltaAction, pedirSubidaAction, quitarArchivoAction } from "./acciones";

export interface ArchivoInicial {
  campo: NombreCampoArchivo;
  ruta: string;
  nombre: string;
  tamano: number;
}

type ItemArchivo = {
  clave: string;
  campo: NombreCampoArchivo;
  nombre: string;
  tamano: number;
  ruta?: string;
  estado: "subiendo" | "listo" | "error";
  progreso: number;
  error?: string;
};

type Valores = Record<string, unknown>;

const MAX_COMPETIDORES = 5;
const ESPERA_BORRADOR_MS = 800;

/** El borrador solo cambia porque lo escribe esta misma página: no hay nada a lo que suscribirse. */
const sinSuscripcion = () => () => {};

const claseCampo =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#0b3ae7] focus:outline-none focus:ring-2 focus:ring-[#0b3ae7]/30";

function tamanoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const esVisible = cumpleCondicion;

/** Sube un archivo con la URL firmada, como lo hace supabase-js (multipart),
 *  pero con XHR para poder enseñar el progreso de archivos de hasta 50 MB. */
function subir(url: string, archivo: File, alProgresar: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const cuerpo = new FormData();
    cuerpo.append("cacheControl", "3600");
    cuerpo.append("", archivo);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alProgresar(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("red"));
    xhr.send(cuerpo);
  });
}

function Etiqueta({ campo, htmlFor }: { campo: CampoAlta; htmlFor?: string }) {
  const contenido = (
    <>
      {campo.etiqueta}
      {campo.obligatorio && (
        <span className="text-[#0b3ae7]" aria-hidden>
          {" "}
          *
        </span>
      )}
      {campo.obligatorio && <span className="sr-only"> (obligatorio)</span>}
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="block text-base font-semibold text-slate-900">
      {contenido}
    </label>
  ) : (
    <legend className="block text-base font-semibold text-slate-900">{contenido}</legend>
  );
}

function Ayuda({ campo }: { campo: CampoAlta }) {
  return campo.ayuda ? (
    <p id={`${campo.id}-ayuda`} className="mt-1 text-sm text-slate-600">
      {campo.ayuda}
    </p>
  ) : null;
}

export function FormularioAlta({
  token,
  cliente,
  respuestas,
  archivos: archivosIniciales,
  enviadaEn,
}: {
  token: string;
  cliente: string;
  respuestas: RespuestasAlta;
  archivos: ArchivoInicial[];
  enviadaEn: string | null;
}) {
  // Borrador local: se lee como almacén externo para que el HTML del servidor
  // (sin borrador) y la hidratación coincidan; justo después se usa el borrador.
  const crudo = useSyncExternalStore(sinSuscripcion, () => leerBorradorCrudo(token), () => null);
  const borrador = useMemo(() => interpretarBorrador(crudo, enviadaEn), [crudo, enviadaEn]);
  const baseValores = useMemo<Valores>(() => ({ ...respuestas, ...(borrador?.valores ?? {}) }), [respuestas, borrador]);
  const baseArchivos = useMemo<ItemArchivo[]>(
    () => (borrador?.archivos ?? archivosIniciales).map((a) => ({ ...a, clave: a.ruta, estado: "listo" as const, progreso: 100 })),
    [borrador, archivosIniciales],
  );
  // Hasta el primer cambio se pinta la base (lo enviado o el borrador).
  const [valoresEditados, setValoresEditados] = useState<Valores | null>(null);
  const [archivosEditados, setArchivosEditados] = useState<ItemArchivo[] | null>(null);
  const valores = valoresEditados ?? baseValores;
  const archivos = archivosEditados ?? baseArchivos;
  const setArchivos = (cambio: (lista: ItemArchivo[]) => ItemArchivo[]) => setArchivosEditados((previa) => cambio(previa ?? baseArchivos));
  const guardados = useMemo(() => new Set(archivosIniciales.map((a) => a.ruta)), [archivosIniciales]);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pendiente, empezar] = useTransition();
  const contador = useRef(0);

  const poner = (id: string, valor: unknown) => setValoresEditados((v) => ({ ...(v ?? baseValores), [id]: valor }));
  const hayCambios = valoresEditados !== null || archivosEditados !== null;

  // Guarda el borrador un momento después de dejar de escribir.
  useEffect(() => {
    if (!hayCambios || enviado) return;
    const t = setTimeout(() => {
      const listos = archivos.filter((a) => a.estado === "listo" && a.ruta).map((a) => ({ campo: a.campo, ruta: a.ruta as string, nombre: a.nombre, tamano: a.tamano }));
      guardarBorrador(token, { valores, archivos: listos });
    }, ESPERA_BORRADOR_MS);
    return () => clearTimeout(t);
  }, [token, valores, archivos, hayCambios, enviado]);

  function quitar(a: ItemArchivo) {
    setArchivos((l) => l.filter((x) => x.clave !== a.clave));
    // Lo recién subido se borra ya del bucket; lo de un envío anterior, al reenviar.
    if (a.ruta && !guardados.has(a.ruta)) void quitarArchivoAction(token, a.ruta).catch(() => undefined);
  }
  const actualizarArchivo = (clave: string, cambios: Partial<ItemArchivo>) =>
    setArchivos((lista) => lista.map((a) => (a.clave === clave ? { ...a, ...cambios } : a)));

  async function anadirArchivos(campo: NombreCampoArchivo, lista: FileList | null) {
    if (!lista) return;
    for (const archivo of Array.from(lista)) {
      const clave = `nuevo-${contador.current++}`;
      const base: ItemArchivo = { clave, campo, nombre: archivo.name, tamano: archivo.size, estado: "subiendo", progreso: 0 };
      const v = validarArchivo(campo, archivo.name, archivo.size, archivo.type);
      if (!v.ok) {
        setArchivos((l) => [...l, { ...base, estado: "error", error: v.error }]);
        continue;
      }
      setArchivos((l) => [...l, base]);
      try {
        const firmada = await pedirSubidaAction(token, { campo, nombre: archivo.name, tamano: archivo.size, tipo: archivo.type });
        if (!firmada.ok) {
          actualizarArchivo(clave, { estado: "error", error: firmada.error });
          continue;
        }
        await subir(firmada.url, archivo, (progreso) => actualizarArchivo(clave, { progreso }));
        actualizarArchivo(clave, { estado: "listo", progreso: 100, ruta: firmada.ruta });
      } catch {
        actualizarArchivo(clave, { estado: "error", error: "No se pudo subir. Comprueba la conexión y vuelve a intentarlo." });
      }
    }
  }

  function enviar() {
    setError(null);
    // Lo que está oculto (p. ej. el enlace de Facebook tras marcar «No») no se guarda.
    const visibles = Object.fromEntries(CAMPOS_ALTA.filter((c) => esVisible(c, valores)).map((c) => [c.id, valores[c.id]]));
    if (archivos.some((a) => a.estado === "subiendo")) {
      setError("Espera a que terminen de subirse los archivos.");
      return;
    }
    const local = leerRespuestasAlta(visibles);
    if (!local.ok) {
      setError(local.error);
      if (local.campo) document.getElementById(`campo-${local.campo}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const listos = archivos.filter((a) => a.estado === "listo" && a.ruta).map((a) => ({ campo: a.campo, ruta: a.ruta as string, nombre: a.nombre }));
    for (const c of CAMPOS_ALTA) {
      if (c.tipo === "archivos" && c.obligatorio && !listos.some((a) => a.campo === c.archivo)) {
        setError(`Falta «${c.etiqueta}»: sube al menos un archivo.`);
        document.getElementById(`campo-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    empezar(async () => {
      try {
        // `guardados`: lo que había enviado al abrir esta pestaña; lo que haya
        // enviado otra pestaña después no se borra.
        const r = await enviarAltaAction(token, visibles, listos, [...guardados]);
        if (r.ok) {
          borrarBorrador(token);
          setEnviado(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else setError(r.error);
      } catch {
        setError("No se pudo enviar. Comprueba la conexión y vuelve a intentarlo.");
      }
    });
  }

  if (enviado) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900">¡Gracias, {cliente}!</h1>
        <p className="mt-4 text-lg text-slate-700">
          Hemos recibido tu alta. Lo revisamos y te escribimos con los siguientes pasos.
        </p>
        <p className="mt-3 text-base text-slate-600">Si necesitas cambiar algo, vuelve a abrir este mismo enlace y envíalo de nuevo.</p>
      </section>
    );
  }

  function control(campo: CampoAlta) {
    const id = `campo-${campo.id}`;
    const valor = valores[campo.id];
    const describedBy = campo.ayuda ? `${campo.id}-ayuda` : undefined;
    switch (campo.tipo) {
      case "texto":
      case "email":
      case "telefono":
      case "url":
        return (
          <div id={id}>
            <Etiqueta campo={campo} htmlFor={`${id}-input`} />
            <Ayuda campo={campo} />
            <input
              id={`${id}-input`}
              type={campo.tipo === "texto" ? "text" : campo.tipo === "telefono" ? "tel" : campo.tipo}
              inputMode={campo.tipo === "url" ? "url" : undefined}
              value={typeof valor === "string" ? valor : ""}
              onChange={(e) => poner(campo.id, e.target.value)}
              maxLength={campo.tipo === "url" ? 500 : (campo.max ?? 200)}
              placeholder={campo.placeholder}
              aria-describedby={describedBy}
              aria-required={campo.obligatorio || undefined}
              autoComplete={campo.tipo === "email" ? "email" : campo.tipo === "telefono" ? "tel" : "off"}
              className={claseCampo}
            />
          </div>
        );
      case "textoLargo":
        return (
          <div id={id}>
            <Etiqueta campo={campo} htmlFor={`${id}-input`} />
            <Ayuda campo={campo} />
            <textarea
              id={`${id}-input`}
              rows={4}
              value={typeof valor === "string" ? valor : ""}
              onChange={(e) => poner(campo.id, e.target.value)}
              maxLength={campo.max ?? 4000}
              placeholder={campo.placeholder}
              aria-describedby={describedBy}
              aria-required={campo.obligatorio || undefined}
              className={claseCampo}
            />
          </div>
        );
      case "opcion":
      case "siNo": {
        const opciones = campo.tipo === "siNo" ? [{ valor: true, etiqueta: "Sí" }, { valor: false, etiqueta: "No" }] : (campo.opciones ?? []);
        return (
          <fieldset id={id} aria-describedby={describedBy}>
            <Etiqueta campo={campo} />
            <Ayuda campo={campo} />
            <div className={`mt-2 flex gap-2 ${campo.tipo === "siNo" ? "flex-row" : "flex-col sm:flex-row sm:flex-wrap"}`}>
              {opciones.map((o) => {
                const marcada = valor === o.valor;
                return (
                  <label
                    key={String(o.valor)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-base ${
                      marcada ? "border-[#0b3ae7] bg-[#0b3ae7]/5 font-semibold text-slate-900" : "border-slate-300 bg-white text-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={campo.id}
                      checked={marcada}
                      onChange={() => poner(campo.id, o.valor)}
                      className="h-4 w-4 accent-[#0b3ae7]"
                    />
                    {o.etiqueta}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      }
      case "casillas": {
        const marcadas = Array.isArray(valor) ? (valor as string[]) : [];
        return (
          <fieldset id={id} aria-describedby={describedBy}>
            <Etiqueta campo={campo} />
            <Ayuda campo={campo} />
            <p className="mt-1 text-sm text-slate-600">Puedes marcar varias.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {(campo.opciones ?? []).map((o) => {
                const marcada = marcadas.includes(o.valor);
                return (
                  <label
                    key={o.valor}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-base ${
                      marcada ? "border-[#0b3ae7] bg-[#0b3ae7]/5 font-semibold text-slate-900" : "border-slate-300 bg-white text-slate-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={(e) => poner(campo.id, e.target.checked ? [...marcadas, o.valor] : marcadas.filter((m) => m !== o.valor))}
                      className="h-4 w-4 accent-[#0b3ae7]"
                    />
                    {o.etiqueta}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      }
      case "consentimiento":
        return (
          <div id={id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white p-4">
              <input
                type="checkbox"
                checked={valor === true}
                onChange={(e) => poner(campo.id, e.target.checked)}
                aria-required={campo.obligatorio || undefined}
                className="mt-1 h-4 w-4 shrink-0 accent-[#0b3ae7]"
              />
              <span className="text-base text-slate-900">
                {campo.etiqueta}
                {campo.obligatorio && (
                  <span className="text-[#0b3ae7]" aria-hidden>
                    {" "}
                    *
                  </span>
                )}
              </span>
            </label>
          </div>
        );
      case "competencia": {
        const filas = Array.isArray(valor) ? (valor as { nombre?: string; web?: string }[]) : [];
        const visibles = Array.from({ length: MAX_COMPETIDORES }, (_, i) => filas[i] ?? { nombre: "", web: "" });
        const cambiar = (i: number, clave: "nombre" | "web", texto: string) =>
          poner(
            campo.id,
            visibles.map((f, j) => (j === i ? { ...f, [clave]: texto } : f)),
          );
        return (
          <fieldset id={id} aria-describedby={describedBy}>
            <Etiqueta campo={campo} />
            <Ayuda campo={campo} />
            <div className="mt-2 space-y-2">
              {visibles.map((f, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <input
                    aria-label={`Competidor ${i + 1}: nombre`}
                    placeholder={`Competidor ${i + 1}`}
                    value={f.nombre ?? ""}
                    maxLength={120}
                    onChange={(e) => cambiar(i, "nombre", e.target.value)}
                    className={`${claseCampo} mt-0`}
                  />
                  <input
                    aria-label={`Competidor ${i + 1}: web`}
                    placeholder="Web"
                    inputMode="url"
                    value={f.web ?? ""}
                    maxLength={500}
                    onChange={(e) => cambiar(i, "web", e.target.value)}
                    className={`${claseCampo} mt-0`}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        );
      }
      case "archivos": {
        const nombreCampo = campo.archivo as NombreCampoArchivo;
        const config = CAMPOS_ARCHIVO[nombreCampo];
        const propios = archivos.filter((a) => a.campo === nombreCampo);
        const llenos = propios.filter((a) => a.estado !== "error").length >= config.maxArchivos;
        return (
          <div id={id}>
            <Etiqueta campo={campo} htmlFor={`${id}-input`} />
            <Ayuda campo={campo} />
            <p className="mt-1 text-sm text-slate-600">Formatos: {config.formatos}. Máximo 50 MB por archivo.</p>
            <label
              className={`mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#0b3ae7] bg-white px-4 py-2.5 text-base font-semibold text-[#0b3ae7] hover:bg-[#0b3ae7]/5 ${
                llenos ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 16V4m0 0l-5 5m5-5l5 5M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {propios.length ? "Añadir más archivos" : "Elegir archivos"}
              <input
                id={`${id}-input`}
                type="file"
                multiple
                accept={aceptAttr(nombreCampo)}
                disabled={llenos}
                className="sr-only"
                onChange={(e) => {
                  void anadirArchivos(nombreCampo, e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {propios.length > 0 && (
              <ul className="mt-3 space-y-2">
                {propios.map((a) => (
                  <li key={a.clave} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{a.nombre}</span>
                    <span className="text-slate-600">{tamanoLegible(a.tamano)}</span>
                    {a.estado === "subiendo" && <span className="text-slate-700">Subiendo… {a.progreso}%</span>}
                    {a.estado === "listo" && <span className="font-semibold text-emerald-700">Subido</span>}
                    {a.estado !== "subiendo" && (
                      <button
                        type="button"
                        onClick={() => quitar(a)}
                        className="font-semibold text-slate-700 underline underline-offset-2 hover:text-red-700"
                      >
                        Quitar
                      </button>
                    )}
                    {a.estado === "error" && <p className="basis-full text-sm font-medium text-red-700">{a.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }
    }
  }

  return (
    <>
      <section className="bg-[#0b3ae7] px-4 pb-12 pt-8 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Bienvenido a Dinkbit, {cliente}</h1>
          <p className="mt-4 text-lg text-white/90">Unos 15 minutos para preparar vuestras campañas. Los campos con * son obligatorios.</p>
          <p className="mt-1 text-sm text-white/75">Tus respuestas se guardan en este navegador hasta que las envíes.</p>
        </div>
      </section>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6"
      >
        {enviadaEn && (
          <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-base text-emerald-900">
            Ya nos enviaste este formulario. Puedes cambiar lo que quieras y volver a enviarlo: sustituirá al anterior.
          </p>
        )}
        {SECCIONES_ALTA.map((seccion, i) => (
          <section key={seccion.id} aria-labelledby={`seccion-${seccion.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b3ae7] text-sm font-bold text-white" aria-hidden>
                {i + 1}
              </span>
              <h2 id={`seccion-${seccion.id}`} className="text-xl font-bold text-slate-900 sm:text-2xl">
                {seccion.titulo}
              </h2>
            </div>
            {seccion.descripcion && <p className="mt-2 text-base text-slate-600">{seccion.descripcion}</p>}
            <div className="mt-6 space-y-6">
              {seccion.campos
                .filter((c) => esVisible(c, valores))
                .map((c) => (
                  <div key={c.id}>{control(c)}</div>
                ))}
            </div>
          </section>
        ))}

        <div className="space-y-3">
          {error && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-base font-medium text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pendiente}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0b3ae7] px-6 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(11,58,231,0.5)] transition-colors hover:bg-[#061c6f] disabled:opacity-60"
          >
            {pendiente ? "Enviando…" : enviadaEn ? "Volver a enviar" : "Enviar alta"}
          </button>
        </div>
      </form>
    </>
  );
}
