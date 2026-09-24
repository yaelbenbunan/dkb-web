import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Config plana nativa. Antes esto pasaba por `FlatCompat` de `@eslint/eslintrc`
 * para traducir la config antigua de `eslint-config-next`, pero con ESLint 10
 * esa traducción revienta: intenta serializar la config del plugin de React,
 * que tiene una referencia circular, y falla con «Converting circular structure
 * to JSON» antes de analizar un solo fichero.
 *
 * Desde la versión 16, `eslint-config-next` exporta config plana en sus
 * subpaths, así que el compat sobra y se importa directamente.
 */
const eslintConfig = [
  // `.claude` y `.remember` son scratch de herramientas: dentro hay worktrees
  // con sus propias dependencias, y lintarlos añadía 58.000 avisos de código
  // de terceros que tapaban por completo los de este repo.
  {
    ignores: [".next/**", "node_modules/**", "public/**", ".claude/**", ".remember/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
