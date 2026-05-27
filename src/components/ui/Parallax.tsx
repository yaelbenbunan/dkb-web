"use client";

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface ParallaxProps {
  children: ReactNode;
  /** Magnitud del parallax en px. Positivo = más lento que el scroll, negativo = más rápido. */
  offset?: number;
  className?: string;
}

/**
 * Wrapper que mueve el contenido con la velocidad del scroll para crear
 * efecto parallax. Útil para fondos decorativos.
 *
 * Se desactiva en mobile (<768px) y cuando el usuario prefiere reducir
 * movimiento, para evitar regresiones de INP en dispositivos de menor potencia.
 */
export function Parallax({ children, offset = 80, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  const disabled = reduceMotion || isMobile;

  return (
    <motion.div
      ref={ref}
      style={disabled ? undefined : { y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
