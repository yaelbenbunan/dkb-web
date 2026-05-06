"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

type Omitted = "initial" | "whileInView" | "viewport" | "transition" | "style";

type Direction = "up" | "down" | "left" | "right";

interface RevealProps extends Omit<HTMLMotionProps<"div">, Omitted> {
  children: ReactNode;
  /** Retraso en segundos. Útil para encadenar varias secciones. */
  delay?: number;
  /** Distancia del desplazamiento en px. Default 40. */
  distance?: number;
  /** Duración en segundos. Default 0.7. */
  duration?: number;
  /** Dirección desde la que aparece. Default "up" (entra desde abajo). */
  from?: Direction;
  /** Si true, también aplica un pequeño zoom-in. */
  scale?: boolean;
  /** Estilo adicional. */
  style?: React.CSSProperties;
}

function offsetFor(from: Direction, d: number) {
  switch (from) {
    case "up":
      return { x: 0, y: d };
    case "down":
      return { x: 0, y: -d };
    case "left":
      return { x: d, y: 0 };
    case "right":
      return { x: -d, y: 0 };
  }
}

/**
 * Wrapper que hace fade-in + slide cuando el contenido entra en el viewport.
 * Una sola vez. Ideal para envolver secciones completas o elementos
 * individuales para darles aparición suave al scrollear.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 40,
  duration = 0.7,
  from = "up",
  scale = false,
  style,
  ...rest
}: RevealProps) {
  const off = offsetFor(from, distance);
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: off.x,
        y: off.y,
        scale: scale ? 0.96 : 1,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      style={{ willChange: "transform, opacity", ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
