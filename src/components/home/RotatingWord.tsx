"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const WORDS = ["cosas", "webs", "ecommerce", "campañas", "diseños", "proyectos"];

export function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="relative inline-block overflow-hidden align-baseline text-[--color-accent]"
      style={{
        textShadow:
          "0 0 32px rgba(24,123,239,0.45), 0 0 8px rgba(24,123,239,0.6)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={mounted ? { y: "100%", opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="inline-block"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
