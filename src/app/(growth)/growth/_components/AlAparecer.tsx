"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sube y aparece lo que hay dentro cuando entra en pantalla.
 *
 * **Es el único movimiento de la página, y es a propósito.** Una landing con
 * cinco animaciones distintas —una que gira, otra que rebota, otra que hace
 * zoom— no se lee como cuidada, se lee como una plantilla. Aquí todo entra
 * igual: sube un poco y se revela. Lo que cambia entre elementos es el retraso,
 * y eso basta para que una fila de tres tarjetas se lea como una secuencia en
 * vez de como un bloque que aparece de golpe.
 *
 * **Pasa una sola vez.** Todo se desconecta al primer disparo: una animación
 * que se repite cada vez que subes y bajas convierte el scroll en un parpadeo,
 * y en una página que se recorre buscando el precio se sube y se baja mucho.
 *
 * **Empieza visible y se oculta al montar.** Es lo contrario de lo natural y es
 * lo que salva el caso que importa: sin JavaScript —o mientras carga— el
 * contenido tiene que estar ahí. Si el estado inicial fuera "invisible", un
 * fallo del script dejaría la página en blanco con todo el texto dentro.
 *
 * **Y respeta `prefers-reduced-motion`.** Quien lo tiene puesto no lo tiene por
 * gusto: para bastante gente el movimiento en pantalla produce mareo de verdad.
 * Con esa preferencia, esto no hace absolutamente nada — igual que si al
 * navegador le falta alguna de las dos APIs que esto usa.
 */
export function AlAparecer({
  children,
  retraso = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Milisegundos de espera, para escalonar una fila de tarjetas. */
  retraso?: number;
  className?: string;
}) {
  const referencia = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [animando, setAnimando] = useState(false);

  useEffect(() => {
    const nodo = referencia.current;
    if (!nodo) return;

    // **Cualquier duda, se queda visible.** Ni `matchMedia` ni
    // `IntersectionObserver` existen en todas partes —jsdom no trae ninguno de
    // los dos, y un navegador viejo puede no traer el segundo—, y el modo de
    // fallo correcto es siempre el mismo: no animar. Una animación que no se ve
    // no le cuesta nada a nadie; un contenido escondido esperando a un
    // observador que no llega es la página en blanco.
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") return;

    // Si ya está en pantalla al cargar —el hero, lo primero que se ve— no se
    // esconde para animarlo después: eso sería un parpadeo nada más entrar.
    const caja = nodo.getBoundingClientRect();
    if (caja.top < window.innerHeight * 0.9) return;

    setAnimando(true);
    setVisible(false);

    let vivo = true;
    const revelar = () => {
      if (!vivo) return;
      vivo = false;
      setVisible(true);
      observador.disconnect();
      window.removeEventListener("scroll", alDesplazar);
    };

    // **El observador solo, no basta.** `IntersectionObserver` avisa cuando el
    // elemento CRUZA el borde, y hay una forma muy normal de no cruzar nunca:
    // saltar de golpe. Un enlace a un ancla, el navegador restaurando la
    // posición al volver atrás, o simplemente un scroll rápido de rueda dejan
    // elementos que pasan de estar debajo de la pantalla a estar encima sin
    // haber estado dentro en ningún fotograma medido — y ésos se quedaban
    // invisibles para siempre, con su texto dentro.
    //
    // Así que hay dos disparadores y el que llegue primero gana: el observador,
    // que es el eficiente y el que acierta en el caso normal, y una
    // comprobación al desplazar, que atrapa lo que el otro no puede ver. El
    // umbral es el mismo en los dos.
    const alDesplazar = () => {
      const caja = nodo.getBoundingClientRect();
      if (caja.top < window.innerHeight * 0.9) revelar();
    };

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) revelar();
      },
      // Se dispara un poco antes del borde: esperando al cruce exacto, el
      // elemento empieza a moverse cuando ya lo estás mirando.
      { rootMargin: "0px 0px -12% 0px" },
    );

    observador.observe(nodo);
    window.addEventListener("scroll", alDesplazar, { passive: true });

    return () => {
      vivo = false;
      observador.disconnect();
      window.removeEventListener("scroll", alDesplazar);
    };
  }, []);

  return (
    <div
      ref={referencia}
      className={className}
      style={
        animando
          ? {
              opacity: visible ? 1 : 0,
              transform: visible ? "none" : "translateY(1.75rem)",
              transition: `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${retraso}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${retraso}ms`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
