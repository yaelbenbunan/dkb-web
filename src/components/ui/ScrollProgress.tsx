"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * Barra de progreso fija en el top que se llena según el scroll.
 * Color accent. 3px de alto.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[#187bef] via-[#3a90f2] to-[#187bef]"
      style={{ scaleX }}
    />
  );
}
