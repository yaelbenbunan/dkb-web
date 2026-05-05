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
      className="relative inline-block align-baseline"
      style={{
        color: "#3a90f2",
        textShadow: "0 0 18px rgba(58,144,242,0.22), 0 0 42px rgba(24,123,239,0.14)",
        filter: "drop-shadow(0 3px 14px rgba(24,123,239,0.18))",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={mounted ? { opacity: 0, scale: 0.94 } : false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-block"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
