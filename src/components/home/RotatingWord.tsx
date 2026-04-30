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
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-block align-baseline text-[--color-accent]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={mounted ? { y: 28, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-block"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
