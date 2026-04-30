"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const WORDS = ["cosas", "webs", "ecommerce", "campañas", "diseños", "proyectos"];

export function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-block align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[index]}
          initial={{ y: "60%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-60%", opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-block bg-gradient-to-r from-[--color-accent] to-[--color-accent-hover] bg-clip-text text-transparent"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
