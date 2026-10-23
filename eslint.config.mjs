import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// shortcut: Next's React/import plugins require ESLint 9; upgrade when their peer ranges support 10.
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
